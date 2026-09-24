# Test 2 and Test 3 — Field Protocol

Written in the structure Chapter 4 requires: title, purpose, assumptions and
constants, procedure, data table, analysis. Fill the tables in as you go and
Chapter 4 is largely written by the end of the session.

**Prerequisite:** Test 1 closed and its constants flashed to every board.
Running Test 2 on placeholder constants produces a number you will throw away.

---

## Constants in force — record before starting

Every one of these is a question the panel can ask, and "I don't remember what
it was set to" is the worst possible answer.

| Constant | Value | Source |
|---|---|---|
| `MEASURED_POWER_1M` (A) | ______ dBm | Test 1 fit |
| `PATH_LOSS_EXPONENT` (n) | ______ | Test 1 fit |
| `RSSI_FLOOR_DBM` | ______ dBm | |
| `HYSTERESIS_DB` | ______ dB | |
| `CONFIRM_TICKS` | ______ | |
| Beacon TX power | `ESP_PWR_LVL_P9` (+9 dBm) | All beacons must match |
| Beacon height | ______ m | |
| Wearable height | ______ m | |
| Scan interval | ______ ms | |
| Date, time, occupancy | | Affects multipath |

---

# Test 2 — Zone Classification Accuracy

**The headline result of the project.** Everything else supports it.

## Purpose

To measure how reliably the wearable identifies which zone the resident is in,
across the full area of each zone rather than only beside the beacon.

## Assumptions

- One beacon per zone, at fixed height, all at matched power
- Line of sight is **not** assumed — this is the realistic indoor case
- The wearable is worn at waist height, as it would be in use

## Procedure

**1. Place the beacons.** One per zone, in *different rooms*, well separated.
Sketch the floor plan with beacon positions — that sketch is a Chapter 4 figure.

**2. Choose sample points.** This step decides whether the result means
anything. Per zone, at least **four**:

| Point type | Why it must be included |
|---|---|
| Beside the beacon (~1 m) | Best case |
| Mid-zone (~3 m) | Typical case |
| **Far corner of the zone** | Worst case within the zone |
| **Near the zone boundary** | The case that actually fails |

> Sample only next to the beacons and you will measure 99% accuracy and the
> number will be worthless. A panel will ask where the hard cases are, and they
> will be right to. **The far-corner and boundary points are the test.**

**3. Label the points** (`BW-1`, `BW-far`, `MR-boundary`, …) and mark them on
the sketch.

**4. Capture.** At each point, stand still and capture **≥30 samples** (~60 s).
Record per sample: timestamp, `point_id`, `true_zone` (where you actually are —
you write this by hand), `zone` (what the firmware decided), and the winning
`rssi_dbm`. Without `true_zone` there is no confusion matrix.

**5. Do not move during a capture.** If you did not pause while walking between
points, discard the transitional samples in analysis.

**6. Stand consistently.** Face the same way at every point and note which way.

## Analysis

Produce: the confusion matrix (rows = actual, columns = classified), overall
accuracy, per-zone precision and recall, the unresolved rate, and a per-point
breakdown showing where the system struggles.

**Report all of it, including the weak points.** An honest 78% with a clear
explanation of which positions fail is a far stronger Chapter 4 than an
unexplained 99%.

Three zones gives a 3×3 matrix. If a beacon is unavailable, a 2×2 matrix is
still a real, measured, defensible result — state the scope limitation in the
paper rather than collecting nothing.

---

# Test 3 — Boundary Behaviour and Hysteresis

## Purpose

To characterise behaviour when the resident crosses between zones: how quickly
a real transition is followed, and whether the system alternates between zones
when the resident lingers at a boundary.

These pull in opposite directions. **The trade-off is the finding.**

## Evidence already in hand

From bring-up on 13 September, worth writing up rather than re-running:

- A complete `medicine_room → bedroom_wing → medicine_room` transition
  captured, restricted-zone alert firing correctly
- No flapping observed with both beacons within 1 dB of each other

## Procedure

**Part A — transition latency.** Walk at normal pace from the centre of zone A
to the centre of zone B. Time from crossing the physical boundary to the
dashboard showing the new zone. **Ten runs**, five in each direction.

**Part B — boundary flapping.** Stand *at* the boundary, still, for three
minutes. Count zone changes. A stationary resident should produce zero. Repeat
at each boundary.

**Part C — tuning.** If Part B shows flapping, raise `HYSTERESIS_DB` or
`CONFIRM_TICKS`, reflash, repeat both parts. **Record before-and-after numbers
for every change** — the comparison is the result, not the final value alone.

## Data

| Run | Direction | Latency (s) | Flaps in 3 min | `HYSTERESIS_DB` | `CONFIRM_TICKS` |
|---|---|---|---|---|---|
| 1 | A→B | | | | |
| 2 | B→A | | | | |

## Analysis

Report mean and worst-case latency, flap count per configuration, and the
reasoning behind the final setting. A latency of a few seconds is expected and
entirely acceptable here — a caregiver does not need sub-second location.
**Say so explicitly, with the number**, rather than leaving the panel to wonder
whether you noticed.

---

## If time runs short

1. **Test 1 closed and constants flashed** — everything depends on it
2. **Test 2** — the headline number
3. **Test 3 Part B** (flapping) — cheap, three minutes per boundary
4. Test 3 Part A (latency) — ten walks
5. Test 3 Part C (tuning) — only if Part B shows a problem

Stopping after item 2 still gives a measured result to report.
