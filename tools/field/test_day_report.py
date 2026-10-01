#!/usr/bin/env python3
"""
TroDes test day (30 Sep 2026) - Chapter 4 figures from serial captures.

Every capture is made with tools/rssi_calibration/log_serial.py (CSV columns
iso_time, elapsed_s, label, line). Three reports:

  sos    Alert delivery time and the button patterns, from a WEARABLE capture.
         The wearable prints "[DELIVERED] <type> <N> ms after it was raised"
         when the server (hub or laptop) has stored the alert - its own clock
         on both ends, so no clock sync is needed. Also counts SOS patterns
         (1-3 presses), escalations and long-press dismisses.

  hr     Heart rate against a reference pulse oximeter, from a WEARABLE
         capture. Each time the oximeter is read, type its value as the label,
         e.g. ox72 (and "transit" between readings). The wearable's value is
         the median of its [STAT] hr= readings in the WINDOW seconds after the
         label was typed (0 = no reading, ignored).

  doors  Door-node reliability, from a DOOR NODE (hub) capture: every reed
         change the node saw, and every door alert the hub raised. Type the
         label "cycleN" (cycle1, cycle2, ...) before each physical open/close,
         so a missed cycle shows up.

Usage (PlatformIO's Python):
  python test_day_report.py sos   C:\\TroDesData\\2026-09-30\\sos.csv
  python test_day_report.py hr    C:\\TroDesData\\2026-09-30\\hr.csv [--window 10]
  python test_day_report.py doors C:\\TroDesData\\2026-09-30\\doors.csv
"""

from __future__ import annotations

import argparse
import csv
import re
import statistics
import sys

DELIVERED = re.compile(r"\[DELIVERED\]\s+(\S+)\s+(\d+)\s+ms after it was raised\s+\(server (\w+)\)")
SOS_RAISED = re.compile(r"\[SOS\]\s+(\d) press(?:es)? -> (ALERT RAISED|ESCALATED): (.*)")
SOS_SAME = re.compile(r"\[SOS\]\s+(\d) press(?:es)? -> an SOS at this level is already active")
SOS_PRESS = re.compile(r"\[SOS\]\s+Press (\d)")
SOS_LONG = re.compile(r"\[SOS\]\s+Long press \((\d+) ms\) -> (.*)")
SOS_ACK = re.compile(r"\[SOS\]\s+Acknowledged by a caregiver")
STAT_HR = re.compile(r"\[STAT\].*\bhr=(\d+)")
DOOR = re.compile(r"\[DOOR\]\s+\S+\s+->\s+(OPEN|CLOSED)")
HUB_DOOR_ALERT = re.compile(r"\[HUB\] alert #\d+ (door_opened|door_closed)")
OX = re.compile(r"^ox(\d{2,3})$", re.I)


def rows(path):
    with open(path, newline="", encoding="utf-8", errors="replace") as fh:
        for r in csv.DictReader(fh):
            yield float(r["elapsed_s"]), (r.get("label") or "").strip(), (r.get("line") or "").strip()


def stats_line(values, unit):
    if not values:
        return "no data"
    v = sorted(values)
    p95 = v[min(len(v) - 1, int(round(0.95 * (len(v) - 1))))]
    return (f"n={len(v)}  mean {statistics.mean(v):.0f} {unit}  median {statistics.median(v):.0f} {unit}  "
            f"min {v[0]:.0f}  max {v[-1]:.0f}  95th pct {p95:.0f} {unit}")


def cmd_sos(a):
    delivered, raised, same, longs, acks, presses = [], [], 0, [], 0, 0
    for t, label, line in rows(a.csv):
        if m := DELIVERED.search(line):
            delivered.append((t, label, m.group(1), int(m.group(2)), m.group(3)))
        elif m := SOS_RAISED.search(line):
            raised.append((t, label, int(m.group(1)), m.group(2), m.group(3)))
        elif SOS_SAME.search(line):
            same += 1
        elif m := SOS_LONG.search(line):
            longs.append((t, label, m.group(2)))
        elif SOS_ACK.search(line):
            acks += 1
        elif SOS_PRESS.search(line):
            presses += 1

    # Trials labelled wifi* are the Wi-Fi-loss test (the network is off on
    # purpose): reported on their own, never mixed into the normal latency.
    wifi = [d for d in delivered if d[1].lower().startswith("wifi")]
    normal = [d for d in delivered if not d[1].lower().startswith("wifi")]
    print("SOS alert delivery time (raised on the wearable -> stored by the server)")
    by_server = {}
    for _, _, typ, ms, server in normal:
        if typ == "sos":
            by_server.setdefault(server, []).append(ms)
    for server, v in sorted(by_server.items()):
        print(f"  server {server:6}: {stats_line(v, 'ms')}")
    late = [d for d in normal if d[2] == "sos" and d[3] > 5000]
    if late:
        print(f"  {len(late)} SOS outside the Wi-Fi-loss test took over 5 s - investigate:")
        for t, label, _, ms, server in late:
            print(f"    t={t:7.1f}s label={label or '-':12} {ms} ms ({server})")
    if wifi:
        print("\nWi-Fi-loss trials (network off, SOS pressed, network back on): queued alert delivered after")
        for t, label, typ, ms, server in wifi:
            print(f"    {label:10} {typ:14} {ms / 1000:6.1f} s  ({server}) - shown on the dashboard as 'delivered late'")
    delivered = normal
    others = [d for d in delivered if d[2] != "sos"]
    if others:
        v = [d[3] for d in others]
        print(f"  other alert types (zone, dismiss): {stats_line(v, 'ms')}")

    print("\nButton patterns")
    print(f"  presses counted: {presses}")
    for n in (1, 2, 3):
        new = [r for r in raised if r[2] == n and r[3] == "ALERT RAISED"]
        esc = [r for r in raised if r[2] == n and r[3] == "ESCALATED"]
        msg = (new or esc)[0][4] if (new or esc) else "-"
        print(f"  {n} press{'es' if n > 1 else '  '}: {len(new)} raised, {len(esc)} escalations   message: {msg}")
    print(f"  same-or-weaker pattern while active (nothing sent, by design): {same}")
    print(f"  long-press dismisses: {len(longs)}  ({sum(1 for l in longs if 'DISMISSED' in l[2])} cancelled an active SOS)")
    print(f"  acknowledged on the dashboard -> wearable cleared: {acks}")
    if raised:
        print("\n  Per pattern (time, label typed, presses, result):")
        for t, label, n, kind, msg in raised:
            print(f"    t={t:7.1f}s  {label or '-':12} {n}  {kind:12} {msg}")


def cmd_hr(a):
    data = list(rows(a.csv))
    pairs = []
    for i, (t, label, _) in enumerate(data):
        m = OX.match(label)
        if not m or (i and data[i - 1][1] == label):
            continue                              # only the moment the label was typed
        ref = int(m.group(1))
        vals = [int(h.group(1)) for tt, _, line in data[i:]
                if tt - t <= a.window for h in [STAT_HR.search(line)] if h and int(h.group(1)) > 0]
        pairs.append((t, ref, statistics.median(vals) if vals else None, len(vals)))
    print(f"Heart rate vs reference pulse oximeter (wearable = median over {a.window:.0f} s after each reading)")
    print(f"  {'time':>8}  {'oximeter':>8}  {'wearable':>8}  {'error':>6}  samples")
    errs = []
    for t, ref, got, n in pairs:
        if got is None:
            print(f"  {t:7.1f}s  {ref:8d}  {'-':>8}  {'-':>6}  0 (no finger detected)")
            continue
        errs.append(got - ref)
        print(f"  {t:7.1f}s  {ref:8d}  {got:8.0f}  {got - ref:+6.0f}  {n}")
    if errs:
        ae = [abs(e) for e in errs]
        print(f"\n  paired readings: {len(errs)} of {len(pairs)}")
        print(f"  mean absolute error {statistics.mean(ae):.1f} bpm, bias {statistics.mean(errs):+.1f} bpm, "
              f"largest error {max(ae):.0f} bpm")
        print(f"  within +/-5 bpm: {sum(e <= 5 for e in ae)}/{len(ae)}   within +/-10 bpm: {sum(e <= 10 for e in ae)}/{len(ae)}")
        if len(errs) > 1:
            print(f"  error standard deviation {statistics.stdev(errs):.1f} bpm")
    else:
        print("  no paired readings - type labels like ox72 when the oximeter is read")


def cmd_doors(a):
    cycles, seen, alerts = set(), [], []
    for t, label, line in rows(a.csv):
        if label.lower().startswith("cycle"):
            cycles.add(label.lower())
        if m := DOOR.search(line):
            seen.append((t, label, m.group(1)))
        elif m := HUB_DOOR_ALERT.search(line):
            alerts.append((t, label, m.group(1)))
    opens = sum(1 for s in seen if s[2] == "OPEN")
    closes = sum(1 for s in seen if s[2] == "CLOSED")
    a_open = sum(1 for x in alerts if x[2] == "door_opened")
    print("Door node reliability")
    print(f"  cycles labelled by the tester: {len(cycles)}")
    print(f"  reed changes the node saw: {opens} open, {closes} closed")
    print(f"  alerts the hub raised: {a_open} 'door opened', {len(alerts) - a_open} 'door closed'")
    if cycles:
        per = {c: [s for s in seen if s[1].lower() == c] for c in sorted(cycles, key=lambda c: int(re.sub(r'\D', '', c) or 0))}
        missed = [c for c, s in per.items() if not any(x[2] == "OPEN" for x in s)]
        extra = [c for c, s in per.items() if sum(x[2] == "OPEN" for x in s) > 1]
        print(f"  detection: {len(cycles) - len(missed)}/{len(cycles)} cycles produced an OPEN"
              + (f"  (missed: {', '.join(missed)})" if missed else ""))
        if extra:
            print(f"  cycles with more than one OPEN (bounce / double count): {', '.join(extra)}")
    if opens and a_open != opens:
        print("  NOTE: alert count differs from the reed changes - check the hub log around those times")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sos"); s.add_argument("csv")
    h = sub.add_parser("hr"); h.add_argument("csv"); h.add_argument("--window", type=float, default=10.0)
    d = sub.add_parser("doors"); d.add_argument("csv")
    a = ap.parse_args()
    {"sos": cmd_sos, "hr": cmd_hr, "doors": cmd_doors}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
