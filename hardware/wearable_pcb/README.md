# TroDes Wearable Carrier Board — KiCad project (Rev C2)

26 September 2026. KiCad 9 format. Open **`trodes_wearable.kicad_pro`**.
Rev C1 (26 Sep, earlier the same day) is kept beside it as
`trodes_wearable_RevC1_2026-09-26.kicad_pcb.bak` / `.kicad_sch.bak`.

Plan: **only the wearable is etched**; the beacons and the door node stay on
perfboard.

## Verified in KiCad 9.0.3 (GUI and command line)

| Check | Result |
|---|---|
| PCB design-rule check (DRC), zones refilled | **0 errors, 0 warnings, 0 unconnected pads** |
| Schematic ↔ PCB parity | **0 differences** (50 nets) |
| Schematic electrical-rule check (ERC) | **0 violations** |
| Netlist before vs after the ERC clean-up | identical |

Reports: `DRC_report_RevC2.txt`, `ERC_report_RevC2.txt`.

**Seven courtyard overlaps are excluded on purpose** (saved in the project
file). Each one was checked against the real part sizes:

| Overlap | Why it is fine |
|---|---|
| U1 (ESP32) with Q1 | The devkit sits about 7.5 mm up on its headers, and the Q1 body lies outside the devkit outline |
| U2 (MAX30102) with R5 and with R6 | The flat resistors (2.5 mm high) lie under the raised module |
| C1 with C2 | 0.6 mm clear |
| BZ1 with Q1 | 1.6 mm clear |
| R3 with C4 | Clear |
| BT1 with M1 | Wire pads only |

"Footprint differs from library" notices are switched off: the board copies
use enlarged pads for home etching on purpose.

## Every connection (checked net by net on the finished board)

| Net | ESP32 pin (team pinout) | Goes to |
|---|---|---|
| +3V3 | 1 (3V3) | C3 +, R5, R6, U2 VIN, U3 VCC |
| +5V | 19 (V5) | M2 OUT+, BZ1 +, D1 K, C1 +, C2 |
| SDA (heart-rate bus) | 22 (IO22) | U2 SDA, R5 (4.7 k pull-up) |
| SCL (heart-rate bus) | 25 (IO21) | U2 SCL, R6 (4.7 k pull-up) |
| FG_SDA (gauge bus) | **32 (IO4)** | U3 SDA (module has its own pull-ups) |
| FG_SCL (gauge bus) | **31 (IO16)** | U3 SCL |
| SOS_BTN | 11 (IO27) | SW2, both SOS legs (other legs to GND) |
| BUZZ_DRV | 9 (IO25) | R1 1 k → Q1 base |
| LED_STAT | 34 (IO2) | R2 330 Ω → D2 anode (cathode to GND) |
| VBAT_SENSE | 5 (IO34) | R3/R4 100 k divider midpoint, C4 100 nF |
| VBAT | — | M1 pad 3 (TP4056 OUT+), SW1 common, R3 |
| VSW | — | SW1 pad 1 → M2 pad 1 (MT3608 IN+) |
| BZ1 − | — | Q1 collector, D1 anode |
| GND | 14, 20, 26 | The pour: C1–C4, D2 K, M1 OUT−, M2 IN−/OUT−, Q1 E, R4, SW2, U2 GND, U3 GND |
| Battery | — | BT1 + → M1 pad 1 (B+), BT1 − → M1 pad 2 (B−) |

Unused on purpose:
- U2: GND2, RD, IRD, INT (GND2 is joined to GND on the module itself);
- U3: ALT, QST;
- every other ESP32 pin (no-connect flags in the schematic).

## Parts as built (from the team's photos and measurements)

| Ref | Part | Mounting |
|---|---|---|
| U1 | ESP32 DevKitC 38-pin, **55 × 28 mm** | 2 × 1×19 female headers, **5 mm** tall, rows 25.4 mm apart, USB to the right |
| U2 | MAX30102 black module, **20 × 15 mm**, 2 × 4 pins, rows 10.16 mm apart | 2 × 1×4 female headers, **sensor side UP** (VIN row toward the top edge). Set its pull-up jumper to **3V3** |
| U3 | MAX17043 fuel gauge (SparkFun layout), **24.1 × 10.2 mm**, 2 × 3 pins, rows 7.62 mm apart | 2 × 1×3 female headers, parts side up, JST to the right |
| SW2 | 12 × 12 mm tact switch, legs 12.5 × 5.0 mm | Soldered |
| BZ1 | 12 mm passive buzzer, legs 7.6 mm apart | + leg on the square pad |
| Q1 | 2N2222A, E-B-C | Flat face toward you, legs down |
| SW1 | SPDT mini toggle 3 A | Panel-mounted, 3 wires |
| M1 | TP4056 + DW01, micro-USB, 28 × 17 mm | Off-board (power deck), 4 wires |
| M2 | MT3608, 36 × 18 × 6 mm | Off-board (power deck), 4 wires. **Set to 5.0 V first** |

**Fuel-gauge battery lead:** the MAX17043 is powered and senses through its own
JST. Plug in a JST-PH lead and connect **red only** to TP4056 **OUT+**
(= VBAT). Leave the black lead unconnected: the gauge's GND already reaches
system GND through the header, and joining black to the battery − would
bypass the DW01 protection.

**To confirm when the fuel gauge arrives:** check the pin labels on its back
match "ALT GND VCC" (JST side up, top row) and "QST SCL SDA" (bottom row). The
pinout was taken from SparkFun's board, which your red clone copies.

**One measurement still assumed:** ESP32 pin 1 (3V3) is taken as **7.0 mm**
from the antenna edge. This only moves the antenna keep-out and slot.

## Firmware change (required for Rev C2)

The fuel gauge has its own I²C bus, so both modules route on one copper
layer. In `firmware/wearable`:

```c
#define PIN_FG_SDA  4    // config.h
#define PIN_FG_SCL  16
Wire1.begin(PIN_FG_SDA, PIN_FG_SCL);   // main.cpp, before gGauge.begin(Wire1)
```

Builds clean (PlatformIO, 26 Sep). The heart-rate bus is unchanged
(SDA IO22, SCL IO21).

## Etching sheets (`artwork/`)

| File | Use |
|---|---|
| **`TroDes_Wearable_RevC2_PRINT_THIS_BottomCopper.pdf`** | **Print this for toner transfer.** Not mirrored on purpose |
| `TroDes_Wearable_RevC2_CHECK_CopperSideView.pdf` | What the etched copper should look like. **Never transfer this one** |
| `TroDes_Wearable_RevC2_DrillGuide.pdf` | Hole sizes |
| `TroDes_Wearable_RevC2_ComponentPlacement.pdf` | Where the parts go |
| `TroDes_Wearable_RevC2_Schematic.pdf` | Schematic, Rev C2 |
| `TroDes_Wearable_RevC2_3D_top.png` | 3D preview |

- **Orientation check:** after the transfer, "TRODES C2 COPPER SIDE" must
  read correctly on the copper.
- Print at **100% / Actual size**. The outline must measure 69.0 × 66.0 mm.
- Do not use the older Rev B/C/C1 sheets.

## Board

| | |
|---|---|
| Size | **69 × 66 mm**, single-sided |
| Copper | B.Cu only, full GND pour |
| Clearance | ≥ 0.4 mm everywhere |
| Tracks | 0.8 mm power; 0.5–0.6 mm signal |
| Holes | 0.8 mm (R, C1, C2, C4, D1, Q1), 0.9 mm (LED), 1.0 mm (headers, C3, buzzer), 1.3 mm (SOS switch) |
| Antenna | No copper pour under the antenna end. Optional 5 × 16.6 mm slot. +3V3 runs along the board edge, away from the antenna |

## Related

[[Work Log]] · [[Enclosure Measurement Sheet]] · [[ESP32 DevKitC Pinout]]
