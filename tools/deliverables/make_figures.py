"""Figures for the IEEE paper (Revision 6) from measured data and the KiCad design.

Plots are black and white (grey fills, hatching, line styles and markers) so
that they print correctly on a monochrome printer.

Writes into figures/:
  f5_power_path.png   voltage along the wearable power path under load (30 Sep 2026, multimeter)
  f6_walk_timeline.png informal three-beacon walk, 30 Sep 2026 00:22-00:37 (wearable serial log)
  a_schematic.png     wearable Rev C3 schematic (from a KiCad PDF export)
  a_pcb_copper.png    Rev C3 copper and silkscreen (from a KiCad PDF export)
Usage: python make_figures.py <dir with sch.pdf and pcb.pdf> <walk log txt>
       (pass - as the first argument to skip the KiCad exports)
"""
import os
import re
import sys
from datetime import datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "figures")
src_dir, walk_log = sys.argv[1], sys.argv[2]
plt.rcParams.update({"font.family": "serif", "font.serif": ["Times New Roman", "Liberation Serif"], "font.size": 10})

# ---- power path (measured 30 Sep 2026, wearable connected, switch ON) ----
labels = ["Battery\nterminals", "TP4056\nB+", "TP4056\nOUT+", "MT3608\nVIN", "MT3608\nVOUT"]
volts = [3.83, 3.76, 3.76, 3.42, 3.25]
fig, ax = plt.subplots(figsize=(3.4, 2.4), dpi=300)
bars = ax.bar(labels, volts, color=["#D9D9D9", "#D9D9D9", "#D9D9D9", "#8C8C8C", "#404040"], edgecolor="black", linewidth=0.6, width=0.6)
for b in bars[3:]:
    b.set_hatch("///")
ax.axhline(5.0, color="black", linestyle="--", linewidth=1)
ax.text(4.3, 5.05, "required 5.0 V", ha="right", va="bottom", fontsize=8)
for b, v in zip(bars, volts):
    ax.text(b.get_x() + b.get_width() / 2, v + 0.05, f"{v:.2f}", ha="center", va="bottom", fontsize=8)
ax.set_ylabel("Voltage to ground (V)")
ax.set_ylim(0, 5.6)
ax.tick_params(axis="x", labelsize=7)
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "f5_power_path.png"))
plt.close(fig)

# ---- informal walk timeline (serial log) ----
zone_y = {"bedroom_wing": 2, "dining_hall": 1, "medicine_room": 3}
zt, zz, rssi = [], [], {"bedroom_wing": [], "dining_hall": [], "medicine_room": []}
t0 = None
for line in open(walk_log, encoding="utf-8", errors="replace"):
    m = re.match(r"(\d\d:\d\d:\d\d) (.*)", line.strip())
    if not m:
        continue
    t = datetime.strptime(m.group(1), "%H:%M:%S")
    if t0 is None:
        t0 = t
    mins = (t - t0).total_seconds() / 60.0
    z = re.search(r"\[ZONE\] -> (\w+)", m.group(2))
    if z:
        zt.append(mins); zz.append(zone_y[z.group(1)])
    r = re.search(r"\[RSSI\] bedroom_wing=(\S+) dining_hall=(\S+) medicine_room=(\S+)", m.group(2))
    if r:
        for k, v in zip(("bedroom_wing", "dining_hall", "medicine_room"), r.groups()):
            if v != "--":
                rssi[k].append((mins, int(v)))
fig, (a1, a2) = plt.subplots(2, 1, figsize=(3.4, 3.4), dpi=300, sharex=True, gridspec_kw={"height_ratios": [1, 1.3]})
start_zone = 2
a1.step([0] + zt + [15], [start_zone] + zz + [zz[-1]], where="post", color="black", linewidth=1.4)
a1.set_yticks([1, 2, 3]); a1.set_yticklabels(["Dining", "Bedroom", "Medicine"], fontsize=8)
a1.set_ylim(0.5, 3.5); a1.set_ylabel("Reported zone", fontsize=8)
a1.spines[["top", "right"]].set_visible(False)
style = {"bedroom_wing": ("-", "o", "black"), "dining_hall": ("--", "s", "#555555"), "medicine_room": (":", "^", "black")}
names = {"bedroom_wing": "B1 bedroom", "dining_hall": "B2 dining", "medicine_room": "B3 medicine"}
for k, pts in rssi.items():
    if pts:
        a2.plot([p[0] for p in pts], [p[1] for p in pts], linestyle=style[k][0], marker=style[k][1], markersize=2.8, markerfacecolor="white", markeredgewidth=0.6, linewidth=0.9, color=style[k][2], label=names[k])
a2.axhline(-88, color="#777777", linestyle="-.", linewidth=0.8)
a2.text(0.2, -87, "floor -88 dBm", fontsize=7, ha="left", color="#444444")
a2.set_ylabel("Smoothed RSSI (dBm)", fontsize=8); a2.set_xlabel("Minutes from 00:22", fontsize=8)
a2.legend(fontsize=7, frameon=False, loc="lower center", bbox_to_anchor=(0.5, 1.0), ncol=3, handlelength=2.2, columnspacing=0.8)
a2.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "f6_walk_timeline.png"))
plt.close(fig)

# ---- KiCad exports -> PNG ----
if src_dir == "-":
    print("KiCad exports skipped")
    sys.exit(0)
sch = pymupdf.open(os.path.join(src_dir, "sch.pdf"))
sch[0].get_pixmap(dpi=200).save(os.path.join(FIG, "a_schematic.png"))
pcb = pymupdf.open(os.path.join(src_dir, "pcb.pdf"))
pg = pcb[0]
# crop to the drawn content (the board sits in a large sheet)
bbox = None
for d in pg.get_drawings():
    r = d["rect"]
    if r.width < pg.rect.width * 0.9:
        bbox = r if bbox is None else bbox | r
clip = pymupdf.Rect(bbox.x0 - 8, bbox.y0 - 8, bbox.x1 + 8, bbox.y1 + 8) if bbox else pg.rect
pg.get_pixmap(dpi=400, clip=clip).save(os.path.join(FIG, "a_pcb_copper.png"))
print("figures written:", sorted(f for f in os.listdir(FIG) if f.endswith(".png")))
