#!/usr/bin/env python3
"""
TroDes - wearable battery runtime report, from the dashboard database.

During a runtime test the wearable runs on its cell and reports to the
dashboard over WiFi every few seconds. The dashboard stores every report in
status_log, so after the cell dies the database already holds the answer:

  * runtime   - the wearable's own uptime in its last report on that boot,
                cross-checked against the wall-clock span of the reports
  * gaps      - stretches with no reports (WiFi dropouts, or the laptop
                sleeping); a long gap near the end hides the real time of death
  * discharge - cell voltage and percentage over time, written to CSV for the
                Chapter 4 plot

Usage:
    python runtime_report.py                         # latest boot of wearable-01
    python runtime_report.py --db ..\\..\\dashboard\\data\\trodes.db --device wearable-01
    python runtime_report.py --boot 3 --csv runtime.csv --plot runtime.png

Measured runtime is only valid if the test started from a full charge with
USB unplugged, and ran until the wearable stopped reporting on its own.
"""

import argparse
import csv
import datetime
import sqlite3
import sys
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parents[2] / "dashboard" / "data" / "trodes.db"


def fmt_ts(t):
    return datetime.datetime.fromtimestamp(t).strftime("%Y-%m-%d %H:%M:%S")


def fmt_dur(s):
    s = int(round(s))
    return f"{s // 3600} h {(s % 3600) // 60:02d} min"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB,
                    help=f"dashboard SQLite file (default: {DEFAULT_DB})")
    ap.add_argument("--device", default="wearable-01")
    ap.add_argument("--boot", type=int, default=None,
                    help="boot_id to report (default: the latest)")
    ap.add_argument("--gap", type=float, default=60.0,
                    help="report silences longer than this many seconds (default 60)")
    ap.add_argument("--csv", type=Path, default=None,
                    help="write hours, batt_v, batt_pct per report to this CSV")
    ap.add_argument("--plot", type=Path, default=None,
                    help="save a discharge plot (needs matplotlib)")
    args = ap.parse_args()

    if not args.db.exists():
        sys.exit(f"Database not found: {args.db}")

    conn = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    boots = conn.execute(
        "SELECT boot_id, COUNT(*) n, MIN(event_at) t0, MAX(event_at) t1 "
        "FROM status_log WHERE device_id = ? AND is_late = 0 "
        "GROUP BY boot_id ORDER BY boot_id", (args.device,)).fetchall()
    if not boots:
        sys.exit(f"No status reports from {args.device} in {args.db}")

    print(f"\nBoots recorded for {args.device}:")
    for b in boots:
        print(f"  boot {b['boot_id']:>3}  {b['n']:>6} reports  "
              f"{fmt_ts(b['t0'])} -> {fmt_ts(b['t1'])}  ({fmt_dur(b['t1'] - b['t0'])})")

    boot = args.boot if args.boot is not None else boots[-1]["boot_id"]
    rows = conn.execute(
        "SELECT event_at, uptime_s, batt_v, batt_pct FROM status_log "
        "WHERE device_id = ? AND boot_id = ? AND is_late = 0 ORDER BY event_at",
        (args.device, boot)).fetchall()
    if not rows:
        sys.exit(f"No reports for boot {boot}")

    t0, t1 = rows[0]["event_at"], rows[-1]["event_at"]
    up0 = rows[0]["uptime_s"] or 0
    up1 = rows[-1]["uptime_s"] or 0

    print(f"\nRuntime - boot {boot}")
    print(f"  First report : {fmt_ts(t0)}  (uptime {up0} s)")
    print(f"  Last report  : {fmt_ts(t1)}  (uptime {up1} s)")
    print(f"  Runtime      : {fmt_dur(up1)}  (wearable's own uptime at its last report)")
    print(f"  Wall clock   : {fmt_dur(t1 - t0)}  (first to last report received)")

    gaps = [(rows[i - 1]["event_at"], rows[i]["event_at"])
            for i in range(1, len(rows))
            if rows[i]["event_at"] - rows[i - 1]["event_at"] > args.gap]
    if gaps:
        print(f"\n  Silences longer than {args.gap:.0f} s: {len(gaps)}")
        for a, b in gaps[:10]:
            print(f"    {fmt_ts(a)} -> {fmt_ts(b)}  ({fmt_dur(b - a)})")
        if len(gaps) > 10:
            print(f"    ... and {len(gaps) - 10} more")
    else:
        print(f"\n  No silences longer than {args.gap:.0f} s.")

    volts = [(r["event_at"], r["batt_v"], r["batt_pct"]) for r in rows
             if r["batt_v"] is not None and r["batt_v"] > 0]
    if volts:
        print("\n  Cell voltage (hourly):")
        next_mark = t0
        for t, v, p in volts:
            if t >= next_mark:
                print(f"    {(t - t0) / 3600:5.1f} h   {v:.2f} V   {p if p is not None else '-':>3}%")
                next_mark += 3600
        t, v, p = volts[-1]
        print(f"    {(t - t0) / 3600:5.1f} h   {v:.2f} V   {p if p is not None else '-':>3}%   (last)")
    else:
        print("\n  No battery voltage in these reports (was the cell reading -1?).")

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["hours", "batt_v", "batt_pct", "uptime_s"])
            for r in rows:
                w.writerow([f"{(r['event_at'] - t0) / 3600:.4f}", r["batt_v"],
                            r["batt_pct"], r["uptime_s"]])
        print(f"\n  Wrote {len(rows)} rows to {args.csv}")

    if args.plot and volts:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
        except ImportError:
            sys.exit("matplotlib is not installed; use --csv and plot elsewhere.")
        hrs = [(t - t0) / 3600 for t, _v, _p in volts]
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.plot(hrs, [v for _t, v, _p in volts])
        ax.set_xlabel("Time on battery (h)")
        ax.set_ylabel("Cell voltage (V)")
        ax.set_title(f"{args.device} discharge - runtime {fmt_dur(up1)}")
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        fig.savefig(args.plot, dpi=150)
        print(f"  Saved plot to {args.plot}")

    print()


if __name__ == "__main__":
    main()
