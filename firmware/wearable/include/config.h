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

// Scan cadence. The scanner runs continuously; each "tick" is one classify
// pass over the RSSI table. 300 ms is a compromise between responsiveness and
// current draw — see the duty-cycle note in docs/PHASE1_TEST_GUIDE.md.
#define SCAN_TICK_MS           300
#define SCAN_INTERVAL          100      // units of 0.625 ms -> 62.5 ms
#define SCAN_WINDOW            99       // must be <= SCAN_INTERVAL

// An RSSI reading older than this is discarded: the beacon is out of range.
#define BEACON_STALE_MS        4000

// Exponential moving average applied to each beacon's RSSI.
// new = alpha*sample + (1-alpha)*old. Lower alpha = smoother but slower.
#define RSSI_EMA_ALPHA         0.35f

// Hysteresis. To take over as current zone, a challenger must beat the
// incumbent by HYSTERESIS_DB and keep doing so for CONFIRM_TICKS ticks.
// At 300 ms/tick, 3 ticks = ~900 ms minimum dwell before a zone change.
// Test 3 in the test guide tunes both numbers.
#define HYSTERESIS_DB          4.0f
#define CONFIRM_TICKS          3

// Below this smoothed RSSI, a beacon is considered too weak to count as
// "the room I am in" at all. Placeholder — Test 1 gives the real floor.
#define RSSI_FLOOR_DBM         (-88.0f)

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
#define PIN_STATUS_LED         2        // on-board LED on most devkits
#define PIN_I2C_SDA            21
#define PIN_I2C_SCL            22

// -----------------------------------------------------------------------------
// SOS button
// -----------------------------------------------------------------------------
#define BUTTON_DEBOUNCE_MS     40
// Short press = raise alert. Long press = dismiss a false alarm.
// 3000 ms is the adviser's PROPOSED value and is NOT yet confirmed.
#define SOS_LONG_PRESS_MS      3000

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
// Battery (MAX17048, with ADC divider fallback)
// -----------------------------------------------------------------------------
#define BATTERY_READ_PERIOD_MS 30000
#define BATTERY_LOW_PCT        20.0f    // not yet adviser-reviewed
#define BATTERY_CRITICAL_PCT   10.0f    // not yet adviser-reviewed
// Fallback path if the MAX17048 is absent: ADC on a 2:1 divider.
#define PIN_BATTERY_ADC        34
#define BATTERY_DIVIDER_RATIO  2.0f
#define BATTERY_ADC_REF_V      3.30f
#define BATTERY_FULL_V         4.20f
#define BATTERY_EMPTY_V        3.30f

// -----------------------------------------------------------------------------
// WiFi / backend
// -----------------------------------------------------------------------------
// Leave WIFI_SSID empty ("") to skip WiFi entirely — Phase 1 BLE testing runs
// fine over serial alone and does not need a backend to exist.
#define WIFI_SSID              ""
#define WIFI_PASSWORD          ""
#define WIFI_CONNECT_TIMEOUT_MS 15000
#define WIFI_RETRY_PERIOD_MS   20000

// PLACEHOLDER. No backend exists yet, and backend hosting (local server vs
// cloud) is still an open question with the adviser.
#define BACKEND_BASE_URL       "http://192.168.1.100:8000"
#define ENDPOINT_STATUS        "/api/v1/status"
#define ENDPOINT_ALERT         "/api/v1/alert"
#define HTTP_TIMEOUT_MS        4000

#define STATUS_REPORT_PERIOD_MS 5000    // heartbeat to the dashboard
#define OFFLINE_QUEUE_DEPTH    24       // events kept while WiFi is down

// -----------------------------------------------------------------------------
// WiFi-down local fallback
// -----------------------------------------------------------------------------
// PROPOSED behaviour, not yet adviser-confirmed: queue events for retry, and
// make the wearable itself audible/visible so an SOS is not silently lost.
#define OFFLINE_CHIRP_PERIOD_MS 60000   // periodic reminder chirp when offline
#define SERIAL_LOG_PERIOD_MS   1000     // status line cadence on serial
