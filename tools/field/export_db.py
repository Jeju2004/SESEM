#!/usr/bin/env python3
"""
TroDes - export the dashboard database to CSV, for backup and analysis.

Writes one CSV per log table (status_log, alerts, door_log, ack_log) into a
folder, with an extra `*_local` column beside every Unix timestamp so the
rows can be read against a video or a notebook without conversion.

The database is opened read-only, so this is safe to run while the dashboard
is still running.

Usage:
    python export_db.py --out ..\\..\\data\\demo\\2026-09-30_video
    python export_db.py --out ..\\..\\data\\demo\\2026-09-30_video --since "2026-09-30 14:00"
    (add --db PATH if the dashboard database is not the repository default)
"""

import argparse
import csv
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parents[2] / "dashboard" / "data" / "trodes.db"
TABLES = ("status_log", "alerts", "door_log", "ack_log")
TIME_COLUMNS = {"received_at", "event_at", "acknowledged_at", "cleared_at", "acked_at"}


def local(ts):
    if ts is None or ts == "":
        return ""
    return datetime.fromtimestamp(float(ts)).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=str(DEFAULT_DB), help=f"dashboard database (default {DEFAULT_DB})")
    ap.add_argument("--out", required=True, help="output folder (created if missing)")
    ap.add_argument("--since", default=None, help='only rows received at or after this local time, e.g. "2026-09-30 14:00"')
    args = ap.parse_args()

    if not Path(args.db).exists():
        sys.exit(f"Database not found: {args.db}")
    since = datetime.strptime(args.since, "%Y-%m-%d %H:%M").timestamp() if args.since else None

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    existing = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}

    for table in TABLES:
        if table not in existing:
            print(f"  {table:<11} not in this database - skipped")
            continue
        cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})")]
        where, params = "", ()
        time_col = next((c for c in ("received_at", "acked_at") if c in cols), None)
        if since is not None and time_col:
            where, params = f" WHERE {time_col} >= ?", (since,)
        rows = conn.execute(f"SELECT * FROM {table}{where} ORDER BY id", params).fetchall()

        header, idx = [], []
        for i, c in enumerate(cols):
            header.append(c)
            if c in TIME_COLUMNS:
                header.append(c + "_local")
                idx.append(i)
        path = out / f"{table}.csv"
        with open(path, "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(header)
            for r in rows:
                line = []
                for i, v in enumerate(r):
                    line.append(v)
                    if i in idx:
                        line.append(local(v))
                w.writerow(line)
        print(f"  {table:<11} {len(rows):>6} rows -> {path}")

    conn.close()


if __name__ == "__main__":
    main()
