// =============================================================================
// TroDes Phase 1 — Zone Beacon Node
// ESP32-WROOM-32, Arduino framework
// =============================================================================
// Advertises a standard iBeacon frame identifying one zone of the facility.
// One physical board per room; edit include/zone_config.h before each flash.
//
// The wearable identifies a zone by (UUID, major, minor) and estimates
// proximity from the received RSSI. This board does nothing else — no WiFi,
// no connections, no sensors. It is mains-powered and expected to run forever.
//
// -----------------------------------------------------------------------------
// WHY THIS FILE BUILDS THE PAYLOAD BY HAND INSTEAD OF USING BLEBeacon
// -----------------------------------------------------------------------------
// The ESP32 Arduino BLEBeacon helper gets byte order wrong in two places, and
// both failures are silent — the beacon advertises happily and looks fine in a
// scanner app, while the wearable rejects every packet.
//
//   1. setManufacturerId(0x4C00) emits 00 4C instead of Apple's 4C 00.
//      (Passing 0x004C works, but only by accident of the library's
//      low-byte-first storage.)
//   2. setProximityUUID() copies the UUID out of the library's NATIVE
//      little-endian representation without swapping it back. A beacon
//      configured with 5ca9015e-... transmitted bd65b0f3-... — the same 16
//      bytes, reversed. Confirmed on air with nRF Connect, 2026-09-03.
//
// Bug 2 in particular cost a full debugging session: the beacon showed the
// right NAME in every scanner app, so it looked correct, but the UUID it
// advertised was not the project's UUID, so the wearable's filter discarded it
// and [RSSI] never populated.
//
// Building the 25-byte manufacturer block directly removes both surprises.
// The layout is fixed by Apple's iBeacon format:
//
//   offset  size  field
//   0       2     company ID, 4C 00 (Apple), on-air byte order
//   2       1     type, 0x02 (proximity beacon)
//   3       1     length of the remainder, 0x15 = 21
//   4       16    proximity UUID, big-endian exactly as written down
//   20      2     major, big-endian
//   22      2     minor, big-endian
//   24      1     measured power at 1 m, dBm, as a signed byte
//
// Verify after any change: nRF Connect must show the UUID from
// docs/ZONE_CONFIG.md, not some rearrangement of it.
// =============================================================================

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>

#include "zone_config.h"

static BLEAdvertising *pAdvertising = nullptr;

// Device name shown in scanner apps, e.g. "TRODES_bedroom_wing".
static const char *kDeviceName = "TRODES_" ZONE_NAME;

// -----------------------------------------------------------------------------
// "5ca9015e-adc8-40a9-a1e2-d539f3b065bd" -> 16 raw bytes, big-endian as on air.
// Identical to the parser in the wearable, deliberately: both ends must agree
// on byte order, so both derive it the same way from the same string.
// -----------------------------------------------------------------------------
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

static uint8_t gUuidBytes[16];

// -----------------------------------------------------------------------------
// Build the iBeacon payload and hand it to the advertiser.
// -----------------------------------------------------------------------------
static void startAdvertising() {
  uint8_t frame[25];
  frame[0] = 0x4C;                       // Apple company ID, on-air order
  frame[1] = 0x00;
  frame[2] = 0x02;                       // iBeacon subtype
  frame[3] = 0x15;                       // remaining length (21)
  memcpy(frame + 4, gUuidBytes, 16);     // UUID, big-endian
  frame[20] = (uint8_t)((BEACON_MAJOR >> 8) & 0xFF);
  frame[21] = (uint8_t)(BEACON_MAJOR & 0xFF);
  frame[22] = (uint8_t)((ZONE_ID >> 8) & 0xFF);
  frame[23] = (uint8_t)(ZONE_ID & 0xFF);
  frame[24] = (uint8_t)(int8_t)MEASURED_POWER_1M;

  BLEAdvertisementData advData;
  BLEAdvertisementData scanResponse;

  // 0x04 = BR/EDR Not Supported. BLE-only device; keeps the payload small.
  advData.setFlags(0x04);
  advData.setManufacturerData(std::string((char *)frame, sizeof(frame)));

  // The 31-byte advertising packet is already full with flags + the 25-byte
  // iBeacon block, so the readable name goes in the scan response instead.
  // That only reaches a scanner if the advertisement type is scannable —
  // ADV_TYPE_NONCONN_IND never answers scan requests, so the name would never
  // transmit and the beacon would appear nameless. SCAN_IND keeps the beacon
  // non-connectable (correct) while letting the name go out.
  scanResponse.setName(kDeviceName);

  pAdvertising->setAdvertisementData(advData);
  pAdvertising->setScanResponseData(scanResponse);
  pAdvertising->setAdvertisementType(ADV_TYPE_SCAN_IND);
  pAdvertising->setMinInterval(ADV_INTERVAL_MIN);
  pAdvertising->setMaxInterval(ADV_INTERVAL_MAX);
  pAdvertising->start();

  Serial.print(F("Frame on air : "));
  for (size_t i = 0; i < sizeof(frame); i++) Serial.printf("%02X ", frame[i]);
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F("TroDes Phase 1 - Zone Beacon"));
  Serial.printf("Zone     : %d (%s)\n", ZONE_ID, ZONE_NAME);
  Serial.printf("Name     : %s\n", kDeviceName);
  Serial.printf("UUID     : %s\n", BEACON_UUID);
  Serial.printf("Major    : %d\n", BEACON_MAJOR);
  Serial.printf("TxPwr@1m : %d dBm (declared)\n", MEASURED_POWER_1M);
  Serial.printf("Interval : %.1f ms\n", ADV_INTERVAL_MIN * 0.625f);
  Serial.println(F("========================================"));

  if (!parseUuid(BEACON_UUID, gUuidBytes)) {
    Serial.println(F("[FATAL] BEACON_UUID in zone_config.h is malformed. Halting."));
    while (true) delay(1000);
  }

#if STATUS_LED_PIN >= 0
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
#endif

  BLEDevice::init(kDeviceName);
  BLEDevice::setPower(BEACON_TX_POWER, ESP_BLE_PWR_TYPE_ADV);
  pAdvertising = BLEDevice::getAdvertising();

  startAdvertising();

  Serial.println(F("[BLE] Advertising started. This board now just blinks."));
  Serial.println(F("[BLE] Verify in nRF Connect: the name above, Connectable: No,"));
  Serial.println(F("      and a Beacon UUID matching the UUID line above EXACTLY."));
  Serial.println(F("      A reversed UUID there means the frame is wrong - see the"));
  Serial.println(F("      comment at the top of this file."));
}

void loop() {
  // Nothing to do. Advertising runs in the BLE controller, not here.
#if STATUS_LED_PIN >= 0
  digitalWrite(STATUS_LED_PIN, HIGH);
  delay(50);
  digitalWrite(STATUS_LED_PIN, LOW);
  delay(2950);
#else
  delay(3000);
#endif

  static uint32_t lastLog = 0;
  if (millis() - lastLog >= 60000UL) {
    lastLog = millis();
    Serial.printf("[BEACON] zone=%d (%s) uptime=%lus\n",
                  ZONE_ID, ZONE_NAME, millis() / 1000UL);
  }
}
