"""Appendix images for the IEEE paper, cropped and oriented for a portrait page.

Writes into figures/:
  a_schematic_rot.png  schematic rotated 90 degrees to fill a portrait page
  a_pcb_board.png      the board area of a_pcb_copper.png (sheet frame removed)
  a_qr_card_one.png    one access card from the panel QR card PDF, 200 dpi
Usage: python make_appendix_images.py <SESEMSG_Panel_QR_Card.pdf>
"""
import os
import sys

import numpy as np
import pymupdf
from PIL import Image

FIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")

Image.open(os.path.join(FIG, "a_schematic.png")).rotate(90, expand=True).save(os.path.join(FIG, "a_schematic_rot.png"))

pcb = Image.open(os.path.join(FIG, "a_pcb_copper.png")).convert("RGB")
a = np.asarray(pcb).astype(int)
ys, xs = np.where((a[:, :, 2] - a[:, :, 0] > 40) & (a[:, :, 2] > 120))   # copper is drawn in blue
pad = 60
pcb.crop((xs.min() - pad, ys.min() - pad, xs.max() + pad, ys.max() + pad)).save(os.path.join(FIG, "a_pcb_board.png"))

page = pymupdf.open(sys.argv[1])[0]
pix = page.get_pixmap(dpi=200)
card = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
g = np.asarray(card.convert("L")).astype(int)
rows = np.where((g < 200).sum(axis=1) > 3)[0]
# the page holds two identical cards; keep the first (content up to the widest gap)
gaps = np.diff(rows)
cut = rows[int(np.argmax(gaps[: len(gaps) // 2 + 1]))] if len(gaps) else rows.max()
top = card.crop((0, max(rows.min() - 20, 0), card.width, cut + 20))
g2 = np.asarray(top.convert("L")).astype(int)
cols = np.where((g2 < 200).sum(axis=0) > 3)[0]
top.crop((max(cols.min() - 20, 0), 0, min(cols.max() + 20, top.width), top.height)).save(os.path.join(FIG, "a_qr_card_one.png"))
print("written: a_schematic_rot.png, a_pcb_board.png, a_qr_card_one.png")
