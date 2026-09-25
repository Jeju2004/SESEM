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
  #define PIN_REED             27
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
#define HTTP_TIMEOUT_MS        4000

// Heartbeat so the dashboard can distinguish "door closed" from "node dead".
#define HEARTBEAT_PERIOD_MS    30000

// Events held while WiFi is down. A door node is mains-powered but the AP can
// still drop; a missed open event is the one thing this node must not lose.
#define OFFLINE_QUEUE_DEPTH    16

// NOTE: battery backup for door nodes is an OPEN question with the adviser.
// As written this node is mains-only: a power cut silences it, and the
// dashboard will see the heartbeat stop.
