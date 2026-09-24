#!/usr/bin/env python3
"""
TroDes Phase 1, Tests 2 and 3 - zone classification accuracy and boundary
behaviour.

Compares the zone the wearable REPORTED ([STAT] zone=...) against the zone the
tester was ACTUALLY in (the capture's label), and produces:

  * a confusion matrix (rows = true zone, columns = reported zone)
  * per-zone precision, recall and F1
  * overall accuracy
  * flicker analysis: how often the reported zone changed while the tester
    stayed put, and the distribution of dwell times

These are exactly the tables Chapter 4 asks for. The flicker section is the
evidence for whether HYSTERESIS_DB and CONFIRM_TICKS are tuned correctly.

Usage:
    python analyze_zone_accuracy.py test2_*.csv
    python analyze_zone_accuracy.py --settle 2.0 test3_boundary.csv
"""

import argparse
import sys
from collections import Counter, defaultdict, OrderedDict

from trodes_log import zone_samples, mean, median


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", nargs="+", help="Capture CSVs from log_serial.py")
    ap.add_argument("--settle", type=float, default=0.0, metavar="SEC",
                    help="Discard samples within SEC seconds after a label "
                         "change, i.e. allow for walking time between spots "
                         "(default 0)")
    ap.add_argument("--ignore", default="unlabelled,transit",
                    help="Comma-separated labels to exclude entirely")
    args = ap.parse_args()

    ignore = {s.strip() for s in args.ignore.split(",") if s.strip()}

    rows = list(zone_samples(args.csv))
    if not rows:
        sys.exit("No [STAT] lines found. Is this a wearable capture?")

    # --- drop the settling window after each label change ---
    kept = []
    last_label = None
    label_changed_at = None
    for t, label, reported in rows:
        if label != last_label:
            last_label = label
            label_changed_at = t
        if label in ignore or not label:
            continue
        if args.settle > 0 and label_changed_at is not None \
                and (t - label_changed_at) < args.settle:
            continue
        kept.append((t, label, reported))

    if not kept:
        sys.exit("Every sample was filtered out. Lower --settle, or check "
                 "that the capture was labelled with zone names.")

    truths = sorted({l for _t, l, _r in kept})
    preds = sorted({r for _t, _l, r in kept})
    cols = list(OrderedDict.fromkeys(truths + [p for p in preds if p not in truths]))

    matrix = defaultdict(Counter)
    for _t, label, reported in kept:
        matrix[label][reported] += 1

    total = len(kept)
    correct = sum(matrix[z][z] for z in truths)

    print(f"\nZone classification - {len(args.csv)} file(s), {total} samples"
          + (f" (settle window {args.settle:.1f}s discarded)" if args.settle else ""))
    print(f"Overall accuracy: {correct}/{total} = {100.0 * correct / total:.1f}%")

    # --- confusion matrix ---
    w = max(14, max(len(c) for c in cols) + 2)
    print("\nConfusion matrix (rows = true, cols = reported):\n")
    print(" " * w + "".join(f"{c:>{w}}" for c in cols) + f"{'total':>{w}}")
    for tz in truths:
        rowtotal = sum(matrix[tz].values())
        print(f"{tz:<{w}}" + "".join(f"{matrix[tz][c]:>{w}}" for c in cols)
              + f"{rowtotal:>{w}}")

    # --- per-zone metrics ---
    print("\nPer-zone metrics:\n")
    print(f"{'zone':<22}{'n':>7}{'precision':>12}{'recall':>10}{'F1':>9}")
    print("-" * 60)
    for z in truths:
        tp = matrix[z][z]
        fn = sum(matrix[z].values()) - tp
        fp = sum(matrix[o][z] for o in truths if o != z)
        prec = tp / (tp + fp) if (tp + fp) else float("nan")
        rec = tp / (tp + fn) if (tp + fn) else float("nan")
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) else float("nan")
        print(f"{z:<22}{tp + fn:>7}{prec:>12.3f}{rec:>10.3f}{f1:>9.3f}")

    # --- confusions worth naming ---
    confusions = Counter()
    for tz in truths:
        for rz, n in matrix[tz].items():
            if rz != tz:
                confusions[(tz, rz)] += n
    if confusions:
        print("\nMost common misclassifications:")
        for (tz, rz), n in confusions.most_common(8):
            print(f"  {tz:<22} reported as {rz:<22} {n:>5} "
                  f"({100.0 * n / total:.1f}% of all samples)")

    # --- flicker / stability ---
    print("\nStability (Test 3):")
    changes_while_static = 0
    segments = []          # (label, duration, n_changes)
    seg_label = kept[0][1]
    seg_start = kept[0][0]
    seg_changes = 0
    prev_reported = kept[0][2]

    for t, label, reported in kept[1:]:
        if label != seg_label:
            segments.append((seg_label, t - seg_start, seg_changes))
            seg_label, seg_start, seg_changes = label, t, 0
        elif reported != prev_reported:
            seg_changes += 1
            changes_while_static += 1
        prev_reported = reported
    segments.append((seg_label, kept[-1][0] - seg_start, seg_changes))

    static_time = sum(d for _l, d, _c in segments if d > 0)
    print(f"  Reported-zone changes while the tester stayed put: "
          f"{changes_while_static}")
    if static_time > 0:
        print(f"  Flicker rate: {60.0 * changes_while_static / static_time:.2f} "
              f"changes per minute of stationary time")
    print("\n  Per stationary segment:")
    print(f"  {'label':<22}{'seconds':>10}{'changes':>10}")
    for label, dur, ch in segments:
        print(f"  {label:<22}{dur:>10.1f}{ch:>10}")

    # --- dwell times between reported-zone changes ---
    dwell = []
    last_change_t = kept[0][0]
    prev_reported = kept[0][2]
    for t, _label, reported in kept[1:]:
        if reported != prev_reported:
            dwell.append(t - last_change_t)
            last_change_t = t
            prev_reported = reported
    if dwell:
        print(f"\n  Dwell time between reported-zone changes: "
              f"n={len(dwell)} mean={mean(dwell):.2f}s "
              f"median={median(dwell):.2f}s min={min(dwell):.2f}s")
        if min(dwell) < 1.0:
            print("  NOTE: a sub-second dwell means the zone flipped and flipped "
                  "back almost immediately. Raise HYSTERESIS_DB or CONFIRM_TICKS "
                  "in wearable/include/config.h and re-run this test.")
    else:
        print("\n  No reported-zone changes in this capture.")

    print()


if __name__ == "__main__":
    main()
