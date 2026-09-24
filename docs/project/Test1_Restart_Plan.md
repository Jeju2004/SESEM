# Test 1 — Restart Plan

Test 1 was attempted on 6 September and the capture is not usable. This is the
clean redo, about 50 minutes.

## What Test 1 is for

It measures the two constants in the wearable's log-distance path-loss model:

```
RSSI(d) = A − 10 · n · log₁₀(d)
```

- **A** = `MEASURED_POWER_1M` — RSSI at exactly 1 m
- **n** = `PATH_LOSS_EXPONENT` — how fast signal decays in this building

Both are still placeholders (`−59.0f`, `2.5f`). Tests 2 and 3 depend on them,
and every Chapter 4 table depends on those. This is the bottleneck.

---

## Why the 6 September capture cannot be reused

`C:\TroDesData\dryrun.csv` — 264 usable RSSI samples across five marks. Cleanly
run, but measuring a system that no longer exists:

| Mark | n | Median | sd |
|---|---|---|---|
| 1 m | 33 | −71.0 | 1.3 |
| 2 m | 51 | −81.0 | 3.6 |
| 3 m | 52 | −81.5 | 3.2 |
| 4 m | 58 | −88.0 | 3.4 |
| 5 m | 70 | −91.5 | 3.7 |

1. **Pre-dates the P9 change.** `zone_config.h` was set to `ESP_PWR_LVL_P9` on
   13 September; this capture is from the 6th, so the beacon was at +3 dBm.
   The 1 m reading of −71 dBm against today's −55 dBm confirms it.
2. **Sniffer build.** 799 `[SNIFF]` lines — `DEBUG_BLE_SNIFF` was 1.
3. **Single beacon.** Only `bedroom_wing` ever resolved.

The capture *format* is correct, though: the label is the distance in metres,
exactly what the analysis tool expects.

---

## The run — 50 minutes

**Setup (10 min)**

1. Confirm the wearable is on a `DEBUG_BLE_SNIFF = 0` build — no `[SCAN]` lines.
2. Confirm the beacon is at `ESP_PWR_LVL_P9`.
3. Beacon on a power bank at **1.5 m**; wearable at **0.75 m**. Keep both
   heights constant — changing one mid-run puts a step in the data that looks
   like a measurement error, because it is one.
4. Tape the floor at **1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0 m**, measured to the
   *antenna*, each from the beacon rather than cumulatively — errors compound.
5. Clear line of sight at every mark. Note anything in the path; it goes in
   Chapter 4's assumptions.

**Capture (30 min)**

```
cd tools/rssi_calibration
python log_serial.py --port COMxx --out test1_los.csv --label 1
```

6. At each mark: hold position, capture **≥30 samples** (~60 s). Type the next
   distance and press Enter as you move; the label changes immediately.
7. **Watch the first mark. 1 m should read ≈ −55 dBm.** If it does not, stop
   and find out why before collecting an hour of data. That single check is
   what separates a 50-minute run from a wasted afternoon.
8. Stand consistently — your own body between beacon and wearable costs
   10–20 dB and is the commonest source of an outlier mark.

**Analysis (10 min)**

```
python analyze_distance_profile.py --zone bedroom_wing --plot test1.png test1_los.csv
```

9. Paste the fitted `A` and `n` into **both** `zone_config.h` and
   `wearable/include/config.h`.
10. Reflash **one board at a time, only that board plugged in**.

---

## Expected result

| Quantity | Expected | If different |
|---|---|---|
| RSSI at 1 m | ≈ **−55 dBm** | Beacon not at P9, or obstructed antenna |
| Path-loss exponent **n** | **3.6–3.8** | Two independent preliminary estimates agree here. A wildly different value means a measurement problem, not a discovery |
| R² | > 0.90 | Lower suggests a blocked line of sight at one mark |

A value near 3.8 is high but credible for a furnished indoor room, and far more
defensible than the 2.5 placeholder.

**Do not discard sub-floor samples.** `RSSI_FLOOR_DBM` (−88) is a
classification threshold, not a hardware clip — the radio reports down to at
least −96 dBm. Excluding readings below −88 throws away real data and biases
the exponent low.

---

## Likely reasons a run stalls

| Symptom | Cause | Fix |
|---|---|---|
| Readings pinned near −88 beyond ~4 m | A beacon still at `P3` | Verify P9 on every beacon first |
| `[SCAN]` lines flooding the log | `DEBUG_BLE_SNIFF = 1` build | Reflash with it set to 0 |
| Serial dropped mid-run | Cable strain, or COM port reassigned | Power bank for the beacon, laptop stays put, tape the cable |
| Capture file empty or truncated | Writing inside the vault path | Write to `C:\TroDesData\` |
| Ran out of corridor | 8 m needs a genuinely clear run | Pick the location before starting |

---

## After Test 1 closes

1. Review `RSSI_FLOOR_DBM` against the weakest reliable reading.
2. Flash the remaining beacons — **at P9**.
3. **Test 2**, the confusion matrix and headline result.
4. **Test 3**, boundary and hysteresis.
