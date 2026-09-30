---
title: Enclosure Measurement Sheet
tags: [enclosure, 3d-print, measurement, hardware, sesem]
updated: 2026-09-26
---

# Enclosure Measurement Sheet

Measure the **assembled** boards with calipers (to 0.1 mm) and fill in the
blanks — the 3D-printed enclosures are modelled from these numbers, not from
datasheets. Photos help as much as numbers: for each board take **top, underside
and all four sides**, each with a ruler in the shot.

## How to measure

- Lay the board **flat, component side up**.
- **Wearable:** ESP32 on the **left**, its antenna end at the **top edge**, USB
  at the **bottom edge** (as in [[Wearable Perfboard Layout]]).
- **Origin = the board's top-left corner.** **X** is measured to the right,
  **Y** downward, both from that corner.
- **Height ↑** = above the board's **top** surface. **Depth ↓** = below its
  **bottom** surface.
- For each part give its **outline** (X from–to, Y from–to) unless noted.

---

## 1. Wearable

### Board and stack

| # | Item | Value (mm) |
|---|---|---|
| W1 | Perfboard length (X) × width (Y) × thickness | ___ × ___ × ___ |
| W2 | Mounting holes? count, diameter, centre X,Y each | |
| W3 | ESP32 devkit outline on the board (X from–to, Y from–to) | |
| W4 | Height ↑ of the devkit's PCB **top** surface | |
| W5 | Height ↑ of the **heatsink top** (tallest point) | |
| W6 | Heatsink outline (X from–to, Y from–to) | |
| W7 | Tallest point anywhere else on top, and what it is | |
| W8 | Depth ↓ of the lowest point underneath (battery/modules/joints) | |

### Openings

| # | Item | Value (mm) |
|---|---|---|
| W9 | ESP32 USB connector: type (micro-B / USB-C); centre X; width × height; height ↑ of its centre; overhang past the board edge | |
| W10 | TP4056 charging port: type; which edge it faces; centre position along that edge; height or depth of its centre; width × height | |
| W11 | Power switch SW1: type (vertical slide / right-angle / toggle); position; lever size and travel; lever tip height ↑ | |
| W12 | SOS button SW2: centre X,Y; body size; top of the button height ↑ | |
| W13 | Status LED D2: centre X,Y; top height ↑; diameter | |
| W14 | Buzzer BZ1: centre X,Y; diameter; top height ↑; on board or on wires? | |

### Heart-rate sensor (fingertip window on the front)

| # | Item | Value (mm) |
|---|---|---|
| W15 | Sensor breakout board outline (length × width × thickness) | |
| W16 | Position of its header on the main board (X,Y); pin count | |
| W17 | Height ↑ of the sensor **face** (top of the optical chip) as it sits now | |
| W18 | Optical window on the chip (the small rectangle): size and position on the breakout | |
| W19 | OK to mount the sensor in a **holder under the lid window** on a short 4-wire lead? (yes/no) | |

### Underneath (back side)

| # | Item | Value (mm) |
|---|---|---|
| W20 | Battery L × W × thickness, and its position | |
| W21 | TP4056 module L × W × tallest height, and its position | |
| W22 | MT3608 module L × W × tallest height (inductor/trimpot), and its position | |
| W23 | Insulating sheet thickness | |

---

## 2. Door node

| # | Item | Value (mm) |
|---|---|---|
| D1 | Perfboard length × width × thickness | ___ × ___ × ___ |
| D2 | ESP32 on headers or soldered? outline on the board | |
| D3 | Heatsink fitted? height ↑ of the tallest point | |
| D4 | USB connector: type; centre X; height ↑ of its centre; overhang | |
| D5 | J1 terminal position; which side the reed wires should leave from | |
| D6 | Depth ↓ of the lowest point underneath | |
| D7 | Reed switch body L × W × H, and magnet L × W × H (for optional small housings) | |
| D8 | Mounting: screws into the wall, or double-sided tape? | |

## 3. Beacons (×3, identical)

| # | Item | Value (mm) |
|---|---|---|
| B1 | ESP32 devkit L × W; thickness including the pins underneath | |
| B2 | Heatsink fitted? height of the tallest point above the devkit PCB | |
| B3 | USB connector type; overhang past the board edge | |
| B4 | Mounting: stand, wall screw, or tape? Beacon height target 1.2–1.5 m | |

## 4. Printer

| Item | Value |
|---|---|
| Printer model and bed size | |
| Nozzle size / layer height | |
| Material (PLA / PETG / other) and colour | |
| Screws on hand (M2 / M2.5 / M3, lengths) — or prefer snap-fit | |

## Known so far (26 Sep, from the team's photos and Rev C2)

These still need confirming with calipers on the built board.

| Part | Size | Notes |
|---|---|---|
| Wearable PCB (Rev C3) | 69 × 66 mm, 1.6 mm | See `KiCad Rev C/README.md` |
| ESP32 DevKitC | 55 × 28 mm | On 5 mm female headers (+ ~2.5 mm male-header plastic) |
| MAX30102 module | 20 × 15 mm | On 2 × 4 female headers, sensor side up, top-left of the board |
| MAX17043 fuel gauge | 24.1 × 10.2 mm + JST | On 2 × 3 female headers, top-middle, JST plug from the right |
| SOS switch | 12 × 12 mm | Bottom-middle of the board |
| MT3608 | 36 × 18 × 6 mm | Power deck under the board |
| TP4056 + DW01 | 28 × 17 mm, **USB Type-C** (corrected 27 Sep; was noted as micro-USB) | Power deck, USB-C facing the left-wall opening |
| Buzzer | 12 mm Ø | Bottom right |
| C3 470 µF | 10 mm Ø, tall | Top-left corner — may set the lid height |

## Design notes so far

- **Heatsink = tallest part** (≈ 18 mm above the board on female headers) →
  the wearable case is about 30–34 mm thick with the battery underneath, and
  needs **vent slots above the heatsink**.
- **Antenna end kept clear** — no metal, no thick walls near it; plastic is
  fine, but no screws or inserts at that end.
- **Heart-rate sensor** — a fingertip cannot reach a sensor ~9 mm below the lid,
  so it goes in a printed holder flush with a lid window, on a short lead (W19).
- **SOS button** — a printed plunger through the lid to the tact switch.
- **Belt clip** — printed spring clip on the back, integral or screw-on.

## Related

[[Wearable Perfboard Layout]] · [[Door Node Perfboard Layout]] · [[ESP32 DevKitC Pinout]] · [[Work Log]]
