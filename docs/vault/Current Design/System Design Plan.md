---
title: Revised System Design Plan (BLE-Based)
tags: [design, current, system-architecture]
supersedes: "[[Archive/Original GPS-GSM Draft]]"
---

# Revised System Design Plan — Indoor Elderly Localization and Safety Monitoring System (BLE-Based)

Full formatted version: `Attachments/Revised_System_Design_Plan.docx`

## Summary of revisions from professor consultation

See [[Decisions Log]] for the full settled list. Headline change: scope narrowed from outdoor GPS geofencing to indoor BLE zone tracking in a single home-for-the-aged facility.

## Objectives

**General:** Design and develop an indoor elderly localization and safety monitoring system for a care facility, using BLE-based zone tracking, door-sensor monitoring, and a web-based caregiver dashboard.

**Specific:**
- Wearable device reporting current zone via BLE proximity to fixed beacons (room-level + restricted-point granularity)
- Door/reed sensors at restricted-zone entry points, real-time alerts on boundary crossing
- SOS button with distinct short-press (alert) / long-press (dismiss) behavior
- Battery level and heart rate monitoring, displayed on caregiver dashboard
- Web-based caregiver GUI: floor plan, current zone, active alerts, device status
- Defined and tested WiFi-down fallback behavior

## Scope and limitations

**Scope:** single indoor facility, zone-based tracking (not coordinates), one wearable per prototype (conceptually scalable).

**Limitations:** BLE accuracy depends on beacon density and wall interference (zone-level, not centimeter-level); requires facility infrastructure (not wearable-only); no fall detection.

## System architecture

- **Wearable device** — see [[Hardware BOM - Wearable]]
- **Fixed facility infrastructure** — BLE beacons (one per [[Zone Map|zone]]), reed sensors — see [[Hardware BOM - Door Sensor]]
- **Backend server** — local (e.g. Raspberry Pi) vs. cloud-hosted — unconfirmed, see [[Open Questions]]

## SOS button logic (confirmed)

- Short press (< ~1.5 s): sends SOS alert with current zone + timestamp.
- Long press (~3+ s, exact threshold unconfirmed): cancels/dismisses an active SOS alert.

## Caregiver web application — GUI requirements

- Facility floor plan with resident's current zone highlighted
- Safe vs. restricted zones visually distinguished
- Real-time alert panel: SOS, restricted-door-opened, low-battery — each timestamped
- Wearable status: battery %, heart rate, last-updated time
- Alert acknowledgment/dismiss control
- Accessible via any standard browser, desktop or phone

## WiFi-down fallback (proposed, unconfirmed)

Wearable buzzes locally + LED blinks a distinct pattern, continues attempting to reconnect, queues last known zone/status to send on reconnection. Alternative considered: mesh relay through fixed beacon nodes. See [[Open Questions]].

## Related

[[00 Start Here]] · [[Decisions Log]] · [[Current Design/PCB Design Plan Rev2]] · [[Current Design/IEEE Paper Draft]]
