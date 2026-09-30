// =============================================================================
// TroDes wearable — hardware self-test (30 Sep 2026)
// =============================================================================
// A one-shot report over serial, then a 1-second live readout. Uses the same
// pins as firmware/wearable (include/config.h). Checks:
//   1. battery sense   GPIO34 through the R3/R4 divider (x2) - is the battery
//                      line (J1 pad 1 / VBAT) reaching the ESP32?
//   2. I2C main bus    SDA 22 / SCL 21: MAX30102 at 0x57, part ID 0x15
//   3. I2C gauge bus   SDA 4 / SCL 16: MAX17043 at 0x36 (not fitted = OK)
//   4. SOS button      GPIO27, pull-up, pressed = LOW
//   5. buzzer + LED    GPIO25 (2N2222 driver) and GPIO2 - listen and look
//   6. Wi-Fi radio     scan: every network, flags SESEMSG and MAPUA Wi-Fi
//   7. BLE radio       6 s scan: the project's iBeacons (zone id, RSSI) and a
//                      count of other BLE devices
//   8. heart-rate      MAX30102 IR level: finger on / off
// Live readout afterwards: battery V, button, IR - press the button and put a
// finger on the sensor to see them change.
// =============================================================================
#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include "MAX30105.h"

#define PIN_SOS_BUTTON 27
#define PIN_BUZZER     25
#define PIN_LED        2
#define PIN_SDA        22
#define PIN_SCL        21
#define PIN_FG_SDA     4
#define PIN_FG_SCL     16
#define PIN_BATT_ADC   34

static const uint8_t kUuid[16] = {0x5c, 0xa9, 0x01, 0x5e, 0xad, 0xc8, 0x40, 0xa9,
                                  0xa1, 0xe2, 0xd5, 0x39, 0xf3, 0xb0, 0x65, 0xbd};
static MAX30105 gHr;
static bool gHrOk = false;
static int gPass = 0, gFail = 0, gWarn = 0;

static void result(const char *level, const char *what, const String &detail) {
  if (!strcmp(level, "PASS")) gPass++;
  else if (!strcmp(level, "FAIL")) gFail++;
  else gWarn++;
  Serial.printf("[%s] %-26s %s\n", level, what, detail.c_str());
}

static float batteryVolts() {
  uint32_t mv = 0;
  for (int i = 0; i < 16; i++) mv += analogReadMilliVolts(PIN_BATT_ADC);
  return (mv / 16.0f) * 2.0f / 1000.0f;   // R3 = R4 = 100 k
}

static int i2cScan(TwoWire &w, const char *bus, String &found) {
  int n = 0;
  for (uint8_t a = 1; a < 127; a++) {
    w.beginTransmission(a);
    if (w.endTransmission() == 0) { found += String(n ? ", 0x" : "0x") + String(a, HEX); n++; }
  }
  return n;
}

static void beep(int ms) {
  ledcWriteTone(0, 2700);
  digitalWrite(PIN_LED, HIGH);
  delay(ms);
  ledcWriteTone(0, 0);
  digitalWrite(PIN_LED, LOW);
}

struct Seen { int minor; int best; long sum; int n; };
static Seen gBeacons[8];
static int gBeaconCount = 0, gOtherBle = 0;

class Cb : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice d) override {
    std::string m = d.getManufacturerData();
    if (m.size() >= 25 && (uint8_t)m[0] == 0x4c && (uint8_t)m[1] == 0x00 && (uint8_t)m[2] == 0x02 &&
        (uint8_t)m[3] == 0x15 && memcmp(m.data() + 4, kUuid, 16) == 0) {
      int minor = ((uint8_t)m[22] << 8) | (uint8_t)m[23];
      int rssi = d.getRSSI();
      for (int i = 0; i < gBeaconCount; i++) {
        if (gBeacons[i].minor == minor) {
          gBeacons[i].best = max(gBeacons[i].best, rssi);
          gBeacons[i].sum += rssi; gBeacons[i].n++;
          return;
        }
      }
      if (gBeaconCount < 8) gBeacons[gBeaconCount++] = {minor, rssi, rssi, 1};
    } else {
      gOtherBle++;
    }
  }
};

static const char *zoneName(int id) {
  return id == 1 ? "bedroom_wing" : id == 2 ? "dining_hall" : id == 11 ? "medicine_room" : "not in the zone table";
}

void setup() {
  Serial.begin(115200);
  delay(400);
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  ledcSetup(0, 2700, 8);
  ledcAttachPin(PIN_BUZZER, 0);
  analogSetPinAttenuation(PIN_BATT_ADC, ADC_11db);

  Serial.println();
  Serial.println(F("=============================================="));
  Serial.println(F(" TroDes wearable - hardware self-test"));
  Serial.println(F("=============================================="));

  // 1. battery sense
  float v = batteryVolts();
  if (v >= 3.0f && v <= 4.35f) result("PASS", "Battery sense (GPIO34)", String(v, 2) + " V - the battery line reaches the ESP32");
  else if (v < 0.5f) result("FAIL", "Battery sense (GPIO34)", String(v, 2) + " V - no battery voltage on the board's VBAT line (J1 pad 1 / R3 / pin 5)");
  else result("WARN", "Battery sense (GPIO34)", String(v, 2) + " V - outside 3.0-4.35 V: weak connection or a low cell");

  // 2. main I2C bus + MAX30102
  Wire.begin(PIN_SDA, PIN_SCL);
  String f;
  int n = i2cScan(Wire, "main", f);
  Serial.printf("       I2C main bus (SDA 22, SCL 21): %d device(s) %s\n", n, f.c_str());
  gHrOk = gHr.begin(Wire, I2C_SPEED_FAST);
  if (gHrOk) {
    uint8_t id = gHr.readPartID();
    result(id == 0x15 ? "PASS" : "WARN", "MAX30102 heart-rate sensor", String("found at 0x57, part ID 0x") + String(id, HEX) + (id == 0x15 ? "" : " (expected 0x15)"));
    gHr.setup(0x24, 4, 2, 400, 411, 4096);
  } else {
    result("FAIL", "MAX30102 heart-rate sensor", "not found at 0x57 - check the 4-wire lead (3V3, GND, SCL 21, SDA 22)");
  }

  // 3. fuel-gauge bus
  TwoWire bus2(1);
  bus2.begin(PIN_FG_SDA, PIN_FG_SCL);
  String g;
  int n2 = i2cScan(bus2, "gauge", g);
  if (n2) result("PASS", "MAX17043 fuel gauge bus", String("device(s) ") + g);
  else result("INFO", "MAX17043 fuel gauge bus", "nothing on SDA 4 / SCL 16 - expected, the gauge is not fitted");
  bus2.end();

  // 4. SOS button (idle)
  int b = digitalRead(PIN_SOS_BUTTON);
  if (b == HIGH) result("PASS", "SOS button (GPIO27)", "reads released (HIGH) at rest");
  else result("FAIL", "SOS button (GPIO27)", "reads PRESSED at rest - shorted switch or wiring to GND");

  // 5. buzzer + LED
  Serial.println(F("       Buzzer + LED: 3 beeps with the LED now - listen and look"));
  for (int i = 0; i < 3; i++) { beep(150); delay(150); }
  result("INFO", "Buzzer (GPIO25) + LED (GPIO2)", "3 beeps / flashes sent - confirm by ear and eye");

  // 6. Wi-Fi scan
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  int nets = WiFi.scanNetworks(false, true);
  bool hub = false, mapua = false;
  Serial.printf("       Wi-Fi networks seen: %d\n", nets);
  for (int i = 0; i < nets; i++) {
    String s = WiFi.SSID(i);
    if (s == "SESEMSG") hub = true;
    if (s == "MAPUA Wi-Fi") mapua = true;
    Serial.printf("         %-32s %4d dBm  ch %2d\n", s.length() ? s.c_str() : "(hidden)", WiFi.RSSI(i), WiFi.channel(i));
  }
  result(nets > 0 ? "PASS" : "FAIL", "Wi-Fi radio", String(nets) + " network(s) heard");
  result(hub ? "PASS" : "WARN", "Hub network SESEMSG", hub ? "on the air" : "not heard - is the door node (hub) powered?");
  result(mapua ? "PASS" : "INFO", "MAPUA Wi-Fi (fallback)", mapua ? "on the air" : "not heard here");
  WiFi.scanDelete();
  WiFi.mode(WIFI_OFF);

  // 7. BLE scan
  BLEDevice::init("");
  BLEScan *sc = BLEDevice::getScan();
  sc->setAdvertisedDeviceCallbacks(new Cb(), true);
  sc->setActiveScan(false);
  sc->setInterval(100);
  sc->setWindow(99);
  Serial.println(F("       BLE scan, 6 s ..."));
  sc->start(6, false);
  for (int i = 0; i < gBeaconCount; i++) {
    Serial.printf("         beacon zone %2d %-20s best %4d dBm, average %4ld dBm, %d packets\n", gBeacons[i].minor,
                  zoneName(gBeacons[i].minor), gBeacons[i].best, gBeacons[i].sum / gBeacons[i].n, gBeacons[i].n);
  }
  Serial.printf("         other BLE advertisements (phones, etc.): %d\n", gOtherBle);
  result(gBeaconCount + gOtherBle > 0 ? "PASS" : "FAIL", "BLE radio", String(gBeaconCount + gOtherBle) + " advertisement source(s) heard");
  result(gBeaconCount == 3 ? "PASS" : gBeaconCount ? "WARN" : "WARN", "Project beacons", String(gBeaconCount) + " of 3 heard" + (gBeaconCount < 3 ? " - power the missing ones" : ""));
  sc->clearResults();

  // 8. heart-rate optical level
  if (gHrOk) {
    long ir = 0;
    for (int i = 0; i < 20; i++) { ir += gHr.getIR(); delay(10); }
    ir /= 20;
    result("INFO", "MAX30102 IR level", String(ir) + (ir > 50000 ? " - finger detected" : " - no finger (place one to test)"));
  }

  Serial.println(F("----------------------------------------------"));
  Serial.printf(" SUMMARY: %d pass, %d fail, %d warn/info\n", gPass, gFail, gWarn);
  Serial.println(F(" Live readout every second: press the button, put a finger on the sensor."));
  Serial.println(F("----------------------------------------------"));
}

void loop() {
  static uint32_t last = 0;
  static int lastBtn = HIGH;
  int b = digitalRead(PIN_SOS_BUTTON);
  if (b != lastBtn) {
    lastBtn = b;
    Serial.printf("[LIVE] button %s\n", b == LOW ? "PRESSED" : "released");
    if (b == LOW) beep(60);
  }
  if (millis() - last >= 1000) {
    last = millis();
    long ir = gHrOk ? gHr.getIR() : -1;
    Serial.printf("[LIVE] battery %.2f V   button %s   IR %ld%s\n", batteryVolts(), b == LOW ? "PRESSED " : "released",
                  ir, ir > 50000 ? " (finger)" : "");
  }
  delay(5);
}
