# TroDes Wearable Carrier Board — KiCad project (Rev C3)

26 September 2026. KiCad 9 format. Open **`trodes_wearable.kicad_pro`**.
Earlier revisions are kept beside it as `.bak` files: Rev C2 (26 Sep), Rev C1
(26 Sep) and Rev C (23 Sep).

Plan: **only the wearable is etched**; the beacons and the door node stay on
perfboard.

## What changed from Rev C2

| Rev C2 | Rev C3 |
|---|---|
| TP4056 and MT3608 as plain 1×4 rows in the wrong order (B+ B− OUT+ OUT−; IN+ IN− OUT+ OUT−) | Wire pads that mirror each module's own terminals and are labelled like the module |
| The battery came onto the board (BT1) and went straight back out to the TP4056 | The battery solders **directly to the TP4056 B+/B−**. BT1 is off the board |
| — | The team moved the whole board onto the A4 drawing sheet (+112 mm, +53.5 mm). The design itself is unchanged |
| "TRODES C2 COPPER SIDE" text etched in copper | **Removed** at the team's request (27 Sep). The ground pour fills its place |

## Off-board power wiring (power deck under the PCB)

```
Battery + ──► TP4056 B+          TP4056 OUT+ ──► J1 OUT+ (square pad)
Battery − ──► TP4056 B−          TP4056 OUT− ──► J1 OUT−
   (JST-PH pigtail on the TP4056 so the battery unplugs)

Toggle switch:  middle lug (common) ──► SW1 pad 2 (VBAT)
                outer lug           ──► SW1 pad 1 (VSW)      pad 3 unused

MT3608:  VIN+ ◄── J2 VIN+ (square pad)     VIN−  ◄── J2 VIN−
         VOUT+ ──► J2 VOUT+                VOUT− ──► J2 VOUT−
```

- **J2** is laid out like the MT3608 turned a quarter turn: top row VIN+ VIN−,
  bottom row VOUT+ VOUT−.
- **Set the MT3608 to 5.0 V on the bench before wiring VOUT to J2.**
- **Fuel gauge (U3) battery lead:** plug a JST-PH lead into its JST and connect
  the **red** wire to TP4056 OUT+ (or to J1 OUT+). Leave the black wire
  unconnected.

## Verified in KiCad 9.0.3

| Check | Result |
|---|---|
| PCB design-rule check, zones refilled | **0 errors, 0 warnings, 0 unconnected pads** |
| Schematic ↔ PCB parity | **0 differences** |
| Schematic ERC | **0 errors, 0 warnings** |

Reports: `DRC_report_RevC3.txt`, `ERC_report_RevC3.txt`.

**Six courtyard overlaps are excluded on purpose**, each checked against the
real part sizes:

| Overlap | Why it is fine |
|---|---|
| U1 with Q1 | The devkit is raised on its headers; the Q1 body lies outside the devkit outline |
| U2 with R5 and with R6 | The flat resistors lie under the raised module |
| C1 with C2 | 0.6 mm clear |
| BZ1 with Q1 | 1.6 mm clear |
| R3 with C4 | Clear |

"Footprint differs from library" notices are switched off because the enlarged
etching pads are deliberate. "Silkscreen over copper" notices are switched off
too: this home-etched board has no printed silkscreen.

### Design rules and measured margins (27 Sep, for UV etching on FR-2)

**Rules:**
- **Netclass:** 0.4 mm clearance, 0.6 mm default track.
- **`trodes_wearable.kicad_dru`:**
  - tracks and pads ≥ 1 mm from the edge;
  - pad ring ≥ 0.45 mm;
  - track ≥ 0.5 mm.

The netclass had been silently reset to KiCad's 0.2 mm default by a scripted
save. It was restored on 27 Sep, and the real copper was measured.

| Worst case on the copper | Value |
|---|---|
| Gap between different nets | 0.47 mm (R1 pad 2 ↔ Q1 emitter) |
| Gap to the ground pour | 0.45 mm |
| Narrowest track | 0.6 mm |
| Tracks and pads to the board edge | 1.1 mm (ground pour 0.5 mm) |
| Pad ring | 0.6 mm (0.8 and 1.3 mm holes), 0.45 mm (1.0 mm header holes) |
| Hole to hole | 1.5 mm |

**FR-2 changes (27 Sep):**
- **Pads enlarged:**
  - resistors, C1, C2, C4, D1, Q1: 2.0 mm;
  - MAX30102, MAX17043, SW1: 1.9 mm;
  - LED: 2.0 mm;
  - SOS switch: 3.2 × 2.5 mm.
- Fuel-gauge tracks widened to 0.6 mm.
- J1 moved 1.27 mm up; it was 0.85 mm from the edge.
- The left +3V3 track moved 0.5 mm in from the edge.
- One VBAT track corner moved away from SW1's spare pad.

## Every connection on the board

| Net | ESP32 pin (team pinout) | Goes to |
|---|---|---|
| +3V3 | 1 (3V3) | C3 +, R5, R6, U2 VIN, U3 VCC |
| +5V | 19 (V5) | **J2 VOUT+**, BZ1 +, D1 K, C1 +, C2 |
| VBAT | — | **J1 OUT+**, SW1 pad 2 (common), R3 |
| VSW | — | SW1 pad 1 → **J2 VIN+** |
| SDA / SCL (heart rate) | 22 (IO22) / 25 (IO21) | U2, R5 / R6 pull-ups |
| FG_SDA / FG_SCL (fuel gauge) | 32 (IO4) / 31 (IO16) | U3 (module pull-ups) |
| SOS_BTN | 11 (IO27) | SW2 SOS legs (other legs to GND) |
| BUZZ_DRV | 9 (IO25) | R1 1 k → Q1 base |
| LED_STAT | 34 (IO2) | R2 330 Ω → D2 |
| VBAT_SENSE | 5 (IO34) | R3/R4 100 k divider, C4 |
| BZ1 − | — | Q1 collector, D1 anode |
| GND | 14, 20, 26 | The pour: **J1 OUT−, J2 VIN−, J2 VOUT−**, C1–C4, D2 K, Q1 E, R4, SW2, U2, U3 |

## Parts as built

| Ref | Part | Mounting |
|---|---|---|
| U1 | ESP32 DevKitC 38-pin, 55 × 28 mm | 2 × 1×19 female headers (5 mm), USB to the right |
| U2 | MAX30102 module 20 × 15 mm, 2 × 4 | Female headers, **sensor side up**. Set its pull-up jumper to 3V3 |
| U3 | MAX17043 fuel gauge (SparkFun layout), 2 × 3 | Female headers, parts side up, JST to the right |
| SW2 | 12 × 12 mm tact switch | Soldered |
| BZ1 | 12 mm passive buzzer, legs 7.6 mm apart | + leg on the square pad |
| Q1 | 2N2222A, E-B-C | Flat face toward you |
| J1 | TP4056 + DW01 (USB Type-C, 28 × 17 mm) | Off-board, 2 wires |
| J2 | MT3608 (36 × 18 × 6 mm) | Off-board, 4 wires |
| SW1 | SPDT mini toggle, 3 A | Panel-mounted, 2 wires |

**Still to confirm:**
- the fuel gauge's back labels (ALT GND VCC / QST SCL SDA) when it arrives;
- the ESP32 pin-1-to-antenna-edge distance (assumed 7.0 mm).

## Firmware

The fuel gauge uses `Wire1` on IO4 (SDA) and IO16 (SCL); the heart-rate bus
is on IO22/IO21. Committed as `8f14d4f`.

## Etching sheets (`artwork/`)

| File | Use |
|---|---|
| **`UV_MASK_NEGATIVE_trodes_wearable-B_Cu.pdf`** | UV mask for **dry film** or other negative resist: copper is clear, gaps are black |
| **`UV_MASK_POSITIVE_trodes_wearable-B_Cu.pdf`** | UV mask for **pre-sensitised positive** boards or positive spray resist: copper is black |
| `TroDes_Wearable_RevC3_ComponentPlacement.pdf` | Where the parts go and which wire goes where |
| `TroDes_Wearable_RevC3_Schematic.pdf` | Schematic |
| `TroDes_Wearable_RevC3_3D_top.png` | 3D preview |

**KiCad plot settings** (File → Plot, saved in the board):

| Setting | Value |
|---|---|
| Format | PDF, black and white |
| Include layers | **B.Cu** |
| Plot on all layers | **Edge.Cuts** |
| Drill marks | Small |
| Scale | 1:1 |
| Mirrored | Off |
| Negative | Off for the positive mask, **On** for the negative mask |
| Drawing sheet | Off |
| Output | `artwork/` (KiCad names the file `trodes_wearable-B_Cu.pdf`; renamed afterwards) |

- **Print** on transparency film at **100% / Actual size**, A4 landscape, with
  no fit-to-page. The outline must measure **69.0 × 66.0 mm**.
- **Expose with the printed side DOWN** on the resist. Looking through the
  film, the antenna slot is then on the **RIGHT**. The mask is not mirrored on
  purpose.
- **Full procedure:** `Wearable PCB UV Etching Plan.md`, covering resist,
  exposure test strip, developing, etching, drilling, cutting, and soldering
  on FR-2.
- **Do not use the older toner-transfer sheets** (Rev C2 or earlier).

## Related

[[Work Log]] · [[Enclosure Measurement Sheet]] · [[ESP32 DevKitC Pinout]]
