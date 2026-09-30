---
title: ESP32 DevKitC Pinout
tags: [reference, esp32, pinout, hardware, sesem]
updated: 2026-09-25
---

# ESP32 DevKitC (38-pin) — Pinout Reference

![[ESP32_DevKitC_Pinout.png]]

The team's pinout reference (supplied 25 Sep 2026). Antenna end at the top, USB
at the bottom. Header **positions** below count from the top of each column
(1–19). The KiCad footprint numbers the left column 1–19 and the right column
20–38, both from the top.

## Our pin assignments

| Board | Signal | GPIO | Header position | Notes |
|---|---|---|---|---|
| Wearable | SOS button | IO27 | left 11 | internal pull-up |
| Wearable | Buzzer driver (Q1 base via R1) | IO25 | left 9 | PWM tone |
| Wearable | Battery sense (R3/R4) | IO34 | left 5 | input-only pin — correct for an ADC input |
| Wearable | **I²C SDA** | **IO22** | right 3 | **deliberately swapped** — see below |
| Wearable | **I²C SCL** | **IO21** | right 6 | **deliberately swapped** — see below |
| Wearable | Status LED | IO2 | right 15 | strapping pin — LED to GND only |
| Wearable | 5 V in (from MT3608) | V5 | left 19 | **5.0 V max** — set the MT3608 first |
| Door node | Reed switch | **IO18** | right 9 | moved from IO27 on 25 Sep; internal pull-up |
| Door node | Status | IO2 | right 15 | on-board LED |
| Door node | Power | USB | — | 5 V adapter |
| Beacon | — | — | — | USB power only; no external wiring |

## ⚠ SDA and SCL are swapped on purpose

This image labels **G21 = SDA** and **G22 = SCL** (the ESP32's defaults). The
TroDes wearable uses **SDA = IO22, SCL = IO21** so the Rev C board routes on one
copper layer; the firmware (`PIN_I2C_SDA 22`, `PIN_I2C_SCL 21`) matches. The
ESP32 can put I²C on any pins, so this is valid. **Wire the heart-rate sensor to
our assignment, not the image labels.** A mix-up causes no damage, but the
sensor will not be found.

## Pins to leave alone

| Pins | Why |
|---|---|
| SD0–SD3, CMD, CLK (GPIO 6–11) | wired to the on-module flash — using them crashes the board |
| IO0, IO2, IO5, IO12, IO15 | strapping pins read at boot — nothing that pulls them the wrong way at power-up |
| IO34, IO35, SENSOR VP (36), SENSOR VN (39) | input-only, no internal pull-up |
| TXD (IO1), RXD (IO3) | USB serial — used for flashing and the serial log |

## Related

[[Wearable Perfboard Layout]] · [[Door Node Perfboard Layout]] · [[Hardware BOM - Wearable]] · [[Hardware BOM - Door Sensor]]
