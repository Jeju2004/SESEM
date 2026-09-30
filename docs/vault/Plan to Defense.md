# Plan to Defense — written 2026-09-12

**Team:** 2 people. **PR1 due:** Monday 21 September. **Defense:** Week 9 or 10
(≈ 28 September – 9 October). **PCB:** self-fabricated, not ordered.

Feasibility: **~50%** for a Week 9 defense, **~65%** for Week 10. Self-fabrication
removes the shipping risk that would otherwise have dominated. What remains is a
scope-and-manpower problem, which is manageable but leaves no slack.

---

## The decision that makes this achievable: build a carrier board

Do **not** attempt to lay out the bare sensor ICs. The MAX30102 is a 0.5 mm-pitch
LGA; hand-etching and hand-soldering it without a stencil and reflow is a
realistic way to lose a week and a board.

**Instead, design the PCB as a carrier for modules:**

| Function | On the board as |
|---|---|
| ESP32-WROOM-32 | Module, castellated pads (or a devkit on headers) |
| MAX30102 | Breakout module on headers |
| MAX17048 | Breakout module on headers |
| TP4056 + protection | Breakout module on headers |
| MCP1700-3.3 | Discrete, SOT-23 or TO-92 |
| Button, buzzer + NPN, LEDs, resistors | Discrete, through-hole or 0805 |

This is entirely defensible for an undergraduate Electronics Design prototype —
you still design, route, etch, and assemble a real board — and it cuts assembly
risk enormously. **Confirm it with the adviser** at the consultation, since
"we fabricate our own PCB" should be explicitly approved against the course's
"working PCB prototype" requirement.

**Antenna keep-out is still non-negotiable.** Position the ESP32 module so its
antenna end **overhangs the board edge**, with no copper — no ground pour, no
traces — underneath or beside it. A compromised antenna degrades RSSI, which
degrades zone detection, which is the entire project.

**Etching practicalities:** prefer **single-sided with jumper wires** over
double-sided. Aligning two-sided toner transfer by hand is difficult and there
are no plated through-holes, so every via becomes a hand-soldered wire anyway.
Single-sided plus a few jumpers is faster, more reliable, and easier to rework.

---

## Buy these now — they are the real lead-time items

- [ ] **2 more ESP32 devkits.** Test 2 (zone classification accuracy) needs at
      least two beacons in separate rooms; three zones needs three. This blocks
      the headline test of the whole project and the boards are cheap. Low
      regret even if the adviser settles on fewer zones.
- [ ] **Copper-clad board, ferric chloride (or equivalent), toner transfer paper
      or photoresist film, fine-tip permanent marker for touch-ups.** Buy enough
      for **three attempts** — first etches usually fail.
- [ ] **Breakout modules** — MAX30102, MAX17048, TP4056 with protection — if not
      already on hand.
- [ ] A **power bank** for the beacon during Test 1, if not already available.

---

## Two tracks, run in parallel

With two people, serialising this does not fit. Split by track and hold a short
sync daily.

**Track A — Hardware** (Test 1–3, schematic, layout, etch, assemble, debug)
**Track B — Software and documents** (dashboard, PR1, paper, user manual)

---

## Week 1 — now to Monday 21 September (PR1 due)

**Track A**

- [ ] Reflash the wearable with `DEBUG_BLE_SNIFF = 0`
- [ ] **Run Test 1** (RSSI vs distance) — `docs/TEST1_FIELD_CHECKLIST.md`.
      Check the 1 m reading is −50 to −60 dBm before committing to the full run
- [ ] Feed the measured `A` and `n` back into the firmware, reflash both boards
- [ ] Flash the new ESP32s as beacons for zones 2 and 3
- [ ] **Draw the schematic** (KiCad). IEEE standard symbols only — hard course rule

**Track B**

- [ ] **Book and attend the adviser consultation** — see the agenda note
- [ ] **Draft PR1, get it signed with a date, submit as PDF** by 21 September
- [ ] Start the caregiver dashboard — see `Dashboard Build Brief.md`
- [ ] Begin Chapter 2 (real citations only — never fabricate a reference)

**Milestone:** PR1 submitted. Test 1 data in hand. Schematic drawn.

---

## Week 2 — 22 to 28 September

**Track A**

- [ ] **Layout, print, etch, drill, assemble** the wearable board
- [ ] Power-on test before fitting modules: check 3.3 V rail, check for shorts
- [ ] **Run Test 2** (zone classification accuracy) with 3 beacons
- [ ] **Run Test 3** (boundary/hysteresis), tune `HYSTERESIS_DB` and
      `CONFIRM_TICKS`, record before-and-after numbers

**Track B**

- [ ] Dashboard functional against the wearable's real HTTP posts
- [ ] Chapter 3 including the **decision matrix** (tie to SDG 3)
- [ ] Chapter 4 written up from Tests 1–3 as the data arrives
- [ ] **Request for Billing Form** — no form means no defense, automatic 5

**Milestone:** Wearable PCB assembled and powered. All three tests done.

---

## Week 3 — 29 September to defense

- [ ] Door sensor node board etched and assembled
- [ ] Full system integration: wearable + 3 beacons + door node + dashboard
- [ ] **User manual** — a graded deliverable, not an afterthought
- [ ] Chapters 1 and 5 finished; bibliography and appendices assembled
- [ ] **Rehearse the demo at least twice**, end to end, on the actual table
- [ ] Prepare for the obvious panel questions: measured accuracy, battery
      runtime, what happens when WiFi drops, why BLE over alternatives

---

## Contingency — decide this early, not on the day

If the wearable PCB is not working 4 days before the defense, **demo on the
breadboard** and present the etched board as fabricated-but-under-debug, with
the layout and etching as evidence of work done. Raise this possibility with the
adviser **at the consultation**, not afterwards.

Keep the breadboard set-up intact and working until the defense is over. Do not
cannibalise it for parts.

---

## What will actually sink this, in order of likelihood

1. **The dashboard never gets started.** Adviser priority #2, large share of
   remaining work, currently zero, and blocked on the hosting decision.
2. **Etching takes three attempts.** First boards usually do.
3. **Test 2 gets skipped** because the beacons were never bought.
4. **The user manual is left to the last two days.** It is explicitly graded.
5. **PR1 slips** because the adviser could not be reached in time.

---

## Honest assessment

The hard technical unknown — whether BLE RSSI can discriminate rooms at your
beacon spacing — is retired. What remains is *known* work under time pressure,
which is a far better position than the reverse.

The binding constraint is two people and roughly three weeks. That is enough
only if the two tracks genuinely run in parallel and the adviser's four blocking
decisions are cleared this week.
