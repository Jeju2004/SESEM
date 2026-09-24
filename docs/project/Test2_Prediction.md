# Test 2 — A-Priori Prediction

Version 1.0 · 21 September 2026

**This document contains no measurements.** It is a model built from measured
parameters, written *before* Test 2 so that the measured result can be compared
against it. Predicting first and comparing after is stronger evidence than
measuring alone, and it is what makes a discrepancy informative rather than
just disappointing.

---

## Inputs

**Measured in this project:**

| Parameter | Value | Source |
|---|---|---|
| Reference power at 1 m | −67 dBm (`dining_hall` −65) | Beacon matching, 21 Sep |
| Position-dependent spread | ±3.0 dB | Test 1 residuals |
| Sample-to-sample spread at a fixed point | 2.6 dB | Test 1, 2.1–3.7 dB range |
| `RSSI_EMA_ALPHA` | 0.35 | firmware |
| `HYSTERESIS_DB` | 4.0 | firmware |
| `RSSI_FLOOR_DBM` | −88 | firmware |

**Assumed, and stated as such:**

- Path-loss exponent **n = 3.0**. Test 1 could not resolve it; this is a
  standard indoor value.
- Zone geometry: sample points at 1, 3, 5 and 5 m from the home beacon, with
  the nearest competing beacon at 8, 6, 6 and 5 m respectively.

**Derived.** The exponential moving average suppresses the time-varying
component only — the positional offset is static while you stand still. EMA at
α = 0.35 reduces 2.6 dB to **1.20 dB**. Combined standard deviation of the
beacon-to-beacon difference: **4.57 dB**.

Hysteresis shifts the decision boundary **4 dB in favour of whichever zone is
already held**, which is why the approach direction matters below.

---

## The dominant unknown: usable radius

Everything hinges on where the home beacon falls to the −88 dBm floor.

| Path-loss exponent | Usable radius |
|---|---|
| n = 2.5 | 6.9 m |
| **n = 3.0** | **5.0 m** |
| n = 3.5 | 4.0 m |
| n = 3.8 (bring-up estimate) | 3.6 m |

Predicted mean zone recall across the four point types:

| n | beside beacon | mid-zone | far corner | boundary | mean |
|---|---|---|---|---|---|
| 2.5 | 100% | 99% | 78% | 70% | **87%** |
| **3.0** | 100% | 98% | 46% | 41% | **71%** |
| 3.5 | 100% | 91% | 13% | 12% | **54%** |
| 3.8 | 100% | 81% | 4% | 3% | **47%** |

**This is the finding worth acting on before testing, not after.** The result
is dominated by whether the far points sit inside the usable radius. Predicted
unresolved rate against far-corner distance, at n = 3.0:

| Far corner at | Home beacon | Unresolved |
|---|---|---|
| 3 m | −81 dBm | 2% |
| 4 m | −85 dBm | 18% |
| 5 m | −88 dBm | **50%** |
| 6 m | −90 dBm | 77% |

---

## Predicted confusion matrix

At n = 3.0, four points per zone, each approached from inside its own zone:

| Actual \ Classified | bedroom_wing | dining_hall | medicine_room | Unresolved |
|---|---|---|---|---|
| **bedroom_wing** | 68% | 7% | 0% | 25% |
| **dining_hall** | 0% | 84% | 2% | 13% |
| **medicine_room** | 0% | 7% | 68% | 25% |

**Predicted overall accuracy: 74%. Predicted unresolved rate: 21%.**

`dining_hall` scores highest because its beacon runs 2 dB hot — the same 2 dB
recorded during beacon matching. That asymmetry is a prediction in itself.

---

## Five falsifiable predictions

Each of these can be shown wrong by the measurement. That is the point.

1. **Per-point accuracy will be bimodal, not uniform.** Because the positional
   offset is static while you stand still, most points will score near 100% or
   near 0%. Intermediate values should appear only where the beacon-to-beacon
   margin is within about 3 dB.
2. **`dining_hall` will have the highest recall** and will be the most common
   wrong answer when another zone is misclassified.
3. **Unresolved samples will cluster almost entirely at far-corner and
   boundary points**, and should be near zero beside the beacons.
4. **Approach direction will change the answer at boundary points.** Walking to
   a boundary from inside the home zone should give roughly 81% correct;
   arriving from the neighbouring zone, roughly 19%. Same position, opposite
   result — this is hysteresis, working as designed.
5. **Accuracy beside the beacon will be 100%** in every zone. If it is not,
   something is wrong with the setup rather than the method, and the run should
   be stopped.

---

## Do this before running the test

**Place the beacons centrally in each zone, not in a corner.** A central beacon
halves the worst-case distance and is the single change that most improves the
result. At n = 3.0 a corner-mounted beacon in a 7 m room leaves the far corner
outside the usable radius entirely.

**Keep the far-corner sample point within about 4 m of its beacon.** Beyond
that the prediction is dominated by the floor rather than by classification.

**Consider `RSSI_FLOOR_DBM`.** It is set to −88, but the radio demonstrably
reports to −96 dBm and below. Lowering the floor to −92 would extend the usable
radius from 5.0 m to about 6.8 m at n = 3.0. The trade-off is that weaker,
noisier readings are admitted to the classifier. This is a firmware knob worth
one deliberate experiment — not a change to make casually mid-test.

---

## Record these so the comparison can be made

- Distance from each sample point to **each** of the three beacons, not just
  its own. The margin between beacons is what the model predicts on.
- Approach direction for every boundary point.
- Room dimensions and beacon mounting positions.
- The constants in force at the time of the run.

Then compare measured against predicted, point by point. Where the model is
wrong, the interesting question is which assumption failed — and the only
assumption not grounded in measurement is n.
