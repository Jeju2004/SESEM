#!/usr/bin/env python3
"""
TroDes Phase 1, Test 1 - RSSI vs distance.

Fits the log-distance path-loss model

    RSSI(d) = A - 10 * n * log10(d)

where A is the measured power at 1 m and n is the path-loss exponent, using
captures whose LABEL is the true distance in metres.

Both fitted values go straight back into the firmware:
    beacon_node/include/zone_config.h : MEASURED_POWER_1M
    wearable/include/config.h         : MEASURED_POWER_1M, PATH_LOSS_EXPONENT

They also give you the numbers Chapter 4 of the IEEE paper needs: a data
table of RSSI vs distance with spread, and a fitted model with an R-squared.

Usage:
    python analyze_distance_profile.py --zone bedroom_wing test1_*.csv
    python analyze_distance_profile.py --zone bedroom_wing --plot t1.png t1.csv
"""

import argparse
import math
import sys
from collections import defaultdict

from trodes_log import rssi_samples, mean, median, stdev, linear_fit


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", nargs="+", help="Capture CSVs from log_serial.py")
    ap.add_argument("--zone", required=True,
                    help="Zone name of the beacon under test, e.g. bedroom_wing")
    ap.add_argument("--plot", metavar="PNG",
                    help="Optional scatter + fit plot (needs matplotlib)")
    args = ap.parse_args()

    by_distance = defaultdict(list)
    skipped = 0

    for _t, label, vals in rssi_samples(args.csv):
        if args.zone not in vals:
            continue
        try:
            d = float(label)
        except ValueError:
            skipped += 1
            continue
        if d <= 0:
            skipped += 1
            continue
        by_distance[d].append(vals[args.zone])

    if not by_distance:
        sys.exit(f"No samples for zone '{args.zone}' with a numeric distance "
                 f"label. Check --zone spelling, and that you labelled the "
                 f"capture with distances in metres.")

    print(f"\nRSSI vs distance - beacon '{args.zone}'")
    print(f"{len(args.csv)} file(s), "
          f"{sum(len(v) for v in by_distance.values())} usable samples"
          + (f", {skipped} rows skipped (non-numeric label)" if skipped else ""))
    print()
    print(f"{'d (m)':>8} {'n':>6} {'mean':>8} {'median':>8} {'sd':>7} "
          f"{'min':>7} {'max':>7}")
    print("-" * 56)

    xs, ys = [], []
    for d in sorted(by_distance):
        v = by_distance[d]
        print(f"{d:>8.2f} {len(v):>6d} {mean(v):>8.1f} {median(v):>8.1f} "
              f"{stdev(v):>7.2f} {min(v):>7.0f} {max(v):>7.0f}")
        # Fit on the per-distance mean so every distance carries equal weight,
        # regardless of how long the tester happened to stand at each spot.
        xs.append(math.log10(d))
        ys.append(mean(v))

    if len(xs) < 2:
        sys.exit("\nNeed at least two distinct distances to fit a model. "
                 "Capture at 1, 2, 4 and 8 m as a minimum.")

    a, b, r2 = linear_fit(xs, ys)          # y = a + b*log10(d)
    n_exp = -b / 10.0                      # b = -10n
    print()
    print("Fitted model:  RSSI(d) = A - 10*n*log10(d)")
    print(f"  A (measured power at 1 m) = {a:.2f} dBm")
    print(f"  n (path-loss exponent)    = {n_exp:.2f}")
    print(f"  R^2                       = {r2:.4f}")
    print()
    print("Residuals (measured mean - model):")
    for d in sorted(by_distance):
        pred = a + b * math.log10(d)
        obs = mean(by_distance[d])
        print(f"  {d:>6.2f} m: obs {obs:>7.1f}  model {pred:>7.1f}  "
              f"resid {obs - pred:>+6.1f} dB")

    print()
    print("Put these into the firmware:")
    print(f"  beacon_node/include/zone_config.h : #define MEASURED_POWER_1M   ({a:.0f})")
    print(f"  wearable/include/config.h         : #define MEASURED_POWER_1M   ({a:.1f}f)")
    print(f"  wearable/include/config.h         : #define PATH_LOSS_EXPONENT  {n_exp:.2f}f")
    print()
    if n_exp < 1.5 or n_exp > 5.0:
        print("WARNING: an exponent outside roughly 1.5-5.0 usually means the "
              "beacon moved, the TX power differed between runs, or the "
              "distance labels are wrong. Re-check before using this.")
    if r2 < 0.8:
        print("WARNING: R^2 below 0.8 - the fit is poor. Indoor multipath does "
              "this. Report it honestly in Chapter 4 rather than hiding it; it "
              "is also the argument for classifying zones by strongest-beacon "
              "rather than by estimated distance.")

    if args.plot:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
        except ImportError:
            print("matplotlib not installed - skipping plot "
                  "(pip install matplotlib)")
            return
        fig, ax = plt.subplots(figsize=(7, 4.5))
        for d in sorted(by_distance):
            v = by_distance[d]
            ax.scatter([d] * len(v), v, s=8, alpha=0.35, color="#4a6fa5")
            ax.scatter([d], [mean(v)], s=45, color="#1b3a6b", zorder=3)
        dmin, dmax = min(by_distance), max(by_distance)
        grid = [dmin * (dmax / dmin) ** (i / 100.0) for i in range(101)]
        ax.plot(grid, [a + b * math.log10(g) for g in grid], "--",
                color="#c05621",
                label=f"fit: A={a:.1f} dBm, n={n_exp:.2f}, R^2={r2:.3f}")
        ax.set_xscale("log")
        ax.set_xlabel("Distance (m, log scale)")
        ax.set_ylabel("RSSI (dBm)")
        ax.set_title(f"RSSI vs distance - beacon '{args.zone}'")
        ax.grid(True, which="both", alpha=0.3)
        ax.legend()
        fig.tight_layout()
        fig.savefig(args.plot, dpi=150)
        print(f"Plot written to {args.plot}")


if __name__ == "__main__":
    main()
