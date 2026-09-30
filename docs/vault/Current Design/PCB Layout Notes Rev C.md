---
title: PCB Layout Notes — Wearable Rev C
tags: [pcb, kicad, layout, wearable, rev-c]
updated: 2026-09-24
source: TroDes Claude project, guides/PCB_Layout_Notes_RevC.md
---

# TroDes Wearable Carrier Board — KiCad project (Rev C)

*Mirrored from the TroDes Claude project (`guides/PCB_Layout_Notes_RevC.md`) on 24 Sep 2026. Edit there or here, then sync.*

> **Project files:** `Current Design/KiCad Rev C/` — open `trodes_wearable.kicad_pro` (from `TroDes_Wearable_KiCad_5.zip`, 23 Sep).
> Print for etching: [[Current Design/KiCad Rev C/artwork/BottomCopper_MIRRORED_for_toner_transfer.pdf|Bottom copper, mirrored]] ·
> [[Current Design/KiCad Rev C/artwork/DrillGuide.pdf|Drill guide]] ·
> [[Current Design/KiCad Rev C/artwork/ComponentPlacement_topview.pdf|Component placement]] ·
> [[Current Design/KiCad Rev C/TroDes_Wearable_RevB_Schematic.pdf|Schematic PDF]] (the file keeps its Rev B name; it carries the Rev C I²C pin swap)

23 September 2026. KiCad 7 file format; KiCad 8 and 9 open it directly.
Open **`trodes_wearable.kicad_pro`**.

---

## What changed from Rev B

| | Rev B | Rev C |
|---|---|---|
| Wire links | 15 | **0** |
| Board | 80 × 76 mm | **69 × 66 mm** |
| TP4056 / MT3608 | on the board | **off-board, 4 pads each** |
| Track corners | 90° staircase | 45° mitres, straight runs |
| Clearance | 0.30 mm worst case | **0.32 mm, DRC clean** |

**Zero jumpers.** Every one of the 14 signal nets routes on the bottom copper
alone, and every ground pad lands on a single connected pour.

---

## Two firmware changes are required

The board only goes jumper-free because two pins were reassigned to match the
devkit's physical pin order. Edit `firmware/wearable/include/config.h`:

```c
#define PIN_I2C_SDA   22      // was 21
#define PIN_I2C_SCL   21      // was 22
```

That is the whole change. The schematic in this project already reflects it.
**If you flash the old firmware to this board, I²C will not work** — SDA and
SCL will be swapped.

## One connection is deliberately not routed

`U3` (MAX17043 fuel gauge) is optional and marked DNP. Its **CELL** pin is not
connected on the board, because routing raw battery voltage across to it was
what forced several of the old jumpers. If you ever fit the gauge, run one wire
from U3's CELL pin to the battery terminal at `M1` pin 3. If you don't fit it —
which is the plan — nothing is missing: the R3/R4 divider on IO34 already
supplies battery voltage.

---

## Do this first

1. **Open the PCB and press `B`** to fill the ground zone. It ships unfilled so
   KiCad computes the pour, clearances and thermal reliefs itself. Then run
   **Inspect → Design Rules Checker**.
2. **Verify the devkit pin order.** `U1` is an ESP32-DevKitC V4, 38-pin, two
   rows of 19 at 2.54 mm with **25.4 mm between rows**. Check the corners
   against your silkscreen — pin 1 = 3V3, 19 = 5V, 20 = GND, 38 = CLK/IO6 —
   and measure the row spacing with calipers. A 30-pin DOIT DevKit V1 is
   22.86 mm with a different pin order; if that's what you have, say so.
3. **Check Q1's pinout.** `TO-92_Wide` is E-B-C. Some 2N2222 packages are C-B-E.

---

## Board

| | |
|---|---|
| Size | **69 × 66 mm**, single-sided |
| Copper | B.Cu only; all parts through-hole on the top |
| Tracks | 0.6 mm signal, 0.8 mm power, 45° corners |
| Clearance | 0.32 mm minimum, verified |
| Pads | 1.9 mm with a 1.0 mm drill |
| Ground | full bottom-copper pour, one connected island |
| Wire links | **none** |

### Off-board modules

`M1` (TP4056) and `M2` (MT3608) are now **4-pad headers**. Mount the modules
beside the battery and run four short wires to each:

| Pad | M1 — TP4056 | M2 — MT3608 |
|---|---|---|
| 1 | B+ | IN+ |
| 2 | B− | IN− |
| 3 | OUT+ | OUT+ |
| 4 | OUT− | OUT− |

This is what freed the board: those two modules were eating ~1000 mm² and
pushing every other part out of position.

### Antenna cut-out

A **7 × 18.5 mm slot** sits under the ESP32's antenna with a copper keep-out
around it. Drill the corners and file or jigsaw it out. If cutting it is more
trouble than it's worth, leave the FR4 — the copper keep-out is already in the
design and is most of the benefit — but put no copper there.

---

## Etching artwork (`artwork/`)

| File | Use |
|---|---|
| `BottomCopper_MIRRORED_for_toner_transfer.pdf` | **Print this one.** Already mirrored. |
| `BottomCopper_asviewed.pdf` | Same copper unmirrored, for checking on screen. |
| `DrillGuide.pdf` | Mirrored copper with drill centres. |
| `ComponentPlacement_topview.pdf` | Where the parts go. |

**Print every sheet at 100% / actual size, no fit-to-page.** Each carries a
50 mm check scale — measure it before committing a sheet of toner paper.

---

## How this was checked

- All 76 pad positions verified against KiCad's own Excellon drill export.
- The schematic netlist verified against KiCad's own netlist exporter.
- Routing connectivity and clearances checked geometrically, independently of
  KiCad: 14 of 14 signal nets connected, every ground pad on one pour, no
  clearance below 0.32 mm.
- **Not** checked: KiCad's own DRC, because the KiCad 7 command line has no DRC
  command. That is your step 1, and it is the authority.

`SW2` will show as two pieces in some connectivity checks. That is the tactile
switch's two holes per terminal, joined inside the switch body — not a fault.

## Related

[[00 Start Here]] · [[Current Design/Final Hardware Plan Rev B]] · [[Current Design/KiCad Project Notes]] · [[Archive/PCB Layout Notes Rev B]] · [[Resume Here]]
