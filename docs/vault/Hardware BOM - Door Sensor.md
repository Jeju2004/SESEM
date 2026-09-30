---
title: Hardware BOM - Door Sensor Node Board
tags: [hardware, bom, pcb, door-sensor]
status: settled
updated: 2026-09-21
---

# Door Sensor Node Board — Bill of Materials

Mounted at each restricted door: reed switch input, WiFi reporting.
Mains-powered — no battery. Battery backup remains an open question, see
[[Open Questions]].

> **MCU settled 21 Sep 2026: ESP32.** Approved by the adviser. See
> [[Decisions Log]].

| Function | Component | Notes |
|---|---|---|
| MCU | **ESP32-WROOM-32 devkit** | Approved 21 Sep 2026. `default_envs = esp32dev` already matches |
| Door detection | Magnetic reed switch + magnet pair | Switch on the door frame, magnet on the leaf. GPIO 27, debounced in firmware |
| Power | 5 V USB wall adapter + 3.3 V regulator | Mains-powered, fixed installation |
| Status indicator | LED + current-limiting resistor | Power and network connection state |

## Why ESP32 rather than ESP8266

This BOM originally specified ESP8266 — cheaper, and sufficient when only WiFi
is needed. Three reasons the adviser approved ESP32 instead:

1. **It is what already works.** The firmware's `default_envs` is `esp32dev`,
   and the board on the bench — confirmed booting, sending heartbeats and
   reporting debounced reed transitions — is an ESP32.
2. **One MCU family across all three board types.** Wearable, beacon and door
   node share a toolchain, a flashing procedure and spare boards.
3. **The node is mains-powered**, so the higher current draw costs nothing.

The written BOM and the physical prototype previously contradicted each other.
They now agree.

## Quantity for the defense demo

Three zones are approved (`bedroom_wing`, `dining_hall`, `medicine_room`), of
which **one is restricted** — the medicine room. **One door node** covers the
approved demo scope.

Build a **second** as a spare. A dead board days before the defense is
otherwise a hard stop, and you have spare devkits in hand.

## Related

[[00 Start Here]] · [[Decisions Log]] · [[Zone Map]] · [[Hardware BOM - Wearable]] · [[Bill of Materials - Complete]]
