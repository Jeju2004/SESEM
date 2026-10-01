---
title: Decisions Log
tags: [decisions, sesem]
status: settled
---

# Decisions Log

Settled in adviser consultation. Considered final unless explicitly revisited — see [[Open Questions]] for what's still undecided.

| Item | Decision |
|---|---|
| Setting | Indoor only — a home for the aged. Outdoor tracking out of scope. |
| GPS module | Removed. Poor performance indoors. |
| Outdoor geofencing | Removed. Replaced by indoor zone detection. |
| Localization technology | BLE, using the ESP32's built-in radio, scanning fixed beacons per [[Zone Map\|zone]]. |
| Fall detection (accelerometer/gyroscope) | Removed. Not required — priority is localization, not motion analysis. |
| Caregiver interface | Web application, not a native mobile app. Browser-accessible, including phone. |
| Heart rate sensor | Added — MAX30102, see [[Hardware BOM - Wearable]]. |
| Door sensors | Added — magnetic reed switches at restricted-area entry points. Door closed = safe, door opened = warning. |
| Battery/power monitoring | Added — surfaced on GUI with low-battery alert. |
| SOS button | Added. Short press → SOS alert. Long press (hold) → cancel/dismiss false alarm. |
| WiFi-down fallback | Required — approach proposed but not confirmed, see [[Open Questions]]. |
| User manual | Confirmed as a critical, graded deliverable. |
| GSM/cellular (SIM800L) | Removed. 2G sunset risk in PH; unnecessary since system runs on facility WiFi. |
| PCB fabrication | **Self-fabricated** — hand-etched, single-sided with jumper wires. Approved 21 Sep 2026. *For the presented prototype, superseded on 24 Sep 2026 — perfboard is allowed; see "Final prototype construction" below.* |
| PCB design approach | **Module-carrier board** — ESP32, MAX30102, MAX17048 and TP4056 mounted as breakout modules on headers rather than bare ICs laid out directly. Approved 21 Sep 2026. |
| Board layer count / vendor | Superseded by self-fabrication: single-sided, no external vendor, no fabrication lead time. |
| Demo zone count | **Three zones** — `bedroom_wing` (safe), `dining_hall` (safe), `medicine_room` (restricted). Approved 21 Sep 2026. |
| Door sensor node MCU | **ESP32.** Standardises all three board types on one toolchain and matches the working bench prototype. Approved 21 Sep 2026. [[Hardware BOM - Door Sensor]] needs correcting — it still specifies ESP8266. |
| Target battery runtime | **24 hours.** Approved 21 Sep 2026. See the duty-cycle consequence below. |
| Defense contingency | **Agreed 21 Sep 2026.** If the etched board is not working four days before the defense, demonstrate on the breadboard and present the etched board as fabricated-but-under-debug, with layout and etching as evidence of work done. *Since 24 Sep this applies to the perfboard builds: if they are not working by Mon 28 Sep, demonstrate on the breadboard.* |
| **Final prototype construction** | **Perfboard allowed** for the final prototype presented at the defense. Adviser, **24 Sep 2026**. Etching is no longer required. The Rev C single-sided PCB layout stays as design documentation (KiCad project and artwork). Wearable: `Perfboard_Build_Guide.md`; door node: perfboard as well. Schematics are still required, in IEEE/ANSI symbols. |

## Localization granularity

- Room-level zone detection (which room the resident is in), **plus**
- Proximity to specific restricted points (door, medicine cabinet, etc.)

## Critical priorities (adviser-emphasized, in order)

1. Localization is the core deliverable — not motion sensing, not outdoor coverage.
2. The caregiver GUI is critical — predefined zones, safe vs. restricted, notifications.
3. Power management is critical — battery monitored and reported, low-battery state visible.
4. The prototype must actually work — not a mockup.
5. The user manual is critical — not an afterthought.

## Battery: runtime target vs. cell capacity — open engineering gap

The adviser approved a **24-hour** runtime target. The team has elected to
**keep the 1000 mAh cell** rather than move to 2000 mAh.

These two are not currently compatible:

| Quantity | Value |
|---|---|
| Approved runtime target | 24 h |
| Present average draw | ~60 mA |
| Energy required at that draw | ~1440 mAh |
| Usable capacity of a 1000 mAh Li-Po (~85%, not discharged flat) | ~850 mAh |
| Runtime actually achieved | **~14–16 h** |
| Average current needed to reach 24 h on this cell | **≈ 35 mA** |

Closing the gap is a **firmware duty-cycle change**, not a hardware one:
lengthen the BLE scan interval and the status reporting interval until average
draw reaches roughly 35 mA, then measure the result rather than calculating it.

This is a fair panel question and should be answered with a measured runtime
figure, not an estimate. Until that measurement exists, the paper should state
the target and the measured value separately.

## Related

[[00 Start Here]] · [[Open Questions]] · [[Current Design/System Design Plan]]
