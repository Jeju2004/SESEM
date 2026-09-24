// =============================================================================
// TroDes Phase 1 — Wearable
// ESP32-WROOM-32, Arduino framework
// =============================================================================
// What this firmware does:
//   * Continuously scans for TroDes iBeacons and decides which ZONE the
//     resident is in (EMA-smoothed RSSI + hysteresis + confirm ticks).
//   * SOS button: short press = raise alert, long press = dismiss false alarm.
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
static float    gHeartRateBpm   = 0.0f;
static bool     gHrPresent      = false;
static float    gBatteryPct     = -1.0f;
static float    gBatteryVolts   = -1.0f;
static bool     gGaugePresent   = false;
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
  digitalWrite(PIN_STATUS_LED, LOW);
}

static void buzzerService() {
  if (gBeepsLeft == 0 && !gBeepOn) return;
  uint32_t now = millis();
  if (gBeepAt != 0 && now < gBeepAt) return;

  if (!gBeepOn) {
    if (gBeepsLeft == 0) { buzzerStop(); return; }
    ledcWriteTone(BUZZER_LEDC_CHANNEL, gPattern.freqHz);
    digitalWrite(PIN_STATUS_LED, HIGH);
    gBeepOn = true;
    gBeepAt = now + gPattern.onMs;
  } else {
    ledcWrite(BUZZER_LEDC_CHANNEL, 0);
    digitalWrite(PIN_STATUS_LED, LOW);
    gBeepOn = false;
    if (gBeepsLeft > 0) gBeepsLeft--;
    gBeepAt = now + gPattern.offMs;
  }
}

// Distinct, learnable patterns — the user manual documents these.
static const BuzzPattern kBeepBoot        = {2700,  80,  80, 2};
static const BuzzPattern kBeepSosSent     = {2700, 150, 100, 3};
static const BuzzPattern kBeepSosDismiss  = {1500, 400, 150, 1};
static const BuzzPattern kBeepRestricted  = {3200, 120,  80, 4};
static const BuzzPattern kBeepBatteryLow  = {2000, 250, 250, 2};
static const BuzzPattern kBeepOffline     = {1800,  60, 120, 2};

// =============================================================================
// Offline event queue
// =============================================================================

struct QueuedEvent {
  char path[32];
  char body[320];
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
  doc["hr_bpm"]     = gHrPresent ? (int)roundf(gHeartRateBpm) : -1;
  doc["batt_pct"]   = (int)roundf(gBatteryPct);
  doc["batt_v"]     = roundf(gBatteryVolts * 100) / 100;
  doc["sos"]        = gSosActive;
  UNLOCK();

  doc["uptime_s"] = millis() / 1000UL;
  serializeJson(doc, buf, len);
}

static void buildAlertJson(char *buf, size_t len, const char *type,
                           const char *detail) {
  StaticJsonDocument<320> doc;
  LOCK();
  int zi = gCurrentZoneIdx;
  doc["device_id"] = DEVICE_ID;
  doc["type"]      = type;
  doc["detail"]    = detail;
  doc["zone"]      = (zi >= 0) ? kZones[zi].name : "unknown";
  doc["zone_id"]   = (zi >= 0) ? kZones[zi].id : 0;
  doc["batt_pct"]  = (int)roundf(gBatteryPct);
  doc["hr_bpm"]    = gHrPresent ? (int)roundf(gHeartRateBpm) : -1;
  UNLOCK();
  doc["uptime_s"] = millis() / 1000UL;
  serializeJson(doc, buf, len);
}

static void raiseAlert(const char *type, const char *detail) {
  char body[320];
  buildAlertJson(body, sizeof(body), type, detail);
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
  // Active scan pulls the beacon's scan response (its readable name) too.
  // It costs more current than a passive scan; if battery runtime becomes the
  // binding constraint, this is the first knob to turn.
  scan->setActiveScan(true);
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
    newIdx = bestIdx;                       // first fix — take it immediately
    gCandidateIdx = -1;
    gCandidateTicks = 0;
  } else if (bestIdx == curIdx) {
    gCandidateIdx = -1;                     // incumbent still strongest
    gCandidateTicks = 0;
  } else {
    // A challenger must beat the incumbent by HYSTERESIS_DB, and keep doing so
    // for CONFIRM_TICKS consecutive ticks, before the zone actually changes.
    // This is what stops the dashboard flickering on a zone boundary.
    if (bestRssi > curRssi + HYSTERESIS_DB) {
      if (bestIdx == gCandidateIdx) {
        if (++gCandidateTicks >= CONFIRM_TICKS) {
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

static void sosService() {
  uint32_t now  = millis();
  bool     read = digitalRead(PIN_SOS_BUTTON);

  if (read != gBtnLastRead) { gBtnLastRead = read; gBtnChangeAt = now; }

  if ((now - gBtnChangeAt) >= BUTTON_DEBOUNCE_MS && read != gBtnStable) {
    gBtnStable = read;
    if (gBtnStable == LOW) {            // pressed
      gBtnPressAt  = now;
      gLongHandled = false;
    } else {                            // released
      uint32_t heldMs = now - gBtnPressAt;
      if (!gLongHandled && heldMs < SOS_LONG_PRESS_MS) {
        // SHORT PRESS = raise an alert.
        LOCK(); gSosActive = true; UNLOCK();
        buzzerPlay(kBeepSosSent);
        Serial.printf("[SOS] Short press (%lu ms) -> ALERT RAISED\n", heldMs);
        raiseAlert("sos", "button short press");
      }
    }
  }

  // LONG PRESS = dismiss a false alarm. Fires while still held, so the
  // resident gets the confirmation tone at the moment the threshold is met
  // rather than having to guess when to let go.
  if (gBtnStable == LOW && !gLongHandled &&
      (now - gBtnPressAt) >= SOS_LONG_PRESS_MS) {
    gLongHandled = true;
    bool was;
    LOCK(); was = gSosActive; gSosActive = false; UNLOCK();
    buzzerPlay(kBeepSosDismiss);
    Serial.printf("[SOS] Long press (%d ms) -> %s\n", SOS_LONG_PRESS_MS,
                  was ? "ALERT DISMISSED" : "no active alert, dismiss noted");
    raiseAlert("sos_dismissed", "button long press");
  }
}

// =============================================================================
// Sensors
// =============================================================================

static MAX30105  gHrSensor;
static SFE_MAX1704X gGauge(MAX1704X_MAX17043);   // U3 on the Rev B/C schematic

// Rolling average of the last few beat-to-beat intervals, as in SparkFun's
// reference example. Optical HR on a wrist is noisy; averaging is not optional.
#define HR_AVG_SIZE 8
static byte     gHrRates[HR_AVG_SIZE];
static byte     gHrRateSpot = 0;
static long     gHrLastBeat = 0;

static void sensorsInit() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);

#if HR_ENABLED
  if (gHrSensor.begin(Wire, I2C_SPEED_FAST)) {
    gHrSensor.setup();                    // SparkFun defaults
    gHrSensor.setPulseAmplitudeRed(0x0A); // dim red LED = "alive" indicator
    gHrSensor.setPulseAmplitudeGreen(0);  // MAX30102 has no green LED
    gHrPresent = true;
    Serial.println(F("[HR] MAX30102 found."));
  } else {
    gHrPresent = false;
    Serial.println(F("[HR] MAX30102 NOT found - heart rate disabled."));
  }
#endif

  if (gGauge.begin()) {
    gGauge.quickStart();
    gGaugePresent = true;
    Serial.println(F("[BATT] MAX17043 found."));
  } else {
    gGaugePresent = false;
    Serial.println(F("[BATT] MAX17043 NOT found - using ADC divider on GPIO 34."));
    analogReadResolution(12);
    analogSetPinAttenuation(PIN_BATTERY_ADC, ADC_11db);
  }
}

static void hrService() {
#if HR_ENABLED
  if (!gHrPresent) return;

  long irValue = gHrSensor.getIR();
  if (irValue < 50000) {
    // Nothing on the sensor — do not report a stale BPM as if it were live.
    LOCK(); gHeartRateBpm = 0.0f; UNLOCK();
    return;
  }

  if (checkForBeat(irValue)) {
    long now   = millis();
    long delta = now - gHrLastBeat;
    gHrLastBeat = now;
    float bpm = 60.0f / (delta / 1000.0f);
    if (bpm > 20.0f && bpm < 255.0f) {
      gHrRates[gHrRateSpot++] = (byte)bpm;
      gHrRateSpot %= HR_AVG_SIZE;
      float sum = 0;
      for (byte i = 0; i < HR_AVG_SIZE; i++) sum += gHrRates[i];
      LOCK(); gHeartRateBpm = sum / HR_AVG_SIZE; UNLOCK();
    }
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
  float pct, volts;

  if (gGaugePresent) {
    volts = gGauge.getVoltage();
    pct   = gGauge.getSOC();
  } else {
    // R3/R4 divider — the primary battery source on Rev B/C. analogReadMilliVolts
    // applies the chip's factory ADC calibration, which a raw count / 4095 does
    // not; averaging takes out the ESP32 ADC's sample-to-sample noise.
    uint32_t mvSum = 0;
    for (int i = 0; i < BATTERY_ADC_SAMPLES; i++) mvSum += analogReadMilliVolts(PIN_BATTERY_ADC);
    volts = (mvSum / (float)BATTERY_ADC_SAMPLES) / 1000.0f * BATTERY_DIVIDER_RATIO;
    pct   = lipoPercent(volts);
  }

  static bool lowSent = false, critSent = false;

  LOCK(); gBatteryPct = pct; gBatteryVolts = volts; UNLOCK();

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

static bool httpPost(const char *path, const char *body) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String url = String(BACKEND_BASE_URL) + path;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(url)) return false;
  http.addHeader("Content-Type", "application/json");
  int code = http.POST((uint8_t *)body, strlen(body));
  http.end();

  if (code > 0 && code < 400) return true;
  Serial.printf("[NET] POST %s failed (code %d)\n", path, code);
  return false;
}

static void taskNetwork(void *arg) {
  const bool wifiConfigured = (strlen(WIFI_SSID) > 0);

  if (!wifiConfigured) {
    Serial.println(F("[NET] WIFI_SSID is empty - running offline."));
    Serial.println(F("[NET] This is fine for Phase 1: zone detection is proven"));
    Serial.println(F("      over Serial and needs no backend."));
  }

  uint32_t lastAttempt = 0, lastStatus = 0, lastChirp = 0;

  for (;;) {
    bool up = (WiFi.status() == WL_CONNECTED);
    if (up != gWifiUp) {
      gWifiUp = up;
      Serial.printf("[NET] WiFi %s%s\n", up ? "connected, IP " : "disconnected",
                    up ? WiFi.localIP().toString().c_str() : "");
    }

    if (wifiConfigured && !up && millis() - lastAttempt > WIFI_RETRY_PERIOD_MS) {
      lastAttempt = millis();
      Serial.printf("[NET] Connecting to \"%s\" ...\n", WIFI_SSID);
      WiFi.mode(WIFI_STA);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      uint32_t t0 = millis();
      while (WiFi.status() != WL_CONNECTED &&
             millis() - t0 < WIFI_CONNECT_TIMEOUT_MS) {
        vTaskDelay(pdMS_TO_TICKS(250));
      }
    }

    // Periodic status heartbeat -> queue (so it survives a WiFi outage too).
    if (millis() - lastStatus >= STATUS_REPORT_PERIOD_MS) {
      lastStatus = millis();
      char body[384];
      buildStatusJson(body, sizeof(body));
      queuePush(ENDPOINT_STATUS, body);
    }

    // Drain the queue while the link holds. One event per pass keeps the
    // task responsive and stops a long backlog from starving WiFi upkeep.
    if (gWifiUp) {
      QueuedEvent ev;
      if (queuePeek(ev)) {
        if (httpPost(ev.path, ev.body)) queuePop();
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
  bool  sos  = gSosActive;
  UNLOCK();

  Serial.printf("[RSSI]%s\n", rssiLine);
#if DEBUG_BLE_SNIFF
  Serial.printf("[SCAN] adv=%lu mfg=%lu ibeacon=%lu ours=%lu\n",
                (unsigned long)gAdvSeen, (unsigned long)gAdvMfg,
                (unsigned long)gAdvIBeacon, (unsigned long)gAdvOurs);
#endif
  Serial.printf("[STAT] zone=%s hr=%.0f batt=%.0f%% sos=%s wifi=%s q=%u\n",
                (zi >= 0) ? kZones[zi].name : "unknown",
                bpm, bpct, sos ? "YES" : "no",
                gWifiUp ? "up" : "down", gQCount);
}

// =============================================================================
// setup / loop
// =============================================================================

void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F("TroDes Phase 1 - Wearable"));
  Serial.printf("Device   : %s (%s)\n", DEVICE_ID, RESIDENT_LABEL);
  Serial.printf("UUID     : %s  major=%d\n", BEACON_UUID, BEACON_MAJOR);
  Serial.printf("Zones    : %u\n", (unsigned)kZoneCount);
  Serial.printf("SOS long : %d ms (proposed, unconfirmed)\n", SOS_LONG_PRESS_MS);
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

  Serial.println(F("[SYS] Running. Short press = SOS, long press = dismiss."));
}

void loop() {
  static uint32_t lastTick = 0, lastHr = 0, lastBatt = 0, lastLog = 0;
  uint32_t now = millis();

  sosService();
  buzzerService();

  if (now - lastHr >= HR_SAMPLE_PERIOD_MS)      { lastHr = now;   hrService(); }
  if (now - lastBatt >= BATTERY_READ_PERIOD_MS) { lastBatt = now; batteryService(); }
  if (now - lastTick >= SCAN_TICK_MS)           { lastTick = now; classifyZone(); }
  if (now - lastLog >= SERIAL_LOG_PERIOD_MS)    { lastLog = now;  printStatusLine(); }

  delay(2);   // yields to the idle task; keeps the watchdog happy
}
