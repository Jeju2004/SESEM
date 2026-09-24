#pragma once
// =============================================================================
// TroDes Phase 1 — Beacon zone configuration
// =============================================================================
// EDIT THIS FILE BEFORE FLASHING EACH PHYSICAL BEACON.
// Every board runs identical code; only ZONE_ID / ZONE_NAME differ.
// The zone table lives in docs/ZONE_CONFIG.md — keep the two in sync.
// =============================================================================

// ---- Shared across the whole system (do NOT change per board) ---------------
// All TroDes beacons advertise this iBeacon proximity UUID. The wearable
// ignores every beacon whose UUID does not match, so a neighbouring building's
// iBeacons cannot be mistaken for a zone.
#define BEACON_UUID       "5ca9015e-adc8-40a9-a1e2-d539f3b065bd"

// Major = installation/site number. 1 = the demo facility.
#define BEACON_MAJOR      1

// ---- Per-board: CHANGE THESE TWO ONLY ---------------------------------------
// Minor = zone id. See docs/ZONE_CONFIG.md:
//   SAFE:       1 bedroom_wing | 2 dining_hall | 3 common_area_garden
//   RESTRICTED: 11 medicine_room | 12 main_exit | 13 stairwell
#define ZONE_ID           2 
#define ZONE_NAME         "dining_hall"

// ---- Radio ------------------------------------------------------------------
// Calibrated RSSI at 1 m, in dBm. PLACEHOLDER: -59 dBm is the generic iBeacon
// default. Test 1 in docs/PHASE1_TEST_GUIDE.md measures the real value for
// these boards; update it here and in the wearable's config.h afterwards.
#define MEASURED_POWER_1M (-59)

// Advertising interval, in units of 0.625 ms.
// 160 * 0.625 ms = 100 ms. Faster = quicker zone response, more current.
// Beacons are mains-powered, so a fast interval costs nothing here.
#define ADV_INTERVAL_MIN  160
#define ADV_INTERVAL_MAX  160

// TX power. Keep EVERY beacon at the same level or the RSSI-to-distance
// model stops being comparable between zones.
//   ESP-IDF enum: N12, N9, N6, N3, N0, P3, P6, P9
//   ESP_PWR_LVL_P3 = +3 dBm, ESP_PWR_LVL_P9 = +9 dBm  (P7 does not exist)
#define BEACON_TX_POWER   ESP_PWR_LVL_P9

// Optional heartbeat LED (most devkits have one on GPIO 2). Set to -1 to skip.
#define STATUS_LED_PIN    2
