#pragma once
// =============================================================================
// TroDes Phase 1 — Wearable configuration
// =============================================================================
// Everything tunable lives here. src/main.cpp should not need editing for
// normal bring-up or testing.
// =============================================================================

// -----------------------------------------------------------------------------
// Identity
// -----------------------------------------------------------------------------
#define DEVICE_ID              "wearable-01"
#define RESIDENT_LABEL         "Resident 1"     // display only

// -----------------------------------------------------------------------------
// BLE / zone detection  (must match the beacons — see docs/ZONE_CONFIG.md)
// -----------------------------------------------------------------------------
#define BEACON_UUID            "5ca9015e-adc8-40a9-a1e2-d539f3b065bd"
#define BEACON_MAJOR           1

// Scan cadence. Each "tick" is one classify pass over the RSSI table.
// 200 ms since 29 Sep (was 300): faster room entry/exit for the demo. The radio duty
// cycle itself (scan interval/window, active vs passive) is set by
// POWER_PROFILE below.
#define SCAN_TICK_MS           200

// -----------------------------------------------------------------------------
// Power profile
// -----------------------------------------------------------------------------
// 0 = TEST       Continuous active scan (~99 % radio duty), CPU 240 MHz,
//                status every 5 s. The configuration Phase 1 and Test 2 use.
// 1 = LOW_POWER  Passive scan at ~30 % radio duty, CPU 80 MHz, status every
//                10 s. For battery-runtime work. MEASURE the runtime — never
//                quote a calculated figure — and re-check zone accuracy (Test 2
//                near and boundary points) before demonstrating on this profile.
// A passive scan loses nothing here: zone detection reads the iBeacon frame in
// the advertisement itself, never the scan response.
// Override without editing this file: set PLATFORMIO_BUILD_FLAGS=-DPOWER_PROFILE=1
#ifndef POWER_PROFILE
  #define POWER_PROFILE        0
#endif

#if POWER_PROFILE == 1
  #define SCAN_ACTIVE              0
  #define SCAN_INTERVAL            160    // units of 0.625 ms -> 100 ms
  #define SCAN_WINDOW              48     // 30 ms -> 30 % radio duty
  #define CPU_FREQ_MHZ             80     // lowest clock that still runs BLE + WiFi
  #define STATUS_REPORT_PERIOD_MS  10000  // dashboard marks a wearable stale at 30 s
#else
  #define SCAN_ACTIVE              1
  #define SCAN_INTERVAL            100    // units of 0.625 ms -> 62.5 ms
  #define SCAN_WINDOW              99     // must be <= SCAN_INTERVAL
  #define CPU_FREQ_MHZ             240
  #define STATUS_REPORT_PERIOD_MS  5000   // heartbeat to the dashboard
#endif

// An RSSI reading older than this is discarded: the beacon is out of range.
#define BEACON_STALE_MS        2500   // was 4000: leaving a room registers ~1.5 s sooner

// Exponential moving average applied to each beacon's RSSI.
// new = alpha*sample + (1-alpha)*old. Lower alpha = smoother but slower.
#define RSSI_EMA_ALPHA         0.4f   // was 0.35: a little faster; the adaptive confirm below stops flicker

// Hysteresis. To take over as current zone, a challenger must beat the
// incumbent by HYSTERESIS_DB and keep doing so for a number of ticks that
// depends on HOW CLEARLY it leads (adaptive confirm, 29 Sep):
//   lead >= FAST_LEAD_DB  -> CONFIRM_TICKS_FAST ticks (a clear room change)
//   smaller lead          -> CONFIRM_TICKS_SLOW ticks (two beacons of similar
//                            strength: people moving near the wearable or a
//                            beacon swing BLE by 5-15 dB, which made the
//                            dashboard jump between two rooms)
// At 200 ms/tick, 2 ticks = ~400 ms minimum dwell before a zone change
// (was 300 ms x 3 = ~900 ms).
// Test 3 in the test guide tunes both numbers.
#define HYSTERESIS_DB          5.0f   // was 4
#define FAST_LEAD_DB           10.0f
#define CONFIRM_TICKS_FAST     2      // x 200 ms = 0.4 s
#define CONFIRM_TICKS_SLOW     8      // x 200 ms = 1.6 s
// 'No beacon at all' must hold for this many ticks, AFTER the BEACON_STALE_MS
// timeout, before the zone becomes unknown: 30 x 200 ms = 6 s, so about 8.5 s
// with no beacon heard. Was 2 ticks (0.4 s, about 3 s in all), which raised
// "Location unknown" at every doorway and hallway and whenever a WiFi scan
// briefly took the shared radio away from BLE (1 Oct, house test). The
// dashboard keeps showing the last zone meanwhile.
#define ZONE_LOST_CONFIRM_TICKS 30

// Below this smoothed RSSI, a beacon is considered too weak to count as
// "the room I am in" at all. Placeholder — Test 1 gives the real floor.
#define RSSI_FLOOR_DBM         (-88.0f)

// Zone ENTRY threshold, for zones that share one room (the defense demo).
// Off (-999) = normal behaviour: the strongest beacon above RSSI_FLOOR_DBM wins,
// subject to the hysteresis below — correct when each zone is its own room.
// On (e.g. -72) = proximity zones: a zone is only entered when its beacon is at
// least this strong (roughly within 1 m), and between beacons the wearable
// keeps its last zone instead of guessing. Test 2 Run 1 (24 Sep, BW and MR
// beacons in one room): near points read -65 to -73 dBm, mid-room -80 to -86,
// and mid-room points were misclassified. Calibrate in the actual demo room.
// Override without editing: PLATFORMIO_BUILD_FLAGS=-DZONE_ENTRY_DBM=-72
#ifndef ZONE_ENTRY_DBM
  #define ZONE_ENTRY_DBM       (-999.0f)
#endif

// Path-loss model, used only for the human-readable distance estimate on
// serial. Zone classification does NOT depend on these numbers.
//   d = 10 ^ ((measuredPower - rssi) / (10 * n))
// PLACEHOLDERS — Test 1 in docs/PHASE1_TEST_GUIDE.md measures both.
#define PATH_LOSS_EXPONENT     2.5f
#define MEASURED_POWER_1M      (-59.0f)

// -----------------------------------------------------------------------------
// Diagnostics
// -----------------------------------------------------------------------------
// 1 = print every manufacturer-data advertisement the scanner hears, as raw
// hex, plus per-tick counters showing how far each packet got through the
// filter. Use this when [RSSI] shows "--" for a beacon you believe is
// advertising. Set back to 0 once zone detection is confirmed -- it is noisy
// and it costs airtime-proportional serial bandwidth.
#define DEBUG_BLE_SNIFF        0

// -----------------------------------------------------------------------------
// Pins
// -----------------------------------------------------------------------------
#define PIN_SOS_BUTTON         27       // to GND, INPUT_PULLUP
#define PIN_BUZZER             25       // NPN driver base via resistor
#define PIN_STATUS_LED         2        // on-board LED on most devkits, and D2 on the PCB
#define LED_HEARTBEAT_PERIOD_MS 2000    // one short "alive" blink this often
#define LED_HEARTBEAT_ON_MS    60
#define PIN_I2C_SDA            22       // was 21 - swapped for the Rev C single-layer PCB
#define PIN_I2C_SCL            21       // was 22 - swapped for the Rev C single-layer PCB
// Rev C2: the MAX17043 fuel gauge has its own I2C bus (Wire1) so both modules
// route on one copper layer. The heart-rate bus above is unchanged.
#define PIN_FG_SDA             4
#define PIN_FG_SCL             16
#define FG_I2C_ADDR            0x36     // MAX17043 7-bit address

// -----------------------------------------------------------------------------
// SOS button
// -----------------------------------------------------------------------------
#define BUTTON_DEBOUNCE_MS     40
// Press = raise alert (on the press, not the release). Hold = dismiss a false alarm.
// 3000 ms is the adviser's PROPOSED value and is NOT yet confirmed.
#define SOS_LONG_PRESS_MS      3000

// SOS button patterns (30 Sep 2026, team request). Quick presses choose how
// urgent the message to the caregivers is; the alert goes out once the
// pattern is complete - SOS_PATTERN_GAP_MS after the last press - with 1, 2 or
// 3 confirmation beeps. A stronger pattern while an SOS is still open
// escalates it. PROPOSED wording: confirm it with the adviser.
#define SOS_PATTERN_GAP_MS     700
#define SOS_MSG_1              "Needs assistance"
#define SOS_MSG_2              "URGENT - please come now"
#define SOS_MSG_3              "EMERGENCY - immediate help needed"

// -----------------------------------------------------------------------------
// Heart rate (MAX30102)
// -----------------------------------------------------------------------------
#define HR_ENABLED             1
#define HR_SAMPLE_PERIOD_MS    20       // sensor polling
#define HR_REPORT_PERIOD_MS    5000     // how often a BPM value is published
// The system has NO adviser-approved heart-rate alert thresholds yet, so the
// firmware only reports the value; it raises no HR alert of its own.
// If thresholds are approved later, add them here and in the alert logic.

// -----------------------------------------------------------------------------
// Battery (R3/R4 divider on GPIO 34; MAX17043 gauge optional)
// -----------------------------------------------------------------------------
#define BATTERY_READ_PERIOD_MS 30000
#define BATTERY_LOW_PCT        20.0f    // not yet adviser-reviewed
#define BATTERY_CRITICAL_PCT   10.0f    // not yet adviser-reviewed
// On Rev B/C the divider is the PRIMARY battery source; the MAX17043 is used
// instead only if it is fitted and answers on I2C.
#define PIN_BATTERY_ADC        34
#define BATTERY_DIVIDER_RATIO  2.0f     // R3 = R4 = 100 k
#define BATTERY_ADC_SAMPLES    16       // averaged per read; one sample is too noisy
#define BATTERY_ABSENT_V       2.5f     // below this no cell is connected (USB / power bank): report "no battery"
// Voltage -> percentage uses the piecewise Li-Po table in main.cpp
// (kLipoCurve), not a straight line: the cell sits near 3.7-3.8 V for most of
// its discharge, so a linear map would misreport the middle of the range.

// -----------------------------------------------------------------------------
// WiFi / backend
// -----------------------------------------------------------------------------
// WiFi name, password and the backend address live in include/secrets.h,
// which git ignores so the password never reaches GitHub. Copy
// include/secrets.h.example to include/secrets.h and fill it in. Without it,
// WIFI_SSID stays empty and the wearable runs offline — Phase 1 BLE testing
// runs fine over serial alone and does not need a backend to exist.
#if __has_include("secrets.h")
  #include "secrets.h"
#endif
#ifndef WIFI_SSID
  #define WIFI_SSID            ""
#endif
#ifndef WIFI_PASSWORD
  #define WIFI_PASSWORD        ""
#endif
// The laptop or Pi running the dashboard. Backend hosting (local vs cloud) is
// still an open question with the adviser.
#ifndef BACKEND_BASE_URL
  #define BACKEND_BASE_URL     "http://192.168.1.100:8000"
#endif
// The SESEMSG hub (door node built with env esp32hub) - optional. When its
// network is in range the wearable reports to it and needs no laptop;
// otherwise it uses WIFI_SSID and the laptop at BACKEND_BASE_URL as before.
#ifndef HUB_SSID
  #define HUB_SSID             ""
#endif
#ifndef HUB_PASSWORD
  #define HUB_PASSWORD         ""
#endif
#ifndef HUB_BASE_URL
  #define HUB_BASE_URL         "http://192.168.4.1"
#endif
#define HUB_RECHECK_MS         60000    // on the fallback network: look for the hub this often
#define POST_FAILS_TO_SWITCH   4        // this many failed POSTs in a row: pick the network again

#define WIFI_CONNECT_TIMEOUT_MS 15000
#define WIFI_RETRY_PERIOD_MS   10000    // was 20 s: back on the hub sooner after it restarts

#define ENDPOINT_STATUS        "/api/v1/status"
#define ENDPOINT_ALERT         "/api/v1/alert"
#define HTTP_TIMEOUT_MS        4000

// STATUS_REPORT_PERIOD_MS is set by POWER_PROFILE above.
#define OFFLINE_QUEUE_DEPTH    48       // alerts kept while WiFi is down (status is not queued offline)

// -----------------------------------------------------------------------------
// WiFi-down local fallback
// -----------------------------------------------------------------------------
// PROPOSED behaviour, not yet adviser-confirmed: queue events for retry, and
// make the wearable itself audible/visible so an SOS is not silently lost.
#define OFFLINE_CHIRP_PERIOD_MS 60000   // periodic reminder chirp when offline
#define SERIAL_LOG_PERIOD_MS   1000     // status line cadence on serial
