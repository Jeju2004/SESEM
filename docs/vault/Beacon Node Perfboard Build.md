---
title: Beacon Node Perfboard Build
tags: [beacon, perfboard, build, hardware, sesem]
updated: 2026-09-27 (ESP32 soldered directly — no female headers)
---

# Beacon Node — perfboard build (×3)

Each beacon is an ESP32 DevKitC that advertises one zone. It is **soldered
directly to the perfboard** by its own pins. There are **no female headers**
(team decision, 27 Sep; the door node is built the same way). A **5 V USB phone charger** powers it
through the devkit's own micro-USB. You can add an **outside status LED** so
the heartbeat blink is visible through the enclosure.

- **Schematic:** `Beacon_Node_Schematic.pdf` (KiCad project `beacon_node.kicad_sch`). ERC clean.
- **Layout:** `Beacon_Perfboard_ComponentSide.png` and `Beacon_Perfboard_SolderSide.png`.

![[Beacon_Perfboard_ComponentSide.png]]

![[Beacon_Perfboard_SolderSide.png]]

| Net | Connects |
|---|---|
| IO2 (ESP32 pin 34) | R1 330 Ω |
| R1 other end | D1 anode (long leg) |
| D1 cathode (flat side) | GND (ESP32 pin 26) |
| All other pins | Nothing. Power comes from USB |

## Parts per beacon

| Qty | Part | Note |
|---|---|---|
| 1 | Perfboard 5 × 7 cm, 18 × 24 holes | Dry-fit first; the layout assumes 18 × 24 |
| 1 | ESP32 DevKitC 38-pin | Already flashed for its zone. It stays re-flashable over USB after soldering |
| 1 | R1 330 Ω ¼ W | Optional (status LED) |
| 1 | D1 LED 5 mm, any colour | Optional |
| ~6 cm | Bare wire (a cut resistor leg works) | For link C |
| 1 | USB cable (micro-USB) + 5 V phone charger | Power |

**Tools:** soldering iron (about 330 °C), solder, side cutters, multimeter,
tape.

## Step by step

### 1. Check the zone first
1. Once the ESP32 is soldered in, it can't easily be swapped. Before soldering,
   plug it into USB and check which zone it advertises. Either:
   - on your phone, open **nRF Connect** → Scanner. Look for **TRODES_bedroom_wing**,
     **TRODES_dining_hall** or **TRODES_medicine_room**; the iBeacon shows
     **Major 1** and **Minor = the zone id (1, 2 or 11)**; or
   - on the serial monitor at 115200, which prints `Zone : 2 (dining_hall)` and so on.

   Write the label (B1/B2/B3) on masking tape on the ESP32.

### 2. Place the ESP32
2. Push the ESP32's pins through the **component side** of the perfboard:
   - Left pin row in **column 1**, right pin row in **column 11**, both covering
     **rows 4 to 22**. The rows are 25.4 mm apart; the pins drop straight in.
   - **Antenna end up** (toward row 0), **USB end down** (toward row 23).
   - Pin 1 (3V3) lands at column 1, row 4.
3. Press it down until the black plastic of its pin headers sits flat on the
   board. Tape it down and flip the board over.

### 3. Solder the ESP32 pins
4. Solder **only the four corner pins** first: (1,4), (1,22), (11,4), (11,22).
5. Turn the board over and check the ESP32 sits flat and square. If not,
   reheat one corner and press.
6. Solder the other **34 pins**, all 38 in total, for strength.
   - About **2 s per pin** at about 330 °C.
   - Work from alternate ends so the module doesn't heat up in one spot.
   - The pins stick out about 4 mm on the solder side; leave them. They don't
     touch anything.

### 4. Optional status LED (on the component side)
7. **R1 330 Ω:** lay it flat along **row 18**, leads in **column 12** and
   **column 15**. Either way round.
8. **D1 LED:** stand it in **column 15**, **long leg (anode) in row 19**, **flat
   side / short leg (cathode) in row 20**.
   - Solder it with its **base about 8 mm above the board**, so the dome comes up
     into the lid hole of the beacon box (see [[Node Enclosures Build]]). A
     folded strip of card 8 mm tall under the LED while soldering sets the height.

### 5. Solder side links (use the solder-side picture: it is mirrored)
9. **Link A:** bridge **IO2 (11,18)** to **R1's lead (12,18)** with solder.
    Bend R1's lead toward the ESP32 pin to help.
10. **Link B:** bridge **R1's other lead (15,18)** to the **LED anode (15,19)**.
11. **Link C:** a bare wire from the **LED cathode (15,20)** → right to
    **column 16** → up **column 16 to row 10** → left along **row 10** to
    **GND pin 26 (11,10)**. Solder at each end. Keep it away from other
    ESP32 pins.
12. On the solder side, trim the R1 and LED leads to about 1.5 mm. Leave the ESP32 pins as they are.

### 6. Check before powering
13. **Continuity** (meter on beep):
    - IO2 pin (11,18) ↔ R1 left lead: beep.
    - LED cathode ↔ GND pin (11,10): beep.
14. **No shorts:** 3V3 (1,4) ↔ any GND pin, and 5V (1,22) ↔ any GND pin,
    must **not** beep. Also check neighbouring pins don't beep to each other.
15. **Look closely** for solder bridges between adjacent pins.

### 7. Plug in and test
16. Plug in the USB charger. The LED (and the on-board blue LED) should
    **blink once every 3 seconds**.
17. With **nRF Connect** on a phone, the beacon should show the TroDes UUID
    and its zone.
    - Or open the serial monitor at 115200: it prints `Zone`, `Major`, and
      `Advertising started`.

### 8. Label each beacon
| Label | Zone | `ZONE_ID` / `ZONE_NAME` in `zone_config.h` |
|---|---|---|
| **B1** | Bedroom wing (safe) | `1` / `bedroom_wing` |
| **B2** | Dining hall (safe) | `2` / `dining_hall` |
| **B3** | Medicine room (**restricted**) | `11` / `medicine_room` |

The beacons were already flashed for Test 2. Confirm each board's zone on the
serial monitor or in nRF Connect before labelling. To re-flash one, set the two
lines in `firmware/beacon_node/include/zone_config.h` and upload.

## Placement (field test and defense)

- **Height:** 1.2–1.5 m, **antenna end up**.
- **Surroundings:** at least 10 cm from metal and large mirrors, and not
  behind a TV or refrigerator.
- **Same setup for all three:** same USB charger type, same orientation.
  Keep TX power the same on all of them (it is `ESP_PWR_LVL_P9` in the
  firmware).
- **Proximity mode:** zones sharing one room need the wearable's proximity
  mode. See [[Defense Demo Plan]].

## Related

[[Door Node Perfboard Layout]] · [[ESP32 DevKitC Pinout]] · [[Defense Demo Plan]] · [[Work Log]]
