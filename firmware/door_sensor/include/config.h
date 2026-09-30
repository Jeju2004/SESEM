#pragma once
// =============================================================================
// TroDes Phase 1 — Door sensor node configuration
// =============================================================================
// EDIT DOOR_ID / DOOR_NAME PER PHYSICAL UNIT before flashing.
// =============================================================================

// Must match a restricted zone in docs/ZONE_CONFIG.md and a door in
// dashboard/config/zones.json. Defense demo: one door node, on medicine_room.
// (The full facility map also had 12 main_exit and 13 stairwell.)
#define DOOR_ID                11
#define DOOR_NAME              "medicine_room"
#define NODE_ID                "door-11"

// -----------------------------------------------------------------------------
// Reed switch
// -----------------------------------------------------------------------------
// Wire the reed switch between the pin and GND, with INPUT_PULLUP.
// Magnet present (door CLOSED)  -> contact closed -> pin reads LOW
// Magnet away   (door OPEN)     -> contact open   -> pin reads HIGH (pull-up)
// Set REED_ACTIVE_LOW_IS_CLOSED to 0 if you fit a normally-open reed instead.
#if defined(ESP8266)
  #define PIN_REED             D5     // GPIO14 on a D1 mini
  #define PIN_STATUS_LED       D4     // GPIO2, on-board LED (active LOW)
  #define LED_ACTIVE_LOW       1
#else
  // GPIO 18 (devkit pin 28): right-hand header, two rows below a GND pin, so the
  // perfboard needs only two short links. Was GPIO 27 on the breadboard.
  #define PIN_REED             18
  #define PIN_STATUS_LED       2
  #define LED_ACTIVE_LOW       0
#endif

#define REED_ACTIVE_LOW_IS_CLOSED 1
#define REED_DEBOUNCE_MS       50

// -----------------------------------------------------------------------------
// WiFi / backend
// -----------------------------------------------------------------------------
// WiFi name, password and the backend address live in include/secrets.h,
// which git ignores so the password never reaches GitHub. Copy
// include/secrets.h.example to include/secrets.h and fill it in (same values
// as the wearable's). Without it the node runs offline.
#if __has_include("secrets.h")
  #include "secrets.h"
#endif
#ifndef WIFI_SSID
  #define WIFI_SSID            ""
#endif
#ifndef WIFI_PASSWORD
  #define WIFI_PASSWORD        ""
#endif
// The PC running the dashboard. Backend hosting (local vs cloud) is still an
// open question with the adviser.
#ifndef BACKEND_BASE_URL
  #define BACKEND_BASE_URL     "http://192.168.1.100:8000"
#endif
#define WIFI_CONNECT_TIMEOUT_MS 15000
#define WIFI_RETRY_PERIOD_MS   20000

#define ENDPOINT_DOOR          "/api/v1/door"
#define ENDPOINT_STATUS        "/api/v1/status"   // hub mode: wearable ingest
#define ENDPOINT_ALERT         "/api/v1/alert"
#define HTTP_TIMEOUT_MS        4000

// Heartbeat so the dashboard can distinguish "door closed" from "node dead".
#define HEARTBEAT_PERIOD_MS    30000

// Events held while WiFi is down. A door node is mains-powered but the AP can
// still drop; a missed open event is the one thing this node must not lose.
#define OFFLINE_QUEUE_DEPTH    64       // door events only while offline; 64 x 224 B ≈ 14 KB

// NOTE: battery backup for door nodes is an OPEN question with the adviser.
// As written this node is mains-only: a power cut silences it, and the
// dashboard will see the heartbeat stop.

// -----------------------------------------------------------------------------
// SESEMSG hub mode (env esp32hub, -DHUB_MODE=1) - see src/hub.cpp
// -----------------------------------------------------------------------------
// The node also runs its own Wi-Fi network and the whole dashboard, so the
// system works with no laptop. The network name, its password and the
// dashboard passcode are credentials: they live in include/secrets.h only.
#ifndef HUB_MODE
  #define HUB_MODE             0
#endif
#if HUB_MODE
  #if !defined(HUB_AP_SSID) || !defined(HUB_AP_PASSWORD) || !defined(HUB_PASSCODE)
    #error "Hub mode needs HUB_AP_SSID, HUB_AP_PASSWORD (8+ chars) and HUB_PASSCODE in include/secrets.h - see secrets.h.example"
  #endif
  #define HUB_AP_CHANNEL       6      // follows the uplink's channel once that connects
  #define HUB_MAX_CLIENTS      8      // the ESP32's DHCP server leases 8 addresses
  // Radio power of the hub's network. Full power (19.5 dBm) for the defense
  // room. For bench tests with the wearable a few cm away, build with
  // PLATFORMIO_BUILD_FLAGS=-DHUB_TX_POWER=WIFI_POWER_2dBm or keep them 1 m apart.
  #ifndef HUB_TX_POWER
    #define HUB_TX_POWER       WIFI_POWER_19_5dBm
  #endif
  // 1 = also join WIFI_SSID (if in range) and forward everything to the laptop
  // server at BACKEND_BASE_URL, so the laptop dashboard keeps working too.
  #ifndef HUB_UPLINK
    #define HUB_UPLINK         1
  #endif
  // More uplink networks, tried in order after WIFI_SSID (e.g. the pocket
  // router, a phone hotspot). Set them in secrets.h.
  #ifndef WIFI2_SSID
    #define WIFI2_SSID         ""
    #define WIFI2_PASSWORD     ""
  #endif
  #ifndef WIFI3_SSID
    #define WIFI3_SSID         ""
    #define WIFI3_PASSWORD     ""
  #endif
  // SESEMSG cloud relay (relay/, a Cloudflare Worker) for viewing from any
  // network. RELAY_URL like "https://sesemsg.<account>.workers.dev" and
  // RELAY_KEY = the relay's HUB_KEY secret. Empty = no remote viewing.
  #ifndef RELAY_URL
    #define RELAY_URL          ""
  #endif
  #ifndef RELAY_KEY
    #define RELAY_KEY          ""
  #endif
  #define RELAY_PUSH_MS        3000
#endif
