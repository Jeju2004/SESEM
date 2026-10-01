---
title: KiCad Project Notes — Wearable Rev B schematic
tags: [pcb, kicad, schematic, wearable]
updated: 2026-09-24
source: TroDes Claude project, guides/KiCad_Project_Notes.md
---

# TroDes Wearable Device Board — KiCad project (Rev B)

*Mirrored from the TroDes Claude project (`guides/KiCad_Project_Notes.md`) on 24 Sep 2026. Edit there or here, then sync.*

> **Partly superseded by Rev C (23 Sep).** The Rev C layout swaps the I²C pins (SDA → IO22, SCL → IO21) and moves the TP4056 and MT3608 off-board — see [[Current Design/PCB Layout Notes Rev C]]. The devkit pin-order checks below still apply.

Generated 23 September 2026. Written in the KiCad 7 file format (`20230121`),
which KiCad 8 and 9 open directly. KiCad 9 will offer to save it in its own
format the first time you save — accept.

## What's here

| File | What it is |
|---|---|
| `trodes_wearable.kicad_pro` | Project file. **Open this one.** |
| `trodes_wearable.kicad_sch` | The schematic. All symbols are embedded — no external symbol libraries needed. |
| `trodes_wearable.kicad_pcb` | Empty board, pre-set for hand etching (0.4 mm min track, 0.4 mm clearance, 0.8 mm min drill). |
| `fp-lib-table` | Registers the project's own footprint library. |
| `TroDes.pretty/` | The custom ESP32-DevKitC carrier footprint. |
| `TroDes_Wearable_RevB_Schematic.pdf` | Printable schematic, A3. |

## Do this first — verify the devkit pin order

`U1` is drawn as an **ESP32-DevKitC V4, 38-pin** (two rows of 19, 2.54 mm
pitch, 25.4 mm between rows). Pins 1–19 are the left column top to bottom,
20–38 the right column top to bottom, with the USB connector at the bottom.

**Check your actual board against the symbol before you etch anything.**
The quick check is the four corners:

| Symbol pin | Should read on the silkscreen |
|---|---|
| 1 | 3V3 |
| 19 | 5V (or VIN) |
| 20 | GND |
| 38 | CLK / IO6 |

Also measure the **row spacing** with calipers. 38-pin DevKitC boards are
25.4 mm; the 30-pin DOIT DevKit V1 is 22.86 mm and has a different pin order
entirely. If yours is the 30-pin board, say so and the symbol and footprint
need regenerating — do not try to patch it by hand.

The GPIOs the firmware uses (IO21, IO22, IO25, IO27, IO2, IO34) exist on both
variants, so only the header geometry is at risk, not the design.

## Going to layout

1. Open `trodes_wearable.kicad_pro`.
2. Schematic editor → **Inspect → Electrical Rules Checker** → Run.
   Expect warnings only for the unused U1 pins; everything else should be clean.
3. **Tools → Update PCB from Schematic** (F8).
4. Place `U1` and `M2` at opposite ends of the board. The MT3608 is a
   switching node and the ESP32 antenna is the whole project.
5. Keep all copper — including any ground pour — away from the antenna end of
   the devkit.

## Single-sided etching notes

The board is a module carrier: every part is through-hole and every module sits
on female headers. Route on **B.Cu only** and use jumper wires on the component
side where a crossing is unavoidable. The design rules in the project already
enforce 0.4 mm minimum track and clearance, which is about the limit for
toner-transfer etching.

## Footprints that need a second look

| Ref | Assigned | Why to check |
|---|---|---|
| U1 | `TroDes:ESP32-DevKitC_2x19_P2.54mm_RowSpacing25.4mm` | Custom. Verify row spacing and pin order as above. |
| SW1 | `PinHeader_1x03_P2.54mm_Vertical` | Generic 3-pin 2.54 mm placeholder. Measure your slide switch. |
| BT1 | `PinHeader_1x02_P2.54mm_Vertical` | Cell connects through a 2-pin header or JST. Swap if you use JST-PH. |
| M1, M2, U2, U3 | 1×4 / 1×5 / 1×6 pin headers | Correct for header-mounted modules; confirm pin count and order on your specific boards. |
| Q1 | `TO-92_Inline` | Pin order is E-B-C. Check your 2N2222's package marking — some TO-92 parts are C-B-E. |

## U3 is marked DNP

`U3` (MAX17043) is set **Do Not Populate**. It will appear crossed out in the
schematic and will be excluded from the board. If the part arrives and you
decide to fit it, clear the DNP flag in its symbol properties and re-run
Update PCB from Schematic. If it does not arrive, nothing needs changing —
the R3/R4 divider on IO34 already supplies battery voltage.

## Net names

`VBAT`, `VSW`, `+5V`, `+3V3`, `GND`, `SDA`, `SCL`, `SOS_BTN`, `BUZZ_DRV`,
`LED_STAT`, `VBAT_SENSE`. These match the names used in the firmware config
and in the Rev B schematic drawing.

The two `PWR_FLAG` symbols exist only to keep ERC quiet about VBAT and GND
being driven by passive pins. They are not components and produce no copper.

## Related

[[Current Design/PCB Layout Notes Rev C]] · [[Current Design/Final Hardware Plan Rev B]] · [[Wearable Schematic Spec]]
