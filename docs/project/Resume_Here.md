# Resume Here — last updated 2026-10-01

## Now (defense day, Thursday 1 October)

1. **`Defense_Day_Checklist.md`**: what to bring and cover, and the morning technical checks.
2. **1 Oct fixes flashed** (wearable COM8, door node COM7 `esp32hub`, about 03:00). Check on hardware: ticks on hold, green cancel notice, no "Location unknown" in a short hallway pass, iPhone stays at the bottom.
3. **Tests B and C are in the paper.** B: n = 6, median 295 ms. C: n = 2, preliminary. More heart-rate readings would strengthen C.
4. **Still to do:** Test A (Run 3, room accuracy) and Test D (door node, 20 cycles, last).
5. **Print:** paper Rev 6 (4 copies, after updating the table of contents in Word) and the manual v0.3.

Record of the night before: `House_Test_2026-09-30.md`.

---

# Earlier (21 September)

Shortest possible "what do I do next." Read `CLAUDE.md` at the firmware root
for the standing project context.

---

## What changed on 21 September

| Item | State |
|---|---|
| Progress Report 1 | **Signed.** Deadline was extended, so submission is not urgent |
| Adviser consultation | **Held. All four blocking decisions settled** — see `Decisions Log.md` |
| Breadboard fallback | **Agreed** with the adviser |
| ESP32 devkits | **In hand** — two spare boards |
| Third beacon | `zone_config.h` set to `dining_hall` / id 2, **not yet flashed** |
| Test 1 | Old capture diagnosed as unusable. Clean redo required |
| Bench work | Migrating to Claude Code on the Windows machine |

**The PCB is unblocked.** That was the critical path, and it is now open.

---

## Settled on 21 September

- **PCB:** self-fabricated, hand-etched, single-sided with jumper wires,
  designed as a **module carrier** (modules on headers, not bare ICs)
- **Three zones:** `bedroom_wing`, `dining_hall` (safe), `medicine_room`
  (restricted)
- **Door node MCU: ESP32.** The BOM still says ESP8266 — correct it
- **Battery runtime target: 24 hours**
- **Contingency:** if the etched board is not working four days before the
  defense, demo on the breadboard with the board shown as under-debug

### The one gap this opens

The team is keeping the **1000 mAh** cell. At ~60 mA average that gives
~14–16 h, not 24. Reaching the approved target needs average draw down to
**≈35 mA**, which is a firmware duty-cycle change — longer scan and report
intervals. Then **measure** the runtime; do not calculate it and call it
measured. Expect the panel to ask.

---

## Do these next, in order

1. **Flash the third beacon.** `zone_config.h` is already set to `dining_hall`
   / id 2 at `ESP_PWR_LVL_P9`. One board plugged in, nothing else:
   ```
   cd firmware/beacon_node
   pio run -t upload --upload-port COMxx
   pio device monitor --port COMxx
   ```
   Confirm it announces `dining_hall`, zone id 2, and that the frame it prints
   at boot matches the UUID line above it.
   **Then set `zone_config.h` back before touching any other beacon.**

2. **Test 1 — clean redo.** `Test1_Restart_Plan.md`. Roughly 50 minutes.
   Analyse with the project's own tool, not a new one:
   ```
   cd tools/rssi_calibration
   python analyze_distance_profile.py --zone bedroom_wing --plot t1.png t1.csv
   ```
   Paste the fitted `A` and `n` into **both** `zone_config.h` and
   `wearable/include/config.h`, then reflash.

3. **Test 2 — three zones.** `Test2_Test3_Field_Protocol.md`. This is the
   confusion matrix, the headline result of the project. Include far-corner and
   near-boundary sample points or the number is meaningless.

4. **Test 3** — boundary latency and hysteresis.

5. **Schematic** — `Schematic_Work_Package.md`. Runs in parallel; nothing about
   it waits on the tests any more.

6. **Point the wearable at the dashboard** — set `WIFI_SSID`, `WIFI_PASSWORD`
   and `BACKEND_BASE_URL` in `wearable/include/config.h`.

---

## Still open with the adviser

Heart-rate alert thresholds (currently display-only), exact SOS long-press
threshold (~3 s proposed), wearable WiFi-down fallback behaviour, battery
backup for door nodes, beacon power source, which IEC/IEEE standards to cite,
a schematic and layout review date, and confirmation of the defense date and
the Request for Billing Form deadline.

**No Request for Billing Form = no defense = automatic grade of 5.** Nobody
has confirmed what it needs or when.

---

## Traps

- `zone_config.h` is a **per-flash file**, currently on `dining_hall`. Two
  beacons sharing a zone id look like RSSI noise, not a config error.
- **All beacons at `ESP_PWR_LVL_P9`.** Mismatched power destroys Test 2.
- **One board plugged in at a time.** CH340 chips have no unique serial.
- `RSSI_FLOOR_DBM` is a classification threshold, not a hardware clip — the
  radio reports below it. Do not drop sub-threshold samples when fitting.
- `[HR] MAX30102 NOT found`, `[BATT] MAX17048 NOT found` and the 0% battery
  alerts are **correct behaviour** — no sensors or cell are wired yet.

---

## Not started

Both PCB layouts, user manual, battery runtime measurement, all Chapter 4 data,
Chapter 2 literature review, Chapter 3 decision matrix.
