---
title: Adviser Decision Sheet (21 Sep consultation)
tags: [adviser, decisions, reference]
updated: 2026-09-24
source: TroDes Claude project, status/Adviser_Decision_Sheet.md
---

# Adviser Decision Sheet

*Mirrored from the TroDes Claude project (`status/Adviser_Decision_Sheet.md`) on 24 Sep 2026. Edit there or here, then sync.*

> **Historical — prepared for the 21 Sep consultation.** The outcomes are recorded in [[Decisions Log]]; the MCP1700 → AP2112K change in §C1 was itself superseded by the Rev B boost topology, see [[Current Design/Final Hardware Plan Rev B]].

**For the consultation. One page of decisions, not a status update.**
Version 1.0 · 21 September 2026

---

## How to use this

Progress Report 1 is signed, but the consultation behind it never happened, so
twelve design questions are still open and four of them are holding up the PCB.
Etching time is now the binding constraint on the defense.

Bring this sheet. Every question has a **recommended default** already filled
in. Ask the adviser to confirm or override — that is a much faster conversation
than asking an open question, and it means silence on an item still leaves you
with a defensible decision you can write down and proceed on.

**Open with the state of play, in about thirty seconds:** three boards working,
BLE zone detection confirmed on hardware with a captured zone transition and a
correct restricted-zone alert, the caregiver dashboard built and passing 38
self-tests, PR1 signed. Then go straight to the decisions. Do not spend the
meeting recapping.

**Write the answer in the right-hand column during the meeting.** An answer you
reconstruct afterwards is an answer you will get wrong.

---

## Section A — blocking the PCB. Do not leave without these four.

### A1. Is self-fabrication of the PCB acceptable?

*Why it matters:* the course requires a "working PCB prototype." The team plans
to etch single-sided boards by hand rather than order fabricated ones. That is
the only approach that fits the remaining schedule, but it needs to be approved
explicitly rather than assumed — discovering at the defense that the panel
expected a fab-house board is unrecoverable.

**Recommended:** yes, hand-etched single-sided with jumper wires, designed as a
**carrier board for modules** (ESP32, MAX30102, MAX17048, TP4056 on headers;
regulator, button, buzzer, NPN, passives discrete). Laying out the bare
MAX30102 — a 0.5 mm-pitch LGA — without a stencil and reflow is a realistic way
to lose a week and a board.

**Ask in the same breath:** if the etched board is not working four days before
the defense, is demonstrating on the breadboard — with the etched board
presented as fabricated-but-under-debug — acceptable? Agree the fallback now,
not on the day.

**Answer:** ______________________________________________

### A2. How many zones and beacons for the defense demo?

*Why it matters:* this is the single most expensive item to get wrong. Test 2 —
the zone-classification confusion matrix — is the headline number the project is
graded on, and it cannot run at three zones with the two beacons that exist.

**Recommended:** three zones — `bedroom_wing` (safe), `dining_hall` (safe),
`medicine_room` (restricted). Three gives a meaningful confusion matrix and
demonstrates the safe/restricted distinction. Two zones makes the matrix
trivially small and the panel will notice.

*Buy the two extra devkits regardless of the answer.* They are cheap, they are
the longest lead-time item left, and they are worthless-case a few hundred pesos.

**Answer:** ______________________________________________

### A3. Door sensor node — ESP32 or ESP8266?

*Why it matters:* the BOM says ESP8266; the firmware and the board on the bench
are ESP32. The written documentation and the physical prototype currently
contradict each other, which is exactly the kind of thing a panel finds.

**Recommended:** ESP32, and correct the BOM. It is what already works, it keeps
one toolchain across all three board types, and the cost difference is
negligible for a mains-powered node.

**Answer:** ______________________________________________

### A4. Target battery runtime for the wearable?

*Why it matters:* this is the number that sizes the duty cycle and the cell, and
it cannot be derived — it is a care-facility policy question. At the current
~60 mA average, a 1000 mAh cell gives roughly **16 hours**, which is under a
full day. Without a target, the firmware's scan and report intervals are
unjustified and Chapter 4's power section has nothing to test against.

**Recommended:** 24 hours, on the reasoning that a carer charges the device
during a daily routine. Meeting it needs either a larger cell (2000 mAh) or a
longer scan interval, and that trade-off is worth stating in the paper.

**Answer:** ______________________________________________

---

## Section B — needed soon, not blocking today

| # | Question | Recommended default | Answer |
|---|---|---|---|
| B1 | Heart rate: own alert thresholds, or display-only? | Display-only for the demo. Thresholds imply clinical judgement the project should not claim. Currently `null` in config and raising nothing. | |
| B2 | SOS long-press dismiss threshold | 3 s. Long enough to be deliberate, short enough not to feel broken. | |
| B3 | Wi-Fi-down fallback for the **wearable** | Queue status, retry, buzz locally + distinct LED pattern. Server side is already implemented and documented. | |
| B4 | Battery backup for door nodes | Out of scope; state it as a Chapter 5 recommendation. A mains-only node correctly shows OFFLINE in a power cut. | |
| B5 | Beacon power source | Mains — assumed throughout, never actually confirmed. | |
| B6 | Which IEC/IEEE standards for Chapter 3 | IEC 62133 (cells), IEC 62368-1 (safety), IEEE 802.15.1 (BLE), IEEE 802.11 (Wi-Fi). | |
| B7 | Will the adviser review schematic + layout before etching? | Yes — and agree a date. A layout error found after etching costs a board and three days. | |
| B8 | Confirm defense date and PR2/PR3 dates | Schedule shifted with the weather suspensions; only PR1 was ever confirmed. | |

---

## Section C — raise as decided, do not ask permission

### C1. The MCP1700-3.3 is being replaced.

This one is an engineering correction, not a decision to defer. **The
MCP1700-3.3 is rated 250 mA. Peak demand is ~380 mA** during Wi-Fi transmit
bursts. An under-specced regulator produces brownout resets that present as
random crashes and are miserable to diagnose after a board is etched.

The fix: substitute **AP2112K-3.3** (600 mA, 55 µA quiescent, SOT-23-5) and add
bulk capacitance — 470 µF electrolytic plus 10 µF ceramic at the ESP32's 3V3
pin. This keeps the low quiescent current that motivated the original choice.

Tell the adviser this is being done and why. Waiting for permission to fix a
known-wrong part spends the only schedule slack left. Note the footprint
differs from the MCP1700, which is precisely why it must be settled before
layout rather than after.

### C2. Backend hosting is no longer blocking.

Previously listed as a blocker. The dashboard stack — FastAPI + SQLite + a
static page — runs unchanged whether hosted locally or in the cloud, so the
build did not wait for it. Mention it for the record; a local machine on the
facility network is the sensible demo answer.

---

## Before you leave the room

- [ ] All four Section A answers written down
- [ ] Schematic and layout review date agreed (B7)
- [ ] Defense date confirmed (B8)
- [ ] Breadboard-fallback contingency agreed (A1)
- [ ] Request for Billing Form — **no form means no defense means an automatic
      grade of 5.** Ask what is needed and when.
- [ ] Next consultation booked

Log the outcome in `status/Adviser_Consultation_Notes.md` §7 the same day.

## Related

[[Decisions Log]] · [[Open Questions]] · [[Adviser Consultation Agenda]]
