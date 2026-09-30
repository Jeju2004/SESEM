---
title: PCB Layout Notes — Wearable Rev B (superseded)
tags: [pcb, kicad, layout, archive]
updated: 2026-09-24
source: TroDes Claude project, guides/PCB_Layout_Notes_RevB.md
---

# TroDes Wearable Carrier Board — KiCad project (Rev B)

*Mirrored from the TroDes Claude project (`guides/PCB_Layout_Notes_RevB.md`) on 24 Sep 2026. Edit there or here, then sync.*

> **Superseded by [[Current Design/PCB Layout Notes Rev C]] (23 Sep).** Rev C removes all 14 wire links and shrinks the board to 69 × 66 mm. Kept for reference — do not etch from Rev B.

Generated 23 September 2026. KiCad 7 file format, which KiCad 8 and 9 open directly.
Open **`trodes_wearable.kicad_pro`**.

---

## Read this first — three things to do before you etch

1. **Fill the ground zone.** Open the PCB, press **B**. The zone is shipped unfilled
   on purpose so KiCad computes the pour, its clearances and the thermal reliefs
   itself rather than trusting geometry I generated. Then run
   **Inspect → Design Rules Checker**.
2. **Verify the devkit pin order.** `U1` is drawn as an **ESP32-DevKitC V4, 38-pin**,
   two rows of 19 at 2.54 mm, **25.4 mm between rows**. Check the four corners against
   your board's silkscreen — pin 1 = 3V3, pin 19 = 5V, pin 20 = GND, pin 38 = CLK/IO6 —
   and measure the row spacing with calipers. A 30-pin DOIT DevKit V1 is 22.86 mm and
   has a different pin order; if that's what you have, say so and both the symbol and
   the footprint need regenerating.
3. **Check the module footprints against your actual modules.** `M1` (TP4056) and
   `M2` (MT3608) are **wire-link footprints**: the module body sits inside the printed
   outline and you run four short wires from its own pads to the four pads above it.
   That works whatever pad layout your vendor used, but confirm the bodies fit.

---

## Board

| | |
|---|---|
| Size | **80 × 76 mm**, single-sided |
| Copper | **B.Cu only** — everything on the bottom, all parts through-hole on the top |
| Minimum track | 0.6 mm signal, 0.8 mm power |
| Minimum clearance achieved | **0.30 mm** (see "Known tight spots") |
| Pads | 1.9 mm with a 1.0 mm drill; wire-link pads 1.2 mm with a 0.7 mm drill |
| Ground | full bottom-copper pour |
| Wire links | 14 |

**Why 80 × 76 and not the 70 × 60 you asked for:** the TP4056 and the MT3608 are
26 × 17 mm and 36 × 17 mm. Laid flat beside a 28 × 54 mm devkit they do not fit in
70 × 60 with any routing room left. If size matters more than integration, the two
power modules can come off the board entirely — they only need four wires each — and
the carrier drops to roughly 62 × 60 mm. Say the word and I will redo it that way.

### The antenna cut-out

There is a **7 × 18.4 mm slot** in the board under the ESP32's antenna, plus a copper
keep-out around it. Drill the corners and file or jigsaw it out. If cutting it is more
trouble than it is worth, leave the FR4 — the copper keep-out is already in the design
and is most of the benefit — but do not put copper there.

---

## Wire links

Single-sided boards need them. Each is a short insulated wire soldered on the
**component side** between two holes. They are drawn in red on
`artwork/ComponentPlacement_topview.pdf`.

| Ref | Net | From (mm) | To (mm) | Length |
|---|---|---|---|---|
| JP1 | /VSW | (36.50, 60.00) | (47.95, 54.66) | 12.6 |
| JP2 | /SCL | (13.20, 15.00) | (22.62, 8.00) | 11.7 |
| JP3 | /SCL | (25.80, 8.80) | (29.21, 8.95) | 3.4 |
| JP4 | /BUZZ_DRV | (55.41, 32.80) | (58.20, 32.20) | 2.9 |
| JP5 | Net-(Q1-B) | (68.54, 23.46) | (74.49, 31.62) | 10.1 |
| JP6 | Net-(BZ1--) | (73.62, 20.00) | (70.85, 25.08) | 5.8 |
| JP7 | /LED_STAT | (43.56, 20.00) | (43.80, 27.12) | 7.1 |
| JP8 | /LED_STAT | (55.26, 30.95) | (58.30, 34.10) | 4.4 |
| JP9 | GND | (42.53, 1.54) | (39.43, 4.96) | 4.6 |
| JP10 | GND | (24.51, 47.36) | (24.51, 43.44) | 3.9 |
| JP11 | GND | (2.56, 53.66) | (8.34, 53.04) | 5.8 |
| JP12 | GND | (41.69, 10.50) | (38.31, 13.34) | 4.4 |
| JP13 | GND | (15.00, 23.44) | (23.24, 20.01) | 8.9 |
| JP14 | GND | (67.29, 47.54) | (63.71, 46.29) | 3.8 |


---

## Etching artwork (`artwork/`)

| File | Use |
|---|---|
| `BottomCopper_MIRRORED_for_toner_transfer.pdf` | **Print this one** for toner transfer. Already mirrored. |
| `BottomCopper_asviewed.pdf` | Same copper, unmirrored — for checking against the screen. |
| `DrillGuide.pdf` | Mirrored copper with drill centres marked. |
| `ComponentPlacement_topview.pdf` | Where the parts go, and the wire links. |

**Print every sheet at 100% / actual size, no fit-to-page.** Each has a 50 mm
check scale — measure it before you commit a sheet of toner paper.

---

## Known tight spots

My own geometric DRC, run independently of KiCad, reports the board clean at
**0.30 mm** clearance with exactly two places at the limit:

- `+3V3` track against `/SCL` track — 0.30 mm
- `+5V` track against Q1's base pad — 0.31 mm

Everything else clears 0.32 mm or better. 0.30 mm is achievable with toner transfer
but it is the limit; if either of those two spots bridges during etching, nudge the
track a little in KiCad and re-export rather than trying to rescue it with a knife.

**Three ground pads may need attention.** My pour model leaves `U2.2`, `D2.1` and
`C1.2` on small islands. KiCad's own zone filler is better than mine and may well
join them — that is why the zone ships unfilled. After you press B and run DRC,
KiCad will flag any isolated zone island explicitly. If it does, add a short wire
link from that pad to the nearest ground copper; there is plenty of room near all
three.

---

## How this was checked

Pad coordinates were verified against KiCad's own Excellon drill export — all 95
component holes match. The schematic netlist was verified against KiCad's own netlist
exporter and matches exactly. Routing connectivity and clearances were checked
geometrically, independently of KiCad. What has **not** been checked is KiCad's DRC
itself, because the KiCad 7 command line has no DRC subcommand — that is your step 1
above, and it is the authority.

## Related

[[Current Design/PCB Layout Notes Rev C]] · [[Current Design/KiCad Project Notes]]
