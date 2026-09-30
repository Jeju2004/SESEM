---
title: Door Node Perfboard Layout
tags: [hardware, perfboard, door-node, build, sesem]
updated: 2026-09-25
---

# Door Node Perfboard Layout — 5 × 7 cm, portrait

![[Door_Node_Perfboard_Map.png]]

**Solder side** (board flipped over sideways — the links are soldered here):

![[Door_Node_Solder_Side.png]]

The door sensor node on one of the 5 × 7 cm boards already in hand (board
assumed **18 × 24 holes** — count yours). The wearable waits for the 6 × 8 cm
boards: see [[Wearable Perfboard Layout]]. Map generator:
`tools/deliverables/perfboard_door_map.js` in the repository.

## Complete wiring

![[Door_Node_Wiring.png]]

Generator: `tools/deliverables/door_wiring.js`. Pin names follow
[[ESP32 DevKitC Pinout]].

## The circuit

| Part | Connection |
|---|---|
| ESP32 DevKitC, **soldered directly** (no headers, decided 25 Sep) | columns 1 and 11, rows 4–22 |
| J1 2-pin screw terminal (reed switch leads) | column 14, rows 12 and 14 |
| Link A | **IO18** (col 11, row 12) → J1 upper, along row 12 |
| Link B | **GND** (col 11, row 10) → along row 10 to column 15, down to row 14, left to J1 lower |
| Power | 5 V USB adapter into the devkit's own USB port |

The reed switch moved from IO27 to **IO18** on 25 Sep (firmware updated) so both
links are short runs beside the devkit — no hookup wire needed: use leg offcuts
from resistors/LEDs, or a breadboard jumper with its ends cut off. No resistor on
the reed: the firmware enables the ESP32's internal pull-up. Door closed (magnet
near) → IO18 reads LOW; door open → HIGH → alert. No external LED — the devkit's
own LED (IO2) shows status.

## Build

1. Dry-fit the devkit (columns 1 and 11, rows 4–22, USB end at the bottom edge)
   and J1 (column 14, rows 12 and 14).
2. Solder **J1**.
3. Solder the **devkit** — only the orange-ringed pins: IO18 (row 12), GND
   (row 10) and the four corners. 2–3 s per joint. The rest may stay
   unsoldered so the devkit can be removed if it ever fails.
4. Solder **link A** and **link B** on the underside, from the devkit pin joints
   to J1. The map is drawn from the component side — on the underside left and
   right are swapped. Keep the two links apart.

## Checks

1. Continuity, USB unplugged: IO18 pin ↔ J1 upper **beeps**; GND pin ↔ J1 lower
   **beeps**; J1 upper ↔ J1 lower **silent** (no reed fitted); 5V ↔ GND
   **silent**.
2. USB power on. Flash the door firmware (reed on IO18) — WiFi details in
   `firmware/door_sensor/include/secrets.h` when needed for the dashboard.
3. Serial monitor at 115200: move the magnet to and from the reed switch — each
   change prints an event; the dashboard's **Restricted doors** panel follows it.

## Related

[[Hardware BOM - Door Sensor]] · [[Field Test Plan]] · [[Wearable Perfboard Layout]]
