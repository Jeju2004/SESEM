// =============================================================================
// TroDes Phase 1 — Restricted-Door Sensor Node
// ESP8266 (Wemos D1 mini) by default; compiles for ESP32 too.
// =============================================================================
// A magnetic reed switch on a restricted door (medicine room, main exit,
// stairwell). On any debounced state change it POSTs an event to the caregiver
// backend; if WiFi is down it queues the event and retries. A periodic
// heartbeat lets the dashboard tell "door closed" apart from "node dead".
//
// Edit include/config.h (DOOR_ID / DOOR_NAME / NODE_ID / WiFi) per unit.
// =============================================================================

#include <Arduino.h>
#include <ArduinoJson.h>

#if defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
  #include <WiFiClient.h>
#else
  #include <WiFi.h>
  #include <HTTPClient.h>
#endif

#include "config.h"

// -----------------------------------------------------------------------------
// Offline event queue
// -----------------------------------------------------------------------------
struct QueuedEvent { char body[224]; };

static QueuedEvent gQueue[OFFLINE_QUEUE_DEPTH];
static uint8_t     gQHead = 0, gQTail = 0, gQCount = 0;
static uint32_t    gQDropped = 0;

static void queuePush(const char *body) {
  if (gQCount == OFFLINE_QUEUE_DEPTH) {
    gQHead = (gQHead + 1) % OFFLINE_QUEUE_DEPTH;
    gQCount--;
    gQDropped++;
  }
  strncpy(gQueue[gQTail].body, body, sizeof(gQueue[gQTail].body) - 1);
  gQueue[gQTail].body[sizeof(gQueue[gQTail].body) - 1] = '\0';
  gQTail = (gQTail + 1) % OFFLINE_QUEUE_DEPTH;
  gQCount++;
}

// -----------------------------------------------------------------------------
// LED
// -----------------------------------------------------------------------------
static void ledSet(bool on) {
#if LED_ACTIVE_LOW
  digitalWrite(PIN_STATUS_LED, on ? LOW : HIGH);
#else
  digitalWrite(PIN_STATUS_LED, on ? HIGH : LOW);
#endif
}

// -----------------------------------------------------------------------------
// Reed switch
// -----------------------------------------------------------------------------
static bool     gDoorOpen     = false;
static bool     gRawLast      = false;
static uint32_t gRawChangedAt = 0;
static bool     gInitialised  = false;

static bool readDoorOpen() {
  int level = digitalRead(PIN_REED);
#if REED_ACTIVE_LOW_IS_CLOSED
  return (level == HIGH);     // pulled up = magnet away = open
#else
  return (level == LOW);
#endif
}

// -----------------------------------------------------------------------------
// Payloads
// -----------------------------------------------------------------------------
static void buildEventJson(char *buf, size_t len, const char *type, bool open) {
  StaticJsonDocument<224> doc;
  doc["node_id"]  = NODE_ID;
  doc["door_id"]  = DOOR_ID;
  doc["door"]     = DOOR_NAME;
  doc["type"]     = type;                       // "state_change" | "heartbeat"
  doc["state"]    = open ? "open" : "closed";
  doc["rssi"]     = WiFi.RSSI();
  doc["uptime_s"] = millis() / 1000UL;
  serializeJson(doc, buf, len);
}

// -----------------------------------------------------------------------------
// Networking
// -----------------------------------------------------------------------------
static bool gWifiUp = false;

static bool httpPostJson(const char *body) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String url = String(BACKEND_BASE_URL) + ENDPOINT_DOOR;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

#if defined(ESP8266)
  WiFiClient client;
  if (!http.begin(client, url)) return false;
#else
  if (!http.begin(url)) return false;
#endif

  http.addHeader("Content-Type", "application/json");
  int code = http.POST((uint8_t *)body, strlen(body));
  http.end();

  if (code > 0 && code < 400) return true;
  Serial.printf("[NET] POST failed (code %d)\n", code);
  return false;
}

static void wifiService() {
  static uint32_t lastAttempt = 0;

  bool up = (WiFi.status() == WL_CONNECTED);
  if (up != gWifiUp) {
    gWifiUp = up;
    if (up) Serial.printf("[NET] WiFi connected, IP %s\n",
                          WiFi.localIP().toString().c_str());
    else    Serial.println(F("[NET] WiFi disconnected."));
  }

  if (strlen(WIFI_SSID) == 0) return;

  if (!up && millis() - lastAttempt > WIFI_RETRY_PERIOD_MS) {
    lastAttempt = millis();
    Serial.printf("[NET] Connecting to \"%s\" ...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    uint32_t t0 = millis();
    while (WiFi.status() != WL_CONNECTED &&
           millis() - t0 < WIFI_CONNECT_TIMEOUT_MS) {
      delay(250);
      yield();
    }
  }
}

static void queueService() {
  if (!gWifiUp || gQCount == 0) return;
  if (httpPostJson(gQueue[gQHead].body)) {
    gQHead = (gQHead + 1) % OFFLINE_QUEUE_DEPTH;
    gQCount--;
  }
}

// -----------------------------------------------------------------------------
// setup / loop
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F("TroDes Phase 1 - Door Sensor Node"));
  Serial.printf("Node  : %s\n", NODE_ID);
  Serial.printf("Door  : %d (%s)  [RESTRICTED]\n", DOOR_ID, DOOR_NAME);
  Serial.println(F("========================================"));

  pinMode(PIN_REED, INPUT_PULLUP);
  pinMode(PIN_STATUS_LED, OUTPUT);
  ledSet(false);

  gDoorOpen     = readDoorOpen();
  gRawLast      = gDoorOpen;
  gRawChangedAt = millis();
  gInitialised  = true;
  ledSet(gDoorOpen);

  Serial.printf("[DOOR] Initial state: %s\n", gDoorOpen ? "OPEN" : "CLOSED");

  // Report the boot state so the dashboard is correct from the first second,
  // including the case where the node reboots while a door is already open.
  char body[224];
  buildEventJson(body, sizeof(body), "boot", gDoorOpen);
  queuePush(body);
}

void loop() {
  static uint32_t lastHeartbeat = 0;

  wifiService();

  // --- debounced reed reading ---
  bool raw = readDoorOpen();
  if (raw != gRawLast) { gRawLast = raw; gRawChangedAt = millis(); }

  if (gInitialised && raw != gDoorOpen &&
      (millis() - gRawChangedAt) >= REED_DEBOUNCE_MS) {
    gDoorOpen = raw;
    ledSet(gDoorOpen);
    Serial.printf("[DOOR] %s -> %s\n", DOOR_NAME, gDoorOpen ? "OPEN" : "CLOSED");

    char body[224];
    buildEventJson(body, sizeof(body), "state_change", gDoorOpen);
    queuePush(body);     // queued, not posted inline: an open event must
                         // survive a WiFi outage, and POSTing here would
                         // block the debounce loop for up to HTTP_TIMEOUT_MS
  }

  // --- heartbeat ---
  if (millis() - lastHeartbeat >= HEARTBEAT_PERIOD_MS) {
    lastHeartbeat = millis();
    // Queued only while the link is up: stale heartbeats queued during an
    // outage would push door events out of the full queue (bench test,
    // 25 Sep: q=16, 3 dropped). The first heartbeat after reconnection is live.
    if (gWifiUp) {
      char body[224];
      buildEventJson(body, sizeof(body), "heartbeat", gDoorOpen);
      queuePush(body);
    }
    Serial.printf("[HB] %s state=%s wifi=%s q=%u dropped=%lu\n",
                  DOOR_NAME, gDoorOpen ? "open" : "closed",
                  gWifiUp ? "up" : "down", gQCount, (unsigned long)gQDropped);
  }

  queueService();

  delay(5);
  yield();
}
