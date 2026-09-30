---
title: Wearable Perfboard Layout
tags: [hardware, perfboard, wearable, build, sesem]
updated: 2026-09-25
---

# Wearable Perfboard Layout — 6 × 8 cm, landscape

![[Wearable_Perfboard_Map.png]]

Proposed placement for the hand-soldered wearable (adviser-approved perfboard,
24 Sep 2026). Board **6 × 8 cm turned landscape, assumed 28 × 22 holes** —
count yours when it arrives and tell me if it differs. The connection list
(which pin joins which) is unchanged from `Perfboard_Build_Guide.md`; this map
adds **where each part sits**. Map generator:
`tools/deliverables/perfboard_map.js` in the repository.

## Why this orientation

- **Antenna** (devkit pin-1 end) overhangs the **top edge** — nothing above or
  beside it. RSSI is the whole project.
- **USB** overhangs the **bottom edge**, so the cable still plugs in for flashing.
- Everything else sits in the **right-hand 15 columns**; the Li-Po, TP4056 and
  MT3608 go on the **back**, bottom-right — the corner furthest from the antenna.
- **The devkit is soldered directly** (decided 25 Sep — no female headers, so
  the board stays thin). Solder only the pins that are used plus the four
  corners (orange rings on the map); the rest may stay unsoldered, which keeps
  the devkit removable if it ever fails. The battery divider (R3, R4, C4)
  therefore sits in the right-hand area, not under the devkit.

## Before soldering — dry fit

1. Measure the devkit's pin-row spacing: **25.4 mm (10 holes apart)** is assumed.
2. Set the devkit's pins into columns 1 and 11, rows 1–19, without soldering.
   Check that the antenna end overhangs the top edge and the USB end the bottom
   edge.
3. Lay every part in its place. Move anything that collides; note the change on
   the printed map.

## Soldering order — lowest parts first, devkit last

| Step | Parts | Check before moving on |
|---|---|---|
| 1 | R1–R6 (R5/R6 only if needed*), C4, D1 (band toward +5 V) | Orientation of D1 |
| 2 | Q1 2N2222 — flat face down, E-B-C left to right | Diode-test B→E and B→C ≈ 0.6–0.7 V |
| 3 | Headers for the U2 lead (4) and U3 (6, optional) | Straight and flush |
| 4 | D2 LED (K to GND); C1, C2, C3 — **lay C1 and C3 on their sides** to stay thin | Polarity of the electrolytics |
| 5 | SW1 slide, SW2 tact, BZ1 (or leave BZ1 on two wires) | — |
| 6 | Wire the nets on the underside with insulated wire (legend on the map) | Continuity of every net; **no short between 5V, 3V3 and GND holes** |
| 7 | **Devkit last:** the orange-ringed pins, 2–3 s per joint | No bridges between adjacent pins |
| 8 | Back: insulating sheet, Li-Po + TP4056 (M1) + MT3608 (M2) — **M2 OUT+ wired last**, after the check below | — |

\* R5/R6 only if the MAX30102 breakout has no pull-ups of its own.

## Power-up checkpoints

1. **Before M2 OUT+ is connected to the board:** power the MT3608 alone from the
   cell and set its output to **5.0 V** with a meter. It ships near 17.6 V — that
   killed one devkit on 24 Sep. Only then solder its OUT+ wire to the pad.
2. Switch on: **5V pin = 5.0 V**, **3V3 pin = 3.3 V**, VBAT = cell voltage,
   IO34 ≈ half the cell voltage.
3. Flash nothing new — the devkit runs the current firmware (SDA IO22, SCL IO21).
   Serial: `[HR] MAX30102 found` once the sensor lead is connected; SOS press →
   three beeps; buzzer and LED respond.

## Related

[[Hardware BOM - Wearable]] · [[Current Design/Final Hardware Plan Rev B]] · [[Field Test Plan]] · [[Resume Here]]
