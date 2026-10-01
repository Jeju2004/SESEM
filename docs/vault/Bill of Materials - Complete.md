---
title: Bill of Materials - Complete System
tags: [hardware, bom, pcb, materials]
status: partial — door sensor MCU pending adviser decision
updated: 2026-09-03
---

# Complete Materials List — TroDes System

One consolidated "what do we need to buy" list across all three hardware roles. Component-level detail and layout notes live in the per-board pages linked below — this page is the summary and finalization status.

## Status at a glance

| Board | Status | Blocking item |
|---|---|---|
| Wearable device | **Finalized** | — |
| Fixed BLE beacon | **Finalized** | Power source not explicitly confirmed (see below) |
| Door sensor node | **Partially finalized** | MCU family (ESP32 vs. ESP8266) — needs adviser sign-off |

## 1. Wearable device board — finalized

Full detail: [[Hardware BOM - Wearable]]

| Function | Component |
|---|---|
| Main MCU | ESP32-WROOM-32 |
| Heart rate | MAX30102 (I2C) |
| SOS button | Momentary tactile pushbutton, GPIO w/ pull-up |
| Local alert | Piezo buzzer + NPN driver transistor |
| Status indicator | Bi-color LED + current-limiting resistors |
| Battery gauge | MAX17048 fuel gauge IC (I2C) |
| Battery | 3.7 V Li-Po cell — capacity depends on target runtime, see [[Open Questions]] |
| Charging | TP4056 with protection |
| Regulation | MCP1700-3.3 LDO |
| Programming | 6-pin UART header (TX/RX/EN/BOOT/3V3/GND) |

Prototype quantity: 1 (consider 2 as spare).

## 2. Fixed BLE beacon node — finalized (no custom PCB)

Per [[Current Design/PCB Design Plan Rev2]], only two custom PCBs are being built — the wearable and the door sensor node. Each zone's beacon is an off-the-shelf ESP32 dev board flashed with `firmware/beacon_node`, not a custom board.

| Function | Component | Notes |
|---|---|---|
| MCU / radio | ESP32 dev board (e.g. ESP32-WROOM-32 devkit) | Runs the iBeacon advertiser firmware; one flashed unit per zone |
| Power | Not explicitly decided | Reasonable default is mains power, matching the door sensor node, since beacons are also fixed installations — but this hasn't actually been confirmed in the design docs. See [[Open Questions]]. |

Prototype quantity: matches the number of zones being demonstrated — unconfirmed, see [[Open Questions]] and [[Zone Map]].

## 3. Door sensor node board — partially finalized

Full detail: [[Hardware BOM - Door Sensor]]

| Function | Component | Status |
|---|---|---|
| MCU | **TBD — ESP32 or ESP8266** | **Open — needs adviser sign-off** |
| Door detection | Magnetic reed switch + magnet pair | Finalized |
| Power | 5 V USB wall adapter + 3.3 V regulator | Finalized |
| Status indicator | LED + current-limiting resistor | Finalized |

Prototype quantity: 2–3 for a representative demo — unconfirmed, see [[Open Questions]].

## What's keeping this list from being fully final

- Door sensor MCU family (ESP32 vs. ESP8266) — see [[Hardware BOM - Door Sensor]]
- Beacon node power source — assumed mains, not confirmed
- Exact demo zone/beacon/door-node counts — see [[Zone Map]], [[Open Questions]]
- Wearable battery capacity — depends on target runtime, not yet set by adviser

## Related

[[00 Start Here]] · [[Hardware BOM - Wearable]] · [[Hardware BOM - Door Sensor]] · [[Current Design/PCB Design Plan Rev2]] · [[Open Questions]]
