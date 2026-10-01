---
title: Final Hardware Plan — Wearable Rev B
tags: [hardware, power, wearable, rev-b]
updated: 2026-09-24
source: TroDes Claude project, guides/Final_Hardware_Plan_RevB.md
---

# Final Hardware Plan — Wearable Rev B

*Mirrored from the TroDes Claude project (`guides/Final_Hardware_Plan_RevB.md`) on 24 Sep 2026. Edit there or here, then sync.*

*Last updated 23 September 2026. Supersedes Rev A (LDO topology).*

---

## 1. Why Rev B exists

Rev A put an LDO between the Li-Po and the ESP32's 3V3 pin. No low-dropout
part in the right package was available in Quiapo or deliverable before the
defense window. Parts with ~1 V dropout (LD1117, 78L05, AMS1117 standalone)
cannot work from a 3.7 V cell — the cell falls below 4.3 V within minutes
and the regulator drops out.

**Rev B routes power the other way:** cell → MT3608 boost to 5.0 V → the
devkit's VIN pin → the devkit's on-board AMS1117 → 3.3 V. Nothing exotic is
sourced, and the regulator is already soldered to a board we own.

**The cost is runtime.** This is a double conversion, and the second stage is
linear. See §4.

---

## 2. Power chain, Rev B

```
BT1 3.7 V Li-Po 1000 mAh
  └─ M1 TP4056 + DW01   (USB-C charge in, protection out)
       └─ VBAT ──┬── SW1 SPDT (battery / off) ── M2 MT3608 boost ── +5 V
                 │                                                    ├── U1 devkit VIN ── AMS1117 ── +3V3
                 │                                                    ├── BZ1 piezo + D1 flyback
                 │                                                    └── C1 100 µF ∥ C2 100 nF
                 └── R3/R4 divider (100 k / 100 k) ── GPIO 34  [VBAT_SENSE]
                 └── U3 MAX17043 CELL pin  (optional gauge, if it arrives)

+3V3 ── U2 MAX30102 ── R5/R6 4.7 k pull-ups (only if the breakout lacks them)
     └─ C3 470 µF bulk
```

### Rules that must not be broken

- **Set the MT3608 trimpot to 5.0 V with a meter BEFORE the devkit is
  connected.** The module ships wound high. The ESP32's absolute maximum on
  3V3 is 3.6 V; feeding VIN above ~12 V destroys the AMS1117 and possibly
  the module.
- **U3's CELL pin goes to raw VBAT, never to a regulated rail.** A fuel gauge
  measuring 5 V reports nonsense.
- **Keep M2 at the far end of the board from the ESP32 antenna.** A switching
  node next to the antenna raises the noise floor, and RSSI is the whole
  project.
- **GPIO 2 is a strapping pin.** Status LED to ground through R2 only — never
  a pull-up to a rail, or the board will not enter download mode.
- **GPIO 6–11 are wired to the SPI flash.** Unusable.
- **GPIO 34 is input-only** and has no internal pull-up. Correct for
  VBAT_SENSE, useless for anything else.

---

## 3. Complete component list

### Already in hand

| Ref | Part | Qty | Note |
|---|---|---|---|
| U1 | ESP32-WROOM-32 devkit | 1 + 2 spare | on 2 × 19 female headers |
| — | ESP32 devkit (beacons) | 3 | one per zone |
| — | ESP32 devkit (door node) | 1 | replaces the ESP8266 in the old BOM |
| U2 | MAX30102 breakout | 1 | I²C, skin-facing |
| BT1 | Li-Po 3.7 V 1000 mAh | 1 | |
| M1 | TP4056 + DW01 protection, USB-C | 2 | |
| SW1 | SPDT slide switch | 3 | battery / off |
| SW2 | Tactile momentary pushbutton | 1 | SOS; internal pull-up in firmware |
| BZ1 | Passive piezo buzzer | 10 pc pack | ₱99 |
| Q1 | 2N2222 NPN | — | buzzer driver |
| D1 | 1N4148 | — | flyback across BZ1, cathode to +5 V |
| D2 | LED | — | status |
| R1 | 1 kΩ | 1 | Q1 base |
| R2 | 330 Ω | 1 | LED series |
| R3, R4 | 100 kΩ | 2 | battery divider, ratio 2.0 |
| R5, R6 | 4.7 kΩ | 2 | I²C pull-ups, **fit only if the breakout has none** |
| C1 | 100 µF electrolytic | 1 | at the devkit VIN pin |
| C2, C5–C9 | 100 nF ceramic | 6 | decoupling |
| C3 | 470 µF electrolytic | 1 | bulk on 3V3 |
| C4 | 100 nF | 1 | across R4, anti-aliasing on the ADC tap |
| — | Magnetic reed switch set | 2 | door nodes |
| — | Female headers, perfboard, FeCl₃, copper clad | — | etching supplies |

### Still to buy

| Part | Qty | Price | Why |
|---|---|---|---|
| **MT3608 boost module** | **3** | ₱39 ea | 1 fitted, 2 spare. This is the only blocking purchase. |

### Optional, do not plan around it

| Ref | Part | Price | Note |
|---|---|---|---|
| U3 | MAX17043 fuel gauge | ₱252, arrives 28 Sept – 2 Oct | If it does not arrive, the R3/R4 divider on GPIO 34 is the battery source. The firmware already falls back. |

---

## 4. Runtime, honestly

Boost + linear is a lossy chain. At 3.7 V cell, MT3608 ≈ 88 % efficient, and
the AMS1117 burns the 5 → 3.3 V difference as heat plus ~5 mA of its own
quiescent current.

| 3.3 V load | Cell current | 1000 mAh runtime |
|---|---|---|
| 60 mA (firmware as it stands) | ≈ 100 mA | **≈ 10 h** |
| 35 mA (after duty-cycle work) | ≈ 61 mA | **≈ 16 h** |

The adviser-approved target is **24 hours**. Rev B does not reach it, and no
firmware change alone will — the topology costs about 1.65× the cell current
that a direct 3.3 V LDO would.

**Do not hide this from the panel.** State the measured figure, state the
cause, and put the fix in Chapter 5 as a recommendation:

> Replace the boost + linear chain with a single buck-boost converter
> (e.g. TPS63020) or a sub-400 mV-dropout LDO feeding the 3V3 pin directly,
> leaving VIN unconnected. At a 35 mA load this returns ≈ 27 h from the same
> cell.

**The selection rule, for the record:** a regulator running from a 3.7 V
Li-Po needs dropout below ~400 mV. Anything near 1 V (LD1117, 78L05, bare
AMS1117) drops out before the cell is half discharged.

---

## 5. Firmware changes Rev B forces

1. **Average 8–16 ADC samples per battery read.** The R3/R4 divider is now the
   primary battery source, not a fallback. A single ESP32 ADC sample is noisy
   enough to swing the reported percentage several points.
2. **Do not map cell voltage to percentage linearly.** A Li-Po sits near 3.7 V
   for most of its discharge; a linear map reads ~44 % for hours. Use a
   piecewise table, or report voltage and let the dashboard interpret it.
3. **Duty-cycle work** to get average draw toward 35 mA: longer BLE scan
   interval, longer WiFi report interval, WiFi off between reports.

---

## 6. Board layout notes (single-sided, hand-etched)

- Module carrier: everything on female headers, no bare ICs.
- 0.4 mm minimum trace, no vias — jumper wires on the component side.
- Antenna keep-out: no copper, no ground pour under or beside the ESP32
  antenna end of the module.
- M2 (boost) at the opposite board edge from the antenna.
- Test points: TP1 VBAT · TP2 +5V · TP3 +3V3 · TP4 GND · TP5 SDA.

---

## 7. What still needs the adviser

Heart-rate alert thresholds, SOS long-press threshold (~3 s proposed),
WiFi-down fallback behaviour, battery backup for door nodes, beacon power
source, IEC/IEEE standards to cite, schematic and layout review date,
defense date, Request for Billing Form deadline and contents.

**Add to that list:** approval of the ~16 h realistic runtime against the
24 h target, since the cause is a sourcing constraint rather than a design
oversight.

## Related

[[00 Start Here]] · [[Resume Here]] · [[Hardware BOM - Wearable]] · [[Current Design/PCB Layout Notes Rev C]] · [[Current Design/KiCad Project Notes]] · [[Decisions Log]]
