# TroDes — Complete Build Process and Instructions

> **Historical — written 24 Aug 2026, before hardware bring-up.** Superseded by [[Resume Here]] and [[Plan to Defense]]; kept for the record of the original staging plan.

*Smart Elderly Safety and Emergency Monitoring System with Geofencing (Indoor BLE-based localization)*
*BS Electronics and Communications Engineering — Electronics Design | Mapua University*

**Status at time of writing:** all Phase 1 components sourced and in hand. Nothing built yet. This document is the end-to-end path from bench to Week 9 defense.

---

## How to read this document

Stages 0–5 are **breadboard work**. Stages 6–9 are **PCB work**. Stages 10–12 are **documentation and defense**.

The stages are ordered by dependency, not by calendar. Some tracks run in parallel — see *Parallel tracks* near the end. Three stages are **hard gates**: do not proceed past them until their exit criteria pass, because the cost of discovering a problem later is measured in weeks, not hours.

Four items are still **blocked on adviser input**. They are marked ⚠ where they appear. Do not invent answers to them.

---

## STAGE 0 — Bench preparation

**Goal:** a working toolchain before you touch any circuit.

1. Install Arduino IDE on the laptop you'll use for the whole project. Don't switch machines mid-project — board definitions and library versions drift.
2. Install the ESP32 board package (Boards Manager → "esp32" by Espressif).
3. Install the ESP8266 board package (needed later for the door node).
4. Install the `NimBLE-Arduino` library (by h2zero) via Library Manager. Not the stock BLE library — NimBLE uses substantially less RAM and flash.
5. Flash a blank sketch to **each** ESP32 board you bought, one at a time, to confirm every board enumerates over USB and accepts a program. Do this now, on day one. A dead-on-arrival board discovered in week 6 is a crisis; discovered today it's a replacement order.
6. Install `nRF Connect` (free) on your phone. This is your BLE ground truth for the rest of the project — when firmware says a beacon isn't visible, nRF Connect tells you whether that's a firmware bug or a genuinely silent beacon.
7. Set up Python on the laptop for `rssi_calibrate.py` (needs `numpy`, `matplotlib`, `scipy`).

**Exit:** every board flashes successfully; nRF Connect sees at least one BLE device in the room.

---

## STAGE 1 — BLE localization proof of concept ⛔ **HARD GATE**

**Goal:** prove zone detection actually works at your intended beacon spacing, *before* any PCB layout exists.

This is the single most important stage in the project. Your adviser named localization as the core deliverable. If zone detection doesn't work, nothing downstream matters — and the results here determine beacon count and placement, which feed directly into the PCB design.

Full procedure lives in the vault: **`03 Firmware/Phase 1 BLE POC.md`**. Summary:

1. Flash `beacon.ino` to 2 ESP32 boards, each with a unique `ZONE_ID` and `ZONE_NAME`. Verify both are visible in nRF Connect before proceeding.
2. Flash `wearable_phase1.ino` to a third ESP32. Serial Monitor at 115200, `OUTPUT_MODE = MODE_HUMAN`.
3. **Test 1 — RSSI vs. distance.** One beacon, measure at 1/2/3/5/8 m with `rssi_calibrate.py log`, fit with `rssi_calibrate.py distance`. Repeat through a wall.
4. **Test 2 — Zone classification accuracy.** Beacons in intended positions, walk test with logged ground truth, then `rssi_calibrate.py accuracy` for the confusion matrix. This produces your headline number.
5. **Test 3 — Boundary behavior.** Stand in a doorway 2 minutes; the reported zone must not flicker.

**Rules while tuning:**

- Fix *physical* problems (beacon placement, TX power) before touching filter parameters. Software tuning that compensates for bad placement produces a system that misbehaves in front of the panel.
- Change one parameter at a time. Log every value you try — this becomes Chapter 4 content.
- If accuracy falls short: more beacons or lower TX power. Not heavier filtering.
- **R² below 0.85 on the distance fit is not a failure.** It is a real, publishable finding that supports zone classification over distance estimation. Write it up as such.

**Photograph everything now** — bench setup, beacon placement, measurement positions, tape measure in frame. Reconstructing these photos in week 8 is miserable and they are required for the paper's appendices.

**Exit criteria (all must hold):**

- [ ] RSSI-vs-distance profile captured, model fitted, plot saved
- [ ] Same profile through a wall, attenuation quantified
- [ ] Zone accuracy measured, confusion matrix produced
- [ ] Accuracy meets adviser-agreed target ⚠ *target not yet confirmed*
- [ ] Doorway standing test passes without flicker
- [ ] Walk-past test doesn't trigger a false zone entry
- [ ] Final parameter values recorded with reasoning

---

## STAGE 2 — Wearable subsystem bring-up (breadboard)

**Goal:** every wearable peripheral working individually, then together, on a breadboard.

Bring up **one subsystem at a time**. Never wire all of them and then debug — you lose the ability to isolate a fault.

**Order (each step: wire, test, confirm working, only then continue):**

1. **Power rail.** AMS1117-3.3 module fed from Li-Po. Confirm a stable 3.3 V under a meter before connecting anything else. Add the bulk capacitor (100–470 µF, ≥6.3 V) near the ESP32 supply pin and a 0.1 µF ceramic close to each IC. Without these you get brownout resets during WiFi transmit bursts that look like random firmware crashes.
2. **TP4056 charging.** Battery leads soldered directly to `B+`/`B−` (this module has bare pads, no JST socket). Load connects to `OUT+`/`OUT−`, never directly to the battery. Confirm charging LED behavior and that output holds while charging. ⚠ *Check your cell's rated standard charge current against the TP4056's default 1 A — the module ships with a resistor set for 1 A, which may exceed a 1000 mAh cell's 0.5 C rating. The programming resistor is changeable.*
3. **Battery monitoring.** Voltage divider (two resistors, ≥100 kΩ each to minimize drain) from battery positive into an ESP32 ADC pin. Calibrate against a multimeter reading at several charge levels — the ESP32 ADC is not linear and needs a correction curve.
4. **SOS button.** GPIO with pull-up. Implement and test short-press (alert) vs. long-press (dismiss) discrimination in firmware. ⚠ *Exact long-press threshold unconfirmed — ~3 s proposed.*
5. **Buzzer.** Passive piezo driven through the NPN transistor low-side switch: GPIO → base resistor → base; buzzer+ → VCC; buzzer− → collector; emitter → GND. Since it's passive, use PWM to produce *distinguishable tone patterns* for SOS / low-battery / WiFi-down. This matters — an alert you can't tell apart from another alert isn't much of an alert.
6. **Status LED.** Bi-color LED with current-limiting resistors.
7. **MAX30102 heart rate.** I2C, sharing the bus with nothing else at this point. 4.7 kΩ pull-ups on SDA/SCL. This sensor needs firm skin contact to produce a usable signal — test it against a wrist, not a fingertip held loosely, or you'll conclude it's broken when it isn't. ⚠ *Heart rate alert thresholds vs. display-only is unconfirmed.*
8. **Integration.** Now combine all of the above with the Stage 1 BLE scanning firmware. Watch for: I2C bus conflicts, ADC readings shifting when WiFi transmits, buzzer current dragging the rail.

**Exit:** all peripherals functioning simultaneously with BLE scanning active, running from battery power alone for at least a few hours without a reset.

---

## STAGE 3 — Door sensor node (breadboard)

Independent of Stages 1–2 — can run in parallel with either.

1. Flash a blank sketch to the ESP8266 NodeMCU, confirm it enumerates.
2. Wire the reed switch to a GPIO with pull-up. The switch half mounts on the fixed door frame, the magnet half on the door leaf, aligned when closed.
3. Test open/close detection reliability, including the gap distance at which it releases — this determines your mounting tolerance.
4. Add debouncing in firmware. Reed switches bounce; an undebounced switch generates phantom door-open events.
5. Add the status LED (power + network state).
6. Connect to WiFi and confirm it reports state changes.

⚠ *Battery backup for door nodes is unconfirmed. A door alarm that dies with facility power is a genuine gap on the main exit door — worth raising explicitly.*

**Exit:** door open/close events reported reliably over WiFi, no phantom triggers over a sustained test.

---

## STAGE 4 — Backend and caregiver dashboard ⚠ **BLOCKED**

**This stage cannot start until the adviser confirms backend hosting: local server (e.g. Raspberry Pi in the facility) vs. cloud-hosted.** That decision changes the architecture, the budget, the demo setup, and what you can claim about the system in the paper. Ask at the next consultation.

Once unblocked, build:

- Data ingestion endpoint receiving zone/battery/heart-rate/alert messages from the wearable and door nodes
- Facility floor plan view with the resident's current zone highlighted
- Safe vs. restricted zones visually distinguished
- Real-time alert panel — SOS, restricted-door-opened, low-battery — each timestamped
- Wearable status: battery %, heart rate, last-updated time
- Alert acknowledge/dismiss control
- Browser-accessible on desktop **and** phone (responsive; not a native app)

Your adviser named the GUI as the second-highest priority after localization. Budget real time for it — it is not a weekend job, and a panel will interrogate it.

---

## STAGE 5 — System integration testing ⛔ **HARD GATE**

**Goal:** the whole system working end-to-end on breadboards before any PCB exists.

This is the last point at which fixing an architectural problem is cheap.

Test, and record results for Chapter 4:

1. **End-to-end latency** — resident changes zone → dashboard updates. Measure in seconds. ⚠ *Maximum acceptable latency unconfirmed.*
2. **SOS path** — button press → alert on dashboard → acknowledge → dismissal via long press.
3. **Door alert path** — door opens → alert appears, timestamped.
4. **Low-battery path** — discharge until the threshold trips → alert appears.
5. **WiFi-down fallback** — disconnect WiFi and observe. ⚠ *Approach proposed (local buzz + distinct LED pattern + queue + retry) but not adviser-confirmed.* Test whatever is approved, and test the reconnection/queue-flush behavior, not just the disconnect.
6. **Battery runtime** — run the wearable from full charge to cutoff, logging duration. This number is required, will be asked about, and is a firmware duty-cycle outcome more than a hardware one. ⚠ *Target runtime unconfirmed.*

**Exit:** every path above works and has a recorded measurement.

---

## STAGE 6 — Schematic and PCB layout

**Only start after Stage 5 passes.** Layout decisions depend on what you learned about beacon placement, component behavior, and power.

**Schematic (KiCad):**

1. Draw in functional blocks: power, MCU, sensors, UI.
2. **IEEE standard symbols only** — hard course requirement, and an easy thing for a panel to mark you down on.
3. Assign footprints verified against the datasheet of the part you *actually bought*, not a generic equivalent.
4. Run Electrical Rules Check. Clear every warning, not just errors.

**Layout:**

5. Define board outline from finalized enclosure dimensions — so the enclosure decision comes first. ⚠ *Wearable form factor (wrist vs. pendant) not yet decided. Wrist is recommended: the MAX30102 needs firm skin contact, which a pendant can't guarantee.*
6. Place components per zone plan; import netlist.
7. **Design single-sided with hand-soldered jumpers**, not double-sided. Aligning two toner transfers by hand is genuinely difficult and a misaligned etch ruins the board. A few jumper wires are far more reliable.
8. Minimize vias — every via is a hand-soldered wire through the board, since you have no plated through-holes.
9. Route power first, then signals, ground pour last.
10. **Antenna keep-out is non-negotiable** — no copper pour, no traces, no components in the ESP32 module's antenna region. Easier to guarantee by hand than in a vendor process; don't skip it because it's DIY. A compromised antenna degrades RSSI, which degrades zone detection, which is the entire project.
11. Route heart-rate sensor traces away from the buzzer driver and any switching components.
12. I2C traces short and routed together.
13. Run Design Rules Check. Resolve every violation.
14. Review in a Gerber viewer even though you're not sending it out — it catches errors the layout view hides.

⚠ **Ask the adviser explicitly:** does the course require a component-level schematic (bare ICs) or does it accept a module-carrier board design (dev board + breakout modules on headers)? Your entire DIY fabrication plan assumes modules on headers. This is a real question with a real consequence, not a formality — raise it before you etch.

⚠ *2-layer acceptable? Adviser review of schematic and layout before fabrication?* Both unconfirmed.

---

## STAGE 7 — DIY PCB fabrication

**Method:** toner transfer + ferric chloride etch. Two boards: wearable, door sensor node. Beacons need no PCB — they stay as bare dev boards plugged into USB power, including at the defense.

1. **Practice first.** Budget 2–3 practice etches on scrap copper clad before your real board. The first one or two will have defects — thin traces breaking, over-etching. That's normal and expected, not a sign you're doing it wrong.
2. Print layout mirrored onto glossy paper with a **laser** printer (inkjet toner won't transfer).
3. Sand the copper clad with 400–600 grit, clean with isopropyl alcohol. Contamination is the most common transfer failure.
4. Heat-transfer the toner (clothes iron or laminator), let cool, soak, peel paper away.
5. Inspect the transfer under good light. Touch up broken traces with a permanent marker before etching — after etching it's too late.
6. Etch in ferric chloride in a **plastic** tray, never metal. Agitate gently. Watch it — over-etching eats thin traces.
7. Rinse thoroughly, remove toner with acetone or IPA.
8. Drill through-holes with 0.8–1.0 mm carbide bits.
9. **Inspect every trace under magnification** before soldering anything. Check continuity with a multimeter on any trace you're unsure about. Finding a break now costs minutes; finding it after populating costs hours.

**Safety:** ferric chloride stains permanently and is corrosive. Gloves, eye protection, ventilation, and a sealed plastic container for storage and disposal. Do not pour it down a drain.

---

## STAGE 8 — Populate and bring-up

**Bring the board up in stages. Do not populate everything and apply power.**

1. **Before populating anything:** check for shorts between power and ground with a multimeter.
2. Populate the power section only. Apply power. **Verify the 3.3 V rail with a meter before any IC is installed.** A wrong rail voltage with ICs fitted destroys them.
3. Populate the MCU. Confirm it programs over the header.
4. Populate peripherals **one at a time**, testing each before adding the next — same discipline as Stage 2, for the same reason.
5. Solder bridges are the top failure mode on a home-etched board with no soldermask. Go slow, use fine solder, inspect every joint under magnification.
6. Validate BLE and WiFi **last**, with the enclosure fitted — enclosure material affects RF performance, so RF testing on a bare board tells you less than you think.

---

## STAGE 9 — Enclosure and final integration

1. Fit both boards into their enclosures.
2. Verify the MAX30102 optical window sits flush against skin in the wearable's final form. This is a mechanical problem that ruins an electrical subsystem if handled late.
3. Verify the USB charging port aligns with its cutout.
4. **Re-run the Stage 1 zone accuracy test with the finished, enclosed wearable.** RF behavior changes with the enclosure and with the board layout — your breadboard accuracy number does not automatically transfer. If accuracy dropped, you need to know now, not at the defense.
5. Mount door nodes at their doors; confirm reed alignment and switch release gap in the real installation.
6. Re-run the full Stage 5 integration test suite on final hardware. These are the numbers that go in the paper.

---

## STAGE 10 — Documentation (runs in parallel from Stage 1 onward)

**Do not leave this to the end.** Chapter 4 requires real measured data from tests you can only run once, on hardware that will be in an enclosure by then.

**IEEE paper — Chapters 1–5 + bibliography + appendices:**

- **Ch. 1** — drafted. ⚠ *§1.7 needs one or two named commercial elderly-monitoring products with real citations.*
- **Ch. 2** — literature review. Needs real, verifiable citations. **Never fabricate a reference or a statistic** — a panel that catches one invented citation will doubt everything else.
- **Ch. 3** — design constraints, **requires a decision matrix**, ideally tied to **SDG 3 (Good Health and Well-Being)**, which is the natural fit for this project.
- **Ch. 4** — per test: title, purpose, assumptions/constants, full procedure, data table, analysis. Fed directly by Stages 1, 5, and 9. This is why you log everything as you go.
- **Ch. 5** — recommendations as *directions for further study*, not excuses for incomplete work. A strong, honest candidate here: migrating the wearable to an **ESP32-C3** for lower power draw and cost.

⚠ *Which specific IEC/IEEE safety standards to cite is unconfirmed. Candidates: IEC 62133 (Li-Po battery safety), IEC 62368-1, IEEE 802.15.1 (Bluetooth), IEEE 802.11 (WiFi).*

**User's manual** — treated as a **critical graded deliverable**, not an afterthought. Written for caregivers, not engineers: how to charge and put on the wearable, what each buzzer pattern and LED state means, how to read the dashboard, how to acknowledge an alert, what to do when WiFi is down.

**Progress reports** — 3 total (weeks 4, 6, 8; each due Monday of the following week). **Adviser signature with date required. PDF only, no links.** 30% of your grade.

**Request for Billing Form** (~week 7) — ⛔ **no form = no defense = automatic grade of 5.** This is the single cheapest catastrophic failure available to you. Handle it early.

---

## STAGE 11 — Defense (Week 9)

- The prototype is 70% of the grade and **must actually work** — not a mockup, not a video, not a simulation.
- Rehearse the live demo end to end, on the real hardware, in advance.
- Charge everything the night before. Bring the charger.
- Bring spare batteries, spare jumpers, and a backup of every firmware binary.
- Have your measured numbers memorized: zone accuracy %, path loss exponent, end-to-end latency, battery runtime. A panel asks for measured values and does not accept "it depends."
- Be ready to defend the DIY fabrication choice, the component substitutions (voltage divider over MAX17048, AMS1117 over MCP1700), and the module-carrier design.
- Know your limitations cold — zone-level not centimeter-level accuracy, requires facility infrastructure, no fall detection. Stating a limitation before a panelist finds it reads as rigor; being caught by it reads as an oversight.

---

## STAGE 12 — Post-defense

- Culminating Design Recommendation Form
- Proof of Submission of Prototype
- Revised IEEE paper incorporating panel feedback

---

## Parallel tracks

These can run concurrently and should, because the serial path is too long otherwise:

| Track | Can run alongside |
|---|---|
| Door sensor node (Stage 3) | Stages 1–2 |
| Backend/dashboard (Stage 4) | Stages 1–3, once unblocked |
| Documentation (Stage 10) | Everything, continuously |
| PCB practice etches (Stage 7 step 1) | Stages 2–5 |

Divide these among the group rather than queueing everyone behind Stage 1.

---

## Critical path warnings

1. **Stage 1 is the gate for everything.** Zone detection failing late invalidates the PCB layout.
2. **The Request for Billing Form is an automatic 5 if missed.** Nothing else on this list can fail that cheaply.
3. **Practice-etch before your real board.** The first attempts will have defects.
4. **The user manual is graded.** It is not an appendix you write the night before.
5. **Data logged during testing cannot be reconstructed later.** Photograph and record as you go, every stage.

---

## Blocked on adviser — bring these to the next consultation

1. Backend hosting: local server or cloud? *(blocks Stage 4 entirely)*
2. Component-level schematic (bare ICs) or module-carrier board acceptable? *(blocks Stage 6)*
3. Number of beacons and door nodes for the defense demo — Phase 1 minimum is 2 beacons + 1 node; full zone map is 6 beacons + 3 nodes *(drives budget and fabrication count)*
4. Acceptable zone misclassification rate, maximum alert latency, minimum battery runtime *(needed so Chapter 4 can demonstrate objectives were met)*
5. WiFi-down fallback approach — confirm or replace the proposal
6. SOS long-press threshold (~3 s proposed)
7. Heart rate: own alert thresholds, or display-only?
8. Battery backup for door nodes?
9. 2-layer acceptable? Will schematic and layout be reviewed before etching?
10. Which specific IEC/IEEE safety standards to cite
11. One or two named commercial products for §1.7 comparison
