# RF Link Budget — Findings and TX Power Decision

Recorded 2026-09-13 during two-beacon bring-up. Chapter 4 and Chapter 5
material: a measured design decision and the diagnostic method that produced it.

---

## Problem observed

With both beacons at `ESP_PWR_LVL_P3` (+3 dBm), the wearable read **−82 to
−91 dBm** at a slant distance of 2.45 m (2.33 m horizontal, beacons at 1.5 m,
wearable at 0.75 m), clear line of sight, no wall between.

Free-space path loss over 2.45 m at 2.4 GHz is about 48 dB, so expected
received power was roughly **−45 dBm**. Observed values were 30–40 dB below.

`RSSI_FLOOR_DBM` is −88 dBm, so the system was at its detection floor at
2.45 m. Zones intermittently dropped to `--`, and anything beyond ~4 m would
have been unusable.

---

## Diagnostic method — isolating transmit from receive

A handset running nRF Connect was used as an **independent reference receiver**
at the wearable's position.

| Receiver | `bedroom_wing` | `medicine_room` |
|---|---|---|
| Wearable (ESP32) | −82 to −89 dBm | −82 to −89 dBm |
| Mobile handset | −76 dBm | −82 dBm |

The two receivers agreed, eliminating receiver desensitisation. In the same
scan the handset recorded a laptop's Bluetooth radio at −45 dBm and unrelated
commercial beacons at −62 dBm, confirming the receiver worked and the
environment was not uniformly lossy.

**Conclusion: the fault was on the transmit side.**

This technique — comparing against an independent receiver rather than
reasoning from the system's own silence — also found the beacon UUID
byte-order defect. Use it for any radio fault in this project.

---

## Measurement at controlled distance

One beacon held in free air at exactly 1 m from the handset, antenna clear.

| Transmit power | Measured at 1 m |
|---|---|
| `ESP_PWR_LVL_P3` (+3 dBm) | **−61 dBm** |
| `ESP_PWR_LVL_P9` (+9 dBm) | **−55 dBm** (individual packets −52) |

The 6 dB improvement matches the 6 dB power increase, confirming the firmware's
power control is effective.

---

## Decision

**Both beacons set to `ESP_PWR_LVL_P9` (+9 dBm).**

| Setting | At 1 m | Usable range to floor |
|---|---|---|
| P3 (+3 dBm) | −61 dBm | ≈ 4 m |
| **P9 (+9 dBm)** | **−55 dBm** | **≈ 7–8 m** |

Beacon-to-beacon consistency after the change: `bedroom_wing` −55 dBm,
`medicine_room` −56 dBm. One decibel apart.

**This consistency is a requirement, not a nicety.** Beacons transmitting at
different powers produce RSSI values that are not comparable, and the zone
classification confusion matrix loses its meaning. Any beacon added later must
use the same setting.

**Trade-off for the paper:** higher transmit power raises the beacon's current
draw. Beacons are mains-powered fixed infrastructure, so this costs nothing
system-wide, and it does **not** affect wearable battery life — the wearable
only receives.

---

## Preliminary path-loss observation

From two measurements of the same beacon: −61 dBm at 1.00 m, −76 dBm at
2.45 m. 15 dB over a 2.45× distance change implies a path-loss exponent near
**3.8**. Free space would predict 2.0.

A value near 3.8 is high but credible for a furnished indoor room with
multipath and absorption, and far more defensible than the 2.5 placeholder.

This is **two points only** and is not a substitute for Test 1, which measures
the exponent across seven distances with repeated samples. Keep it as a sanity
check: if Test 1 returns something wildly different in a comparable
environment, question the measurement.

---

## Firmware note

`zone_config.h` previously carried a comment stating `ESP_PWR_LVL_P3 = 0 dBm,
ESP_PWR_LVL_P7 = +9 dBm`. Both halves were wrong — the ESP-IDF enumeration is
`N12, N9, N6, N3, N0, P3, P6, P9`, so P3 is **+3 dBm**, P9 is **+9 dBm**, and
there is no P7. **Corrected 2026-09-21.**

---

## Consequences for testing

- Test 1 can cover 1–8 m without hitting the floor
- `MEASURED_POWER_1M` (−59 dBm placeholder) must be re-measured at P9 —
  preliminary figure ≈ −55 dBm
- `RSSI_FLOOR_DBM` (−88) should be reviewed against Test 1's weakest reliable
  reading
- **Captures taken before 13 September 2026 are at P3 and are not comparable
  with anything measured since.** `C:\TroDesData\dryrun.csv` (6 Sep) is in this
  category and cannot be used to fit the model.
