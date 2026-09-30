// =============================================================================
// TroDes Phase 1 — Wearable
// ESP32-WROOM-32, Arduino framework
// =============================================================================
// What this firmware does:
//   * Continuously scans for TroDes iBeacons and decides which ZONE the
//     resident is in (EMA-smoothed RSSI + hysteresis + confirm ticks).
//   * SOS button: press = raise alert at once, hold 3 s = dismiss false alarm.
//   * Reads heart rate (MAX30102) and battery state of charge (R3/R4 divider
//     on GPIO 34, or the optional MAX17043 gauge when fitted).
//   * Reports status to the caregiver backend over WiFi, with an offline
//     retry queue and a local buzzer/LED fallback when WiFi is down.
//   * Logs everything to Serial regardless of WiFi, so Phase 1 zone-detection
//     testing does not depend on a backend existing yet.
//
// Structure: three FreeRTOS contexts so nothing blocks anything else.
//   loop()      — button, buzzer, sensors, serial, zone classification
//   taskBle     — blocking BLE scan (would otherwise stall the button)
//   taskNetwork — WiFi connect + HTTP POSTs (blocking, up to HTTP_TIMEOUT_MS)
// Shared state is guarded by gStateMux.
//
// Everything tunable is in include/config.h.
// =============================================================================

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

#include <MAX30105.h>
#include <heartRate.h>
#include <SparkFun_MAX1704x_Fuel_Gauge_Arduino_Library.h>

#include "config.h"
#include "zone_table.h"

// =============================================================================
// Shared state
// =============================================================================

static SemaphoreHandle_t gStateMux = nullptr;
#define LOCK()   xSemaphoreTake(gStateMux, portMAX_DELAY)
#define UNLOCK() xSemaphoreGive(gStateMux)

struct BeaconState {
  float    ema      = 0.0f;   // smoothed RSSI, dBm
  bool     hasEma   = false;
  int      lastRaw  = 0;
  uint32_t lastSeen = 0;      // millis()
  uint32_t packets  = 0;
};

static BeaconState gBeacons[kZoneCount];

static int      gCurrentZoneIdx = -1;   // index into kZones, -1 = unknown
static int      gCandidateIdx   = -1;
static uint8_t  gCandidateTicks = 0;

static bool     gSosActive      = false;
// Set by the network task when the dashboard says this wearable's SOS has
// been acknowledged or cleared; sosService() then resets (29 Sep).
static volatile bool gSosAckPending = false;
static volatile bool gSosDelivered  = false;   // the "sos" alert reached the dashboard
static uint8_t       gSosLevel      = 0;       // 1-3: presses in the pattern that raised it
static float    gHeartRateBpm   = 0.0f;
static bool     gHrPresent      = false;
static float    gBatteryPct     = -1.0f;
static float    gBatteryVolts   = -1.0f;
static bool     gGaugePresent   = false;
static bool     gBattFromGauge  = false;   // last reading came from the MAX17043, not the R3/R4 divider
static bool     gWifiUp         = false;

static uint8_t  gUuidBytes[16];

// Diagnostic counters -- how far each advertisement gets through the filter.
// Printed once per status line when DEBUG_BLE_SNIFF is on. Reading them:
//   adv=0        -> the scanner is hearing NOTHING. Radio/scan problem, not a filter problem.
//   adv>0 mfg=0  -> hearing devices, but none carry manufacturer data (no beacons nearby).
//   mfg>0 ib=0   -> manufacturer data present but not iBeacon-shaped. Check the beacon's frame.
//   ib>0 ours=0  -> real iBeacons on air, but UUID or major does not match ours.
//   ours>0       -> packets accepted; any remaining problem is in classification, not reception.
static volatile uint32_t gAdvSeen = 0, gAdvMfg = 0, gAdvIBeacon = 0, gAdvOurs = 0;

// =============================================================================
// Small helpers
// =============================================================================

static int zoneIndexById(uint16_t id) {
  for (size_t i = 0; i < kZoneCount; i++) {
    if (kZones[i].id == id) return (int)i;
  }
  return -1;
}

// Log-distance path-loss model. Serial display only — zone classification
// never uses this, so a wrong exponent cannot break zone detection.
static float estimateDistanceM(float rssi) {
  if (rssi >= 0.0f) return -1.0f;
  return powf(10.0f, (MEASURED_POWER_1M - rssi) / (10.0f * PATH_LOSS_EXPONENT));
}

// "5ca9015e-adc8-40a9-a1e2-d539f3b065bd" -> 16 raw bytes, big-endian as on air.
static bool parseUuid(const char *s, uint8_t out[16]) {
  int n = 0;
  uint8_t hi = 0;
  bool haveHi = false;
  for (const char *p = s; *p; ++p) {
    if (*p == '-') continue;
    uint8_t v;
    if (*p >= '0' && *p <= '9')      v = *p - '0';
    else if (*p >= 'a' && *p <= 'f') v = *p - 'a' + 10;
    else if (*p >= 'A' && *p <= 'F') v = *p - 'A' + 10;
    else return false;
    if (!haveHi) { hi = v; haveHi = true; }
    else {
      if (n >= 16) return false;
      out[n++] = (uint8_t)((hi << 4) | v);
      haveHi = false;
    }
  }
  return (n == 16 && !haveHi);
}

// =============================================================================
// Buzzer — non-blocking pattern player
// =============================================================================

#define BUZZER_LEDC_CHANNEL 0

struct BuzzPattern {
  uint16_t freqHz;
  uint16_t onMs;
  uint16_t offMs;
  uint8_t  beeps;      // 0 = silence / stop
};

static BuzzPattern gPattern   = {0, 0, 0, 0};
static uint8_t     gBeepsLeft = 0;
static bool        gBeepOn    = false;
static uint32_t    gBeepAt    = 0;

static void buzzerInit() {
  ledcSetup(BUZZER_LEDC_CHANNEL, 2700, 10);
  ledcAttachPin(PIN_BUZZER, BUZZER_LEDC_CHANNEL);
  ledcWrite(BUZZER_LEDC_CHANNEL, 0);
}

static void buzzerPlay(const BuzzPattern &p) {
  gPattern   = p;
  gBeepsLeft = p.beeps;
  gBeepOn    = false;
  gBeepAt    = 0;   // fire immediately on next service call
}

static void buzzerStop() {
  gBeepsLeft = 0;
  gBeepOn    = false;
  ledcWrite(BUZZER_LEDC_CHANNEL, 0);
}

static void buzzerService() {
  if (gBeepsLeft == 0 && !gBeepOn) return;
  uint32_t now = millis();
  if (gBeepAt != 0 && now < gBeepAt) return;

  if (!gBeepOn) {
    if (gBeepsLeft == 0) { buzzerStop(); return; }
    ledcWriteTone(BUZZER_LEDC_CHANNEL, gPattern.freqHz);
    gBeepOn = true;
    gBeepAt = now + gPattern.onMs;
  } else {
    ledcWrite(BUZZER_LEDC_CHANNEL, 0);
    gBeepOn = false;
    if (gBeepsLeft > 0) gBeepsLeft--;
    gBeepAt = now + gPattern.offMs;
  }
}

// Distinct, learnable patterns — the user manual documents these.
static const BuzzPattern kBeepBoot        = {2700,  80,  80, 2};
static const BuzzPattern kBeepSosSent     = {2700, 150, 100, 3};
static const BuzzPattern kBeepPress       = {2700,  40,  40, 1};   // each press, at once
static const BuzzPattern kBeepSos1        = {2700, 150, 100, 1};   // pattern sent: one beep
static const BuzzPattern kBeepSos2        = {2700, 150, 100, 2};   // ... per press in it
static const BuzzPattern kBeepSos3        = {2700, 150, 100, 3};
static const BuzzPattern kBeepSosDismiss  = {1500, 400, 150, 1};
static const BuzzPattern kBeepRestricted  = {3200, 120,  80, 4};
static const BuzzPattern kBeepBatteryLow  = {2000, 250, 250, 2};
static const BuzzPattern kBeepOffline     = {1800,  60, 120, 2};

// =============================================================================
// Offline event queue
// =============================================================================

struct QueuedEvent {
  char     path[32];
  char     body[320];
  uint32_t at;          // millis() when raised: the log reports delivery time (Chapter 4 latency)
};

static QueuedEvent gQueue[OFFLINE_QUEUE_DEPTH];
static uint8_t     gQHead = 0, gQTail = 0, gQCount = 0;
static uint32_t    gQDropped = 0;

static void queuePush(const char *path, const char *body) {
  LOCK();
  if (gQCount == OFFLINE_QUEUE_DEPTH) {
    // Oldest-out. A stale status line matters less than the newest one.
    gQHead = (gQHead + 1) % OFFLINE_QUEUE_DEPTH;
    gQCount--;
    gQDropped++;
  }
  strncpy(gQueue[gQTail].path, path, sizeof(gQueue[gQTail].path) - 1);
  gQueue[gQTail].path[sizeof(gQueue[gQTail].path) - 1] = '\0';
  strncpy(gQueue[gQTail].body, body, sizeof(gQueue[gQTail].body) - 1);
  gQueue[gQTail].body[sizeof(gQueue[gQTail].body) - 1] = '\0';
  gQueue[gQTail].at = millis();
  gQTail = (gQTail + 1) % OFFLINE_QUEUE_DEPTH;
  gQCount++;
  UNLOCK();
}

static bool queuePeek(QueuedEvent &out) {
  bool ok = false;
  LOCK();
  if (gQCount > 0) { out = gQueue[gQHead]; ok = true; }
  UNLOCK();
  return ok;
}

static void queuePop() {
  LOCK();
  if (gQCount > 0) { gQHead = (gQHead + 1) % OFFLINE_QUEUE_DEPTH; gQCount--; }
  UNLOCK();
}

// =============================================================================
// Payload builders
// =============================================================================

static void buildStatusJson(char *buf, size_t len) {
  StaticJsonDocument<384> doc;

  LOCK();
  int   zi   = gCurrentZoneIdx;
  float rssi = (zi >= 0 && gBeacons[zi].hasEma) ? gBeacons[zi].ema : 0.0f;
  doc["device_id"]  = DEVICE_ID;
  doc["zone_id"]    = (zi >= 0) ? kZones[zi].id : 0;
  doc["zone"]       = (zi >= 0) ? kZones[zi].name : "unknown";
  doc["restricted"] = (zi >= 0) ? kZones[zi].restricted : false;
  doc["rssi"]       = (int)roundf(rssi);
  doc["distance_m"] = (zi >= 0) ? roundf(estimateDistanceM(rssi) * 100) / 100 : -1;
  doc["hr_bpm"]     = (gHrPresent && gHeartRateBpm > 0) ? (int)roundf(gHeartRateBpm) : -1;   // 0 = no finger
  doc["batt_pct"]   = (int)roundf(gBatteryPct);
  doc["batt_v"]     = roundf(gBatteryVolts * 100) / 100;
  doc["batt_src"]   = gBattFromGauge ? "gauge" : "adc";
  doc["sos"]        = gSosActive;
  UNLOCK();

  doc["uptime_s"] = millis() / 1000UL;
  serializeJson(doc, buf, len);
}

static void buildAlertJson(char *buf, size_t len, const char *type,
                           const char *detail, int level = 0) {
  StaticJsonDocument<320> doc;
  LOCK();
  int zi = gCurrentZoneIdx;
  doc["device_id"] = DEVICE_ID;
  doc["type"]      = type;
  doc["detail"]    = detail;
  if (level > 0) doc["level"] = level;           // SOS urgency, 1-3 presses
  doc["zone"]      = (zi >= 0) ? kZones[zi].name : "unknown";
  doc["zone_id"]   = (zi >= 0) ? kZones[zi].id : 0;
  doc["batt_pct"]  = (int)roundf(gBatteryPct);
  doc["hr_bpm"]    = (gHrPresent && gHeartRateBpm > 0) ? (int)roundf(gHeartRateBpm) : -1;    // 0 = no finger
  UNLOCK();
  doc["uptime_s"] = millis() / 1000UL;
  serializeJson(doc, buf, len);
}

static void raiseAlert(const char *type, const char *detail, int level = 0) {
  char body[320];
  buildAlertJson(body, sizeof(body), type, detail, level);
  Serial.printf("[ALERT] %s\n", body);
  queuePush(ENDPOINT_ALERT, body);
}

// =============================================================================
// BLE scanning  (own task — BLEScan::start() blocks)
// =============================================================================

class BeaconCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice dev) override {
    gAdvSeen++;
    if (!dev.haveManufacturerData()) return;
    gAdvMfg++;

    std::string md = dev.getManufacturerData();
    const uint8_t *p = (const uint8_t *)md.data();

    // A well-formed iBeacon manufacturer block is exactly 25 bytes:
    //   4C 00 | 02 15 | 16-byte UUID | major(2) | minor(2) | txPower(1)
    bool ibShape = (md.length() == 25 && p[0] == 0x4C && p[1] == 0x00 &&
                    p[2] == 0x02 && p[3] == 0x15);

#if DEBUG_BLE_SNIFF
    // Dump what is actually on the air, throttled so a busy room cannot flood
    // the serial link. This is the line that settles "is the beacon wrong, or
    // is the filter wrong" -- compare the printed UUID bytes against the ones
    // echoed at boot.
    {
      static uint32_t lastSniff = 0;
      if (millis() - lastSniff >= 300) {
        lastSniff = millis();
        char hex[96];
        size_t n = md.length() < 25 ? md.length() : 25;
        size_t o = 0;
        for (size_t i = 0; i < n && o + 3 < sizeof(hex); i++)
          o += snprintf(hex + o, sizeof(hex) - o, "%02X ", p[i]);
        hex[o] = '\0';
        Serial.printf("[SNIFF] rssi=%4d len=%2u %s%s\n",
                      dev.getRSSI(), (unsigned)md.length(), hex,
                      ibShape ? "<-- iBeacon shape" : "");
      }
    }
#endif

    if (!ibShape) return;
    gAdvIBeacon++;

    if (memcmp(p + 4, gUuidBytes, 16) != 0) {
#if DEBUG_BLE_SNIFF
      static uint32_t lastMiss = 0;
      if (millis() - lastMiss >= 3000) {
        lastMiss = millis();
        Serial.println(F("[SNIFF] iBeacon on air, but its UUID is not ours."));
      }
#endif
      return;
    }

    uint16_t major = ((uint16_t)p[20] << 8) | p[21];
    uint16_t minor = ((uint16_t)p[22] << 8) | p[23];
    if (major != BEACON_MAJOR) {
#if DEBUG_BLE_SNIFF
      Serial.printf("[SNIFF] UUID matches but major=%u, expected %d\n",
                    major, BEACON_MAJOR);
#endif
      return;
    }
    gAdvOurs++;

    int idx = zoneIndexById(minor);
    if (idx < 0) return;                        // unknown zone id — ignore

    int rssi = dev.getRSSI();

    LOCK();
    BeaconState &b = gBeacons[idx];
    if (!b.hasEma) { b.ema = (float)rssi; b.hasEma = true; }
    else           { b.ema = RSSI_EMA_ALPHA * rssi + (1.0f - RSSI_EMA_ALPHA) * b.ema; }
    b.lastRaw  = rssi;
    b.lastSeen = millis();
    b.packets++;
    UNLOCK();
  }
};

static void taskBle(void *arg) {
  BLEDevice::init("");
  BLEScan *scan = BLEDevice::getScan();
  scan->setAdvertisedDeviceCallbacks(new BeaconCallbacks(), /*wantDuplicates=*/true);
  // Active scan also pulls each beacon's scan response (its readable name),
  // which costs transmit current; zone detection never needs it. POWER_PROFILE
  // 1 turns it off.
  scan->setActiveScan(SCAN_ACTIVE);
  scan->setInterval(SCAN_INTERVAL);
  scan->setWindow(SCAN_WINDOW);

  Serial.println(F("[BLE] Scanner running."));

  for (;;) {
    scan->start(2, false);     // blocking, 2 s
    scan->clearResults();      // free the result heap; callbacks already ran
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// -----------------------------------------------------------------------------
// Zone classification — one pass, called every SCAN_TICK_MS from loop()
// -----------------------------------------------------------------------------
static void classifyZone() {
  uint32_t now = millis();

  int   bestIdx  = -1;
  float bestRssi = -999.0f;

  LOCK();
  for (size_t i = 0; i < kZoneCount; i++) {
    BeaconState &b = gBeacons[i];
    if (!b.hasEma) continue;
    if (now - b.lastSeen > BEACON_STALE_MS) { b.hasEma = false; continue; }
    if (b.ema < RSSI_FLOOR_DBM) continue;
    if (b.ema > bestRssi) { bestRssi = b.ema; bestIdx = (int)i; }
  }

  int   curIdx  = gCurrentZoneIdx;
  float curRssi = (curIdx >= 0 && gBeacons[curIdx].hasEma &&
                   (now - gBeacons[curIdx].lastSeen <= BEACON_STALE_MS))
                      ? gBeacons[curIdx].ema
                      : -999.0f;
  UNLOCK();

  int newIdx = curIdx;

  if (bestIdx < 0) {
    // Nothing in range at all — only give up after the confirm window, so a
    // couple of missed advertising packets do not blank the dashboard.
    if (curIdx >= 0) {
      if (++gCandidateTicks >= CONFIRM_TICKS) { newIdx = -1; gCandidateTicks = 0; }
    }
    gCandidateIdx = -1;
  } else if (curIdx < 0) {
    // First fix — take it immediately, but in proximity mode only once the
    // wearable is actually close to a beacon.
    if (bestRssi >= ZONE_ENTRY_DBM) newIdx = bestIdx;
    gCandidateIdx = -1;
    gCandidateTicks = 0;
  } else if (bestIdx == curIdx) {
    gCandidateIdx = -1;                     // incumbent still strongest
    gCandidateTicks = 0;
  } else {
    // A challenger must beat the incumbent by HYSTERESIS_DB, and keep doing so
    // for several consecutive ticks, before the zone actually changes. How many
    // depends on how clearly it leads: a clear move (>= FAST_LEAD_DB, or the
    // old beacon gone) is taken in CONFIRM_TICKS_FAST ticks; a close call
    // between two similar beacons needs CONFIRM_TICKS_SLOW, which is what
    // stops the dashboard jumping between two rooms when people walk past.
    // In proximity mode it must also be above ZONE_ENTRY_DBM, so walking
    // across a shared room keeps the last zone until the next beacon is close.
    float lead = bestRssi - curRssi;
    if (lead > HYSTERESIS_DB && bestRssi >= ZONE_ENTRY_DBM) {
      int need = (lead >= FAST_LEAD_DB) ? CONFIRM_TICKS_FAST : CONFIRM_TICKS_SLOW;
      if (bestIdx == gCandidateIdx) {
        if (++gCandidateTicks >= need) {
          newIdx = bestIdx;
          gCandidateIdx = -1;
          gCandidateTicks = 0;
        }
      } else {
        gCandidateIdx = bestIdx;
        gCandidateTicks = 1;
      }
    } else {
      gCandidateIdx = -1;
      gCandidateTicks = 0;
    }
  }

  if (newIdx != curIdx) {
    LOCK();
    gCurrentZoneIdx = newIdx;
    UNLOCK();

    if (newIdx < 0) {
      Serial.println(F("[ZONE] -> unknown (no beacon in range)"));
      raiseAlert("zone_lost", "no beacon in range");
    } else {
      Serial.printf("[ZONE] -> %s (id=%u, rssi=%.1f dBm, ~%.1f m)%s\n",
                    kZones[newIdx].name, kZones[newIdx].id, bestRssi,
                    estimateDistanceM(bestRssi),
                    kZones[newIdx].restricted ? "  *** RESTRICTED ***" : "");
      if (kZones[newIdx].restricted) {
        buzzerPlay(kBeepRestricted);
        raiseAlert("zone_restricted", kZones[newIdx].name);
      } else {
        raiseAlert("zone_change", kZones[newIdx].name);
      }
    }
  }
}

// =============================================================================
// SOS button
// =============================================================================

static bool     gBtnStable   = HIGH;     // INPUT_PULLUP: HIGH = released
static bool     gBtnLastRead = HIGH;
static uint32_t gBtnChangeAt = 0;
static uint32_t gBtnPressAt  = 0;
static bool     gLongHandled = false;
static uint8_t  gPatCount    = 0;        // presses in the pattern being entered
static uint32_t gPatLastEdge = 0;        // last press or release of that pattern

static void sosService() {
  uint32_t now  = millis();

  if (gSosAckPending) {                 // a caregiver acknowledged it on the dashboard
    gSosAckPending = false;
    gSosDelivered  = false;
    bool was;
    LOCK(); was = gSosActive; gSosActive = false; gSosLevel = 0; UNLOCK();
    if (was) {
      buzzerPlay(kBeepSosDismiss);
      Serial.println(F("[SOS] Acknowledged by a caregiver -> SOS cleared"));
    }
  }
  bool     read = digitalRead(PIN_SOS_BUTTON);

  if (read != gBtnLastRead) { gBtnLastRead = read; gBtnChangeAt = now; }

  if ((now - gBtnChangeAt) >= BUTTON_DEBOUNCE_MS && read != gBtnStable) {
    gBtnStable = read;
    if (gBtnStable == LOW) {            // pressed
      gBtnPressAt  = now;
      gLongHandled = false;
      // Every press is heard at once (short tick). The presses are counted,
      // and the alert goes out when the pattern ends (below), so 1, 2 or 3
      // quick presses can say how urgent it is.
      if (gPatCount < 3) gPatCount++;
      gPatLastEdge = now;
      buzzerPlay(kBeepPress);
      Serial.printf("[SOS] Press %u\n", gPatCount);
    } else {
      gPatLastEdge = now;               // released: the gap timer starts here
    }
  }

  // PATTERN COMPLETE: no press for SOS_PATTERN_GAP_MS after the last release.
  // Nothing active yet -> raise it. Already active -> a stronger pattern
  // escalates it (new alert; the server retires the weaker one); the same or a
  // weaker one only repeats the tone, so nothing is sent twice.
  if (gPatCount && gBtnStable == HIGH && now - gPatLastEdge >= SOS_PATTERN_GAP_MS) {
    uint8_t level = gPatCount;
    gPatCount = 0;
    bool was;
    uint8_t prev;
    LOCK(); was = gSosActive; prev = gSosLevel; UNLOCK();
    if (!was || level > prev) {
      const char *msg = level >= 3 ? SOS_MSG_3 : level == 2 ? SOS_MSG_2 : SOS_MSG_1;
      LOCK(); gSosActive = true; gSosLevel = level; UNLOCK();
      gSosDelivered = false;
      buzzerPlay(level >= 3 ? kBeepSos3 : level == 2 ? kBeepSos2 : kBeepSos1);
      Serial.printf("[SOS] %u press%s -> %s: %s\n", level, level > 1 ? "es" : "",
                    was ? "ESCALATED" : "ALERT RAISED", msg);
      raiseAlert("sos", msg, level);
    } else {
      buzzerPlay(kBeepSos1);
      Serial.printf("[SOS] %u press%s -> an SOS at this level is already active\n", level, level > 1 ? "es" : "");
    }
  }

  // LONG PRESS = dismiss a false alarm. Fires while still held, so the
  // resident gets the confirmation tone at the moment the threshold is met
  // rather than having to guess when to let go.
  if (gBtnStable == LOW && !gLongHandled &&
      (now - gBtnPressAt) >= SOS_LONG_PRESS_MS) {
    gLongHandled = true;
    gPatCount = 0;                      // the hold is a dismiss, not a press
    bool was;
    LOCK(); was = gSosActive; gSosActive = false; gSosLevel = 0; UNLOCK();
    gSosDelivered = false;
    buzzerPlay(kBeepSosDismiss);
    Serial.printf("[SOS] Long press (%d ms) -> %s\n", SOS_LONG_PRESS_MS,
                  was ? "ALERT DISMISSED" : "no active alert, dismiss noted");
    raiseAlert("sos_dismissed", "button long press");
  }
}

// =============================================================================
// Status LED — lit with every beep, held on while an SOS is active, and a
// short heartbeat blink otherwise so a glance shows the wearable is running.
// =============================================================================

static void ledService() {
  bool sos;
  LOCK(); sos = gSosActive; UNLOCK();
  bool heartbeat = (millis() % LED_HEARTBEAT_PERIOD_MS) < LED_HEARTBEAT_ON_MS;
  digitalWrite(PIN_STATUS_LED, (gBeepOn || sos || heartbeat) ? HIGH : LOW);
}

// =============================================================================
// Sensors
// =============================================================================

static MAX30105  gHrSensor;
static SFE_MAX1704X gGauge(MAX1704X_MAX17043);   // U3 on the Rev B/C schematic

// The MAX17043 is powered from the Li-Po on its own JST lead, not from 3V3, so
// it only answers on I2C while a cell is connected. It is probed again on every
// battery read while missing (cell plugged in after boot), and the R3/R4
// divider takes over whenever it stops answering or reads nonsense.
static bool gaugeProbe() {
  Wire1.beginTransmission(FG_I2C_ADDR);               // plain address check first, so an
  if (Wire1.endTransmission() != 0) return false;     // absent gauge does not spam Wire errors
  if (!gGauge.begin(Wire1)) return false;
  gGauge.quickStart();                                // fresh SOC estimate from the resting voltage
  return true;
}

static bool gaugeRead(float &volts, float &pct) {
  Wire1.beginTransmission(FG_I2C_ADDR);
  if (Wire1.endTransmission() != 0) return false;     // cell unplugged, or the gauge lost
  volts = gGauge.getVoltage();
  pct   = gGauge.getSOC();
  if (volts < BATTERY_ABSENT_V || volts > 4.5f) return false;   // not a real cell reading
  pct = constrain(pct, 0.0f, 100.0f);                 // SOC reads a little over 100 % when full
  return true;
}

// Heart rate (29 Sep rewrite, for accuracy):
//   * every FIFO sample is processed, at a steady 100 samples/s (the old code
//     read only the newest sample every 20 ms and skipped the rest, so the beat
//     detector missed beats);
//   * beat times come from the sample count (10 ms each), not from millis();
//   * only 40-180 bpm intervals count, and once there are 3, a beat more than
//     25 % away from the running median is rejected (motion, a slipping finger);
//   * the reported value is the MEDIAN of the last 8 good intervals, and only
//     after the finger has been steady for HR_SETTLE_MS with >= 4 good beats;
//   * everything resets when the finger comes off, so an old value never
//     carries over.
#define HR_SAMPLE_MS      10           // 400 sps / 4-sample average = 100 sps
#define HR_FINGER_IR      50000        // IR below this = nothing on the sensor
#define HR_SETTLE_MS      1500         // ignore beats while the finger settles
#define HR_MIN_BEATS      4            // good intervals needed before reporting
#define HR_BUF            8
static uint16_t gHrIv[HR_BUF];         // last good beat-to-beat intervals, ms
static uint8_t  gHrIvCount = 0, gHrIvHead = 0, gHrRejects = 0;
static uint32_t gHrSampleIdx = 0, gHrLastBeatIdx = 0, gHrFingerSince = 0;
static bool     gHrFinger = false;
static uint32_t gHrLastIr = 0, gHrBeatsSeen = 0;   // for the "[HR] finger" serial line

static uint16_t hrMedian() {
  uint16_t t[HR_BUF];
  for (uint8_t i = 0; i < gHrIvCount; i++) t[i] = gHrIv[i];
  for (uint8_t i = 1; i < gHrIvCount; i++)            // insertion sort, n <= 8
    for (uint8_t j = i; j > 0 && t[j - 1] > t[j]; j--) { uint16_t x = t[j]; t[j] = t[j - 1]; t[j - 1] = x; }
  return t[gHrIvCount / 2];
}

static void hrReset() {
  gHrIvCount = gHrIvHead = gHrRejects = 0;
  gHrLastBeatIdx = 0;
  gHrBeatsSeen = 0;
  LOCK(); gHeartRateBpm = 0.0f; UNLOCK();             // 0 -> sent as -1 ("no reading")
}

static void sensorsInit() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);

#if HR_ENABLED
  if (gHrSensor.begin(Wire, I2C_SPEED_FAST)) {
    // IR carries the pulse: 400 sps averaged x4 = 100 sps, 411 us pulses (18-bit),
    // 4096 nA range - the MAX30102 datasheet's settings for fingertip PPG.
    gHrSensor.setup(0x24, 4, 2, 400, 411, 4096);   // brightness ~7 mA, avg 4, Red+IR
    gHrSensor.setPulseAmplitudeRed(0x0A); // dim red LED = "alive" indicator
    gHrSensor.setPulseAmplitudeGreen(0);  // MAX30102 has no green LED
    gHrPresent = true;
    Serial.println(F("[HR] MAX30102 found."));
  } else {
    gHrPresent = false;
    Serial.println(F("[HR] MAX30102 NOT found - heart rate disabled."));
  }
#endif

  // The divider ADC is always set up: it is the fallback whenever the gauge is
  // missing or drops out.
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_BATTERY_ADC, ADC_11db);

  Wire1.begin(PIN_FG_SDA, PIN_FG_SCL);   // fuel gauge on its own bus (Rev C2)
  gGaugePresent = gaugeProbe();
  if (gGaugePresent) {
    Serial.println(F("[BATT] MAX17043 found - using the fuel gauge."));
  } else {
    Serial.println(F("[BATT] MAX17043 not answering - using the ADC divider on GPIO 34."));
    Serial.println(F("       (It needs the battery on its JST lead; checked again every 30 s.)"));
  }
}

static void hrService() {
#if HR_ENABLED
  if (!gHrPresent) return;

  gHrSensor.check();                                   // pull new samples into the FIFO buffer
  while (gHrSensor.available()) {
    uint32_t ir = gHrSensor.getFIFOIR();
    gHrSensor.nextSample();
    gHrSampleIdx++;
    uint32_t tMs = gHrSampleIdx * HR_SAMPLE_MS;

    if (ir < HR_FINGER_IR) {                           // no finger (or it lifted)
      if (gHrFinger) { gHrFinger = false; hrReset(); }
      continue;
    }
    if (!gHrFinger) { gHrFinger = true; gHrFingerSince = tMs; hrReset(); }

    // SparkFun's checkForBeat() is written for 16-bit samples: its DC estimator
    // takes a uint16_t and a beat only counts if the pulse swing is 20-1000.
    // This sensor is set to 18 bits (411 us pulses), so a finger reads ~100k-250k:
    // the value wrapped at 65536 and strong pulses swung past 1000, and beats
    // were never detected (30 Sep: no heart rate at all). >> 2 brings the full
    // 18-bit range into 16 bits and a normal pulse into the 20-1000 window.
    gHrLastIr = ir;
    if (!checkForBeat((long)(ir >> 2))) continue;
    gHrBeatsSeen++;
    if (tMs - gHrFingerSince < HR_SETTLE_MS) { gHrLastBeatIdx = gHrSampleIdx; continue; }
    if (gHrLastBeatIdx == 0) { gHrLastBeatIdx = gHrSampleIdx; continue; }

    uint32_t iv = (gHrSampleIdx - gHrLastBeatIdx) * HR_SAMPLE_MS;
    gHrLastBeatIdx = gHrSampleIdx;
    if (iv < 333 || iv > 1500) continue;               // outside 40-180 bpm: not a real beat

    if (gHrIvCount >= 3) {                             // reject outliers vs the running median
      uint16_t med = hrMedian();
      if (iv < med * 0.75f || iv > med * 1.25f) {
        if (++gHrRejects >= 4) { gHrIvCount = gHrIvHead = 0; gHrRejects = 0; }  // rhythm really changed: re-learn
        continue;
      }
    }
    gHrRejects = 0;
    gHrIv[gHrIvHead] = (uint16_t)iv;
    gHrIvHead = (gHrIvHead + 1) % HR_BUF;
    if (gHrIvCount < HR_BUF) gHrIvCount++;

    if (gHrIvCount >= HR_MIN_BEATS) {
      float bpm = 60000.0f / hrMedian();
      LOCK(); gHeartRateBpm = bpm; UNLOCK();
    }
  }

  // While a finger is on: one line every 2 s, so a failed reading can be
  // diagnosed on the spot (IR level, beats the detector saw, beats kept).
  static uint32_t lastHrLog = 0;
  if (gHrFinger && millis() - lastHrLog >= 2000) {
    lastHrLog = millis();
    float bpm;
    LOCK(); bpm = gHeartRateBpm; UNLOCK();
    Serial.printf("[HR] finger: IR %lu, beats seen %lu, kept %u of %d needed, bpm %.0f\n",
                  (unsigned long)gHrLastIr, (unsigned long)gHrBeatsSeen, gHrIvCount, HR_MIN_BEATS, bpm);
  }
#endif
}

// Typical single-cell Li-Po resting voltage vs state of charge. A generic
// curve, not measured on this cell — voltage-based SOC is approximate, and
// reads high while charging and low under a WiFi burst.
struct LipoPoint { float volts; float pct; };
static const LipoPoint kLipoCurve[] = {
    {3.30f,   0}, {3.45f,   5}, {3.68f,  10}, {3.74f,  20}, {3.77f,  30},
    {3.79f,  40}, {3.82f,  50}, {3.87f,  60}, {3.92f,  70}, {3.98f,  80},
    {4.06f,  90}, {4.20f, 100},
};

static float lipoPercent(float volts) {
  const size_t n = sizeof(kLipoCurve) / sizeof(kLipoCurve[0]);
  if (volts <= kLipoCurve[0].volts)     return 0.0f;
  if (volts >= kLipoCurve[n - 1].volts) return 100.0f;
  for (size_t i = 1; i < n; i++) {
    if (volts <= kLipoCurve[i].volts) {
      const LipoPoint &a = kLipoCurve[i - 1], &b = kLipoCurve[i];
      return a.pct + (volts - a.volts) * (b.pct - a.pct) / (b.volts - a.volts);
    }
  }
  return 100.0f;
}

static void batteryService() {
  float pct = 0.0f, volts = 0.0f;

  // A gauge found just now has only been quick-started: its SOC needs a moment
  // to settle, so this read still uses the divider and the gauge takes over on
  // the next one. Reading it at once could raise a false "battery critical".
  bool justFound = false;
  if (!gGaugePresent && gaugeProbe()) {
    gGaugePresent = justFound = true;
    Serial.println(F("[BATT] MAX17043 found - switching to the fuel gauge."));
  }
  bool fromGauge = gGaugePresent && !justFound && gaugeRead(volts, pct);
  if (gGaugePresent && !justFound && !fromGauge) {
    gGaugePresent = false;
    Serial.println(F("[BATT] MAX17043 stopped answering - back to the ADC divider."));
  }

  if (!fromGauge) {
    // R3/R4 divider — the primary battery source on Rev B/C. analogReadMilliVolts
    // applies the chip's factory ADC calibration, which a raw count / 4095 does
    // not; averaging takes out the ESP32 ADC's sample-to-sample noise.
    uint32_t mvSum = 0;
    for (int i = 0; i < BATTERY_ADC_SAMPLES; i++) mvSum += analogReadMilliVolts(PIN_BATTERY_ADC);
    volts = (mvSum / (float)BATTERY_ADC_SAMPLES) / 1000.0f * BATTERY_DIVIDER_RATIO;
    pct   = lipoPercent(volts);
  }

  static bool lowSent = false, critSent = false;

  // No cell connected - running from USB or a power bank. The divider then
  // reads ~0.3 V, which would show as 0 % and raise false battery alerts.
  // A Li-Po never runs the board below ~2.5 V (the DW01 cuts it off first),
  // so report "no battery" (-1: the dashboard shows a dash) and raise nothing.
  if (volts < BATTERY_ABSENT_V) {
    LOCK(); gBatteryPct = -1.0f; gBatteryVolts = volts; gBattFromGauge = false; UNLOCK();
    lowSent = critSent = false;
    return;
  }

  LOCK(); gBatteryPct = pct; gBatteryVolts = volts; gBattFromGauge = fromGauge; UNLOCK();

  if (pct <= BATTERY_CRITICAL_PCT && !critSent) {
    critSent = true;
    buzzerPlay(kBeepBatteryLow);
    raiseAlert("battery_critical", "SOC at or below critical threshold");
  } else if (pct <= BATTERY_LOW_PCT && !lowSent) {
    lowSent = true;
    buzzerPlay(kBeepBatteryLow);
    raiseAlert("battery_low", "SOC at or below low threshold");
  } else if (pct > BATTERY_LOW_PCT + 5.0f) {
    lowSent = critSent = false;    // re-arm after charging, with 5% deadband
  }
}

// =============================================================================
// Networking  (own task — WiFi.begin() and HTTP POSTs block)
// =============================================================================

// Where reports go: the SESEMSG hub when the wearable joined its network,
// otherwise the laptop. Set by pickNetwork(); only the network task uses it.
static const char *gBackendUrl   = BACKEND_BASE_URL;
static bool        gOnHub        = false;
static uint8_t     gPostFailRun  = 0;

static bool httpPost(const char *path, const char *body, String *reply = nullptr) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String url = String(gBackendUrl) + path;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(url)) return false;
  http.addHeader("Content-Type", "application/json");
  int code = http.POST((uint8_t *)body, strlen(body));
  if (reply && code > 0 && code < 400) *reply = http.getString();
  http.end();

  if (code > 0 && code < 400) { gPostFailRun = 0; return true; }
  if (gPostFailRun < 255) gPostFailRun++;
  Serial.printf("[NET] POST %s failed (code %d)\n", path, code);
  return false;
}

// True if the hub's network is on the air. A scan takes about 2 s, during
// which BLE scanning carries on (the radio is shared, zone updates just slow).
static bool hubInRange() {
  if (strlen(HUB_SSID) == 0) return false;
  // A scan fails while a connection attempt is running (30 Sep: the wearable
  // kept retrying a network that was not there and never saw the hub come
  // back). Stop any attempt first, and try the scan twice.
  if (WiFi.status() != WL_CONNECTED) { WiFi.disconnect(); vTaskDelay(pdMS_TO_TICKS(100)); }
  int n = WiFi.scanNetworks(false, false, false, 120);
  if (n < 0) { vTaskDelay(pdMS_TO_TICKS(300)); n = WiFi.scanNetworks(false, false, false, 120); }
  bool found = false;
  for (int i = 0; i < n && !found; i++) found = (WiFi.SSID(i) == HUB_SSID);
  WiFi.scanDelete();
  return found;
}

// The hub wins when it is in range: it is what the defense runs on, and it
// forwards to the laptop by itself when the laptop is around. Otherwise the
// building Wi-Fi and the laptop, as before.
static void pickNetwork(const char *&ssid, const char *&pass) {
  bool hub = hubInRange() || strlen(WIFI_SSID) == 0;
  gOnHub      = hub;
  ssid        = hub ? HUB_SSID : WIFI_SSID;
  pass        = hub ? HUB_PASSWORD : WIFI_PASSWORD;
  gBackendUrl = hub ? HUB_BASE_URL : BACKEND_BASE_URL;
}

// The dashboard answers every status with "sos_open": how many of this
// wearable's SOS alerts are still waiting for a caregiver. Once our SOS has
// reached it and none is open any more (acknowledged on the dashboard, or
// cleared), the wearable leaves SOS mode: LED back to the heartbeat blink,
// and the next press raises a NEW alert. Before this, SOS mode only ended with
// a 3 s hold, so the LED stayed lit and later presses sent nothing.
static void handleStatusReply(const String &reply) {
  StaticJsonDocument<192> r;
  if (deserializeJson(r, reply) || !r.containsKey("sos_open")) return;   // older dashboard: ignore
  int open = r["sos_open"] | -1;
  bool active;
  LOCK(); active = gSosActive; UNLOCK();
  if (active && gSosDelivered && open == 0) gSosAckPending = true;
}

// "Up" means an IP address, not just the WiFi status: right after a
// disconnect() the status still reads WL_CONNECTED for a moment, and reports
// sent then fail with "host unreachable" (seen 29 Sep while moving to the hub).
static bool linkUp() {
  return WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress((uint32_t)0);
}

// Drop the link and wait until the stack agrees it is down (max 1 s).
static void linkDrop() {
  WiFi.disconnect();
  uint32_t t0 = millis();
  while (WiFi.status() == WL_CONNECTED && millis() - t0 < 1000) vTaskDelay(pdMS_TO_TICKS(50));
}

// One line per WiFi event, so a failed connection says why.
static void onWifiEvent(WiFiEvent_t ev, WiFiEventInfo_t info) {
  if (ev == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    Serial.printf("[NET] got IP %s (gateway %s)\n", IPAddress(info.got_ip.ip_info.ip.addr).toString().c_str(),
                  IPAddress(info.got_ip.ip_info.gw.addr).toString().c_str());
  } else if (ev == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    Serial.printf("[NET] WiFi dropped, reason %u\n", info.wifi_sta_disconnected.reason);
  } else if (ev == ARDUINO_EVENT_WIFI_STA_LOST_IP) {
    Serial.println(F("[NET] lost IP address"));
  }
}

static void taskNetwork(void *arg) {
  WiFi.onEvent(onWifiEvent);
  // Reconnection is this task's job (every WIFI_RETRY_PERIOD_MS, choosing the
  // network each time). The core's own auto-reconnect retried a missing
  // network back to back and blocked the scan that would find the hub.
  WiFi.setAutoReconnect(false);
  const bool wifiConfigured = (strlen(WIFI_SSID) > 0) || (strlen(HUB_SSID) > 0);

  if (!wifiConfigured) {
    Serial.println(F("[NET] WIFI_SSID is empty - running offline."));
    Serial.println(F("[NET] This is fine for Phase 1: zone detection is proven"));
    Serial.println(F("      over Serial and needs no backend."));
  }

  // First attempt at once (was: 20 s after boot, the whole retry period).
  uint32_t lastAttempt = millis() - WIFI_RETRY_PERIOD_MS - 1, lastStatus = 0, lastChirp = 0;
  uint32_t lastHubCheck = millis();

  for (;;) {
    bool up = linkUp();
    if (up != gWifiUp) {
      gWifiUp = up;
      Serial.printf("[NET] WiFi %s%s\n", up ? "connected, IP " : "disconnected",
                    up ? WiFi.localIP().toString().c_str() : "");
    }

    // Connected but the server keeps failing (laptop switched off, or the hub
    // came up after we joined the building Wi-Fi), or the hub has appeared
    // while we are on the fallback network: drop the link and choose again.
    if (up && gPostFailRun >= POST_FAILS_TO_SWITCH) {
      Serial.printf("[NET] %u failed reports in a row - choosing the network again\n", gPostFailRun);
      gPostFailRun = 0;
      linkDrop();
      lastAttempt = millis() - WIFI_RETRY_PERIOD_MS - 1;
      up = false;
    } else if (up && !gOnHub && strlen(HUB_SSID) > 0 && millis() - lastHubCheck >= HUB_RECHECK_MS) {
      lastHubCheck = millis();
      if (hubInRange()) {
        Serial.println(F("[NET] Hub SESEMSG is on the air - moving to it"));
        linkDrop();
        lastAttempt = millis() - WIFI_RETRY_PERIOD_MS - 1;
        up = false;
      }
    }

    if (wifiConfigured && !up && millis() - lastAttempt > WIFI_RETRY_PERIOD_MS) {
      lastAttempt = millis();
      lastHubCheck = millis();
      WiFi.mode(WIFI_STA);
      const char *ssid, *pass;
      pickNetwork(ssid, pass);
      Serial.printf("[NET] Connecting to \"%s\" (server %s) ...\n", ssid, gBackendUrl);
      WiFi.begin(ssid, pass);
      uint32_t t0 = millis();
      while (!linkUp() && millis() - t0 < WIFI_CONNECT_TIMEOUT_MS) {
        wl_status_t st = WiFi.status();
        if (millis() - t0 > 1500 && (st == WL_NO_SSID_AVAIL || st == WL_CONNECT_FAILED)) break;   // not there: stop waiting
        vTaskDelay(pdMS_TO_TICKS(250));
      }
    }

    // Periodic status heartbeat. Queued only while the link is up: a status is
    // a snapshot, and stale ones queued during an outage would push alerts —
    // an SOS pressed while offline — out of the full queue. Alerts are always
    // queued (raiseAlert); the first status after reconnection is current.
    if (millis() - lastStatus >= STATUS_REPORT_PERIOD_MS) {
      lastStatus = millis();
      if (gWifiUp) {
        char body[384];
        buildStatusJson(body, sizeof(body));
        queuePush(ENDPOINT_STATUS, body);
      }
    }

    // Drain the queue while the link holds. One event per pass keeps the
    // task responsive and stops a long backlog from starving WiFi upkeep.
    if (gWifiUp) {
      QueuedEvent ev;
      if (queuePeek(ev)) {
        bool   isStatus = (strcmp(ev.path, ENDPOINT_STATUS) == 0);
        String reply;
        if (httpPost(ev.path, ev.body, isStatus ? &reply : nullptr)) {
          queuePop();
          if (strcmp(ev.path, ENDPOINT_ALERT) == 0 && strstr(ev.body, "\"type\":\"sos\""))
            gSosDelivered = true;
          // Raised -> stored by the server (it replies only after storing), on
          // the wearable's own clock: the alert-latency figure for Chapter 4,
          // the same whether the server is the hub or the laptop.
          if (strcmp(ev.path, ENDPOINT_ALERT) == 0) {
            const char *t = strstr(ev.body, "\"type\":\"");
            char type[24] = "?";
            if (t) {
              t += 8;
              size_t n = strcspn(t, "\"");
              if (n >= sizeof(type)) n = sizeof(type) - 1;
              memcpy(type, t, n);
              type[n] = 0;
            }
            Serial.printf("[DELIVERED] %s %lu ms after it was raised (server %s)\n", type,
                          (unsigned long)(millis() - ev.at), gOnHub ? "hub" : "laptop");
          }
          if (isStatus) handleStatusReply(reply);
        }
      }
    } else if (millis() - lastChirp >= OFFLINE_CHIRP_PERIOD_MS) {
      // WiFi-down local fallback: PROPOSED, not yet adviser-confirmed.
      // Events keep queueing; the wearable itself chirps so an unreachable
      // dashboard is not a silent failure.
      lastChirp = millis();
      buzzerPlay(kBeepOffline);
      Serial.printf("[NET] Offline. Queued events: %u (dropped %lu)\n",
                    gQCount, gQDropped);
    }

    vTaskDelay(pdMS_TO_TICKS(200));
  }
}

// =============================================================================
// Serial status line
// =============================================================================

static void printStatusLine() {
  uint32_t now = millis();
  char rssiLine[220];
  int  off = 0;

  LOCK();
  for (size_t i = 0; i < kZoneCount; i++) {
    bool fresh = gBeacons[i].hasEma && (now - gBeacons[i].lastSeen <= BEACON_STALE_MS);
    if (fresh) {
      off += snprintf(rssiLine + off, sizeof(rssiLine) - off, " %s=%.0f",
                      kZones[i].name, gBeacons[i].ema);
    } else {
      off += snprintf(rssiLine + off, sizeof(rssiLine) - off, " %s=--",
                      kZones[i].name);
    }
    if (off >= (int)sizeof(rssiLine)) break;
  }
  int   zi   = gCurrentZoneIdx;
  float bpm  = gHeartRateBpm;
  float bpct = gBatteryPct;
  float bv   = gBatteryVolts;
  bool  bsrc = gBattFromGauge;
  bool  sos  = gSosActive;
  UNLOCK();

  Serial.printf("[RSSI]%s\n", rssiLine);
#if DEBUG_BLE_SNIFF
  Serial.printf("[SCAN] adv=%lu mfg=%lu ibeacon=%lu ours=%lu\n",
                (unsigned long)gAdvSeen, (unsigned long)gAdvMfg,
                (unsigned long)gAdvIBeacon, (unsigned long)gAdvOurs);
#endif
  // New fields go at the END of the line: tools/rssi_calibration parses the start.
  Serial.printf("[STAT] zone=%s hr=%.0f batt=%.0f%% sos=%s wifi=%s q=%u bv=%.2f src=%s\n",
                (zi >= 0) ? kZones[zi].name : "unknown",
                bpm, bpct, sos ? "YES" : "no",
                gWifiUp ? "up" : "down", gQCount, bv, bsrc ? "gauge" : "adc");
}

// =============================================================================
// setup / loop
// =============================================================================

void setup() {
  // Before anything else starts: the radio stacks and LEDC run from the 80 MHz
  // APB clock, which stays fixed whatever the CPU clock is.
  setCpuFrequencyMhz(CPU_FREQ_MHZ);

  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F("TroDes Phase 1 - Wearable"));
  Serial.printf("Device   : %s (%s)\n", DEVICE_ID, RESIDENT_LABEL);
  Serial.printf("UUID     : %s  major=%d\n", BEACON_UUID, BEACON_MAJOR);
  Serial.printf("Zones    : %u\n", (unsigned)kZoneCount);
  Serial.printf("SOS long : %d ms (proposed, unconfirmed)\n", SOS_LONG_PRESS_MS);
  Serial.printf("Power    : profile %d - CPU %lu MHz, %s scan %d%% duty, status every %d s\n",
                POWER_PROFILE, (unsigned long)getCpuFrequencyMhz(),
                SCAN_ACTIVE ? "active" : "passive",
                (100 * SCAN_WINDOW) / SCAN_INTERVAL, STATUS_REPORT_PERIOD_MS / 1000);
  if (ZONE_ENTRY_DBM > -900.0f) {
    Serial.printf("Zones    : proximity mode - enter a zone only above %.0f dBm\n",
                  (float)ZONE_ENTRY_DBM);
  } else {
    Serial.println(F("Zones    : room mode - strongest beacon wins (entry threshold off)"));
  }
  Serial.println(F("========================================"));

  if (!parseUuid(BEACON_UUID, gUuidBytes)) {
    Serial.println(F("[FATAL] BEACON_UUID in config.h is malformed. Halting."));
    while (true) delay(1000);
  }

#if DEBUG_BLE_SNIFF
  Serial.print(F("Expect UUID bytes on air: "));
  for (int i = 0; i < 16; i++) Serial.printf("%02X ", gUuidBytes[i]);
  Serial.println();
  Serial.println(F("Diagnostics ON (DEBUG_BLE_SNIFF=1 in include/config.h)"));
#endif

  gStateMux = xSemaphoreCreateMutex();

  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);
  buzzerInit();

  sensorsInit();
  buzzerPlay(kBeepBoot);

  xTaskCreatePinnedToCore(taskBle,     "ble", 6144, nullptr, 1, nullptr, 1);
  xTaskCreatePinnedToCore(taskNetwork, "net", 8192, nullptr, 1, nullptr, 0);

  Serial.println(F("[SYS] Running. Press = SOS, hold 3 s = dismiss."));
}

void loop() {
  static uint32_t lastTick = 0, lastHr = 0, lastLog = 0;
  // First battery read 5 s after boot (not 30 s): unsigned wrap-around makes
  // now - lastBatt reach BATTERY_READ_PERIOD_MS at now = 5000.
  static uint32_t lastBatt = (uint32_t)(5000 - BATTERY_READ_PERIOD_MS);
  uint32_t now = millis();

  sosService();
  buzzerService();
  ledService();

  if (now - lastHr >= HR_SAMPLE_PERIOD_MS)      { lastHr = now;   hrService(); }
  if (now - lastBatt >= BATTERY_READ_PERIOD_MS) { lastBatt = now; batteryService(); }
  if (now - lastTick >= SCAN_TICK_MS)           { lastTick = now; classifyZone(); }
  if (now - lastLog >= SERIAL_LOG_PERIOD_MS)    { lastLog = now;  printStatusLine(); }

  delay(2);   // yields to the idle task; keeps the watchdog happy
}
