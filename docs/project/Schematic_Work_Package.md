# Wearable Schematic — Work Package

Build order for the KiCad schematic. `Wearable Schematic Spec.md` in the vault
root stays the source of truth for every pin and value.

**The PCB is no longer blocked.** The adviser approved self-fabrication and the
module-carrier design on 21 September. Etching time is now the binding
constraint on the defense, and every day the schematic is not drawn comes off
the end of the schedule, where there is no slack.

Budget for **three etching attempts.** First boards usually take them.

---

## Session 1 — page setup and power (~45 min)

1. **Title block first.** Project, board name (`TroDes Wearable`), revision
   (`Rev A`), date, both authors. Graded detail, two minutes.
2. **Set symbols to ANSI/IEEE** — see the table below. Hard course rule and the
   easiest place to lose marks.
3. Power input: TP4056 module as a multi-pin connector symbol, USB-C input,
   Li-Po cell (`BT1`, 1000 mAh).
4. `VBAT` net label off TP4056 OUT+.
5. Regulator — **draw it as AP2112K-3.3, SOT-23-5**, not the MCP1700. Input
   1 µF; output 1 µF + 10 µF + 470 µF electrolytic. Tie EN to VIN.
6. `+3V3` and `GND` power symbols. Label nets; do not draw long wires.

> **Why not the MCP1700:** rated 250 mA against a ~380 mA peak during WiFi
> transmit bursts. It will brown out and present as random crashes. Footprints
> differ (SOT-23-5 vs SOT-23-3/TO-92), so this must be settled **before**
> layout. Raise it with the adviser as a correction being made, not a question.

## Session 2 — ESP32 and the I²C bus (~45 min)

7. ESP32-WROOM-32, or the devkit as a header pair. Decide once, stay consistent
   with the layout.
8. 100 nF from VCC to GND at the ESP32 and at each module.
9. `SDA` → GPIO 21, `SCL` → GPIO 22, as net labels.
10. MAX30102 breakout (`U2`) and MAX17048 breakout (`U3`) on those nets.
11. **MAX17048 CELL pin to `VBAT`, not `+3V3`.** Wired to the regulated rail it
    reports a flat 3.3 V forever. The commonest wiring error on this board.
12. 4.7 kΩ pull-ups on SDA/SCL **only if the modules lack them** — most
    breakouts have them. Note the choice on the schematic either way.

## Session 3 — I/O and finishing (~45 min)

13. Battery divider: 100 kΩ + 100 kΩ from `VBAT` to `GND`, midpoint to
    GPIO 34, 100 nF midpoint to GND.
14. SOS button to GPIO 27, to GND. Internal pull-up — **no external resistor**.
15. Buzzer driver: GPIO 25 → 1 kΩ → NPN base; buzzer between `+3V3` and
    collector; **1N4148 flyback across the buzzer, cathode to `+3V3`**; emitter
    to GND. The buzzer must be **passive** — the firmware drives a tone.
16. Status LED: GPIO 2 → 330 Ω → LED → GND. GPIO 2 is a strapping pin; an LED
    to ground is a safe weak pull-down. **Never a pull-up.**
17. Four test pads: TP1 `VBAT`, TP2 `+3V3`, TP3 `GND`, TP4 `SDA`.
18. Reference designators and values on **every** component.
19. Run ERC. Resolve every error; annotate every warning you keep.

---

## IEEE symbols — hard course rule

| Part | Use | Not |
|---|---|---|
| Resistor | `Device:R_US` (zigzag) | `Device:R` (rectangle) |
| Potentiometer | `Device:R_POT_US` | `Device:R_POT` |
| Inductor | `Device:L_US` | `Device:L` |
| Capacitor, polarised | `Device:C_Polarized_US` | `Device:C_Polarized` |
| Capacitor, non-polarised | `Device:C` | — |
| Diode | `Device:D` | — |
| NPN | `Device:Q_NPN_BCE` | — |
| LED | `Device:LED` | — |

**Check the 470 µF electrolytic specifically** — the part most likely to get
dropped in with the IEC symbol by reflex.

## Pin assignments — must match `config.h`

| ESP32 pin | Net | Goes to |
|---|---|---|
| GPIO 21 | `SDA` | MAX30102, MAX17048 |
| GPIO 22 | `SCL` | MAX30102, MAX17048 |
| GPIO 27 | `SOS_BTN` | Pushbutton → GND |
| GPIO 25 | `BUZZ_DRV` | 1 kΩ → NPN base |
| GPIO 2 | `LED_STAT` | 330 Ω → LED |
| GPIO 34 | `VBAT_SENSE` | Divider midpoint (input-only pin — correct here) |

**Do not use GPIO 6–11.** Wired to the SPI flash; using one prevents boot and
looks like a dead board.

---

## Self-check before calling it done

- [ ] Title block complete, both authors, revision
- [ ] Every component has a designator **and** a value
- [ ] All resistors are zigzag `_US` symbols
- [ ] MAX17048 CELL is on `VBAT`, not `+3V3`
- [ ] 1N4148 flyback fitted across the buzzer
- [ ] Nothing on GPIO 6–11
- [ ] GPIO 2 has no pull-up
- [ ] Regulator is AP2112K-3.3 with all three output capacitors
- [ ] Four test pads present
- [ ] ERC clean, or every remaining warning annotated
- [ ] Exported as PDF for the adviser's review

## Then, immediately: layout

Do not pause between schematic and layout.

| Rule | Value | Why |
|---|---|---|
| Minimum trace | 0.4 mm (16 mil) | Etching undercuts |
| Power traces | ≥ 1.0 mm (40 mil) | 380 mA peaks |
| Clearance | 0.5 mm (20 mil) | Toner transfer is imprecise |
| Pad diameter | ≥ 2.0 mm for 0.8 mm holes | Survives off-centre drilling |
| Vias | **None** | Jumper wires on the component side |

**Antenna keep-out is non-negotiable.** Position the ESP32 so its antenna end
**overhangs the board edge** — no copper, traces, pour or components under or
beside it. A degraded antenna degrades RSSI, which degrades zone detection,
which is the entire project.

**Ground:** no pour under everything on a single-sided board. Run a wide
perimeter ground bus (≥1.5 mm) and branch from it. Keep regulator, bulk
capacitor and ESP32 ground returns short and close together.

**Route in this order:** `+3V3` → `GND` bus → `VBAT` → `SDA`/`SCL` (together,
away from the buzzer trace) → everything else.

**Mark jumper positions** with a permanent marker after etching; there is no
silkscreen. Keep a printed layout with jumpers highlighted.

## Bring-up order — follow exactly

1. Inspect the etched board against a bright light for hairline breaks and
   bridges.
2. **Continuity test before soldering anything.** `+3V3` to `GND` must read
   open.
3. Solder the **power section only** — regulator, capacitors, TP4056.
4. Apply the battery and measure TP2: 3.25–3.35 V. Do not proceed until you see
   it.
5. Fit the ESP32. Confirm it boots and prints its banner.
6. Fit the modules **one at a time**, checking the firmware finds each. One
   short on an I²C line takes down the whole bus.
7. Then the button, buzzer and LED.
