---
title: Hardware BOM - Wearable Device Board
tags: [hardware, bom, pcb, wearable]
updated: 2026-09-24
---

# Wearable Device Board — Bill of Materials

Worn by the resident: BLE scanning, heart rate, SOS button, battery management.

> **Power section superseded by Rev B (23 Sep 2026).** The AP2112K below could
> not be sourced in time. The wearable now runs cell → TP4056 → SW1 → MT3608
> boost (5.0 V) → devkit VIN → on-board AMS1117 → 3V3. The fuel gauge is a
> MAX17043, optional and not fitted; the R3/R4 divider on GPIO 34 is the
> battery source. The Rev C layout also swaps the I²C pins (SDA → GPIO 22,
> SCL → GPIO 21). Runtime drops to ≈10 h as the firmware stands, ≈16 h after
> duty-cycle work. Current parts list: [[Current Design/Final Hardware Plan Rev B]];
> current layout: [[Current Design/PCB Layout Notes Rev C]].

> **Reconciled 21 Sep 2026** against `firmware/wearable/include/config.h` and
> the adviser's approved PCB decisions. The full net-by-net wiring list lives in
> `Firmware/trodes_phase1/docs/project/Wearable_Netlist.md` — draw the schematic
> from that, not from this table.

## Build decision — devkit, not bare module

**ESP32-WROOM-32 devkit on 2 × 19-pin headers.** Matches the module-carrier
design approved 21 Sep. This removes the programming header, EN/BOOT buttons
and USB-serial bridge from the board entirely.

## Main components

| Function | Component | Interface | Notes |
|---|---|---|---|
| Main MCU | ESP32-WROOM-32 devkit | — | Built-in BLE for localization, WiFi for reporting. Antenna end overhangs the board edge |
| Heart rate | MAX30102 breakout | I2C (GPIO 21/22) | Optical pulse sensor, underside, skin-facing |
| SOS button | Momentary tactile pushbutton | GPIO 27, internal pull-up | Short press = alert, long press (3 s) = dismiss. No external pull-up |
| Local alert | Passive piezo buzzer + NPN driver + 1N4148 flyback | GPIO 25 via 1 kΩ → NPN base | **Must be passive** — firmware drives a square-wave tone |
| Status indicator | **One** LED + 330 Ω | GPIO 2 | Strapping pin: LED-to-ground only, never a pull-up |
| Battery gauge | MAX17048 breakout | I2C | **CELL pin wires to `VBAT`, before the regulator** |
| Battery sense (fallback) | 100 kΩ + 100 kΩ divider + 100 nF | GPIO 34 (input-only) | Ratio 2.0, matches `BATTERY_DIVIDER_RATIO` |
| Battery | 3.7 V Li-Po, **1000 mAh** | JST-PH 2.0 | Capacity decided 21 Sep 2026 |
| Charging | TP4056 **with DW01 protection** | USB input | Bare TP4056 has no over-discharge cutoff and will destroy the cell |
| Regulation | **AP2112K-3.3** (SOT-23-5, 600 mA) | — | EN tied to VIN. Replaces the MCP1700-3.3 — see below |
| Power switch | SPDT slide switch | — | Battery / off. Prevents the cell feeding the board while USB is connected |
| Decoupling | 1 µF ×2, 10 µF, 470 µF electrolytic, 100 nF ×4 | — | 10 µF and 470 µF sit **at the devkit's 3V3 pin**, not at the regulator |
| Test points | 4 × 2 mm pads | — | VBAT, +3V3, GND, SDA |

## Changes made 21 September 2026

| Was | Now | Reason |
|---|---|---|
| MCP1700-3.3 LDO | **AP2112K-3.3** | MCP1700 is rated 250 mA against a ~380 mA peak during WiFi transmit bursts. Under-specified regulators brown out and present as random crashes. Footprints differ (SOT-23-3/TO-92 vs SOT-23-5), so this had to be settled before layout |
| Bi-color LED on 2 GPIO | **One LED on GPIO 2** | Firmware defines only `PIN_STATUS_LED 2`. A second LED would be unconnected |
| 6-pin programming header | **Removed** | Only needed for a bare WROOM module; the devkit has USB |
| Battery capacity "unconfirmed" | **1000 mAh** | Team decision, 21 Sep. See the runtime gap below |
| Divider not listed | **Added** (R3/R4/C5) | `PIN_BATTERY_ADC 34` exists in firmware but the parts were never in the BOM |
| "Bursts approach 500 mA" | **~380 mA system peak** | Per the current budget in `Wearable Schematic Spec`. AP2112K covers either figure |

## Power budget

| Component | Typical current | Notes |
|---|---|---|
| ESP32, WiFi transmitting | 250–350 mA | Millisecond bursts; supplied by the bulk capacitor |
| ESP32, BLE scanning only | ~30–60 mA | Dominant sustained mode |
| ESP32, modem sleep | ~15–20 mA | Between scan/report cycles |
| MAX30102 | ~600 µA active, ~1 µA standby | Sample periodically |
| MAX17048 | ~23 µA | Negligible |
| Buzzer, sounding | ~20–30 mA | Intermittent |
| Status LED | ~5 mA | |
| Divider (100 k + 100 k) | ~21 µA | |
| **Sustained average** | **~60 mA** | |
| **System peak** | **~380 mA** | Sizes the regulator |

## Runtime target vs. cell capacity — open gap

The adviser approved a **24-hour** target. The team is keeping the **1000 mAh**
cell.

| Quantity | Value |
|---|---|
| Approved target | 24 h |
| Present average draw | ~60 mA |
| Energy required | ~1440 mAh |
| Usable capacity (4.2 → 3.3 V cutoff, per `BATTERY_EMPTY_V`) | ~850 mAh |
| Runtime achieved | **~14–16 h** |
| Average current needed for 24 h | **≈ 35 mA** |

Closing this is a **firmware duty-cycle change** — lengthen `SCAN_TICK_MS` and
`STATUS_REPORT_PERIOD_MS` until average draw reaches ~35 mA, then **measure**
the runtime rather than calculating it. Expect the panel to ask, and answer
with a measured figure.

## Layout notes

- Antenna keep-out around the ESP32 is **non-negotiable** — no copper pour, traces or components. A compromised antenna degrades RSSI, which degrades zone detection, which is the entire project.
- Heart rate sensor on the underside, optical window facing skin — settle the enclosure before finalizing placement.
- I2C traces short and routed together; 4.7 kΩ pull-ups **only if the breakouts lack them** (most have them fitted).
- Route heart-rate traces away from the buzzer driver and the regulator.
- Single-sided, hand-etched, jumper wires instead of vias. Minimum trace 0.4 mm, power traces ≥ 1.0 mm, clearance 0.5 mm, pads ≥ 2.0 mm.
- **Do not use GPIO 6–11** — wired to the SPI flash; the board will not boot.

## Related

[[00 Start Here]] · [[Decisions Log]] · [[Wearable Schematic Spec]] · [[Hardware BOM - Door Sensor]] · [[Bill of Materials - Complete]]
