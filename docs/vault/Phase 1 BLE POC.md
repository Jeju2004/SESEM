---
title: Phase 1 — BLE Localization Proof of Concept
tags: [firmware, testing, phase1, current-stage]
status: in-progress — hardware bring-up started
---

# Phase 1 — BLE Localization Proof of Concept

> **Status below is out of date — see [[Resume Here]].** BLE zone detection was
> confirmed on hardware on 3 Sep 2026, all three demo beacons were commissioned
> and matched at P9 by 21 Sep (Progress Report 2, §2.2–2.3), and the wearable
> is no longer the blocking item. Kept as the bring-up record.

**This is the current stage of the project.** Prove BLE zone detection works reliably at the intended beacon spacing *before* committing to a PCB layout ([[Current Design/PCB Design Plan Rev2]]).

Code files: `Firmware/trodes_phase1/firmware/beacon_node`, `Firmware/trodes_phase1/firmware/wearable`, `Firmware/trodes_phase1/firmware/door_sensor` (current PlatformIO projects — supersede the older flat `beacon.ino` / `wearable_phase1.ino` files at the vault root)

## Bring-up status (as of 2026-09-03)

Hardware bring-up has started — this is no longer purely theoretical.

**Beacon (`firmware/beacon_node`) — confirmed working on real hardware (2026-08-26).** Visible and correctly named over BLE, RSSI −42 to −49 dBm at close range, after fixing two bugs:
- Advertisement type was `ADV_TYPE_NONCONN_IND` (never responds to scan requests, so the board's name never actually broadcast) — changed to `ADV_TYPE_SCAN_IND` (still non-connectable, correct for a beacon, but the name now transmits).
- Manufacturer ID was being sent as `0x4C00` instead of `0x004C` — the library stores it low-byte-first, so the wrong constant silently sent the wrong bytes over the air. Generic scanners didn't notice, but the wearable's own filter (which correctly checks for the right bytes) rejected every packet, so RSSI never updated.

**Wearable (`firmware/wearable`) — still the blocking item.** Flashed and boots correctly on a second ESP32 (2026-08-26); MAX30102/MAX17048 correctly report absent (not yet wired — expected) and the WiFi retry loop behaves as designed (no AP configured — expected). But the `[RSSI]` line was still showing `--` for every zone as of the last check, mid-fix for the manufacturer-ID bug above. **Next action: reflash both the beacon and the wearable from the current firmware package and confirm `bedroom_wing` populates with a real RSSI value** — all three tests below are blocked behind this.

**Door sensor (`firmware/door_sensor`) — builds and runs, never flashed to real hardware yet.** Confirmed building for both the ESP8266 (RAM 39.6%, Flash 27.6%) and ESP32 targets. Its MCU family is an open decision — see [[Hardware BOM - Door Sensor]] and [[Open Questions]].

**Toolchain note:** building inside this vault initially failed (`Can not remove temporary directory ...\.pio\build`) because the vault folder's name contains parentheses, which PlatformIO's SCons layer mishandles on Windows. Fixed by pointing `build_dir`/`libdeps_dir` outside the vault (`C:/pio/<board>/...`) in each project's `platformio.ini` — already applied to all three firmware projects. Keep this fix even if the folder is renamed. Full detail in `Firmware/trodes_phase1/docs/BOARD_PROGRAMMING_GUIDE.md` §7.

## Hardware needed

3–4 ESP32 dev boards (1 wearable, 2–3 beacons), USB cables/hub, tape measure, laptop with Arduino IDE. No heart rate sensor, buttons, battery, or custom hardware needed yet.

## Setup

1. Install `NimBLE-Arduino` library (by h2zero) via Arduino IDE Library Manager.
2. Flash `beacon.ino` to each beacon board — unique `ZONE_ID` and `ZONE_NAME` per board, verify visibility with nRF Connect before proceeding.
3. Flash `wearable_phase1.ino` — `OUTPUT_MODE = MODE_HUMAN`, Serial Monitor at 115200.

## Test 1 — RSSI vs. distance profile

One beacon powered, measure at 1/2/3/5/8 m using `rssi_calibrate.py log`, then fit with `rssi_calibrate.py distance`. Yields path loss exponent *n*, reference RSSI, R², plot. *n* 2–3.5 is normal indoors; *n* > 4 means heavy obstruction. **R² below 0.85 is not a failure** — it's a real, publishable finding supporting zone classification over distance estimation. Repeat through a wall to quantify wall attenuation.

## Test 2 — Zone classification accuracy (the headline number)

Beacons in intended positions, walk test with logged ground-truth timestamps, then `rssi_calibrate.py accuracy` for overall accuracy % and confusion matrix. **Fix physical problems (beacon placement, TX power) before tuning filter parameters** — software tuning to compensate for bad placement produces a fragile system that misbehaves during defense.

## Test 3 — Boundary behavior

Stand in a doorway for 2 minutes — reported zone should stay fixed (hysteresis working). `ZONE CHANGE` messages while standing still = increase `HYSTERESIS_DBM` or `DWELL_SCANS`, change one parameter at a time, log every value tried.

## Tunable parameters

| Parameter | Default | Effect |
|---|---|---|
| `MEDIAN_WINDOW` | 5 | Larger = better spike rejection, slower response |
| `EMA_ALPHA` | 0.30 | Lower = smoother, slower to react |
| `HYSTERESIS_DBM` | 6 | Higher = stickier zones, less flicker, slower switching |
| `DWELL_SCANS` | 2 | Higher = fewer false transitions, more latency |
| `RSSI_FLOOR_DBM` | -90 | Discard threshold for unreliable weak readings |
| `TX_POWER_DBM` (beacon) | 0 | Lower = tighter zone coverage, cleaner separation |

## Exit criteria — move to Phase 2 only when all hold

- [ ] RSSI vs. distance profile captured, model fitted, plot saved
- [ ] Same profile captured through a wall, attenuation quantified
- [ ] Zone accuracy measured with confusion matrix
- [ ] Accuracy meets adviser-agreed target
- [ ] Doorway standing test passes without flicker
- [ ] Walk-past test doesn't trigger a false zone entry
- [ ] Final parameter values recorded with reasoning

If accuracy is short of target: **more beacons or lower TX power**, not more aggressive filtering.

## Feeds directly into

[[Current Design/IEEE Paper Draft]] Chapter 4 — the RSSI-vs-distance plot/equation, path loss exponent (with/without wall), zone accuracy %, confusion matrix, and parameter tuning log are all Chapter 4 content. Take setup/beacon-placement photos now, on the bench — reconstructing them later is miserable.

## Related

[[00 Start Here]] · [[Zone Map]] · [[Current Design/PCB Design Plan Rev2]]
