---
title: Resume Here
tags: [status, next-steps, sesem]
updated: 2026-09-27
source: TroDes Claude project, status/Resume_Here.md
---

# Resume Here — last updated 2026-09-27

*Mirrored from the TroDes Claude project (`status/Resume_Here.md`) on 24 Sep 2026. Edit there or here, then sync.*

Shortest possible "what do I do next." Read `CLAUDE.md` at the firmware root
for the standing project context.

---

## Latest — 27 September (before buying)

1. **Buy:** [[Shopping List 2026-09-27]] (wearable parts, female headers, UV-etching materials).
2. **Solder the three beacons:** [[Beacon Node Perfboard Build]].
3. **PR3:**
   - `Progress Reports/TroDes_Progress_Report_3.pdf`: fill in the OR number, time and panel;
   - get the adviser's signature;
   - submit **Mon 28 Sep**.
4. **Etch the wearable (Rev C3, UV on FR-2):** [[Wearable PCB UV Etching Plan]].
5. **Print the enclosure:** [[Wearable Enclosure Build]]. If a part's height differs from the table there, send it.
6. **Tests:**
   - field test at the house, Mon 28 – Tue 29;
   - Test 2 Run 2 (single room);
   - runtime;
   - Test 3.
7. **Interrupt-driven I/O:** in PR3 as a feature, but **not coded yet**. Ask for the firmware change when ready.

## Enclosures — resolved 27 September

The measurements came in and the wearable enclosure is modelled; see
[[Wearable Enclosure Build]]. The beacon and door-node boxes will be modelled after their
perfboards are built.

## Pick up here — night of 24 September

1. **Dorm Test 2 Run 2** (single room = the defense setup) — follow
   [[Defense Demo Plan]] §2–3: calibrate the entry threshold, run room mode,
   flash proximity mode, run again, then the walk test.
2. **Battery runtime** — flash `POWER_PROFILE=1`, fill in
   `include/secrets.h`, run the dashboard overnight, then
   `tools/runtime/runtime_report.py`.
3. **Test 3**, perfboard build, user manual, IEEE Ch. 3–4.

Test 2 Run 1 (school) is done — results in `Work Log.md`: zero cross-room
errors; in one room only ~1 m points are reliable; all unknowns at doorways.
Code is committed to GitHub up to `093780e`; raw test captures are backed up
in the repository's `data/` folder.

## Latest — evening of 24 September

| Item | State |
|---|---|
| **Billing form** | **Done** (reported by the team). OR number, time and panel still to be recorded |
| **Wearable devkit** | Original destroyed by the MT3608's factory 17.64 V; replaced with a spare, flashed and verified. **1 spare devkit left** |
| **Firmware** | Three zones, MAX17043 gauge, averaged divider battery reading, SDA IO22 / SCL IO21 — committed to GitHub (`f5b2e92`) and applied to the vault snapshot |
| **Beacons** | All three heard by the new wearable and matched within 4 dB when spaced apart. **Ready for Test 2** |
| **Build** | **Perfboard approved by the adviser (24 Sep) for the final prototype** — no etching. Wearable and door node on perfboard; working by Mon 28 Sep, else breadboard demo |
| **Dashboard** | Run it from the repository (`dashboard/`, three zones). `C:\TroDesData\dashboard` still lists six |

---

## What changed on 24 September

| Item | State |
|---|---|
| **Defense date** | **Friday, 2 October 2026**, per the signed billing form. Time and panel not yet assigned. That is eight days away |
| **Breadboard fallback trigger** | Four days before the defense = **Monday, 28 September**. If the etched board is not working by then, the demo runs on the breadboard (agreed 21 Sept) |
| **Request for Billing Form** | Form FM-EEC-25 (*Design Oral Presentation and Billing Form*) filled in and **signed by the adviser, 24 Sept**. Filed in the vault under `Billing Form/`. Still pending — see below |
| **Code** | Now kept in GitHub `Jeju2004/SESEM` (private), seeded from the 21 Sept vault snapshot (commit `4e8225c`). **Edit the repository**, not `Firmware/trodes_phase1` in the vault. See `guides/Code_Repository.md` |
| **Dashboard code** | Not yet in the repository. It lives at `C:\TroDesData\dashboard` (see `status/Dashboard_Build_Status.md`) — commit it to `dashboard/` |
| **Rev C board firmware** | Rev C swaps the I²C pins. Set `PIN_I2C_SDA 22` and `PIN_I2C_SCL 21` in `wearable/include/config.h` before flashing a board that sits on the Rev C carrier, or neither sensor will be found |
| **Progress Report 2** | PDF dated 21 Sept is in `Progress Reports/`. It predates the Rev B boost topology — confirm whether it was submitted as-is or needs the revision noted below |
| **Third beacon** | **Done.** Progress Report 2 §2.2 records the `dining_hall` beacon commissioned on 21 Sept, frame verified byte-for-byte, −65 dBm median at 1 m. The "flash the third beacon" step below the 21 Sept table is closed |
| **Work log** | Every session is now recorded in `status/Work_Log.md` (vault: `Work Log.md`) |

### Billing form — what is still missing

- Presentation **time**
- **Panel members** (three) and their signatures
- **Payment** — ₱8,000 total (adviser ₱3,000, panel 3 × ₱1,500, miscellaneous
  ₱500) — and the **Official Receipt number**
- Approval of the **course instructor** (Engr. Mary Ann V. Latina) and the
  **program chair** (Engr. Flordeliza L. Valiente)
- **Check the presentation type.** The form ticks *Proposal*, not *Final*.
  Confirm with the adviser that this is the correct box for this defense

**No completed billing form = no defense = automatic grade of 5.**

---

## What changed on 23 September

| Item | State |
|---|---|
| Power topology | **Changed to boost (Rev B).** No usable low-dropout LDO was sourceable in time. See `Final_Hardware_Plan_RevB.md` |
| Wearable schematic | **Rev B issued** — boost chain, buzzer and D1 on +5 V, MAX17043 drawn as optional |
| PCB layout | **Rev C** — 69 × 66 mm, zero wire links, TP4056 and MT3608 off-board. See `guides/PCB_Layout_Notes_RevC.md` |
| Component shopping | Done except **MT3608 boost modules ×3 @ ₱39** — the only blocking purchase |
| MAX17043 fuel gauge | Ordered, arrives 28 Sept – 2 Oct. **Do not plan around it.** R3/R4 divider on GPIO 34 is the battery source |
| Runtime target | **At risk.** Rev B gives ≈10 h as firmware stands, ≈16 h after duty-cycle work, against a 24 h approved target |
| Progress Report 2 | Drafted; **needs updating** for the boost topology and the revised runtime figure |
| Test 1 | Clean redo done — negative result, standing-wave fading identified |
| Test 2 | Prediction filed (85 % expected). **Field run not yet done** |

---

## What changed on 21 September

| Item | State |
|---|---|
| Progress Report 1 | **Signed.** Deadline was extended, so submission is not urgent |
| Adviser consultation | **Held. All four blocking decisions settled** — see `Decisions Log.md` |
| Breadboard fallback | **Agreed** with the adviser |
| ESP32 devkits | **In hand** — two spare boards |
| Third beacon | `zone_config.h` set to `dining_hall` / id 2, **not yet flashed** |

---

## Settled

- **PCB:** self-fabricated, hand-etched, single-sided, designed as a
  **module carrier** (modules on headers, not bare ICs). Rev C needs no wire
  links
- **Three zones:** `bedroom_wing`, `dining_hall` (safe), `medicine_room`
  (restricted)
- **Door node MCU: ESP32** (the old BOM said ESP8266)
- **Battery runtime target: 24 hours** — see the risk above
- **Power: cell → TP4056 → SW1 → MT3608 boost 5 V → devkit VIN → AMS1117 → 3V3**
- **Contingency:** if the etched board is not working four days before the
  defense (**Mon 28 Sept**), demo on the breadboard with the board shown as
  under-debug
- **Defense: Friday 2 October 2026**

---

## Do these next, in order

1. ~~Finish the billing form~~ — **done 24 Sep.** Record the OR number,
   presentation time and panel in `Deliverables Tracker.md`.

2. ~~Buy MT3608 boost modules~~ — **in hand; the fitted one is set to
   5.03 V.** Its factory 17.64 V destroyed one devkit on 24 Sep (see
   `Work Log.md`). Measure every MT3608 at 5.0 V before an ESP32 goes on it.

3. **Test 2 — three zones.** `Test2_Test3_Field_Protocol.md`. This is the
   confusion matrix, the headline result of the project. Compare against the
   85 % figure in `Test2_Prediction.md`. Include far-corner and near-boundary
   sample points or the number is meaningless. All three beacons are
   commissioned and matched at P9.

4. **Test 3** — boundary latency and hysteresis.

5. **Firmware (in the repository):** swap the I²C pins for Rev C
   (`PIN_I2C_SDA 22`, `PIN_I2C_SCL 21`); average 8–16 ADC samples per battery
   read; replace the linear voltage→percentage map with a piecewise table. The
   divider is now the primary battery source, not a fallback.

6. **Duty-cycle work** — longer BLE scan and WiFi report intervals, WiFi off
   between reports. Target 35 mA average at 3.3 V, then **measure** the
   runtime; do not calculate it and call it measured.

7. **Etch the Rev C board.** Fill the ground zone and run KiCad's DRC first.
   M2 is off-board; keep it away from the ESP32 antenna end. Antenna keep-out
   is non-negotiable. It must be working by **Mon 28 Sept** or the breadboard
   fallback applies.

8. **Update Progress Report 2** for the boost topology and the runtime figure,
   if it has not already gone in.

9. **Point the wearable at the dashboard** — set `WIFI_SSID`, `WIFI_PASSWORD`
   and `BACKEND_BASE_URL` in `wearable/include/config.h`. Commit the dashboard
   code from `C:\TroDesData\dashboard` to the repository while you are there.

---

## Still open with the adviser

Heart-rate alert thresholds (currently display-only), exact SOS long-press
threshold (~3 s proposed), wearable WiFi-down fallback behaviour, battery
backup for door nodes, beacon power source, which IEC/IEEE standards to cite,
a schematic and layout review date, and the presentation time and panel.

**Also:** sign-off on the ~16 h realistic runtime against the 24 h target. The
cause is a sourcing constraint, not a design oversight, and it belongs in
Chapter 5 as a recommendation rather than an excuse.

---

## Traps

- **Set the MT3608 to 5.0 V before connecting the devkit.** It ships wound high.
- **U3 CELL → raw VBAT, never a regulated rail.** On Rev C this is a hand wire
  to `M1` pin 3 — only if the gauge is fitted.
- **Rev C swaps SDA and SCL.** Old firmware on a Rev C board finds no sensors.
- `zone_config.h` is a **per-flash file**, currently on `dining_hall`. Two
  beacons sharing a zone id look like RSSI noise, not a config error.
- **All beacons at `ESP_PWR_LVL_P9`.** Mismatched power destroys Test 2.
- **One board plugged in at a time.** CH340 chips have no unique serial.
- `RSSI_FLOOR_DBM` is a classification threshold, not a hardware clip — the
  radio reports below it. Do not drop sub-threshold samples when fitting.
- GPIO 2 is a strapping pin; GPIO 6–11 are the SPI flash; GPIO 34 is
  input-only with no pull-up.
- `[HR] MAX30102 NOT found` and the 0 % battery alerts are **correct
  behaviour** until the sensors and cell are wired.
- **Edit code in the repository**, not in the vault's `Firmware/trodes_phase1`
  snapshot.

---

## Not started

Door-node PCB layout, etching either board, user manual, battery runtime
measurement, Test 2 and Test 3 field data, Chapter 2 literature review,
Chapter 3 decision matrix.

## Related

[[00 Start Here]] · [[Work Log]] · [[Deliverables Tracker]] · [[Decisions Log]] · [[Open Questions]] · [[Current Design/Final Hardware Plan Rev B]] · [[Current Design/PCB Layout Notes Rev C]] · [[Dashboard Build Status]] · [[Code Repository]]
