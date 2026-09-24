# Phase 1 Test Guide — proving BLE zone detection before PCB layout

**Why this exists.** The core deliverable of this project is *localisation*.
If room-level zone detection does not work reliably at the beacon spacing the
facility actually has, then the PCB layout, the enclosure, and the dashboard
are all built on sand. Everything in this guide runs on a breadboard. Do not
commit to a PCB layout until the exit criteria below are met.

The three tests here produce, in order: the RSSI-vs-distance model, the zone
classification accuracy figure, and the boundary/hysteresis behaviour. Those
are exactly the three results Chapter 4 of the IEEE paper needs, and each one
below is written in the shape Chapter 4 requires — title, purpose,
assumptions and constants, procedure, data table, analysis.

---

## 0. Before you start

**Hardware**

- 1 × ESP32 flashed with `beacon_node` per zone under test, each with
  `ZONE_ID`/`ZONE_NAME` set and the board physically labelled
- 1 × ESP32 flashed with `wearable`
- USB power for each beacon (power bank or wall adapter — they are mains
  devices in the real system)
- A tape measure. Not paces. Panelists ask.

**Software**

```bash
cd tools/rssi_calibration
pip install -r requirements.txt
```

**Confirm the beacons first.** Open nRF Connect (or LightBlue) on a phone and
check each beacon shows as `TRODES_<zone>`, `Connectable: No`, with a steady
stream. A beacon that is not advertising will look exactly like a wearable
that cannot classify — do not debug the wrong board.

**Confirm the wearable is hearing them.** Open the Serial Monitor at 115200
and watch the `[RSSI]` line. Every zone whose beacon is powered and in range
must show a number. If a zone shows `--` while its beacon is definitely
advertising, stop and fix that before running any test — see the
troubleshooting table in `BOARD_PROGRAMMING_GUIDE.md`.

**Close the Serial Monitor before running `log_serial.py`.** Only one program
can hold a COM port at a time.

---

## Test 1 — RSSI vs distance profile

**Purpose.** Determine the log-distance path-loss model for these boards in
this building: the measured power at 1 m (*A*) and the path-loss exponent
(*n*) in `RSSI(d) = A − 10·n·log₁₀(d)`. Both feed back into the firmware, and
the spread at each distance tells you how much RSSI noise the zone classifier
has to survive.

**Assumptions and constants**

| Constant | Value |
|---|---|
| Beacon TX power | `ESP_PWR_LVL_P3` (0 dBm), identical on all beacons |
| Advertising interval | 100 ms |
| Wearable scan | active, 300 ms classification tick |
| Beacon height | 1.5 m (record the actual value) |
| Wearable height | 1.0 m, worn/held at wrist height (record the actual value) |
| Environment | line of sight, single corridor or room, no people moving through |
| Samples per point | ≥ 60 (≈ 60 s at one `[RSSI]` line per second) |

**Procedure**

1. Place one beacon at a fixed point. Record its height and the room.
2. Mark distances at **1, 2, 3, 4, 6, 8, and 12 m** with the tape measure.
3. Start the capture, labelling with the true distance:
   ```bash
   python log_serial.py --port COM6 --out test1_los.csv --label 1
   ```
4. Stand at 1 m, holding the wearable still, facing the beacon, for 60 s.
5. Type `2` + Enter into the running capture, walk to the 2 m mark, stand 60 s.
   Repeat for each distance. (The few seconds of walking are labelled with the
   destination; with 60 s of dwell they are noise, and Test 2's `--settle`
   option exists if you want them gone entirely.)
6. Ctrl+C to stop.
7. Repeat the whole run once with the wearable's body **between** it and the
   beacon (body-blocking), saved as `test1_nlos.csv`. Human bodies attenuate
   2.4 GHz noticeably, and a wearable is worn on a body — the panel will ask.

**Analysis**

```bash
python analyze_distance_profile.py --zone bedroom_wing --plot test1_los.png test1_los.csv
```

Record the printed table (distance, n, mean, median, sd, min, max) as the
Chapter 4 data table, and the fitted *A*, *n*, and R² as the result.

**Then update the firmware** with the printed `#define` lines:
`MEASURED_POWER_1M` in both `beacon_node/include/zone_config.h` and
`wearable/include/config.h`, and `PATH_LOSS_EXPONENT` in the wearable's config.
Reflash every board before running Test 2.

**Exit criteria**

- [ ] R² ≥ 0.8 for the line-of-sight fit
- [ ] Fitted *n* between 1.5 and 5.0 (indoor free-space is ~2; cluttered
      indoor is typically 2.5–4)
- [ ] Standard deviation at each distance recorded, and ≤ ~6 dB at 1–4 m
- [ ] The body-blocked run's mean at each distance recorded alongside the
      line-of-sight run, with the attenuation in dB stated

If the standard deviation swamps the difference between adjacent rooms, say so
plainly and move to the mitigation in the note at the end of this guide —
that is a real finding, not a failure.

---

## Test 2 — Zone classification accuracy

**Purpose.** Measure how often the wearable reports the room the resident is
actually in. This is the headline number of the whole project.

**Assumptions and constants**

| Constant | Value |
|---|---|
| Beacons | one per zone, all powered, each at a recorded position |
| Beacon spacing | the real spacing of the mapped rooms (record it) |
| `HYSTERESIS_DB` | 4 dB |
| `CONFIRM_TICKS` | 3 (≈900 ms at a 300 ms tick) |
| `RSSI_FLOOR_DBM` | −88 dBm (or the Test 1 value) |
| Dwell per zone | ≥ 120 s |
| Passes | ≥ 3 per zone, entering from different directions |

**Procedure**

1. Deploy every beacon at its intended mounting position. Sketch the layout
   with distances — this sketch goes into the paper.
2. Start the capture labelled with the zone you are standing in:
   ```bash
   python log_serial.py --port COM6 --out test2_pass1.csv --label bedroom_wing
   ```
3. Stand in the middle of the zone for 120 s.
4. Type the next zone's name + Enter, walk there, stand 120 s. Cover every
   zone in the map.
5. Repeat as `test2_pass2.csv`, `test2_pass3.csv`, entering each zone from a
   different direction.
6. Also spend one labelled period at each zone's **doorway** rather than its
   centre; doorways are where classification is hardest and where the panel
   will focus.

**Analysis**

```bash
python analyze_zone_accuracy.py --settle 8 test2_pass*.csv
```

`--settle 8` discards the first 8 seconds after each label change, so walking
time between rooms is not scored as a misclassification. Say in the paper that
you did this and why.

Record: the confusion matrix, per-zone precision/recall/F1, overall accuracy,
and the named misclassification pairs.

**Exit criteria**

- [ ] Overall accuracy ≥ 90% across all passes
- [ ] **The restricted zone** (`medicine_room` in the three-zone demo) has
      recall ≥ 95% — missing a resident at a restricted door is the failure
      mode that matters, and it is worth trading safe-zone precision for it
- [ ] No safe zone is confused with a restricted zone more than 2% of the time
- [ ] Confusion matrix and per-zone metrics recorded for Chapter 4

If a specific pair of zones is repeatedly confused, that is usually two
beacons too close together or a thin wall between them. Move a beacon, note
the change, and re-run. Report the layout you ended up with.

---

## Test 3 — Boundary and hysteresis behaviour

**Purpose.** Show that the reported zone is *stable* — that standing near a
boundary does not make the dashboard flicker between two rooms, and that a
real zone change is still reported promptly.

**Assumptions and constants**

Same as Test 2, plus:

| Constant | Value |
|---|---|
| Boundary standing time | 180 s per boundary |
| Boundaries tested | every adjacent pair, and at minimum every safe↔restricted pair |
| Crossing repetitions | ≥ 5 per boundary |

**Procedure**

1. **Static boundary test.** Stand exactly on a boundary (a doorway threshold)
   labelled with the zone you consider yourself in, for 180 s. Do not move.
   Repeat for every adjacent zone pair.
2. **Crossing latency test.** Start on one side, labelled correctly. Walk at a
   normal pace across the boundary; the moment you cross, type the new zone +
   Enter. Stand 20 s. Cross back. Repeat five times per boundary.
3. Save as `test3_<zoneA>_<zoneB>.csv`.

**Analysis**

```bash
python analyze_zone_accuracy.py test3_bedroom_dining.csv
```

Read the **Stability** section: changes while stationary, flicker rate per
minute, and the dwell-time distribution.

For crossing latency, read the raw log: the gap between your label change and
the following `[ZONE] ->` line is the detection latency. Take the mean over the
five crossings. (Your reaction time is inside that number — say so; it makes
the measurement conservative, which is the right direction.)

**Exit criteria**

- [ ] Zero reported-zone changes while standing still in a zone centre
- [ ] ≤ 2 changes per minute while standing on a boundary
- [ ] No dwell time under 1 s (a sub-second flip-and-flip-back means the
      hysteresis is too weak)
- [ ] Mean crossing detection latency ≤ 3 s
- [ ] Latency into a **restricted** zone ≤ 2 s

**Tuning.** These two constants in `wearable/include/config.h` trade the two
criteria against each other:

- `HYSTERESIS_DB` (default 4.0) — how much stronger a challenger beacon must
  be. Raise it to kill flicker; too high and you get stuck in the old zone.
- `CONFIRM_TICKS` (default 3) — how many consecutive ticks the challenger must
  win. Raise it to kill flicker at the cost of latency: each tick is 300 ms.

Record the final values and the numbers that justified them. "We tuned it
until it looked right" will not survive the panel; "flicker rate fell from
6.2/min to 0.3/min when hysteresis went from 2 dB to 4 dB, at a latency cost
of 0.4 s" will.

---

## What Phase 1 does *not* cover

State this plainly rather than letting the panel find it:

- **Battery runtime.** Cannot be tested meaningfully until the adviser sets a
  target runtime and the duty cycle is chosen to meet it. Continuous active
  BLE scanning plus WiFi reporting draws roughly 60 mA average, which is about
  16 hours on a 1000 mAh cell — that is the number to design against, and
  active scanning is the first thing to cut if it falls short.
- **The caregiver dashboard.** Not built yet; backend hosting is still open.
  Phase 1 deliberately proves localisation over Serial so it does not block on
  that decision.
- **Heart rate accuracy.** The MAX30102 reports a value; it has not been
  validated against a reference, and there are no approved alert thresholds.
- **Door node integration.** The reed nodes report independently of the
  wearable. Testing them is a separate, simpler exercise: open the door, watch
  for the event.

---

## If zone detection does not meet the exit criteria

This is a real possibility at close beacon spacing, and it is better to find
it now than during the defence. In rough order of what to try:

1. **Move beacons apart, or add walls between them.** Zone separation is a
   geometry problem before it is a firmware problem.
2. **Raise `HYSTERESIS_DB` and `CONFIRM_TICKS`.** Buys stability, costs latency.
3. **Lower `RSSI_EMA_ALPHA`** (more smoothing, slower response).
4. **Raise `RSSI_FLOOR_DBM`** so distant beacons stop competing at all.
5. **Separate the three demo zones further.** The demo is already down to
   three zones (approved 21 Sep 2026); if two of them still confuse each other,
   choose rooms with more distance or a solid wall between them.

Whatever you change, record the before-and-after numbers. A documented
limitation with measurements behind it is a Chapter 5 recommendation. An
undocumented one is a question you cannot answer.
