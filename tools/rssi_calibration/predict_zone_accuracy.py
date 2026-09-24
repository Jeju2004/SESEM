#!/usr/bin/env python3
"""
TroDes - Test 2 a-priori prediction.

Predicts the zone-classification confusion matrix from measured radio
parameters, BEFORE the test is run, so the measurement can be compared against
it. Contains no measured classification data.

    python predict_zone_accuracy.py
    python predict_zone_accuracy.py --n 3.5 --far 4.0
    python predict_zone_accuracy.py --floor -92        # what-if on RSSI_FLOOR_DBM
"""
import argparse, math

def Phi(z): return 0.5 * (1 + math.erf(z / math.sqrt(2)))

ap = argparse.ArgumentParser()
ap.add_argument("--n", type=float, default=3.0, help="path-loss exponent (assumed)")
ap.add_argument("--far", type=float, default=5.0, help="far-corner distance, m")
ap.add_argument("--floor", type=float, default=-88.0, help="RSSI_FLOOR_DBM")
ap.add_argument("--hyst", type=float, default=4.0, help="HYSTERESIS_DB")
ap.add_argument("--alpha", type=float, default=0.35, help="RSSI_EMA_ALPHA")
ap.add_argument("--sig-pos", type=float, default=3.0, help="positional sd, dB (measured)")
ap.add_argument("--sig-time", type=float, default=2.6, help="time sd at a point, dB (measured)")
a = ap.parse_args()

A = {"bedroom_wing": -67.0, "dining_hall": -65.0, "medicine_room": -67.0}   # measured
ADJ = {"bedroom_wing": "dining_hall", "dining_hall": "medicine_room", "medicine_room": "dining_hall"}
ZONES = list(A)
GEO = [("beside beacon", 1.0, 8.0), ("mid-zone", 3.0, 6.0),
       ("far corner", a.far, a.far + 1.0), ("near boundary", a.far, a.far)]

st = a.sig_time * math.sqrt(a.alpha / (2 - a.alpha))
SD = math.sqrt(2 * a.sig_pos ** 2 + 2 * st ** 2)
SP = math.sqrt(a.sig_pos ** 2 + st ** 2)
radius = 10 ** ((-67 - a.floor) / (-10 * a.n)) if False else 10 ** ((abs(a.floor) - 67) / (10 * a.n))

print("=" * 72)
print("TEST 2 - A-PRIORI PREDICTION   (model output, not measurement)")
print("=" * 72)
print(f"assumed n = {a.n}   floor = {a.floor:.0f} dBm   hysteresis = {a.hyst:.0f} dB")
print(f"EMA-effective time sd {st:.2f} dB   difference sd {SD:.2f} dB")
print(f"usable radius from a -67 dBm beacon: {radius:.2f} m\n")

print(f"{'point':<16}{'d_home':>8}{'margin':>9}{'P(correct)':>13}{'from neighbour':>17}{'unresolved':>13}")
print("-" * 72)
for nm, dh, dc in GEO:
    m = 10 * a.n * math.log10(dc / dh)
    r = -67 - 10 * a.n * math.log10(dh)
    pun = Phi((a.floor - r) / SP)
    print(f"{nm:<16}{dh:>7.1f}m{m:>8.1f}dB{Phi((m + a.hyst) / SD):>12.1%}"
          f"{Phi((m - a.hyst) / SD):>16.1%}{pun:>12.1%}")

M = {z: {c: 0.0 for c in ZONES + ["UNRESOLVED"]} for z in ZONES}
for z in ZONES:
    comp = ADJ[z]; bias = A[z] - A[comp]
    for nm, dh, dc in GEO:
        m = 10 * a.n * math.log10(dc / dh) + bias
        r = A[z] - 10 * a.n * math.log10(dh)
        pun = Phi((a.floor - r) / SP)
        ok = Phi((m + a.hyst) / SD)
        M[z][z] += ok * (1 - pun) / len(GEO)
        M[z][comp] += (1 - ok) * (1 - pun) / len(GEO)
        M[z]["UNRESOLVED"] += pun / len(GEO)

cols = ZONES + ["UNRESOLVED"]; W = 16
print("\nPREDICTED CONFUSION MATRIX  (rows = actual, cols = classified)")
print("-" * 72)
print(" " * W + "".join(f"{c[:14]:>{W}}" for c in cols) + f"{'recall':>10}")
acc = 0.0
for z in ZONES:
    s = sum(M[z].values())
    print(f"{z:<{W}}" + "".join(f"{100*M[z][c]/s:>{W-1}.1f}%" for c in cols) + f"{100*M[z][z]/s:>9.1f}%")
    acc += M[z][z] / s
print("-" * 72)
print(f"  PREDICTED ACCURACY  {100*acc/len(ZONES):.1f}%")
print(f"  PREDICTED UNRESOLVED {100*sum(M[z]['UNRESOLVED']/sum(M[z].values()) for z in ZONES)/len(ZONES):.1f}%")
print("=" * 72)
print("Compare against: python analyze_zone_accuracy.py --settle 3 test2_*.csv")
