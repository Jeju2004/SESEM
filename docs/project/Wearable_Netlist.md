# Wearable Board — Authoritative Netlist

Version 1.0 · 21 September 2026
Reconciled against `firmware/wearable/include/config.h`. Where this document
and `Hardware BOM - Wearable.md` disagree, **this one is correct** — the
discrepancies are listed at the bottom with reasons.

Draw from this. Tick each net as you wire it.

---

## Decision to make first: devkit, not bare module

**Use an ESP32-WROOM-32 devkit on 2×19 headers.** This matches the
module-carrier approach the adviser approved on 21 September, and it removes
three things from the board:

- No 6-pin programming header — the devkit has USB
- No EN/BOOT buttons — the devkit has them
- No USB-serial bridge

The `Hardware BOM` lists a 6-pin programming header. That was for a bare
WROOM module. **Not needed.** Delete it from the BOM.

Position the devkit so its **antenna end overhangs the board edge**. No
copper, no pour, no traces, no components under or beside it. Non-negotiable.

---

## Components

| Ref | Value | Package | Notes |
|---|---|---|---|
| U1 | ESP32-WROOM-32 devkit | 2 × 19-pin header, 2.54 mm | Antenna overhangs board edge |
| U2 | MAX30102 breakout | 5-pin header | Underside, optical window skin-facing |
| U3 | MAX17048 breakout | 4-pin header + CELL wire | **CELL goes to VBAT** |
| U4 | **AP2112K-3.3** | SOT-23-5 | 600 mA. EN tied to VIN |
| M1 | TP4056 **with DW01 protection** | Module, 4 pads + USB | Bare TP4056 has no over-discharge cutoff |
| BT1 | Li-Po 3.7 V **1000 mAh** | JST-PH 2.0 | Capacity decided 21 Sep |
| SW1 | Tactile pushbutton | 6 × 6 mm THT | SOS. Recess or shroud it |
| SW2 | SPDT slide switch | THT | Battery / off |
| Q1 | 2N2222, BC547 or S8050 | TO-92 | Any small-signal NPN > 100 mA |
| D1 | 1N4148 | DO-35 | Flyback, cathode to +3V3 |
| D2 | LED 3 mm | THT | Status. **One LED, not two** |
| BZ1 | Piezo buzzer, **passive** | 12 mm THT | Firmware drives a tone — active buzzer won't work |
| R1 | 1 kΩ | 0805 / THT | Q1 base |
| R2 | 330 Ω | | D2 series |
| R3, R4 | 100 kΩ | | Battery divider, ratio 2.0 |
| R5, R6 | 4.7 kΩ | | I²C pull-ups — **fit only if the breakouts lack them** |
| C1 | 1 µF ceramic | | U4 input |
| C2 | 1 µF ceramic | | U4 output |
| C3 | 10 µF ceramic | | At U1's 3V3 pin |
| C4 | 470 µF electrolytic | | Bulk, at U1's 3V3 pin |
| C5 | 100 nF | | Divider midpoint |
| C6–C8 | 100 nF | | Decoupling at U1, U2, U3 |
| C9 | 100 nF | | SOS debounce, optional |
| TP1–TP4 | Test pad, 2 mm | | VBAT, +3V3, GND, SDA |

---

## Nets — the wiring list

### `VBAT` — always live, straight from the cell
- M1 OUT+
- U3 CELL pin ← **not +3V3. Wired to the regulated rail it reports a flat 3.3 V forever**
- SW2 common
- TP1

### `VSW` — downstream of the power switch
- SW2 output
- U4 VIN, U4 EN (tie EN to VIN)
- C1 → GND
- R3 top

### `+3V3`
- U4 VOUT
- C2, C3, C4 → GND — **put C3 and C4 physically at U1's 3V3 pin, not near the regulator**
- U1 3V3
- U2 VIN, U3 VDD
- BZ1 positive terminal
- D1 cathode
- R5, R6 top (if fitted)
- TP2

### `GND`
Everything. U1 has several GND pins — **tie them all**. TP3.

### `SDA` → U1 **GPIO 21**
- U2 SDA, U3 SDA, R5 bottom, TP4

### `SCL` → U1 **GPIO 22**
- U2 SCL, U3 SCL, R6 bottom

### `SOS_BTN` → U1 **GPIO 27**
- SW1 → GND. Internal pull-up in firmware — **no external pull-up**
- C9 → GND (optional; firmware debounces at 40 ms)

### `BUZZ_DRV` → U1 **GPIO 25**
- R1 → Q1 base

### `BUZZ_COL`
- Q1 collector, BZ1 negative terminal, D1 anode
- Q1 emitter → GND

### `LED_STAT` → U1 **GPIO 2**
- R2 → D2 anode; D2 cathode → GND
- **GPIO 2 is a strapping pin. LED-to-ground is a safe weak pull-down. Never a pull-up.**

### `VBAT_SENSE` → U1 **GPIO 34**
- R3 / R4 junction, C5 → GND
- R4 bottom → GND
- Ratio 2.0 matches `BATTERY_DIVIDER_RATIO 2.0f`. At 4.2 V the ADC sees 2.1 V
- GPIO 34 is input-only — correct choice here

**Do not use GPIO 6–11.** Wired to the SPI flash; the board will not boot and
it looks like a dead board.

---

## Where this overrides `Hardware BOM - Wearable.md`

| BOM says | Correct | Why |
|---|---|---|
| MCP1700-3.3 regulator | **AP2112K-3.3** | MCP1700 is rated 250 mA against a ~380 mA peak. Brownout resets that present as random crashes. Footprints differ, so it must be settled before layout |
| Bi-color LED, 2 GPIO | **One LED on GPIO 2** | Firmware defines only `PIN_STATUS_LED 2`. A second LED would be unconnected |
| 6-pin programming header | **None** | Devkit has USB. Only needed for a bare WROOM module |
| Battery capacity unconfirmed | **1000 mAh** | Decided 21 Sep |
| No battery divider listed | **R3/R4 + C5 to GPIO 34** | `PIN_BATTERY_ADC 34` exists in firmware. Fallback if the MAX17048 fails |
| Bursts approach 500 mA | **~380 mA system peak** | Per the schematic spec's current budget. AP2112K's 600 mA covers either figure |

Update the BOM to match, or the two documents will contradict each other in
front of the panel.

---

## ERC checklist before you call the schematic done

- [ ] Title block: project, board name, `Rev A`, date, both authors
- [ ] Every component has a reference designator **and** a value
- [ ] All resistors drawn with `Device:R_US` (zigzag), not `Device:R`
- [ ] 470 µF uses `Device:C_Polarized_US` — the one most often missed
- [ ] U3 CELL is on `VBAT`, not `+3V3`
- [ ] D1 flyback fitted across the buzzer, cathode to `+3V3`
- [ ] Nothing connected to GPIO 6–11
- [ ] GPIO 2 has no pull-up
- [ ] C3 and C4 placed at U1's 3V3 pin
- [ ] Four test pads present
- [ ] ERC clean, or every remaining warning annotated
- [ ] Exported as PDF for the adviser's review

---

## Layout, straight after

| Rule | Value |
|---|---|
| Minimum trace | 0.4 mm (16 mil) |
| Power traces (`+3V3`, `GND`, `VBAT`) | ≥ 1.0 mm (40 mil) |
| Clearance | 0.5 mm (20 mil) |
| Pad diameter | ≥ 2.0 mm for 0.8 mm holes |
| Vias | **None** — jumper wires on the component side |

Route order: `+3V3` → `GND` bus (≥1.5 mm perimeter) → `VBAT`/`VSW` →
`SDA`/`SCL` together, away from `BUZZ_COL` → everything else.

Budget three etching attempts.
