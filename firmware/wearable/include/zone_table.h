#pragma once
#include <stdint.h>

// =============================================================================
// TroDes zone table — MUST match docs/ZONE_CONFIG.md and every beacon's
// zone_config.h. The beacon's iBeacon "minor" field is the zone id.
// =============================================================================
// Defense demo: three zones, one beacon each, approved by the adviser on
// 21 Sep 2026. The full facility map also had common_area_garden (3),
// main_exit (12) and stairwell (13) — add them back here, and flash a beacon
// for each, to extend the system.

struct ZoneDef {
  uint16_t    id;
  const char *name;
  bool        restricted;
};

static const ZoneDef kZones[] = {
    // --- Safe zones ---
    {  1, "bedroom_wing",       false },
    {  2, "dining_hall",        false },
    // --- Restricted zones (also covered by a reed door sensor) ---
    { 11, "medicine_room",      true  },
};

static const size_t kZoneCount = sizeof(kZones) / sizeof(kZones[0]);
