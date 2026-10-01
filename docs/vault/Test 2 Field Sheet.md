---
title: Test 2 Field Sheet
tags: [test2, testing, chapter-4, sesem]
updated: 2026-09-24
---

# Test 2 — Zone Classification Accuracy · Field Sheet

Print this and fill it in on the spot. Procedure background:
`docs/project/Test2_Test3_Field_Protocol.md`. Prediction to compare against:
`docs/project/Test2_Prediction.md` (74 % overall, 21 % unresolved at n = 3.0).

**Time needed:** ~15 min setup + ~25 min capture (15 points × ~90 s).

---

## 1. Setup checklist

- [ ] **Beacons:** one per room, in three *different* rooms, placed **centrally**
      (not in a corner), same height (~1.2–1.5 m), antenna end up, clear of
      metal. All at `ESP_PWR_LVL_P9`.
- [ ] **Wearable:** the flashed ESP32 on COM8, **SW1 off**, powered by the
      laptop's USB. Carry it at **waist height**, facing the same way at every
      point.
- [ ] **Far-corner points within ~4 m of their beacon** (beyond that the
      −88 dBm floor dominates the result).
- [ ] Sketch the floor plan below with beacon and point positions — this
      sketch is a Chapter 4 figure.

## 2. Constants in force (as flashed 24 Sep 2026)

| Constant | Value |
|---|---|
| `HYSTERESIS_DB` | 4.0 dB |
| `CONFIRM_TICKS` | 3 (≈ 900 ms at 300 ms/tick) |
| `RSSI_EMA_ALPHA` | 0.35 |
| `RSSI_FLOOR_DBM` | −88 dBm |
| `MEASURED_POWER_1M` / `PATH_LOSS_EXPONENT` | −59 dBm / 2.5 — placeholders, distance display only; **classification does not use them** |
| Beacon TX power | P9 (+9 dBm), all three |
| Beacon height | ______ m |
| Wearable height | ______ m |
| Date / start time / people in the area | ____________ |

## 3. Floor plan sketch

Rooms, doorways, beacon positions (●) and sample points (✕), with dimensions.

<br><br><br><br><br><br><br><br><br><br>

## 4. Sample points

Type the **label** exactly as shown. Measure the distance from each point to
**all three** beacons — the model predicts on the margin between beacons.

`-bnd-in` = walk to the boundary **from inside that zone**.
`-bnd-out` = walk to the same boundary **from the neighbouring zone**
(same spot, opposite approach — tests prediction 4, hysteresis).
Stand ~0.5 m inside the zone at a boundary so the true zone is unambiguous.

| # | Label to type | Where | to BW (m) | to DH (m) | to MR (m) | Notes |
|---|---|---|---|---|---|---|
| 1 | `bedroom_wing@BW-near` | ~1 m from BW beacon | | | | |
| 2 | `bedroom_wing@BW-mid` | mid-room, ~3 m | | | | |
| 3 | `bedroom_wing@BW-far` | far corner (≤ 4 m) | | | | |
| 4 | `bedroom_wing@BW-bnd-in` | doorway toward ____, from inside BW | | | | |
| 5 | `bedroom_wing@BW-bnd-out` | same spot, arriving from ____ | | | | |
| 6 | `dining_hall@DH-near` | ~1 m from DH beacon | | | | |
| 7 | `dining_hall@DH-mid` | mid-room, ~3 m | | | | |
| 8 | `dining_hall@DH-far` | far corner (≤ 4 m) | | | | |
| 9 | `dining_hall@DH-bnd-in` | doorway toward ____, from inside DH | | | | |
| 10 | `dining_hall@DH-bnd-out` | same spot, arriving from ____ | | | | |
| 11 | `medicine_room@MR-near` | ~1 m from MR beacon | | | | |
| 12 | `medicine_room@MR-mid` | mid-room, ~3 m | | | | |
| 13 | `medicine_room@MR-far` | far corner (≤ 4 m) | | | | |
| 14 | `medicine_room@MR-bnd-in` | doorway toward ____, from inside MR | | | | |
| 15 | `medicine_room@MR-bnd-out` | same spot, arriving from ____ | | | | |

## 5. Capture — one continuous log

Open PowerShell and start the logger. It starts on the label `transit`, which
the analysis ignores — opening the port reboots the wearable, and this keeps
the boot out of the data.

```powershell
cd C:\Users\Chester\Desktop\Vaya\SESEM\tools\rssi_calibration
& "C:\Users\Chester\.platformio\penv\Scripts\python.exe" log_serial.py --port COM8 --out C:\TroDesData\test2\test2_run1.csv --label transit
```

At **each point**:

1. Walk there. Stop. Face your chosen direction.
2. Type the label (e.g. `bedroom_wing@BW-near`) and press **Enter**.
3. **Stand still for 60 s** (≈ 60 samples; minimum 30).
4. Type `transit` and press **Enter**, then walk to the next point.

For a `-bnd-out` point, walk in from the *neighbouring* zone's centre while
still labelled `transit`, stop at the boundary spot, then type the label.

**Stop and check the setup if a `-near` point is not ~100 % correct**
(prediction 5) — watch the `[STAT] zone=` lines while you stand there.

Press **Ctrl+C** when all 15 points are done.

## 6. Analysis

```powershell
& "C:\Users\Chester\.platformio\penv\Scripts\python.exe" analyze_zone_accuracy.py --settle 5 C:\TroDesData\test2\test2_run1.csv > C:\TroDesData\test2\test2_run1_results.txt
```

`--settle 5` discards the first 5 s after each label change (the wearable
catching up after you stop). The output has the confusion matrix, per-zone
precision/recall, **per-point table**, unresolved rate and stability.

## 7. Compare against the prediction

| | Predicted (n = 3.0) | Measured |
|---|---|---|
| Overall accuracy | 74 % | |
| Unresolved rate | 21 % | |
| `-near` points | 100 % each | |

- [ ] 1. Per-point accuracy is bimodal (mostly near 0 % or 100 %)
- [ ] 2. `dining_hall` has the highest recall / is the most common wrong answer
- [ ] 3. Unresolved samples cluster at far-corner and boundary points
- [ ] 4. `-bnd-in` scores clearly higher than `-bnd-out` at the same spot
- [ ] 5. Every `-near` point is 100 %

Where a prediction fails, note which assumption broke — the only one not
grounded in measurement is the path-loss exponent n.

## Related

[[Resume Here]] · [[Work Log]] · [[Deliverables Tracker]]
