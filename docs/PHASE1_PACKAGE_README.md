# TroDes — Phase 1 BLE Firmware and Tools

Smart Elderly Safety and Emergency Monitoring System
BS Electronics and Communications Engineering, Electronics Design — Mapua University

Rebuilt 2026-09-03. This package replaces the earlier
`trodes_phase1_firmware.zip`; contents and behaviour are the same, including
the three bring-up fixes from 2026-08-26.

---

## What this is for

Phase 1 exists to answer one question before any PCB is laid out:

> **Does BLE zone detection actually work at the beacon spacing this facility
> has?**

Everything here runs on a breadboard. The wearable logs its zone decision to
Serial, so nothing in Phase 1 depends on a backend or a dashboard existing —
which matters, because backend hosting is still an open question with the
adviser.

---

## Layout

```
firmware/
  beacon_node/     ESP32 iBeacon advertiser — one flashed board per zone
  wearable/        ESP32 wearable — BLE scan, zone logic, SOS, HR, battery, WiFi
  door_sensor/     ESP8266 (or ESP32) reed switch node for restricted doors
tools/
  rssi_calibration/
    log_serial.py                 timestamped serial capture with ground-truth labels
    analyze_distance_profile.py   Test 1: RSSI-vs-distance fit (A, n, R²)
    analyze_zone_accuracy.py      Tests 2 & 3: confusion matrix, flicker analysis
    trodes_log.py                 shared log-parsing helpers
docs/
  ZONE_CONFIG.md               the zone table every board must agree on
  PHASE1_TEST_GUIDE.md         the three tests, with exit criteria
  BOARD_PROGRAMMING_GUIDE.md   flashing routine and troubleshooting
```

---

## Order of operations

1. Read `docs/BOARD_PROGRAMMING_GUIDE.md` §1 and set up VS Code + PlatformIO.
2. Read `docs/ZONE_CONFIG.md` and decide which zones you are actually
   demonstrating. (The demo zone count is still an open question — the table
   ships with the full six-zone sample map.)
3. Flash one `beacon_node` per zone, editing `include/zone_config.h` each time.
   Label each board physically. Verify each in nRF Connect.
4. Flash `wearable`. Watch the `[RSSI]` line at 115200 — every powered beacon
   in range must show a number.
5. Run the three tests in `docs/PHASE1_TEST_GUIDE.md`, in order.
6. Feed the measured values back into the firmware and reflash before moving on.

---

## Status of this code

**Verified:** all three sources pass a syntax check, and the beacon firmware
was confirmed working on real hardware on 2026-08-26 (visible and correctly
named over the air, RSSI −42 to −49 dBm at close range).

**Not yet verified on hardware:**

- End-to-end zone detection on the wearable. Before the manufacturer-ID fix,
  the `[RSSI]` line still showed `--` for every zone. That fix is in this
  package, but the confirming hardware check has not been run — **flash both
  boards from this package and check that `bedroom_wing` populates with a real
  RSSI value.** That is the first thing to do with this code.
- The door sensor node has never been flashed.
- No sensors have been wired to the wearable yet. Booting with the MAX30102
  and MAX17048 absent is expected and handled: the firmware reports them as
  not found and carries on.

---

## Values that are placeholders, not decisions

Do not present any of these to the panel as settled:

| Value | Current | Depends on |
|---|---|---|
| Measured power at 1 m | −59 dBm | Test 1 |
| Path-loss exponent | 2.5 | Test 1 |
| Hysteresis / confirm ticks | 4 dB / 3 ticks (~900 ms) | Test 3 |
| SOS long-press dismiss | 3000 ms | Adviser confirmation |
| Battery low / critical | 20% / 10% | Adviser review |
| Backend URL | `http://192.168.1.100:8000` | Backend hosting decision |
| WiFi-down fallback (queue + local buzzer/LED) | Implemented as proposed | Adviser approval |
| Zone count | 6 (full sample map) | Demo scope decision |

---

## Not built yet

- Caregiver web dashboard and backend
- PCB schematic and layout for either board
- Battery runtime testing (needs a target runtime from the adviser first)
- User manual

---

## Power reality check

The wearable as written scans BLE continuously with an **active** scan and
reports over WiFi every 5 s. That is roughly 60 mA average, which is about
**16 hours on a 1000 mAh cell** — under a full day. This is a firmware
decision, not a hardware one, and the knobs are all in
`wearable/include/config.h`: switch to a passive scan, lengthen `SCAN_TICK_MS`,
duty-cycle the radio, and lengthen `STATUS_REPORT_PERIOD_MS`. Do not tune it
until the adviser sets a target runtime, and do not claim a runtime figure
that has not been measured.
