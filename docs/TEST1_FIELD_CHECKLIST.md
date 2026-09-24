# Test 1 — Field Checklist (RSSI vs Distance)

Print this or open it on the laptop you carry. It is the step-by-step version
of Test 1 in `PHASE1_TEST_GUIDE.md`. Budget **90 minutes** including setup.

Purpose: measure the real path-loss model for these boards in this building —
the measured power at 1 m (*A*) and the path-loss exponent (*n*) in
`RSSI(d) = A − 10·n·log₁₀(d)`. These become firmware constants and the first
real data table in Chapter 4.

---

## 1. Pack list

- [ ] Beacon board (the one printing "TroDes Phase 1 - Zone Beacon")
- [ ] Wearable board (prints "TroDes Phase 1 - Wearable")
- [ ] **Power bank** + USB cable for the beacon (it must run untethered)
- [ ] Laptop + USB cable for the wearable (you carry this as you walk)
- [ ] **Tape measure**, at least 10 m. Not a phone app. Not paces.
- [ ] Masking tape + marker to mark the floor
- [ ] Something to stand the beacon on at a fixed height — a chair, a box,
      a stack of books. It must not move between runs.
- [ ] Phone, for photos of the setup (Chapter 4 needs a figure)

**Label the boards physically** if you have not already. Two identical ESP32s
are indistinguishable and you will mix them up.

---

## 2. Where to do this

**Best:** a straight, empty corridor at least 13 m long. Hallways in an
academic building after hours are ideal.

**Acceptable:** a long room, a covered walkway, a quiet stretch of car park.

**Requirements:**

- [ ] Clear line of sight for the full length — no corners, no doors swinging
- [ ] Nobody walking through during a measurement (a body crossing the path
      drops RSSI several dB and will show up as an outlier)
- [ ] The same location for the whole test. Do not move rooms halfway.

**Write down before you start** — the paper needs it:

```
Location            : ______________________________
Approx dimensions   : ______ m x ______ m
Wall/floor material : ______________________________
Beacon height       : ______ m
Wearable height     : ______ m
Date / time         : ______________________________
Other 2.4 GHz kit   : ____ WiFi APs visible, ____ people present
```

---

## 3. Set up (15 min)

1. Stand the beacon at one end at a fixed height (**1.5 m is a good default** —
   roughly where a wall-mounted beacon would sit). Record the actual height.
2. Power it from the **power bank**. Confirm the on-board LED blinks once every
   3 seconds — that is the beacon alive.
3. Measure and mark the floor with tape at:

   **1 m, 2 m, 3 m, 4 m, 6 m, 8 m, 12 m**

   Measure each from the beacon, not cumulatively from the last mark — errors
   compound. Write the distance on each piece of tape.
4. If you cannot get 12 m, stop at 8 m. Note the constraint. Four distances is
   the absolute minimum for a fit; seven is much better.
5. Plug the wearable into the laptop. Note its COM port (`pio device list`).
   **Do not trust yesterday's port number** — these boards move ports.
6. **Close the PlatformIO Serial Monitor.** Only one program can hold a COM
   port, and `log_serial.py` needs it.

---

## 4. Run A — line of sight (25 min)

```
cd tools\rssi_calibration
pip install -r requirements.txt
python log_serial.py --port COM10 --out test1_los.csv --label 1
```

(substitute your actual port)

Then, for each mark:

1. Stand at the mark, holding the wearable **out in front of you at the
   recorded height**, board facing the beacon, your body **behind** it.
2. Stand still for **60 seconds**. Count it — do not guess.
3. Type the next distance into the running terminal and press Enter, e.g.
   `2`, then walk to the 2 m mark. The label changes immediately.
4. Repeat through every mark.

Ctrl+C when done.

**Keep constant across all marks:** height, orientation of the board, which
hand, how far from your body. Changing any of these mid-run adds variance that
looks like distance-dependence and will corrupt the fit.

---

## 5. Run B — body-blocked (25 min)

Identical, but **turn around** so your body is between the wearable and the
beacon at every mark. Hold the board against your chest, as a resident would
actually wear it.

```
python log_serial.py --port COM10 --out test1_nlos.csv --label 1
```

This matters. A wearable is worn on a body, and a human body attenuates
2.4 GHz noticeably. The panel will ask. Having the number is a strong answer;
not having it is a gap.

---

## 6. Analyse (10 min, at the desk)

```
python analyze_distance_profile.py --zone bedroom_wing --plot test1_los.png test1_los.csv
python analyze_distance_profile.py --zone bedroom_wing --plot test1_nlos.png test1_nlos.csv
```

Record from the line-of-sight run:

- The **data table** (distance, n, mean, median, sd, min, max) → Chapter 4
- **A**, **n**, **R²** → Chapter 4 result, and the firmware
- The **residuals** → shows honestly how well the model fits
- The **PNG plot** → Chapter 4 figure

Then state the body-blocking attenuation: mean LOS minus mean blocked, per
distance, in dB.

### Exit criteria

- [ ] R² ≥ 0.8 on the line-of-sight fit
- [ ] Fitted *n* between 1.5 and 5.0
- [ ] Standard deviation recorded at every distance, ≤ ~6 dB at 1–4 m
- [ ] Body-blocked attenuation stated in dB

A poor fit is a **result**, not a failure — indoor multipath does this. Report
it honestly; it is also the argument for classifying zones by strongest-beacon
rather than by estimated distance.

---

## 7. Update the firmware, then reflash

The analysis script prints the exact lines. Update:

- `beacon_node/include/zone_config.h` → `MEASURED_POWER_1M`
- `wearable/include/config.h` → `MEASURED_POWER_1M`, `PATH_LOSS_EXPONENT`
- `wearable/include/config.h` → `RSSI_FLOOR_DBM`, from the weakest reliable
  reading you actually observed

Reflash **both** boards — **one at a time, with only that board plugged in.**
COM ports on these CH340 boards move around, and a wrong-board flash looks
exactly like a firmware bug.

---

## 8. Before you pack up

- [ ] Photos of the setup, with the tape measure visible
- [ ] The location/height/conditions box in §2 filled in
- [ ] Both CSVs copied somewhere safe (they are raw data — do not lose them)
- [ ] Both PNGs saved
- [ ] A note of anything odd: people walking through, a door opened, a dropout

Raw captures are evidence. Keep them even after the analysis is done — a panel
may ask to see them, and Chapter 4 is far more defensible with them than with
summary numbers alone.

---

## Next after this

Test 2 (zone classification accuracy) needs **more than one beacon**. You
currently have one. Before Test 2 you need either more ESP32s flashed as
beacons, or an adviser decision on the demo zone count — that question is still
open and it now blocks progress.

---

## Appendix — practical notes from the 2026-09-03 dry run

**Write captures to `C:\TroDesData`, not into the vault.** Creating files inside
`...\AA_Electronics Design (SESEM)\...` fails with `FileNotFoundError` — the
same parenthesis problem that breaks PlatformIO builds there. Use absolute
output paths:

```
--out C:\TroDesData\test1_los.csv
```

**Use PlatformIO's Python.** It already has pyserial; add matplotlib once:

```powershell
& "C:\Users\Chester\.platformio\penv\Scripts\python.exe" -m pip install matplotlib
& "C:\Users\Chester\.platformio\penv\Scripts\python.exe" log_serial.py --port COM10 --out C:\TroDesData\test1_los.csv --label 1
```

**Reflash the wearable with `DEBUG_BLE_SNIFF = 0` before the real run.** With it
on, three `[SNIFF]` lines per 300 ms bury the `[RSSI]` lines, bloat the CSV and
eat serial bandwidth.

**Sanity-check the 1 m reading before you commit to a whole run.** At 1 m,
line of sight, both boards at 0 dBm TX, expect roughly **−50 to −60 dBm**. The
dry run produced −71 dBm at its "1 m" mark, which is far too weak — a sign the
distance was estimated rather than measured, or something was blocking the
path. If your first mark reads below about −65, stop and find out why before
spending an hour collecting data built on it.

**Stand still during each 60 s window.** The dry run showed a 20 dB spread
(−85 to −65) inside one distance label. That is movement, not multipath, and it
inflates the standard deviation that Chapter 4 reports.

**Give every distance the same dwell time.** The dry run had 33 samples at one
distance and 70 at another. The fit weights each distance's mean equally, so
uneven dwell is not fatal, but equal dwell is cleaner to defend.
