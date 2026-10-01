// =============================================================================
// SESEMSG hub mode - the door node runs the whole system, no laptop
// =============================================================================
// Build env esp32hub. The door node keeps its job (the reed switch on the
// medicine-room door) and also becomes the system's server:
//
//   * Wi-Fi access point "SESEMSG" (WPA2). The wearable and the caregivers'
//     phones join it directly - no router, no internet.
//   * A DNS server that answers every name with 192.168.4.1, so a phone that
//     joins pops up the dashboard by itself (the "sign in to network" window
//     hotels use) and any address typed in lands on it.
//   * The caregiver dashboard: the SAME page the laptop serves
//     (dashboard/static/v2), packed into the firmware at build time by
//     scripts/embed_dashboard.py.
//   * The laptop server's API, kept in RAM: device ingest (/status, /alert,
//     /door), /summary, acknowledge, the passcode (/auth/*). The JSON matches
//     dashboard/app/main.py field for field, so the page needs no hub version.
//     The alert rules and wording mirror dashboard/app/config.py and the
//     facility (zones, door, resident) mirrors dashboard/config/zones.json -
//     change them there and here together.
//   * Optional uplink: if one of the networks in secrets.h (WIFI_SSID,
//     WIFI2_SSID, WIFI3_SSID) is in range, the hub also joins it and
//       - forwards every packet to the laptop server as before, so the laptop
//         dashboard keeps working (an SOS acknowledged there is cleared here);
//       - if RELAY_URL is set and the network has internet, pushes its summary
//         to the SESEMSG cloud relay (relay/src/worker.js) every 3 s, so
//         caregivers can watch from any network or mobile data. Acknowledge
//         on the remote page comes back in the relay's reply and is applied
//         here; the relay's reply also sets the hub's clock.
//
// Honest limits, all acceptable for the demo:
//   * Alerts live in RAM: a hub restart starts an empty history.
//   * No real-time clock: the first phone that opens the page tells the hub
//     the time. Times are stored relative to the hub's uptime, so events from
//     before that still show the right clock time.
//   * The ESP32's DHCP server leases 8 addresses: the wearable + 7 phones.
//
// The web server is written here rather than using the core's WebServer:
// that one serves a single connection at a time and waits up to 5 s (a
// hard-coded HTTP_MAX_DATA_WAIT) on a connection that sends nothing - which is
// exactly what phone browsers' speculative "preconnect" sockets do. The page
// would freeze for 5 s at a time. This one keeps up to 10 connections open,
// answers whichever has a complete request, and SENDS WITHOUT BLOCKING: a
// reply goes out a piece per loop pass, as fast as that phone takes it. (The
// first version wrote each reply in one blocking call; on 30 Sep a phone in
// Wi-Fi power-save, taking a 10 KB summary through a 5.7 KB send buffer,
// stalled the whole hub past the wearable's 4 s timeout.) Phones polling in
// the same moment also share one summary instead of each building its own.
// =============================================================================
#if HUB_MODE

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <esp_timer.h>
#include <esp_system.h>
#include <esp_wifi.h>
#include <algorithm>
#include <memory>
#include <string>
#include <lwip/sockets.h>

#include "config.h"
#include "hub.h"
#include "hub_page.h"

// =============================================================================
// Facility - mirrors dashboard/config/zones.json
// =============================================================================
struct ZoneCfg { int id; const char *key; const char *name; const char *cls; };
static const ZoneCfg kZoneCfg[] = {
  { 1,  "bedroom_wing",  "Bedroom Wing",  "safe" },
  { 2,  "dining_hall",   "Dining Hall",   "safe" },
  { 11, "medicine_room", "Medicine Room", "restricted" },
};
struct DoorCfg { int id; const char *key; const char *name; const char *nodeId; bool restricted; };
static const DoorCfg kDoorCfg[] = {
  { 11, "medicine_room", "Medicine Room Door", "door-11", true },
};
struct ResidentCfg { const char *deviceId; const char *name; const char *room; };
static const ResidentCfg kResidentCfg[] = {
  { "wearable-01", "Resident A", "Bedroom Wing - Bed 1" },
};
static const char *kFacilityName = "Home for the Aged - Demo Facility";

static const int WEARABLE_STALE_S = 30;
static const int DOOR_STALE_S     = 90;
static const int BATT_LOW_PCT     = 20;
static const int BATT_CRIT_PCT    = 10;
static const int DELAYED_S        = 10;     // dashboard/app/db.py DELAYED_S

template <size_t N, typename T> static constexpr size_t countOf(T (&)[N]) { return N; }

static const ZoneCfg *zoneById(int id) {
  for (const auto &z : kZoneCfg) if (z.id == id) return &z;
  return nullptr;
}
static const ZoneCfg *zoneByKey(const char *key) {
  if (!key) return nullptr;
  for (const auto &z : kZoneCfg) if (strcmp(z.key, key) == 0) return &z;
  return nullptr;
}
static const ZoneCfg *zoneLookup(int id, bool hasId, const char *key) {
  const ZoneCfg *z = hasId ? zoneById(id) : nullptr;
  return z ? z : zoneByKey(key);
}
static const char *zoneClass(int id, bool hasId, const char *key) {
  bool noKey = !key || !*key || strcmp(key, "unknown") == 0;
  if ((!hasId || id == 0) && noKey) return "unknown";
  const ZoneCfg *z = zoneLookup(id, hasId, key);
  return z ? z->cls : "unknown";
}
// Writes the display name into out (a beacon this config does not know is
// shown as "<key> (unconfigured)", as the laptop server does).
static void zoneName(int id, bool hasId, const char *key, char *out, size_t n) {
  const ZoneCfg *z = zoneLookup(id, hasId, key);
  if (z) snprintf(out, n, "%s", z->name);
  else if (key && *key && strcmp(key, "unknown") != 0) snprintf(out, n, "%s (unconfigured)", key);
  else snprintf(out, n, "Unknown");
}
static const DoorCfg *doorFor(const char *nodeId, int doorId, bool hasDoorId) {
  for (const auto &d : kDoorCfg) if (strcmp(d.nodeId, nodeId) == 0) return &d;
  if (hasDoorId) for (const auto &d : kDoorCfg) if (d.id == doorId) return &d;
  return nullptr;
}
static const ResidentCfg *residentFor(const char *deviceId) {
  for (const auto &r : kResidentCfg) if (strcmp(r.deviceId, deviceId) == 0) return &r;
  return nullptr;
}
static const char *residentName(const char *deviceId) {
  const ResidentCfg *r = residentFor(deviceId);
  return r ? r->name : deviceId;
}

// =============================================================================
// Alert types - mirrors ALERT_SEVERITY / ALERT_LABEL in dashboard/app/config.py
// =============================================================================
enum : uint8_t { SEV_INFO = 1, SEV_WARNING = 2, SEV_CRITICAL = 3 };
struct TypeInfo { const char *type; uint8_t sev; const char *label; };
static const TypeInfo kTypes[] = {
  { "sos",              SEV_CRITICAL, "SOS PRESSED" },
  { "sos_dismissed",    SEV_INFO,     "SOS dismissed by resident" },
  { "zone_restricted",  SEV_CRITICAL, "Entered restricted zone" },
  { "zone_change",      SEV_INFO,     "Moved zone" },
  { "zone_lost",        SEV_WARNING,  "Location unknown - no beacon in range" },
  { "battery_low",      SEV_WARNING,  "Battery low" },
  { "battery_critical", SEV_CRITICAL, "Battery critically low" },
  { "door_opened",      SEV_CRITICAL, "Restricted door opened" },
  { "door_closed",      SEV_INFO,     "Restricted door closed" },
  { "device_offline",   SEV_WARNING,  "Device not reporting" },
};
static const TypeInfo *typeInfo(const char *type) {
  for (const auto &t : kTypes) if (strcmp(t.type, type) == 0) return &t;
  return nullptr;
}
static const char *sevName(uint8_t s) {
  return s == SEV_CRITICAL ? "critical" : s == SEV_WARNING ? "warning" : "info";
}

// =============================================================================
// Clock
// =============================================================================
// Everything is stored as seconds of hub uptime; ep() turns that into epoch
// seconds once a phone has told the hub the time.
static double gEpochBase = 0;                       // epoch at uptime 0; 0 = unknown
static inline double upNow() { return esp_timer_get_time() / 1e6; }
static inline double ep(double up) { return gEpochBase + up; }
static const double NO_TIME = -1;

template <size_t N> static void cpy(char (&dst)[N], const char *src) {
  snprintf(dst, N, "%s", src ? src : "");
}

// =============================================================================
// State
// =============================================================================
struct Dev {                           // one wearable
  bool     used;
  char     id[24];
  double   firstSeen, lastSeen, lastEvent, zoneEnteredAt;
  double   bootAt;                     // hub uptime when the device booted (best estimate)
  uint32_t lastUptime;
  int      bootId;
  int      zoneId;
  char     zone[24];
  bool     restricted;
  bool     hasRssi;   int   rssi;
  bool     hasDist;   float dist;
  int      hr, batt;
  bool     hasBattV;  float battV;
  bool     sos;
};
static Dev gDevs[4];

struct DoorSt {                        // one door node
  bool     used;
  char     nodeId[24];
  bool     hasDoorId; int doorId;
  char     door[24];
  char     state[8];                   // "open" | "closed" | "" (unknown)
  double   lastSeen, stateChangedAt, bootAt;
  uint32_t lastUptime;
  int      bootId;
};
static DoorSt gDoorSt[4];

struct AlertRec {
  uint32_t id;                         // 0 = empty slot
  uint8_t  sev;
  char     type[20], source[10];
  char     deviceId[24], nodeId[24];
  char     detail[80];
  char     zone[24];  bool hasZoneId; int zoneId;
  char     door[24];  bool hasDoorId; int doorId;
  bool     hasBatt;   int batt;
  bool     hasHr;     int hr;
  uint32_t uptime;
  double   eventAt, receivedAt;
  bool     late;
  double   ackAt;     char ackBy[41];
  double   clearedAt; char clearedReason[48];
};
#define HUB_ALERT_SLOTS 64
static AlertRec gAlerts[HUB_ALERT_SLOTS];
static uint32_t gNextAlertId = 1;
// Bumped on every change the dashboard can see; the shared summary is rebuilt
// when it moves (or after 700 ms, for the seconds-ago fields).
static uint32_t gStateVersion = 0;

static inline bool alertOpen(const AlertRec &a)   { return a.id && a.ackAt < 0 && a.clearedAt < 0; }
static inline bool alertActive(const AlertRec &a) { return alertOpen(a) && a.sev >= SEV_WARNING; }

// A free slot, else the oldest one nobody has to act on any more, else the
// oldest of all. 64 slots cover hours of demo; the page shows 25 anyway.
static AlertRec &newAlert(const char *type, const char *source) {
  int pick = -1;
  for (int i = 0; i < HUB_ALERT_SLOTS && pick < 0; i++) if (!gAlerts[i].id) pick = i;
  if (pick < 0) {
    for (int i = 0; i < HUB_ALERT_SLOTS; i++)
      if (!alertActive(gAlerts[i]) && (pick < 0 || gAlerts[i].id < gAlerts[pick].id)) pick = i;
  }
  if (pick < 0) {
    for (int i = 0; i < HUB_ALERT_SLOTS; i++)
      if (pick < 0 || gAlerts[i].id < gAlerts[pick].id) pick = i;
  }
  AlertRec &a = gAlerts[pick];
  gStateVersion++;
  memset(&a, 0, sizeof(a));
  a.id = gNextAlertId++;
  const TypeInfo *ti = typeInfo(type);
  a.sev = ti ? ti->sev : SEV_INFO;
  cpy(a.type, type);
  cpy(a.source, source);
  a.ackAt = a.clearedAt = NO_TIME;
  a.receivedAt = a.eventAt = upNow();
  return a;
}

static AlertRec *alertById(uint32_t id) {
  for (auto &a : gAlerts) if (a.id && a.id == id) return &a;
  return nullptr;
}

static int clearAlerts(const char *type, const char *deviceId, const char *reason) {
  int n = 0;
  for (auto &a : gAlerts) {
    if (a.id && a.clearedAt < 0 && strcmp(a.type, type) == 0 && strcmp(a.deviceId, deviceId) == 0) {
      a.clearedAt = upNow();
      cpy(a.clearedReason, reason);
      n++;
      gStateVersion++;
    }
  }
  return n;
}

static int countOpen(const char *type, const char *deviceId) {
  int n = 0;
  for (auto &a : gAlerts)
    if (alertOpen(a) && strcmp(a.type, type) == 0 && strcmp(a.deviceId, deviceId) == 0) n++;
  return n;
}

// Not yet cleared, whether or not a caregiver has acknowledged it. Used where
// one alert must stand for one whole episode: an acknowledged "not reporting"
// or "location unknown" is still true until the wearable is back (1 Oct: an
// acknowledged offline alert was raised again every 5 s during one outage).
static int countUncleared(const char *type, const char *deviceId) {
  int n = 0;
  for (auto &a : gAlerts)
    if (a.id && a.clearedAt < 0 && strcmp(a.type, type) == 0 && strcmp(a.deviceId, deviceId) == 0) n++;
  return n;
}

static Dev *devFind(const char *id, bool create) {
  for (auto &d : gDevs) if (d.used && strcmp(d.id, id) == 0) return &d;
  if (!create) return nullptr;
  for (auto &d : gDevs) if (!d.used) { memset(&d, 0, sizeof(d)); d.used = true; cpy(d.id, id); return &d; }
  return nullptr;                      // more wearables than slots: ignore the extra one
}

static DoorSt *doorFind(const char *nodeId, bool create) {
  for (auto &d : gDoorSt) if (d.used && strcmp(d.nodeId, nodeId) == 0) return &d;
  if (!create) return nullptr;
  for (auto &d : gDoorSt) if (!d.used) { memset(&d, 0, sizeof(d)); d.used = true; cpy(d.nodeId, nodeId); return &d; }
  return nullptr;
}

// =============================================================================
// Uplink: forward to the laptop server (optional)
// =============================================================================
enum : uint8_t { FWD_STATUS = 0, FWD_ALERT = 1, FWD_DOOR = 2 };
struct FwdItem { uint8_t kind; uint32_t at; char body[420]; };
static QueueHandle_t   gFwdQ = nullptr;
static volatile bool   gUplinkUp = false;
static volatile bool   gSosAtLaptop = false;      // our last SOS reached the laptop
static volatile bool   gLaptopAckedSos = false;   // ...and the laptop says it was acknowledged
static volatile uint32_t gFwdOk = 0, gFwdFail = 0;

bool hubUplinkUp() { return gUplinkUp; }

static void forward(uint8_t kind, const char *body) {
  if (!gFwdQ || !gUplinkUp) return;               // no laptop network: the hub is the record
  FwdItem it;
  it.kind = kind;
  it.at = millis();
  cpy(it.body, body);
  xQueueSend(gFwdQ, &it, 0);                       // full queue: drop, never block the hub
}

static void taskForward(void *) {
  FwdItem it;
  uint32_t pauseUntil = 0;
  int fails = 0;
  for (;;) {
    if (xQueueReceive(gFwdQ, &it, portMAX_DELAY) != pdTRUE) continue;
    if (!gUplinkUp) continue;
    if ((int32_t)(millis() - pauseUntil) < 0) continue;          // laptop not answering: skip a while
    if (it.kind == FWD_STATUS && millis() - it.at > 4000) continue;   // a stale snapshot: drop
    const char *path = it.kind == FWD_STATUS ? ENDPOINT_STATUS
                     : it.kind == FWD_ALERT  ? ENDPOINT_ALERT : ENDPOINT_DOOR;
    HTTPClient http;
    http.setConnectTimeout(1500);
    http.setTimeout(2000);
    if (!http.begin(String(BACKEND_BASE_URL) + path)) continue;
    http.addHeader("Content-Type", "application/json");
    int code = http.POST((uint8_t *)it.body, strlen(it.body));
    String reply = (code >= 200 && code < 300 && it.kind == FWD_STATUS) ? http.getString() : String();
    http.end();
    if (code >= 200 && code < 400) {
      gFwdOk++;
      fails = 0;
      if (it.kind == FWD_ALERT && strstr(it.body, "\"type\":\"sos\"")) gSosAtLaptop = true;
      if (it.kind == FWD_STATUS && gSosAtLaptop && reply.indexOf("\"sos_open\":0") >= 0)
        gLaptopAckedSos = true;                    // applied by hubLoop(), which owns the alerts
    } else {
      gFwdFail++;
      if (++fails >= 3) { fails = 0; pauseUntil = millis() + 30000; }
    }
  }
}

static std::shared_ptr<const std::string> summaryShared();

// =============================================================================
// Cloud relay: push the summary out, take remote acknowledgements back
// =============================================================================
static SemaphoreHandle_t                  gRelayMux = nullptr;
static TaskHandle_t                       gRelayTask = nullptr;
static std::shared_ptr<const std::string> gRelayBody;          // next summary to push
static volatile bool                      gRelayBusy = false;
static QueueHandle_t                      gRelayAckQ = nullptr;  // relay -> hubLoop()
struct RelayAck { uint32_t id; char by[41]; };
static volatile double   gRelayNow = 0, gRelayNowAt = 0;       // relay clock, and when (upNow)
static volatile uint32_t gRelayOk = 0, gRelayFail = 0, gRelayLastOkMs = 0;
static volatile int      gRelayLastCode = 0;

static bool relayConfigured() { return HUB_UPLINK && strlen(RELAY_URL) > 0 && strlen(RELAY_KEY) > 0; }

static void taskRelay(void *) {
  // One TLS client kept open between pushes (keep-alive): a new TLS handshake
  // every 3 s would cost the ESP32 about half a second of CPU each time.
  // setInsecure(): the relay's certificate is not checked. The hub only sends
  // to the address in secrets.h and authenticates with RELAY_KEY; checking the
  // certificate would pin a CA that Cloudflare may rotate before the defense.
  WiFiClientSecure tls;
  tls.setInsecure();
  HTTPClient http;
  http.setReuse(true);
  const String url = String(RELAY_URL) + "/hub/push";
  for (;;) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    std::shared_ptr<const std::string> body;
    xSemaphoreTake(gRelayMux, portMAX_DELAY);
    body.swap(gRelayBody);
    xSemaphoreGive(gRelayMux);
    if (!body || !gUplinkUp) { gRelayBusy = false; continue; }
    http.setConnectTimeout(4000);
    http.setTimeout(5000);
    int code = -1;
    String reply;
    if (http.begin(tls, url)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Hub-Key", RELAY_KEY);
      code = http.POST((uint8_t *)body->data(), body->size());
      if (code == 200) reply = http.getString();
      http.end();                  // keeps the connection when the relay allows it
    }
    gRelayLastCode = code;
    if (code == 200) {
      gRelayOk++;
      gRelayLastOkMs = millis();
      DynamicJsonDocument r(2048);
      if (!deserializeJson(r, reply)) {
        double now = r["now"] | 0.0;
        if (now > 1.6e9) { gRelayNow = now; gRelayNowAt = upNow(); }
        for (JsonObject a : r["acks"].as<JsonArray>()) {
          RelayAck ra;
          ra.id = a["id"] | 0;
          snprintf(ra.by, sizeof(ra.by), "%s", (const char *)(a["by"] | "caregiver (remote)"));
          if (ra.id) xQueueSend(gRelayAckQ, &ra, 0);
        }
      }
    } else {
      gRelayFail++;
      tls.stop();                  // start clean next time
    }
    gRelayBusy = false;
  }
}

// Called from hubLoop(): hand the current summary to the push task every 3 s.
static void relayService() {
  if (!relayConfigured() || !gUplinkUp || !gRelayTask) return;
  static uint32_t last = 0;
  if (gRelayBusy || millis() - last < RELAY_PUSH_MS) return;
  last = millis();
  std::shared_ptr<const std::string> body = summaryShared();
  xSemaphoreTake(gRelayMux, portMAX_DELAY);
  gRelayBody = body;
  xSemaphoreGive(gRelayMux);
  gRelayBusy = true;
  xTaskNotifyGive(gRelayTask);
}

// Remote acknowledgements and the relay's clock, applied where the alerts live.
static void relayApply() {
  if (!gRelayAckQ) return;
  RelayAck ra;
  while (xQueueReceive(gRelayAckQ, &ra, 0) == pdTRUE) {
    AlertRec *a = alertById(ra.id);
    if (a && a->ackAt < 0) {
      a->ackAt = upNow();
      cpy(a->ackBy, ra.by);
      gStateVersion++;
      Serial.printf("[HUB] alert #%lu %s acknowledged remotely by %s\n", (unsigned long)ra.id, a->type, a->ackBy);
    }
  }
  if (gRelayNowAt > 0) {
    double relayNow = gRelayNow + (upNow() - gRelayNowAt);
    if (gEpochBase == 0 || fabs(ep(upNow()) - relayNow) > 5) {
      gEpochBase = relayNow - upNow();
      gStateVersion++;
      Serial.println(F("[HUB] clock set from the cloud relay"));
    }
    gRelayNowAt = 0;
  }
}

// =============================================================================
// Ingest - mirrors POST /api/v1/status, /alert, /door in dashboard/app/main.py
// =============================================================================
static void ingestStatus(JsonObject in, JsonDocument &out, int &code) {
  const char *id = in["device_id"];
  if (!id || !*id) { code = 422; out["detail"] = "device_id required"; return; }
  Dev *d = devFind(id, true);
  if (!d) { code = 503; out["detail"] = "device table full"; return; }
  double rcv = upNow();
  uint32_t up = in["uptime_s"] | 0;
  bool fresh = (d->firstSeen == 0 && d->lastSeen == 0);

  // The wearable never queues status packets, so uptime going backwards can
  // only be a restart (reconcile_uptime in dashboard/app/db.py, explicit_boot=None).
  if (fresh) { d->firstSeen = rcv; d->bootAt = rcv - up; d->bootId = 1; }
  else if (up < d->lastUptime) { d->bootId++; d->bootAt = rcv - up; }
  else if (up == d->lastUptime) {
    code = 200; out["ok"] = true; out["accepted"] = false; out["reason"] = "late_or_duplicate";
    return;
  } else d->bootAt = min(d->bootAt, rcv - (double)up);
  double eventAt = d->bootAt + up;

  const char *zone = in["zone"] | "unknown";
  bool zoneChanged = fresh || strcmp(d->zone, zone) != 0;
  if (zoneChanged) d->zoneEnteredAt = eventAt;
  d->lastSeen = rcv;
  d->lastEvent = eventAt;
  d->lastUptime = up;
  d->zoneId = in["zone_id"] | 0;
  cpy(d->zone, zone);
  d->restricted = in["restricted"] | false;
  d->hasRssi = in["rssi"].is<int>();      d->rssi = in["rssi"] | 0;
  d->hasDist = !in["distance_m"].isNull(); d->dist = in["distance_m"] | 0.0f;
  d->hr   = in["hr_bpm"]   | -1;
  d->batt = in["batt_pct"] | -1;
  d->hasBattV = !in["batt_v"].isNull();  d->battV = in["batt_v"] | 0.0f;
  d->sos = in["sos"] | false;

  clearAlerts("device_offline", id, "device reporting again");
  // A known zone again ends a "location unknown" episode by itself, so the
  // caregiver is not left with a pile of them to acknowledge.
  if (d->zoneId != 0) clearAlerts("zone_lost", id, "back in range");

  code = 200;
  out["ok"] = true;
  out["accepted"] = true;
  out["event_at"] = ep(eventAt);
  out["boot_id"] = d->bootId;
  out["sos_open"] = countOpen("sos", id);   // the wearable leaves SOS mode on 0
}

static void ingestAlert(JsonObject in, JsonDocument &out, int &code) {
  const char *id = in["device_id"];
  const char *type = in["type"];
  if (!id || !*id || !type || !*type) { code = 422; out["detail"] = "device_id and type required"; return; }
  double rcv = upNow();
  uint32_t up = in["uptime_s"] | 0;
  Dev *d = devFind(id, false);

  // A report the wearable sends again because the reply timed out - the hub
  // had stored it already - is the same event, not a new alert. (30 Sep: a
  // duplicate SOS stayed open after the first was acknowledged, so the
  // wearable never left SOS mode and ignored the next press.) Same device,
  // type, uptime and detail within 30 s = the same event.
  const char *detail = in["detail"] | "";
  for (auto &x : gAlerts) {
    if (x.id && strcmp(x.deviceId, id) == 0 && strcmp(x.type, type) == 0 && x.uptime == up &&
        strncmp(x.detail, detail, sizeof(x.detail) - 1) == 0 && rcv - x.receivedAt < 30) {
      code = 200;
      out["ok"] = true;
      out["alert_id"] = x.id;
      out["duplicate"] = true;
      out["cleared_sos"] = 0;
      out["event_at"] = ep(x.eventAt);
      return;
    }
  }

  // One "location unknown" per episode: while one is still uncleared, a
  // repeat is the same episode (1 Oct: walking through rooms with no beacon
  // filled the dashboard with them).
  if (strcmp(type, "zone_lost") == 0 && countUncleared("zone_lost", id) > 0) {
    code = 200;
    out["ok"] = true;
    out["duplicate"] = true;
    out["cleared_sos"] = 0;
    return;
  }
  if (strcmp(type, "zone_change") == 0 || strcmp(type, "zone_restricted") == 0)
    clearAlerts("zone_lost", id, "back in range");

  AlertRec &a = newAlert(type, "wearable");
  cpy(a.deviceId, id);
  cpy(a.detail, in["detail"] | "");
  cpy(a.zone, in["zone"] | "");
  a.hasZoneId = !in["zone_id"].isNull(); a.zoneId = in["zone_id"] | 0;
  a.hasBatt = !in["batt_pct"].isNull();  a.batt = in["batt_pct"] | 0;
  a.hasHr   = !in["hr_bpm"].isNull();    a.hr   = in["hr_bpm"] | 0;
  a.uptime = up;
  a.receivedAt = rcv;
  // Placed on the device clock the status packets established; an alert that
  // waited in the wearable's queue during a Wi-Fi drop keeps its real time.
  if (d && d->lastSeen > 0) {
    a.eventAt = d->bootAt + up;
    a.late = a.eventAt < rcv - DELAYED_S;
  }

  int cleared = 0;
  if (strcmp(type, "sos_dismissed") == 0) {
    cleared = clearAlerts("sos", id, "dismissed by resident (long press)");
    if (d) d->sos = false;
  } else if (strcmp(type, "sos") == 0) {
    if (d) d->sos = true;
    gSosAtLaptop = false;                  // this SOS has not reached the laptop yet
    // A new SOS while one is open is an escalation (1 -> 2 or 3 presses; the
    // wearable sends nothing for a same or weaker pattern). The older one is
    // retired, so one Acknowledge clears the wearable.
    for (auto &x : gAlerts) {
      if (x.id && x.id != a.id && alertOpen(x) && strcmp(x.type, "sos") == 0 && strcmp(x.deviceId, id) == 0) {
        x.clearedAt = upNow();
        cpy(x.clearedReason, "replaced by a more urgent SOS");
        gStateVersion++;
      }
    }
  }
  Serial.printf("[HUB] alert #%lu %s from %s: %s\n", (unsigned long)a.id, type, id, a.detail);

  code = 200;
  out["ok"] = true;
  out["alert_id"] = a.id;
  out["cleared_sos"] = cleared;
  out["event_at"] = ep(a.eventAt);
}

static void ingestDoor(JsonObject in, JsonDocument &out, int &code) {
  const char *nodeId = in["node_id"];
  if (!nodeId || !*nodeId) { code = 422; out["detail"] = "node_id required"; return; }
  DoorSt *s = doorFind(nodeId, true);
  if (!s) { code = 503; out["detail"] = "door table full"; return; }
  double rcv = upNow();
  uint32_t up = in["uptime_s"] | 0;
  const char *type = in["type"] | "state_change";
  const char *state = in["state"].as<const char *>();
  bool hasDoorId = !in["door_id"].isNull();
  int doorIdIn = in["door_id"] | 0;
  bool fresh = (s->lastSeen == 0);
  bool isBoot = strcmp(type, "boot") == 0;
  bool live = isBoot || strcmp(type, "heartbeat") == 0;

  // Door nodes announce restarts with "boot"; otherwise uptime going
  // backwards is a delayed packet from their queue (explicit_boot rule).
  bool late = false;
  if (fresh || isBoot) { if (!fresh && isBoot) s->bootId++; else if (fresh) s->bootId = 1; s->bootAt = rcv - up; }
  else if (up < s->lastUptime) late = true;
  else if (live) s->bootAt = min(s->bootAt, rcv - (double)up);
  double eventAt = s->bootAt + up;

  const DoorCfg *cfg = doorFor(nodeId, doorIdIn, hasDoorId);
  const char *doorName = cfg ? cfg->name : (in["door"] | nodeId);
  const char *doorKey = in["door"] | (cfg ? cfg->key : "");
  int doorId = hasDoorId ? doorIdIn : (cfg ? cfg->id : 0);
  bool restricted = cfg ? cfg->restricted : true;

  if (late) {
    // A door that opened during a Wi-Fi outage DID open: record it, marked late,
    // but leave the live state alone. (node, type, uptime) de-duplicates retries.
    uint32_t lateId = 0;
    if (strcmp(type, "state_change") == 0 && restricted && state) {
      const char *t = strcmp(state, "open") == 0 ? "door_opened" : "door_closed";
      bool dup = false;
      for (auto &a : gAlerts)
        if (a.id && strcmp(a.nodeId, nodeId) == 0 && strcmp(a.type, t) == 0 && a.uptime == up) dup = true;
      if (!dup) {
        AlertRec &a = newAlert(t, "door");
        cpy(a.nodeId, nodeId); cpy(a.door, doorKey);
        a.hasDoorId = true; a.doorId = doorId;
        snprintf(a.detail, sizeof(a.detail), "%s %s (delivered late)", doorName, state);
        a.uptime = up; a.eventAt = eventAt; a.receivedAt = rcv; a.late = true;
        lateId = a.id;
      }
    }
    code = 200; out["ok"] = true; out["accepted"] = false; out["reason"] = "late_or_duplicate";
    if (lateId) out["alert_id"] = lateId; else out["alert_id"] = nullptr;
    out["event_at"] = ep(eventAt);
    return;
  }

  bool stateChanged = strcmp(type, "state_change") == 0 && state &&
                      (fresh || strcmp(s->state, state) != 0);
  if (state) cpy(s->state, state);
  if (stateChanged || fresh) s->stateChangedAt = eventAt;
  s->hasDoorId = true; s->doorId = doorId;
  cpy(s->door, doorKey);
  s->lastSeen = rcv;
  s->lastUptime = up;

  uint32_t alertId = 0;
  if (stateChanged && restricted) {
    AlertRec &a = newAlert(strcmp(state, "open") == 0 ? "door_opened" : "door_closed", "door");
    cpy(a.nodeId, nodeId); cpy(a.door, doorKey);
    a.hasDoorId = true; a.doorId = doorId;
    snprintf(a.detail, sizeof(a.detail), "%s %s", doorName, state);
    a.uptime = up; a.eventAt = eventAt; a.receivedAt = rcv;
    alertId = a.id;
    Serial.printf("[HUB] alert #%lu %s\n", (unsigned long)a.id, a.type);
  }
  code = 200;
  out["ok"] = true;
  out["accepted"] = true;
  if (alertId) out["alert_id"] = alertId; else out["alert_id"] = nullptr;
  out["state_changed"] = stateChanged;
  out["event_at"] = ep(eventAt);
}

// =============================================================================
// Read views - mirrors _resident_view / get_doors / _alert_view / get_summary
// =============================================================================
static const char *battLevel(int pct) {
  if (pct < 0) return "unknown";
  if (pct <= BATT_CRIT_PCT) return "critical";
  if (pct <= BATT_LOW_PCT) return "low";
  return "ok";
}

static void alertView(JsonObject o, const AlertRec &a) {
  // Null fields are left out rather than sent as null: the page treats a
  // missing field exactly like null, and the summary stays small enough to
  // send every second to several phones.
  const TypeInfo *ti = typeInfo(a.type);
  o["id"] = a.id;
  o["source"] = (const char *)a.source;
  o["type"] = (const char *)a.type;
  o["label"] = ti ? ti->label : (const char *)a.type;
  o["severity"] = sevName(a.sev);
  if (a.detail[0]) o["detail"] = (const char *)a.detail;
  if (a.deviceId[0]) { o["device_id"] = (const char *)a.deviceId; o["resident"] = residentName(a.deviceId); }
  if (a.nodeId[0]) o["node_id"] = (const char *)a.nodeId;
  if (a.zone[0]) {
    o["zone"] = (const char *)a.zone;
    char zn[48];
    zoneName(a.zoneId, a.hasZoneId, a.zone, zn, sizeof(zn));
    o["zone_name"] = zn;                               // copied by ArduinoJson (char*)
  }
  if (a.door[0]) o["door"] = (const char *)a.door;
  if (a.hasDoorId) o["door_id"] = a.doorId;
  if (a.hasBatt) o["batt_pct"] = a.batt;
  if (a.hasHr) o["hr_bpm"] = a.hr;
  o["event_at"] = ep(a.eventAt);
  o["received_at"] = ep(a.receivedAt);
  o["delayed"] = a.late || (a.receivedAt - a.eventAt > DELAYED_S);
  if (a.ackAt >= 0) { o["acknowledged_at"] = ep(a.ackAt); o["acknowledged_by"] = (const char *)a.ackBy; }
  if (a.clearedAt >= 0) { o["cleared_at"] = ep(a.clearedAt); o["cleared_reason"] = (const char *)a.clearedReason; }
}

static void residentView(JsonObject o, const Dev &d, double t) {
  const ResidentCfg *rc = residentFor(d.id);
  o["device_id"] = (const char *)d.id;
  o["name"] = rc ? rc->name : (const char *)d.id;
  if (rc) o["room"] = rc->room; else o["room"] = nullptr;
  JsonObject z = o.createNestedObject("zone");
  z["id"] = d.zoneId;
  z["key"] = (const char *)d.zone;
  char zn[48];
  zoneName(d.zoneId, true, d.zone, zn, sizeof(zn));
  z["name"] = zn;
  z["class"] = zoneClass(d.zoneId, true, d.zone);
  o["zone_entered_at"] = ep(d.zoneEnteredAt);
  o["seconds_in_zone"] = max(0, (int)(t - d.zoneEnteredAt));
  o["last_seen_at"] = ep(d.lastSeen);
  int since = (int)(t - d.lastSeen);
  o["seconds_since_seen"] = since;
  o["stale"] = since > WEARABLE_STALE_S;
  o["stale_threshold_s"] = WEARABLE_STALE_S;
  JsonObject b = o.createNestedObject("battery");
  if (d.batt >= 0) b["pct"] = d.batt; else b["pct"] = nullptr;
  if (d.hasBattV) b["volts"] = d.battV; else b["volts"] = nullptr;
  b["level"] = battLevel(d.batt);
  if (d.hr >= 0) o["hr_bpm"] = d.hr; else o["hr_bpm"] = nullptr;
  if (d.hasRssi) o["rssi"] = d.rssi; else o["rssi"] = nullptr;
  if (d.hasDist) o["distance_m_approx"] = d.dist; else o["distance_m_approx"] = nullptr;
  o["sos"] = d.sos;
  int open = 0;
  for (auto &a : gAlerts) if (alertActive(a) && strcmp(a.deviceId, d.id) == 0) open++;
  o["open_alerts"] = open;
  o["boot_id"] = d.bootId;
}

static void doorView(JsonObject o, const DoorSt &s, const DoorCfg *cfg, double t) {
  int since = (int)(t - s.lastSeen);
  o["node_id"] = (const char *)s.nodeId;
  if (cfg) {
    o["door_id"] = s.hasDoorId ? s.doorId : cfg->id;
    o["name"] = cfg->name;
    o["key"] = cfg->key;
    o["restricted"] = cfg->restricted;
  } else {
    // A node reporting under an id the facility does not expect is still shown.
    char nm[64];
    snprintf(nm, sizeof(nm), "%s (unexpected node id)", s.door[0] ? s.door : s.nodeId);
    o["door_id"] = s.doorId;
    o["name"] = nm;
    o["key"] = (const char *)s.door;
    o["restricted"] = true;
    o["unconfigured"] = true;
  }
  o["state"] = s.state[0] ? (const char *)s.state : "unknown";
  o["offline"] = since > DOOR_STALE_S;       // silent node = fault, never "closed"
  o["seconds_since_seen"] = since;
  o["stale_threshold_s"] = DOOR_STALE_S;
  o["state_changed_at"] = ep(s.stateChangedAt);
}

static void buildSummary(JsonDocument &doc) {
  double t = upNow();
  doc["server_time"] = ep(t);
  doc["facility_name"] = kFacilityName;
  doc["hub"] = true;
  JsonObject th = doc.createNestedObject("thresholds");
  th["wearable_stale_s"] = WEARABLE_STALE_S;
  th["door_stale_s"] = DOOR_STALE_S;
  th["battery_low_pct"] = BATT_LOW_PCT;
  th["battery_critical_pct"] = BATT_CRIT_PCT;

  JsonArray zones = doc.createNestedArray("zones");
  for (const auto &z : kZoneCfg) {
    JsonObject o = zones.createNestedObject();
    o["id"] = z.id; o["key"] = z.key; o["name"] = z.name; o["class"] = z.cls;
  }

  int nRes = 0, nStale = 0;
  JsonArray res = doc.createNestedArray("residents");
  for (const auto &d : gDevs) {
    if (!d.used) continue;
    residentView(res.createNestedObject(), d, t);
    nRes++;
    if (t - d.lastSeen > WEARABLE_STALE_S) nStale++;
  }
  for (const auto &rc : kResidentCfg) {
    if (devFind(rc.deviceId, false)) continue;
    JsonObject o = res.createNestedObject();       // configured but never reported
    o["device_id"] = rc.deviceId; o["name"] = rc.name; o["room"] = rc.room;
    JsonObject z = o.createNestedObject("zone");
    z["id"] = 0; z["key"] = "unknown"; z["name"] = "Unknown"; z["class"] = "unknown";
    o["zone_entered_at"] = nullptr; o["seconds_in_zone"] = nullptr;
    o["last_seen_at"] = nullptr; o["seconds_since_seen"] = nullptr;
    o["stale"] = true; o["stale_threshold_s"] = WEARABLE_STALE_S;
    JsonObject b = o.createNestedObject("battery");
    b["pct"] = nullptr; b["volts"] = nullptr; b["level"] = "unknown";
    o["hr_bpm"] = nullptr; o["rssi"] = nullptr; o["distance_m_approx"] = nullptr;
    o["sos"] = false; o["open_alerts"] = 0; o["never_seen"] = true;
    nRes++; nStale++;
  }

  int nOpen = 0, nOffline = 0;
  JsonArray doors = doc.createNestedArray("doors");
  for (const auto &dc : kDoorCfg) {
    const DoorSt *s = doorFind(dc.nodeId, false);
    JsonObject o = doors.createNestedObject();
    if (!s) {
      o["node_id"] = dc.nodeId; o["door_id"] = dc.id; o["name"] = dc.name; o["key"] = dc.key;
      o["restricted"] = dc.restricted; o["state"] = "unknown"; o["offline"] = true;
      o["never_seen"] = true; o["seconds_since_seen"] = nullptr;
      o["stale_threshold_s"] = DOOR_STALE_S; o["state_changed_at"] = nullptr;
      nOffline++;
      continue;
    }
    doorView(o, *s, &dc, t);
    if (strcmp(s->state, "open") == 0) nOpen++;
    if (t - s->lastSeen > DOOR_STALE_S) nOffline++;
  }
  for (const auto &s : gDoorSt) {
    if (!s.used) continue;
    bool claimed = false;
    for (const auto &dc : kDoorCfg) if (strcmp(dc.nodeId, s.nodeId) == 0) claimed = true;
    if (claimed) continue;
    doorView(doors.createNestedObject(), s, nullptr, t);
    if (strcmp(s.state, "open") == 0) nOpen++;
    if (t - s.lastSeen > DOOR_STALE_S) nOffline++;
  }

  // Active: most severe first, then newest. Recent: newest 25 of everything.
  const AlertRec *act[HUB_ALERT_SLOTS], *all[HUB_ALERT_SLOTS];
  int na = 0, nall = 0, nCrit = 0, nWarn = 0;
  for (const auto &a : gAlerts) {
    if (!a.id) continue;
    all[nall++] = &a;
    if (alertActive(a)) {
      act[na++] = &a;
      if (a.sev == SEV_CRITICAL) nCrit++; else nWarn++;
    }
  }
  std::sort(act, act + na, [](const AlertRec *x, const AlertRec *y) {
    return x->sev != y->sev ? x->sev > y->sev : x->eventAt > y->eventAt;
  });
  std::sort(all, all + nall, [](const AlertRec *x, const AlertRec *y) { return x->eventAt > y->eventAt; });
  JsonArray aa = doc.createNestedArray("alerts_active");
  for (int i = 0; i < na; i++) alertView(aa.createNestedObject(), *act[i]);
  JsonArray ar = doc.createNestedArray("alerts_recent");
  for (int i = 0; i < nall && i < 25; i++) alertView(ar.createNestedObject(), *all[i]);

  JsonObject c = doc.createNestedObject("counts");
  c["residents"] = nRes;
  c["critical"] = nCrit;
  c["warning"] = nWarn;
  c["stale_devices"] = nStale;
  c["doors_open"] = nOpen;
  c["doors_offline"] = nOffline;
}

// =============================================================================
// Watchdog - silence is a safety event (_check_stale_once)
// =============================================================================
static void watchdog() {
  static uint32_t last = 0;
  if (millis() - last < 5000) return;
  last = millis();
  double t = upNow();
  for (auto &d : gDevs) {
    if (!d.used) continue;
    double silent = t - d.lastSeen;
    if (silent > WEARABLE_STALE_S && countUncleared("device_offline", d.id) == 0) {
      AlertRec &a = newAlert("device_offline", "server");
      cpy(a.deviceId, d.id);
      snprintf(a.detail, sizeof(a.detail), "No status for %d s (threshold %d s)", (int)silent, WEARABLE_STALE_S);
      cpy(a.zone, d.zone);
      a.hasZoneId = true; a.zoneId = d.zoneId;
      Serial.printf("[HUB] alert #%lu device_offline %s\n", (unsigned long)a.id, d.id);
    }
  }
}

// Signal of every device on the hub's network. Two ESP32s a few centimetres
// apart (both on one laptop's USB ports) read about -10 dBm and overload each
// other's receiver: the join works, then frames corrupt and the link drops.
// Anything stronger than about -20 dBm means "move them apart".
static String stationSignals() {
  wifi_sta_list_t list;
  String out;
  if (esp_wifi_ap_get_sta_list(&list) != ESP_OK) return out;
  for (int i = 0; i < list.num; i++) {
    char one[40];
    snprintf(one, sizeof(one), "%s%02x:%02x %d dBm", i ? ", " : "", list.sta[i].mac[4], list.sta[i].mac[5],
             list.sta[i].rssi);
    out += one;
  }
  return out;
}

// =============================================================================
// Passcode sessions - mirrors dashboard/app/auth.py
// =============================================================================
struct Session { char tok[33]; double issued; };
static Session gSessions[12];
static double  gFailAt[5];
static int     gFailN = 0;
static double  gLockedUntil = 0;
static const double SESSION_S = 12 * 3600;

static bool sessionValid(const char *tok) {
  if (!tok || strlen(tok) != 32) return false;
  double t = upNow();
  for (auto &s : gSessions)
    if (s.tok[0] && strcmp(s.tok, tok) == 0 && t - s.issued < SESSION_S) return true;
  return false;
}
static const char *sessionNew() {
  int pick = 0;
  for (int i = 1; i < (int)countOf(gSessions); i++)
    if (gSessions[i].issued < gSessions[pick].issued) pick = i;
  for (int i = 0; i < 16; i++) sprintf(gSessions[pick].tok + 2 * i, "%02x", (unsigned)(esp_random() & 0xFF));
  gSessions[pick].issued = upNow();
  return gSessions[pick].tok;
}
static void sessionDrop(const char *tok) {
  for (auto &s : gSessions) if (tok && s.tok[0] && strcmp(s.tok, tok) == 0) s.tok[0] = 0;
}

// =============================================================================
// HTTP
// =============================================================================
#define HUB_CONNS   10              // listen + DNS + 10 + uplink = 13 of the 16 lwIP sockets
#define HUB_REQ_BUF 2048
#define HUB_SEND_MAX_MS 8000        // a phone that takes longer than this for one reply is dropped
struct Conn {
  WiFiClient c;
  bool       used;
  uint32_t   t0;
  size_t     len;
  int        hdrEnd;                 // offset of the body, -1 until headers are complete
  int        clen;
  char       buf[HUB_REQ_BUF];
  // the reply, sent a piece per loop pass (never blocks the hub):
  bool                               sending;
  uint32_t                           sendT0;
  std::string                        head;       // status line + headers (+ a small body)
  size_t                             headSent;
  std::shared_ptr<const std::string> shared;     // a shared body (the summary), or
  const uint8_t                     *flash;      // the gzipped page in flash
  size_t                             bodyLen, bodySent;
};
static Conn       gConns[HUB_CONNS];
static WiFiServer gServer(80, 8);
static DNSServer  gDns;
static uint32_t   gSummaries = 0;

struct Req {
  char        method[8];
  char        path[96];
  char        query[96];
  char        host[64];
  char        session[40];
  const char *body;
  size_t      bodyLen;
  IPAddress   remote, local;
};

static const char *reasonText(int code) {
  switch (code) {
    case 200: return "OK";           case 204: return "No Content";
    case 302: return "Found";        case 401: return "Unauthorized";
    case 404: return "Not Found";    case 405: return "Method Not Allowed";
    case 413: return "Payload Too Large"; case 422: return "Unprocessable Entity";
    case 429: return "Too Many Requests"; case 503: return "Service Unavailable";
    default:  return "OK";
  }
}

// Hand as much of the reply to the socket as it takes right now. Returns true
// when the reply is finished (or the socket failed): the caller closes it.
static bool pump(Conn &k) {
  int fd = k.c.fd();
  if (fd < 0) return true;
  while (k.headSent < k.head.size()) {
    int n = ::send(fd, k.head.data() + k.headSent, k.head.size() - k.headSent, MSG_DONTWAIT);
    if (n > 0) { k.headSent += n; continue; }
    return !(n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK));
  }
  const uint8_t *src = k.flash ? k.flash : k.shared ? (const uint8_t *)k.shared->data() : nullptr;
  while (src && k.bodySent < k.bodyLen) {
    int n = ::send(fd, src + k.bodySent, min<size_t>(k.bodyLen - k.bodySent, 2920), MSG_DONTWAIT);
    if (n > 0) { k.bodySent += n; continue; }
    return !(n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK));
  }
  return true;
}

// Queue a reply on the connection. A small body rides in the same buffer as
// the headers (one TCP segment); the page (flash) and the shared summary are
// sent straight from where they are, without a copy per phone.
static void sendResp(Conn &c, int code, const char *ctype, const uint8_t *body, size_t len,
                     const char *extra = "", bool gz = false,
                     std::shared_ptr<const std::string> shared = nullptr) {
  char head[400];
  int n = snprintf(head, sizeof(head),
                   "HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %u\r\n"
                   "Cache-Control: no-store\r\nConnection: close\r\n%s%s\r\n",
                   code, reasonText(code), ctype, (unsigned)(shared ? shared->size() : len),
                   gz ? "Content-Encoding: gzip\r\n" : "", extra);
  c.head.assign(head, n);
  c.headSent = 0;
  c.bodySent = 0;
  c.flash = nullptr;
  c.shared = shared;
  c.bodyLen = shared ? shared->size() : 0;
  if (!shared && len) {
    if (body == HUB_PAGE_GZ) { c.flash = body; c.bodyLen = len; }
    else c.head.append((const char *)body, len);
  }
  c.sending = true;
  c.sendT0 = millis();
}

static void sendJson(Conn &c, int code, JsonDocument &doc, const char *extra = "") {
  String s;
  s.reserve(measureJson(doc) + 1);
  serializeJson(doc, s);
  sendResp(c, code, "application/json", (const uint8_t *)s.c_str(), s.length(), extra);
}

// One summary for every phone that polls within 700 ms of the last one, unless
// something changed in between. Seven phones polling each second then cost one
// JSON build per second, not seven.
static std::shared_ptr<const std::string> summaryShared() {
  static std::shared_ptr<const std::string> cache;
  static uint32_t builtAt = 0, builtVersion = 0;
  if (cache && builtVersion == gStateVersion && millis() - builtAt < 700) return cache;
  DynamicJsonDocument doc(28672);
  buildSummary(doc);
  if (doc.overflowed()) Serial.println(F("[HUB] summary JSON truncated - raise the document size"));
  auto str = std::make_shared<std::string>();
  str->reserve(measureJson(doc) + 1);
  serializeJson(doc, *str);
  cache = str;
  builtAt = millis();
  builtVersion = gStateVersion;
  return cache;
}

static void sendRedirect(Conn &c, IPAddress local) {
  char extra[80];
  snprintf(extra, sizeof(extra), "Location: http://%s/\r\n", local.toString().c_str());
  sendResp(c, 302, "text/plain", (const uint8_t *)"", 0, extra);
}

// A request for anything other than the hub's own address - a phone checking
// for internet (connectivitycheck.gstatic.com, captive.apple.com,
// msftconnecttest.com), or someone typing any web address - is sent to the
// dashboard. That is what makes the phone pop up the page by itself.
static bool hostIsHub(const char *host) {
  if (!host[0]) return true;
  if (isdigit((unsigned char)host[0])) return true;        // any IP literal: us
  char low[64];
  size_t i = 0;
  for (; host[i] && i < sizeof(low) - 1; i++) low[i] = tolower((unsigned char)host[i]);
  low[i] = 0;
  return strstr(low, "sesemsg") != nullptr;
}

static bool parseRequest(Conn &k, Req &r) {
  memset(&r, 0, sizeof(r));
  k.buf[k.len] = 0;
  char *line = k.buf;
  char *eol = strstr(line, "\r\n");
  if (!eol) return false;
  *eol = 0;
  char *sp1 = strchr(line, ' ');
  if (!sp1) return false;
  *sp1 = 0;
  cpy(r.method, line);
  char *target = sp1 + 1;
  char *sp2 = strchr(target, ' ');
  if (sp2) *sp2 = 0;
  char *q = strchr(target, '?');
  if (q) { *q = 0; cpy(r.query, q + 1); }
  cpy(r.path, target);

  char *h = eol + 2;
  while (h < k.buf + k.hdrEnd - 2) {
    char *e = strstr(h, "\r\n");
    if (!e) break;
    *e = 0;
    char *colon = strchr(h, ':');
    if (colon) {
      *colon = 0;
      char *v = colon + 1;
      while (*v == ' ') v++;
      if (strcasecmp(h, "Host") == 0) {
        cpy(r.host, v);
        char *port = strchr(r.host, ':');
        if (port) *port = 0;
      } else if (strcasecmp(h, "Cookie") == 0) {
        const char *s = strstr(v, "trodes_session=");
        if (s) {
          s += strlen("trodes_session=");
          size_t n = 0;
          while (isxdigit((unsigned char)s[n]) && n < sizeof(r.session) - 1) { r.session[n] = s[n]; n++; }
          r.session[n] = 0;
        }
      }
    }
    h = e + 2;
  }
  r.body = k.buf + k.hdrEnd;
  r.bodyLen = k.len - k.hdrEnd;
  r.remote = k.c.remoteIP();
  r.local = k.c.localIP();
  return true;
}

static void handleLogin(Conn &c, Req &r) {
  StaticJsonDocument<256> out;
  double t = upNow();
  if (t < gLockedUntil) {
    out["ok"] = false; out["locked_for"] = (int)(gLockedUntil - t) + 1;
    sendJson(c, 429, out);
    return;
  }
  StaticJsonDocument<256> in;
  const char *pc = "";
  if (!deserializeJson(in, r.body, r.bodyLen)) pc = in["passcode"] | "";
  while (*pc == ' ') pc++;
  char code[16];
  cpy(code, pc);
  for (int i = strlen(code) - 1; i >= 0 && code[i] == ' '; i--) code[i] = 0;
  // compare every character, so the time taken does not leak how many matched
  const char *want = HUB_PASSCODE;
  size_t lw = strlen(want), lc = strlen(code);
  uint8_t diff = (lw != lc);
  for (size_t i = 0; i < lw; i++) diff |= (uint8_t)(want[i] ^ (i < lc ? code[i] : 0));
  if (!diff) {
    gFailN = 0;
    char extra[128];
    snprintf(extra, sizeof(extra),
             "Set-Cookie: trodes_session=%s; Max-Age=43200; Path=/; HttpOnly; SameSite=Lax\r\n", sessionNew());
    out["ok"] = true;
    sendJson(c, 200, out, extra);
    Serial.printf("[HUB] login OK from %s\n", r.remote.toString().c_str());
    return;
  }
  // five wrong codes within 5 minutes lock the login for 60 s
  int keep = 0;
  for (int i = 0; i < gFailN; i++) if (t - gFailAt[i] < 300) gFailAt[keep++] = gFailAt[i];
  gFailN = keep;
  if (gFailN < 5) gFailAt[gFailN++] = t;
  if (gFailN >= 5) {
    gFailN = 0;
    gLockedUntil = t + 60;
    out["ok"] = false; out["locked_for"] = 60;
    sendJson(c, 429, out);
    return;
  }
  out["ok"] = false; out["tries_left"] = 5 - gFailN;
  sendJson(c, 401, out);
}

static void handleAck(Conn &c, Req &r, uint32_t id) {
  StaticJsonDocument<256> out;
  AlertRec *a = alertById(id);
  if (!a) { out["detail"] = "alert not found"; sendJson(c, 404, out); return; }
  if (a->ackAt >= 0) {
    out["ok"] = true; out["already"] = true; out["alert_id"] = id;
    out["acknowledged_by"] = (const char *)a->ackBy; out["acknowledged_at"] = ep(a->ackAt);
    sendJson(c, 200, out);
    return;
  }
  StaticJsonDocument<384> in;
  const char *by = "caregiver";
  if (!deserializeJson(in, r.body, r.bodyLen)) by = in["acked_by"] | "caregiver";
  a->ackAt = upNow();
  cpy(a->ackBy, by);
  gStateVersion++;
  Serial.printf("[HUB] alert #%lu %s acknowledged by %s\n", (unsigned long)id, a->type, a->ackBy);
  out["ok"] = true; out["alert_id"] = id;
  out["acknowledged_by"] = (const char *)a->ackBy; out["acknowledged_at"] = ep(a->ackAt);
  sendJson(c, 200, out);
}

static void handleIngest(Conn &c, Req &r, uint8_t kind) {
  StaticJsonDocument<768> in;
  StaticJsonDocument<256> out;
  int code = 422;
  if (deserializeJson(in, r.body, r.bodyLen) || !in.is<JsonObject>()) {
    out["detail"] = "body is not a JSON object";
  } else if (kind == FWD_STATUS) ingestStatus(in.as<JsonObject>(), out, code);
  else if (kind == FWD_ALERT)    ingestAlert(in.as<JsonObject>(), out, code);
  else                           ingestDoor(in.as<JsonObject>(), out, code);
  sendJson(c, code, out);
  gStateVersion++;
  if (code == 200 && !(out["duplicate"] | false)) {    // a repeat is not forwarded twice
    char body[421];
    size_t n = min(r.bodyLen, sizeof(body) - 1);
    memcpy(body, r.body, n);
    body[n] = 0;
    forward(kind, body);
  }
}

static void route(Conn &c, Req &r) {
  bool get = strcmp(r.method, "GET") == 0 || strcmp(r.method, "HEAD") == 0;
  bool post = strcmp(r.method, "POST") == 0;
  const char *p = r.path;

  if (!hostIsHub(r.host)) {                 // captive portal
    if (get) sendRedirect(c, r.local);
    else sendResp(c, 404, "text/plain", (const uint8_t *)"", 0);
    return;
  }
  if (get && (strcmp(p, "/") == 0 || strcmp(p, "/index.html") == 0)) {
    sendResp(c, 200, "text/html; charset=utf-8", HUB_PAGE_GZ, HUB_PAGE_GZ_LEN, "", true);
    return;
  }
  if (post && strcmp(p, ENDPOINT_STATUS) == 0) { handleIngest(c, r, FWD_STATUS); return; }
  if (post && strcmp(p, ENDPOINT_ALERT) == 0)  { handleIngest(c, r, FWD_ALERT);  return; }
  if (post && strcmp(p, ENDPOINT_DOOR) == 0)   { handleIngest(c, r, FWD_DOOR);   return; }

  if (strncmp(p, "/api/v1/auth/", 13) == 0) {
    if (get && strcmp(p, "/api/v1/auth/status") == 0) {
      // ?now=<ms since 1970> from the page: the hub's only source of time.
      const char *nq = strstr(r.query, "now=");
      if (nq && gEpochBase == 0) {
        double ms = atof(nq + 4);
        if (ms > 1.6e12) {                  // a sane date (after 2020)
          gEpochBase = ms / 1000.0 - upNow();
          gStateVersion++;
          Serial.printf("[HUB] clock set from %s\n", r.remote.toString().c_str());
        }
      }
      StaticJsonDocument<192> out;
      out["required"] = true;
      out["authenticated"] = sessionValid(r.session);
      out["length"] = strlen(HUB_PASSCODE);
      out["hub"] = true;
      sendJson(c, 200, out);
      return;
    }
    if (post && strcmp(p, "/api/v1/auth/login") == 0) { handleLogin(c, r); return; }
    if (post && strcmp(p, "/api/v1/auth/logout") == 0) {
      sessionDrop(r.session);
      StaticJsonDocument<32> out;
      out["ok"] = true;
      sendJson(c, 200, out, "Set-Cookie: trodes_session=; Max-Age=0; Path=/\r\n");
      return;
    }
  }
  if (get && strcmp(p, "/api/v1/health") == 0) {
    StaticJsonDocument<96> out;
    out["ok"] = true; out["server_time"] = ep(upNow()); out["hub"] = true;
    sendJson(c, 200, out);
    return;
  }
  if (get && strcmp(p, "/api/v1/hub") == 0) {        // diagnostics, no personal data
    StaticJsonDocument<384> out;
    out["uptime_s"] = (uint32_t)upNow();
    out["clock_set"] = gEpochBase != 0;
    out["ap_ssid"] = HUB_AP_SSID;
    out["ap_clients"] = WiFi.softAPgetStationNum();
    out["uplink"] = (bool)gUplinkUp;
    out["uplink_ip"] = gUplinkUp ? WiFi.localIP().toString() : String("");
    out["uplink_ssid"] = gUplinkUp ? WiFi.SSID() : String("");
    out["relay"] = relayConfigured();
    out["relay_ok"] = (uint32_t)gRelayOk;
    out["relay_failed"] = (uint32_t)gRelayFail;
    out["relay_last_code"] = (int)gRelayLastCode;
    if (gRelayLastOkMs) out["relay_last_ok_s_ago"] = (millis() - gRelayLastOkMs) / 1000;
    out["forwarded_ok"] = (uint32_t)gFwdOk;
    out["forward_failed"] = (uint32_t)gFwdFail;
    out["signals"] = stationSignals();
    out["free_heap"] = ESP.getFreeHeap();
    out["min_free_heap"] = ESP.getMinFreeHeap();
    int n = 0;
    for (auto &a : gAlerts) if (a.id) n++;
    out["alerts_stored"] = n;
    sendJson(c, 200, out);
    return;
  }

  if (strncmp(p, "/api/", 5) == 0) {
    if (!sessionValid(r.session)) {
      StaticJsonDocument<64> out;
      out["detail"] = "passcode required";
      sendJson(c, 401, out);
      return;
    }
    if (get && strcmp(p, "/api/v1/summary") == 0) {
      sendResp(c, 200, "application/json", nullptr, 0, "", false, summaryShared());
      gSummaries++;
      return;
    }
    unsigned long id = 0;
    if (post && sscanf(p, "/api/v1/alerts/%lu/ack", &id) == 1) { handleAck(c, r, id); return; }
    StaticJsonDocument<64> out;
    out["detail"] = "Not Found";
    sendJson(c, 404, out);
    return;
  }
  if (get && strcmp(p, "/favicon.ico") == 0) { sendResp(c, 204, "text/plain", (const uint8_t *)"", 0); return; }
  // Anything else - including /generate_204, /hotspot-detect.html and
  // /connecttest.txt asked of the hub's own address - goes to the dashboard.
  if (get) sendRedirect(c, r.local);
  else sendResp(c, 404, "text/plain", (const uint8_t *)"", 0);
}

static void connClose(Conn &k) {
  k.c.stop();
  k.used = false;
  k.sending = false;
  k.head.clear();
  k.head.shrink_to_fit();
  k.shared.reset();
  k.flash = nullptr;
}

static void httpService() {
  // accept: a new connection takes a free slot, else the one that has waited
  // longest without sending a complete request (a browser's idle preconnect)
  for (int n = 0; n < 4; n++) {
    WiFiClient nc = gServer.available();
    if (!nc) break;
    int slot = -1;
    for (int i = 0; i < HUB_CONNS; i++) if (!gConns[i].used) { slot = i; break; }
    if (slot < 0) {                    // full: drop the longest-idle one that is not mid-reply
      for (int i = 0; i < HUB_CONNS; i++)
        if (!gConns[i].sending && (slot < 0 || gConns[i].t0 < gConns[slot].t0)) slot = i;
      if (slot < 0) {
        slot = 0;
        for (int i = 1; i < HUB_CONNS; i++) if (gConns[i].t0 < gConns[slot].t0) slot = i;
      }
      connClose(gConns[slot]);
    }
    Conn &k = gConns[slot];
    k.c = nc;
    k.used = true;
    k.t0 = millis();
    k.len = 0;
    k.hdrEnd = -1;
    k.clen = 0;
  }

  for (auto &k : gConns) {
    if (!k.used) continue;
    if (k.sending) {                   // carry on with the reply, never wait for the phone
      if (pump(k) || millis() - k.sendT0 > HUB_SEND_MAX_MS) connClose(k);
      continue;
    }
    int avail = k.c.available();
    if (avail > 0) {
      size_t room = HUB_REQ_BUF - 1 - k.len;
      if (room == 0) {
        sendResp(k, 413, "text/plain", (const uint8_t *)"", 0);
        if (pump(k)) connClose(k);
        continue;
      }
      int got = k.c.read((uint8_t *)k.buf + k.len, min((size_t)avail, room));
      if (got > 0) k.len += got;
      k.buf[k.len] = 0;
      if (k.hdrEnd < 0) {
        char *e = strstr(k.buf, "\r\n\r\n");
        if (e) {
          k.hdrEnd = (e - k.buf) + 4;
          // Content-Length, case-insensitive, before the headers are cut up
          for (char *h = k.buf; h < e; h++) {
            if ((h == k.buf || h[-1] == '\n') && strncasecmp(h, "Content-Length:", 15) == 0) {
              k.clen = atoi(h + 15);
              break;
            }
          }
        }
      }
    } else if (!k.c.connected()) {
      connClose(k);
      continue;
    }

    if (k.hdrEnd >= 0 && (int)k.len >= k.hdrEnd + k.clen) {
      Req r;
      uint32_t t0 = millis();
      if (parseRequest(k, r)) {
        route(k, r);
        bool quiet = strcmp(r.path, "/api/v1/summary") == 0 || strcmp(r.path, ENDPOINT_STATUS) == 0 ||
                     strcmp(r.path, "/api/v1/auth/status") == 0;
        if (!quiet)
          Serial.printf("[HTTP] %s %s %s%s (%lu ms)\n", r.remote.toString().c_str(), r.method,
                        hostIsHub(r.host) ? "" : r.host, r.path, (unsigned long)(millis() - t0));
      }
      if (!k.sending || pump(k)) connClose(k);   // most replies finish on the first pass
    } else if (millis() - k.t0 > 4000) {
      connClose(k);                      // said nothing (or not enough) for 4 s
    }
  }
}

// =============================================================================
// Wi-Fi: access point + optional uplink to the laptop's network
// =============================================================================
struct Uplink { const char *ssid, *pass; };
static const Uplink kUplinks[] = {
  { WIFI_SSID, WIFI_PASSWORD }, { WIFI2_SSID, WIFI2_PASSWORD }, { WIFI3_SSID, WIFI3_PASSWORD },
};
static bool uplinkConfigured() {
  if (!HUB_UPLINK) return false;
  for (const auto &u : kUplinks) if (u.ssid[0]) return true;
  return false;
}

// Join the first uplink network (in secrets.h order) that is on the air: the
// building Wi-Fi, a pocket router, a phone hotspot. A scan makes the radio
// visit other channels, which briefly interrupts the phones on the hub, so
// the scans back off to one every 5 minutes while none of them is around.
static void uplinkService() {
  if (!uplinkConfigured()) return;
  enum { IDLE, SCANNING, JOINING };
  static int state = IDLE;
  static uint32_t nextTry = 0, backoff = 20000, stepStart = 0;
  static const Uplink *chosen = nullptr;
  bool up = WiFi.status() == WL_CONNECTED;
  if (up) {
    if (!gUplinkUp) {
      gUplinkUp = true;
      backoff = 20000;
      Serial.printf("[HUB] uplink \"%s\" connected, IP %s%s%s\n", WiFi.SSID().c_str(),
                    WiFi.localIP().toString().c_str(), relayConfigured() ? " - pushing to the cloud relay" : "",
                    strlen(BACKEND_BASE_URL) ? " - forwarding to the laptop" : "");
    }
    state = IDLE;
    return;
  }
  if (gUplinkUp) {
    gUplinkUp = false;
    Serial.println(F("[HUB] uplink lost - the hub keeps running on its own"));
    nextTry = millis() + 5000;
  }
  if (state == IDLE) {
    if ((int32_t)(millis() - nextTry) < 0) return;
    WiFi.scanNetworks(true, false, false, 120);   // async: the hub keeps serving
    state = SCANNING;
    stepStart = millis();
    return;
  }
  if (state == SCANNING) {
    int n = WiFi.scanComplete();
    if (n == WIFI_SCAN_RUNNING && millis() - stepStart < 8000) return;
    chosen = nullptr;
    for (const auto &u : kUplinks) {
      if (!u.ssid[0] || chosen) continue;
      for (int i = 0; i < n; i++) if (WiFi.SSID(i) == u.ssid) { chosen = &u; break; }
    }
    WiFi.scanDelete();
    if (!chosen) {
      state = IDLE;
      nextTry = millis() + backoff;
      Serial.printf("[HUB] no uplink network in range - next look in %lu s\n", (unsigned long)(backoff / 1000));
      backoff = min<uint32_t>(backoff * 2, 300000);
      return;
    }
    Serial.printf("[HUB] joining uplink \"%s\" ...\n", chosen->ssid);
    WiFi.begin(chosen->ssid, chosen->pass);
    state = JOINING;
    stepStart = millis();
    return;
  }
  if (millis() - stepStart > 12000) {            // JOINING timed out
    WiFi.disconnect(false, false);
    state = IDLE;
    nextTry = millis() + backoff;
    Serial.printf("[HUB] could not join \"%s\" - next try in %lu s\n", chosen ? chosen->ssid : "?",
                  (unsigned long)(backoff / 1000));
    backoff = min<uint32_t>(backoff * 2, 300000);
  }
}

// Who joins and leaves the hub's network, and which address each one got -
// the first thing to look at when a phone or the wearable "cannot connect".
static void onApEvent(WiFiEvent_t ev, WiFiEventInfo_t info) {
  if (ev == ARDUINO_EVENT_WIFI_AP_STACONNECTED) {
    const uint8_t *m = info.wifi_ap_staconnected.mac;
    Serial.printf("[HUB] joined: %02x:%02x:%02x:%02x:%02x:%02x (%d on the network)\n",
                  m[0], m[1], m[2], m[3], m[4], m[5], WiFi.softAPgetStationNum());
  } else if (ev == ARDUINO_EVENT_WIFI_AP_STADISCONNECTED) {
    const uint8_t *m = info.wifi_ap_stadisconnected.mac;
    Serial.printf("[HUB] left:   %02x:%02x:%02x:%02x:%02x:%02x\n", m[0], m[1], m[2], m[3], m[4], m[5]);
  } else if (ev == ARDUINO_EVENT_WIFI_AP_STAIPASSIGNED) {
    Serial.printf("[HUB] gave address %s\n", IPAddress(info.wifi_ap_staipassigned.ip.addr).toString().c_str());
  }
}

void hubBegin() {
  WiFi.onEvent(onApEvent);
  WiFi.persistent(false);
  WiFi.mode(uplinkConfigured() ? WIFI_AP_STA : WIFI_AP);
  WiFi.setAutoReconnect(false);     // the core's auto-reconnect retries a missing network
                                    // back to back, freezing the hub's own clients
  IPAddress ip(192, 168, 4, 1), mask(255, 255, 255, 0);
  WiFi.softAPConfig(ip, ip, mask);
  bool ok = WiFi.softAP(HUB_AP_SSID, HUB_AP_PASSWORD, HUB_AP_CHANNEL, 0, HUB_MAX_CLIENTS);
  WiFi.softAPsetHostname("sesemsg");
  WiFi.setSleep(false);
  WiFi.setTxPower(HUB_TX_POWER);
  gDns.setErrorReplyCode(DNSReplyCode::NoError);
  gDns.start(53, "*", ip);
  gServer.begin();
  gServer.setNoDelay(true);

  gFwdQ = xQueueCreate(16, sizeof(FwdItem));
  xTaskCreatePinnedToCore(taskForward, "fwd", 6144, nullptr, 1, nullptr, 0);
  if (relayConfigured()) {
    gRelayMux = xSemaphoreCreateMutex();
    gRelayAckQ = xQueueCreate(8, sizeof(RelayAck));
    xTaskCreatePinnedToCore(taskRelay, "relay", 10240, nullptr, 1, &gRelayTask, 0);
  }

  Serial.println(F("----------------------------------------"));
  Serial.printf("[HUB] %s: Wi-Fi \"%s\" at http://%s/  (max %d devices)\n", ok ? "Ready" : "AP FAILED",
                HUB_AP_SSID, ip.toString().c_str(), HUB_MAX_CLIENTS);
  Serial.printf("[HUB] Dashboard page %u bytes (gzipped), passcode %u digits\n",
                (unsigned)HUB_PAGE_GZ_LEN, (unsigned)strlen(HUB_PASSCODE));
  if (uplinkConfigured()) {
    Serial.print(F("[HUB] Uplink networks:"));
    for (const auto &u : kUplinks) if (u.ssid[0]) Serial.printf(" \"%s\"", u.ssid);
    Serial.println();
    Serial.printf("[HUB] Cloud relay: %s\n", relayConfigured() ? RELAY_URL : "off (RELAY_URL / RELAY_KEY not set)");
  } else Serial.println(F("[HUB] Uplink: off (standalone)"));
  Serial.println(F("----------------------------------------"));
}

void hubDoorEvent(const char *json) {
  StaticJsonDocument<384> in;
  StaticJsonDocument<256> out;
  int code = 0;
  if (deserializeJson(in, json)) return;
  ingestDoor(in.as<JsonObject>(), out, code);
  gStateVersion++;
  forward(FWD_DOOR, json);
}

void hubLoop() {
  gDns.processNextRequest();
  httpService();
  uplinkService();
  relayService();
  relayApply();
  watchdog();

  if (gLaptopAckedSos) {             // acknowledged on the laptop dashboard
    gLaptopAckedSos = false;
    gSosAtLaptop = false;
    for (auto &a : gAlerts) {
      if (alertOpen(a) && strcmp(a.type, "sos") == 0) {
        a.ackAt = upNow();
        cpy(a.ackBy, "caregiver (laptop dashboard)");
        gStateVersion++;
        Serial.printf("[HUB] alert #%lu sos acknowledged on the laptop\n", (unsigned long)a.id);
      }
    }
  }

  static uint32_t lastLog = 0;
  if (millis() - lastLog >= 30000) {
    lastLog = millis();
    int active = 0;
    for (auto &a : gAlerts) if (alertActive(a)) active++;
    Serial.printf("[HUB] devices=%d active_alerts=%d page_polls=%lu/30s uplink=%s fwd=%lu/%lu heap=%u clock=%s\n",
                  WiFi.softAPgetStationNum(), active, (unsigned long)gSummaries,
                  gUplinkUp ? "up" : "off", (unsigned long)gFwdOk, (unsigned long)gFwdFail,
                  ESP.getFreeHeap(), gEpochBase ? "set" : "not set");
    if (WiFi.softAPgetStationNum()) Serial.printf("[HUB] signal: %s\n", stationSignals().c_str());
    if (relayConfigured())
      Serial.printf("[HUB] relay: %lu ok / %lu failed, last code %d%s\n", (unsigned long)gRelayOk,
                    (unsigned long)gRelayFail, (int)gRelayLastCode, gUplinkUp ? "" : " (no uplink)");
    gSummaries = 0;
  }
}

#endif  // HUB_MODE
