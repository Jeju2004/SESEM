"""Shared parsing helpers for the TroDes Phase 1 capture format."""

import csv
import math
import re

# [RSSI] bedroom_wing=-45 dining_hall=-- common_area_garden=-77 ...
RSSI_LINE = re.compile(r"^\[RSSI\]\s*(.*)$")
RSSI_PAIR = re.compile(r"([A-Za-z0-9_]+)=(-?\d+|--)")

# [STAT] zone=bedroom_wing hr=0 batt=87% sos=no wifi=down q=3
STAT_LINE = re.compile(r"^\[STAT\]\s+zone=(\S+)")

# [ZONE] -> dining_hall (id=2, rssi=-61.3 dBm, ~3.2 m)
ZONE_LINE = re.compile(r"^\[ZONE\]\s*->\s*(\S+)")


def read_rows(paths):
    """Yield (elapsed_s, label, line) from one or more capture CSVs."""
    for path in paths:
        with open(path, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                try:
                    t = float(row["elapsed_s"])
                except (KeyError, TypeError, ValueError):
                    t = 0.0
                yield t, (row.get("label") or "").strip(), row.get("line") or ""


def rssi_samples(paths):
    """Yield (elapsed_s, label, {zone: rssi_dbm}) for every [RSSI] line.

    Zones reporting '--' (nothing heard) are omitted from the dict rather than
    recorded as a number, so they never pollute a mean.
    """
    for t, label, line in read_rows(paths):
        m = RSSI_LINE.match(line.strip())
        if not m:
            continue
        vals = {}
        for zone, val in RSSI_PAIR.findall(m.group(1)):
            if val != "--":
                vals[zone] = float(val)
        yield t, label, vals


def zone_samples(paths):
    """Yield (elapsed_s, label, reported_zone) for every [STAT] line."""
    for t, label, line in read_rows(paths):
        m = STAT_LINE.match(line.strip())
        if m:
            yield t, label, m.group(1)


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def stdev(xs):
    if len(xs) < 2:
        return float("nan")
    mu = mean(xs)
    return math.sqrt(sum((x - mu) ** 2 for x in xs) / (len(xs) - 1))


def median(xs):
    if not xs:
        return float("nan")
    s = sorted(xs)
    n = len(s)
    return s[n // 2] if n % 2 else 0.5 * (s[n // 2 - 1] + s[n // 2])


def linear_fit(xs, ys):
    """Ordinary least squares y = a + b*x. Pure Python, no numpy needed."""
    n = len(xs)
    if n < 2:
        return float("nan"), float("nan"), float("nan")
    mx, my = mean(xs), mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return float("nan"), float("nan"), float("nan")
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    a = my - b * mx
    ss_tot = sum((y - my) ** 2 for y in ys)
    ss_res = sum((y - (a + b * x)) ** 2 for x, y in zip(xs, ys))
    r2 = 1 - ss_res / ss_tot if ss_tot else float("nan")
    return a, b, r2
