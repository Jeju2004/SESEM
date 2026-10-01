---
title: Zone Map
tags: [zones, facility, sesem]
---

# Zone Map (sample facility layout)

## Safe zones
- Bedroom wing
- Dining hall
- Common area / garden

## Restricted zones — each requires a door sensor
- Medicine room
- Main exit door
- Stairwell

**Infrastructure:** one BLE beacon per zone for room-level tracking; magnetic reed sensors at each restricted-zone entry point ([[Hardware BOM - Door Sensor]]).

## Localization logic

- **Room-level detection:** the wearable's BLE scan identifies the strongest-signal beacon to determine which zone the wearer is currently in.
- **Restricted-point detection:** dedicated door/reed sensors at specific restricted points provide higher-precision, binary safe/unsafe status independent of BLE — door closed = safe, door opened = immediate alert.
- The caregiver GUI shows both layers together: current zone (from BLE) and any restricted-point alerts (from door sensors).

## Open item

Number of zones/beacons to actually build for the Week 9 defense demo is unconfirmed — see [[Open Questions]]. A full facility is likely too large; a scaled-down representative area is expected.

## Related

[[00 Start Here]] · [[Phase 1 BLE POC]] · [[Current Design/System Design Plan]]
