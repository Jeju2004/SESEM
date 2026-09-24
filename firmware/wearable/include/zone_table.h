#pragma once
#include <stdint.h>

// =============================================================================
// TroDes zone table — MUST match docs/ZONE_CONFIG.md and every beacon's
// zone_config.h. The beacon's iBeacon "minor" field is the zone id.
// =============================================================================
// This is the full 6-zone sample facility map. The number of zones actually
// demonstrated in Week 9 is still an open question with the adviser; scale
// this table down (and flash fewer beacons) once that is settled.

struct ZoneDef {
  uint16_t    id;
  const char *name;
  bool        restricted;
};

static const ZoneDef kZones[] = {
    // --- Safe zones ---
    {  1, "bedroom_wing",       false },
    {  2, "dining_hall",        false },
    {  3, "common_area_garden", false },
    // --- Restricted zones (also covered by a reed door sensor) ---
    { 11, "medicine_room",      true  },
    { 12, "main_exit",          true  },
    { 13, "stairwell",          true  },
};

static const size_t kZoneCount = sizeof(kZones) / sizeof(kZones[0]);
