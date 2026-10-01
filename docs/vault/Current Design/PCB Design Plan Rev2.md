---
title: PCB Design and Layout Plan (Revision 2)
tags: [sesem, design, current, pcb]
supersedes: "[[Archive/Original PCB Plan (GPS-GSM)]]"
---

# PCB Design and Layout Plan — Revision 2 (BLE Based)

Full formatted version: `Attachments/PCB_Design_and_Layout_Plan_Rev2.docx`

## What changed from Revision 1

GPS module, GSM/cellular module, and accelerometer removed — the 2G-sunset concern from Rev 1 no longer applies since the system now runs entirely over facility WiFi + BLE. Removing GPS/cellular also eliminates the largest current draws and toughest RF placement constraints. Added: heart rate sensor, battery fuel gauge, and a second, simpler board — the door sensor node.

## Two boards required

| Board | Purpose | Prototype qty |
|---|---|---|
| Wearable device board | See [[Hardware BOM - Wearable]] | 1 (consider 2 as spare) |
| Door sensor node board | See [[Hardware BOM - Door Sensor]] | 2–3 for representative demo |

Confirm exact door-node count with adviser — see [[Open Questions]].

## Schematic-to-PCB workflow (KiCad)

1. Draw schematic in functional blocks (power, MCU, sensors, UI) — **IEEE standard symbols only**, per course requirement.
2. Assign footprints verified against the actual datasheet of the part being purchased.
3. Run Electrical Rules Check, clear all warnings.
4. Define board outline from finalized enclosure dimensions.
5. Import netlist, place components per zone plan.
6. Route power first, then signals; ground pour last, respecting antenna keep-out.
7. Run Design Rules Check, resolve every violation.
8. Generate Gerber/drill files, review in a Gerber viewer before ordering.
9. Confirm fabrication vendor/turnaround against the Week 9 defense date.
10. On receipt: check for shorts, verify voltage rails before populating ICs.
11. Bring up in stages: power section, then MCU, then each peripheral in turn.
12. Validate BLE/WiFi last, once enclosure is fitted (enclosure material affects RF).

## Risk notes

> **Order PCBs early.** Fabrication/shipping delays are the most common cause of missed defense deadlines. A board respin after a layout error can consume weeks.

> **Breadboard the BLE localization before committing to layout.** Confirming zone detection works at the intended beacon spacing matters more than a finished board, and may change component/placement decisions. See [[Phase 1 BLE POC]].

## Open questions specific to this document

- Is a 2-layer board acceptable for both boards?
- How many door sensor nodes for the defense demo?
- Target battery runtime, to size duty cycle and battery capacity?
- Battery backup for door sensor nodes?
- Approved PCB fabrication vendor and turnaround time?
- Will schematic and layout be reviewed before fabrication is ordered?

(Full list: [[Open Questions]])

## Related

[[00 Start Here]] · [[Hardware BOM - Wearable]] · [[Hardware BOM - Door Sensor]] · [[Current Design/System Design Plan]]

## Update (Aug 2026): self-fabricating PCBs

Decision: boards will be DIY/self-etched (toner-transfer + ferric chloride), not ordered from a fab house. This resolves the vendor/turnaround open question but replaces it with new constraints — flag these with the adviser:

- **Design single-sided where possible.** Hand-aligning two etched layers is unreliable; use hand-soldered jumpers for the few unavoidable crossovers instead of a true double-sided board.
- **No plated-through-holes** — every via is a hand-soldered wire.
- **Use breakout modules (ESP32 dev board, MAX30102, MAX17048, TP4056), not bare ICs**, mounted via headers/sockets — sidesteps fine-pitch hand soldering. Confirm with adviser whether the course requires component-level (bare-IC) schematic/PCB or accepts a module-carrier board design — this is a real open question, not a formality.
- **Antenna keep-out is still non-negotiable** — actually easier to guarantee by hand (just leave copper out of that area), do not treat DIY as an excuse to skip it.
- Cost: ~PHP 648 for tools + consumables (both boards) — see `Attachments/TroDes_Estimated_BOM.xlsx`, "DIY PCB Fabrication" tab.
