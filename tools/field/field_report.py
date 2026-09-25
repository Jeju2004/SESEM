#!/usr/bin/env python3
"""
TroDes field test — alert latency and door-node reliability.

Both measurements use the laptop's clock on both ends, so no clock
synchronisation is needed:

  latency  The wearable prints an [ALERT] line the moment an alert is raised;
           log_serial.py timestamps it with the laptop clock. The dashboard,
           on the same laptop, stores received_at for that alert. Latency is
           the difference: queueing + WiFi + HTTP + server, end to end.
           Requires the wearable on USB to the laptop while the log runs.

  doors    Counts the door node's open/close events, heartbeats and the gaps
           between heartbeats in a time window, from the dashboard database.

Usage:
    python field_report.py latency --capture C:\\TroDesData\\field\\field_alerts.csv
    python field_report.py doors --since "2026-09-26 14:00" --until "2026-09-26 14:20"
    (add --db PATH if the dashboard database is not the repository default)
"""

import argparse
import csv
import datetime
import json
import re
import sqlite3
import statistics
import sys
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parents[2] / "dashboard" / "data" / "trodes.db"
ALERT_LINE = re.compile(r"^\[ALERT\]\s*(\{.*\})\s*$")


def open_db(path):
    if not Path(path).exists():
        sys.exit(f"Database not found: {path}")
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def ts(s):
    """Local-time 'YYYY-MM-DD HH:MM[:SS]' or ISO string -> epoch seconds."""
    return datetime.datetime.fromisoformat(s.replace(" ", "T")).timestamp()


def fmt(t):
    return datetime.datetime.fromtimestamp(t).strftime("%H:%M:%S")


def cmd_latency(args):
    conn = open_db(args.db)
    events = []
    with open(args.capture, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            m = ALERT_LINE.match((row.get("line") or "").strip())
            if not m:
                continue
            try:
                payload = json.loads(m.group(1))
            except json.JSONDecodeError:
                continue
            events.append((ts(row["iso_time"]), payload.get("type"), payload.get("device_id")))
    if not events:
        sys.exit("No [ALERT] lines in the capture. Was the wearable on USB with the logger running?")

    print(f"\nAlert latency — {len(events)} alert(s) raised in the capture\n")
    print(f"  {'raised':>8}  {'type':<18}{'received':>10}{'latency (s)':>13}")
    print("  " + "-" * 51)
    by_type, used = {}, set()
    for t_raised, typ, dev in events:
        row = conn.execute(
            "SELECT id, received_at FROM alerts WHERE type = ? AND (device_id = ? OR ? IS NULL) "
            "AND received_at >= ? AND received_at <= ? ORDER BY received_at",
            (typ, dev, dev, t_raised - 1.0, t_raised + args.window)).fetchall()
        match = next((r for r in row if r["id"] not in used), None)
        if match is None:
            print(f"  {fmt(t_raised):>8}  {typ:<18}{'NOT RECEIVED':>10}")
            by_type.setdefault(typ, {"lat": [], "missed": 0})["missed"] += 1
            continue
        used.add(match["id"])
        lat = match["received_at"] - t_raised
        by_type.setdefault(typ, {"lat": [], "missed": 0})["lat"].append(lat)
        print(f"  {fmt(t_raised):>8}  {typ:<18}{fmt(match['received_at']):>10}{lat:>13.2f}")

    print("\n  Summary by alert type:")
    print(f"  {'type':<18}{'n':>4}{'missed':>8}{'mean (s)':>10}{'max (s)':>9}")
    for typ, d in by_type.items():
        lat = d["lat"]
        mean = f"{statistics.mean(lat):.2f}" if lat else "-"
        mx = f"{max(lat):.2f}" if lat else "-"
        print(f"  {typ:<18}{len(lat):>4}{d['missed']:>8}{mean:>10}{mx:>9}")
    print("\n  A negative or near-zero latency means the laptop and logger clocks disagree —"
          "\n  check that the capture and the dashboard ran on the same computer.\n")


def cmd_doors(args):
    conn = open_db(args.db)
    t0, t1 = ts(args.since), ts(args.until)
    rows = conn.execute(
        "SELECT * FROM door_log WHERE received_at BETWEEN ? AND ? AND is_late = 0 "
        "AND (node_id = ? OR ? IS NULL) ORDER BY received_at",
        (t0, t1, args.node, args.node)).fetchall()
    if not rows:
        sys.exit("No door reports in that window. Check --since/--until (local time) and --node.")

    changes = [r for r in rows if r["type"] == "state_change"]
    opens = [r for r in changes if r["state"] == "open"]
    closes = [r for r in changes if r["state"] == "closed"]
    beats = [r["received_at"] for r in rows if r["type"] == "heartbeat"]
    gaps = [b - a for a, b in zip(beats, beats[1:])]
    alerts = conn.execute(
        "SELECT COUNT(*) n FROM alerts WHERE type = 'door_opened' AND received_at BETWEEN ? AND ?",
        (t0, t1)).fetchone()["n"]

    print(f"\nDoor node report — {fmt(t0)} to {fmt(t1)}\n")
    print(f"  Open events       : {len(opens)}")
    print(f"  Close events      : {len(closes)}")
    print(f"  Door-opened alerts: {alerts}")
    print(f"  Heartbeats        : {len(beats)}" + (f"  (largest gap {max(gaps):.0f} s)" if gaps else ""))
    if args.expected is not None:
        missed = args.expected - len(opens)
        print(f"  Expected opens    : {args.expected}  →  missed {max(0, missed)}"
              + (f", {-missed} extra (possible false triggers)" if missed < 0 else ""))
    seq = [r["state"] for r in changes]
    doubles = sum(1 for a, b in zip(seq, seq[1:]) if a == b)
    if doubles:
        print(f"  Note: {doubles} repeated state(s) in sequence — an event was lost or duplicated.")
    print()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=str(DEFAULT_DB), help=f"dashboard database (default {DEFAULT_DB})")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("latency", help="alert latency from a serial capture + the dashboard database")
    a.add_argument("--capture", required=True, help="log_serial.py CSV recorded during the alert trials")
    a.add_argument("--window", type=float, default=60.0, help="max seconds to wait for delivery (default 60)")
    d = sub.add_parser("doors", help="door-node event counts in a time window")
    d.add_argument("--since", required=True, help='local time, e.g. "2026-09-26 14:00"')
    d.add_argument("--until", required=True)
    d.add_argument("--node", default="door-11")
    d.add_argument("--expected", type=int, default=None, help="number of openings performed")
    args = ap.parse_args()
    {"latency": cmd_latency, "doors": cmd_doors}[args.cmd](args)


if __name__ == "__main__":
    main()
