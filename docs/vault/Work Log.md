---
title: Work Log
tags: [log, sesem]
---

# Work Log

Running, dated record of every work session — what was done, what was decided,
what changed, and what is next. Newest first. Code changes are also recorded in
the repository's `CHANGELOG.md` — see [[Code Repository]].

## 2026-09-30

### Everything committed to the repository (about 19:55, on the team's request)

- **Branch `build-2026-09-30`** in `Jeju2004/SESEM`. There are 4 commits on top of `main` (`aaa0826`); **not pushed and not merged into `main`**.
  - `f592d72`: firmware, covering hub mode, the wearable SOS patterns and hub support, and the self-test.
  - `050e653`: the dashboard v2 page, passcode sessions and duplicate-SOS guard, plus the cloud relay.
  - `f32561a`: hardware:
    - `hardware/wearable_pcb_revC3/`: the etched board, from the saved project. The 28 Sep autosave is left out because it differs and was never saved.
    - `hardware/beacon_node/`.
    - `hardware/enclosures/`: Rev A, Rev B and the node boxes.
    - `.gitignore` now lets those renders through.
  - `51e4b39`: deliverables, generators, docs, data and the CHANGELOG entry:
    - drafts: paper Rev 4, manual v0.2, deck v0.2;
    - the final PR3;
    - the hub note and Test Day note in `docs/project/`;
    - the walk and door-bench logs in `data/`.
- **Left out on purpose:**
  - **Contain the hub's Wi-Fi password:** the panel QR card images, and **IEEE paper Rev 5** (Appendix H shows the card). **Committed as-is afterwards at the team's request** (`2029761`; CHANGELOG corrected in `7bc8fc8`).
  - **Scratch or superseded:** Rev C1, the zip bundles, the `_*.py` KiCad helper scripts and the Word lock file.
- **Passcode removed from committed files:**
  - `secrets.h.example` now shows a placeholder (`000000`);
  - the repo copy of the Test Day note no longer states it.
  - The vault note is unchanged.

### Wearable enclosure Rev B (finished 19:10); build is about 90 % done

- **Team report:**
  - the lid sits **5 mm above the latch**, because the power-module wiring lifted the PCB;
  - a latch sketch was provided (a hook on the lid clicks into a gap in the wall);
  - they asked for:
    - the ESP32 USB-C opening raised;
    - the TP4056 charging light made visible;
    - sharp corners rounded (elderly wearers);
    - the heart-rate, SOS and LED D2 hole spacing unchanged;
    - the switch not moved;
    - the belt module to **slide into the body** like an electric fan's control module.
- **Rev B model:** `trodes_wearable_enclosure_revB.py` (Blender, parametric; Rev A kept).
  - **+5 mm** (`WIRE_RISE`): PCB posts 7.5 mm; the shelf is open over the TP4056 and MT3608 so the wiring can rise instead of lifting the shelf.
  - **Four snap hooks** on the lid into side-wall windows (the sketch). About 1.4 % strain; release with toothpicks.
  - **ESP32 USB-C** opening raised with the PCB, 15 × 11 mm.
  - **Charge-light window** in the left wall above the charging port. It looks straight onto the TP4056.
  - **Rounded corners and edges:** R4 corners, a rounded lid edge that still prints without support, chamfered SOS and LED holes, and an R2 finger window.
  - The hole positions and the switch are **unchanged**.
  - **Sliding belt clip:** 60° dovetail rail on the back, a 45° top stop and a snap detent. No screws.
- **Checked by the script:**
  - all 5 parts are closed and manifold;
  - **31 part and component pairs: 0 mm³ overlap**. The collision check was proven on a known 100 mm³ overlap.
  - One solver defect was found and fixed: a zero-thickness double face on the clip.
- **Size:** 74 × 74 × **45.8 mm** (was 37.8): +5 for the wiring, +3 for the rail.
- **Reprint:** base, lid, shelf and clip. The old plunger fits.
  - The plate file is `TroDes_Wearable_RevB_A1_plate.3mf`; it takes about 6–7 h.
  - Print the clip with an 8–10 mm brim.
- **Where:**
  - `Desktop\TroDes Deliverables\Enclosures\`: script, `out_revB\`, plate, `make_plate_revB.py`;
  - [[Wearable Enclosure Build]], rewritten for Rev B;
  - the STLs, 3MF, script and renders are in both vaults' attachments.
- **Not committed.**

### IEEE-format full paper, Revision 5 (finished 15:26); to be finalized after the test data

- **Team request:** the full paper in **IEEE format**, Chapters 1–5 with the complete methodology (Methods of Research), data and results, conclusion, recommendations and appendices, with tables, figures, equations and graphs.
- **`TroDes_IEEE_Paper_DRAFT_Rev5`** (18 pages; Revision 4 kept as the single-column version). IEEE rules applied:
  - two columns, 10-pt Times New Roman, 24-pt title, centred byline, **drop cap** on the introduction;
  - **abstract 206 words** plus one pending results sentence (at most 40 words, so it stays within 250), no abbreviations or citations; Index Terms;
  - tables numbered **TABLE I–XXIV** with the caption above, figures **Fig. 1–14** with the caption below, equations **(1)–(19)** at the right margin; the generator refuses to build if any number is out of order;
  - references [1]–[13] in order of first citation; last page's columns balanced; tables no longer split across columns.
- **Methods of Research content (Chapter 3):** 3.1 research design (developmental with experimental evaluation), 3.2 instruments (Table I), 3.3 data-gathering procedure, **3.4 statistical treatment** with equations: path-loss model, smoothing, accuracy, precision, recall, F1, mean, standard deviation, standard error, MAE, bias, detection rate. Component computations with equations: cell current and runtime, battery divider, buzzer base current, LED current, I²C rise time, heart rate from the median beat interval.
- **Data now in Chapter 4:**
  - Test 1 and the path-loss fit;
  - beacon matching;
  - Run 1 (confusion matrix, per-zone and per-point tables);
  - **the 30 Sep three-beacon walk** (table of the 11 zone changes, and a new timeline graph);
  - hub verification;
  - **the wearable self-test** (Table XXI);
  - **the power-path measurements** (Table XXII and a bar graph);
  - the 29 Sep door latency.
  - Run 3, SOS latency, heart rate vs the oximeter, 20 door cycles and Wi-Fi loss keep **yellow placeholders**.
- **Appendices A–J:**
  - A: bill of materials (only the known prices are filled in: MAX17043 ₱252, MT3608 ₱39, buzzers ₱99);
  - B: the Rev C3 schematic (rotated to fill the page);
  - C: the copper;
  - D: door-node wiring and the beacon perfboard;
  - E: the enclosures;
  - F: firmware excerpts (zone rule, SOS patterns);
  - G: test data;
  - H: the manual and the panel QR card;
  - I and J: placeholders for photographs and signed forms.
- **New tools:**
  - `tools/deliverables/paper_ieee.js`;
  - `make_figures.py` (power-path graph, walk timeline, KiCad exports);
  - `make_appendix_images.py` (schematic rotation, board crop, single QR card).
  - The drop cap and PDF export are done in Word.
- **Note:** the panel QR card in Appendix H shows the hub's Wi-Fi password. Remove it or change the password if the paper is ever published outside the school.
- **Where:**
  - `deliverables/drafts/`;
  - `Desktop\TroDes Deliverables\`;
  - both vaults' attachments.
- **Not committed.**

### Wearable does not run on its battery: power path measured, hardware self-test (earlier today)

- **Symptom:** the wearable works on USB but not on the Li-Po.
  - The MT3608 gives 5.01–5.08 V unloaded but drops to about 3.2 V (fluctuating 3.18–3.33 V) once the wearable is connected. A new MT3608 does the same (3.19 V). With the switch off, its output reads 0.25 V.
- **Measured under load** (multimeter, switch on): battery 3.83 V → TP4056 B+ 3.76 → TP4056 OUT+ 3.76 → **MT3608 VIN 3.42** → MT3608 VOUT 3.25 (should be 5.0). No module heats up.
- **Design check:** a scratch copy of Rev C3 passes DRC (0 unconnected pads) and ERC (0 errors); the power nets are as intended and all power traces are 0.8 mm.
  - Pad map: `Desktop\TroDes Deliverables\RevC3_power_pads.png`.
- **Hardware self-test** (`firmware/wearable_selftest`, flashed on COM8):
  - MAX30102 found (part ID 0x15);
  - fuel-gauge bus empty (not fitted);
  - button, buzzer and LED OK;
  - Wi-Fi 11 networks (strongest −21 dBm); BLE 65 advertisers;
  - **battery sense 0.28 V**, i.e. no battery voltage on the sense line. This is only meaningful if the battery was connected at the time; 0.28 V is also what the divider reads with no cell (29 Sep).
- **Diagnosis:** 0.34 V is lost between the TP4056 output and the MT3608 input, so the fault is in a joint, a wire or the switch contact. The most likely spots are the J1 pad 1 joint and SW1. Under the boost converter's current pulses the loss grows until the converter cannot start.
- **Next:**
  - bridge the switch (pad 3 to pad 4 in the pad map);
  - re-solder J1 pad 1;
  - measure again;
  - **do not turn the MT3608 trimmer up under load**.
- **The wearable still has the self-test firmware.** Restore production firmware with `pio run -t upload --upload-port COM8` in `firmware/wearable`.
- **Open:** charging-LED behaviour (module LEDs only, a firmware voltage heuristic, or a hardware change), awaiting the team's choice.

### Final deliverables drafted (about 01:40–02:05); to be finalized after the test day

- **Team direction:** draft the final deliverables now and finalize them after today's tests. The defense-briefing notes (26 Sep) were used as the checklist: the deck and paper must cover **constraints, standards, design and what we let go**; 10 minutes maximum; emphasis on the demo; a backup video.
- **IEEE paper, Revision 4** (`TroDes_IEEE_Paper_DRAFT_Rev4`, 25 pages). Changes:
  - **Front matter:** new abstract; the hub added to 1.4 and 1.6.
  - **New Fig. 3.1:** (a) the stand-alone hub, as demonstrated, and (b) the facility network, with the cloud relay dashed as further study.
  - **Chapter 3:**
    - current firmware constants and the heart-rate algorithm;
    - the SOS patterns and the acknowledgement loop;
    - the hub's design;
    - **RA 10173 (Data Privacy Act)** added to the standards;
    - updated constraints table;
    - **new 3.10 Descoped Features** (the "what we let go" table).
  - **Chapter 4:** Run 1 kept and labelled "earlier firmware"; new sections 4.4–4.9 for today's tests, with yellow placeholders only where numbers go; hub verification (Table 4.14, measured); the stall and duplicate-SOS findings; "tests not performed" (battery).
  - **Chapter 5:** conclusions with placeholders; recommendations updated.
  - **Generator fixes:** snake_case zone names no longer turn italic; headings and figures stay with the text that follows.
- **User's Manual, draft v0.2** (20 pages):
  - the door node as the hub, and joining by QR (5.3), with the computer as the alternative (5.4);
  - the button patterns and new tones table, and the LED behaviour;
  - reading the new dashboard, with a real phone screenshot (test data);
  - network loss including hub restarts, and phone troubleshooting;
  - updated specifications and glossary.
- **Defense deck, draft v0.2:** 14 slides plus 2 backups for the 10-minute slot.
  - **New slides:** architecture (hub), "How it decides — and how it calls for help", **Applicable standards**, **What we let go**, and **Results on the final firmware** (yellow cards for today's numbers).
  - The date is now 1 October; Run 1 and the engineering findings moved to the backups.
- **New figures** in `tools/deliverables/figures/`: `f1_arch_v2.png` (from `f1_arch_v2.html`) and `f4_dashboard_phone.png`, a 390 px phone capture from a scratch server with test data.
- **Dashboard CSS:** a "reduce motion" setting on the phone now turns off the animations. This is for accessibility, and it also gives still screenshots.
- **Test-day sheet:** gained the backup-video step and the **defense-day checklist** (printing, forms, cards, attire, holding room N205B).
- **Where:**
  - `deliverables/drafts/` in the repository;
  - `Desktop\TroDes Deliverables\`;
  - both vaults' attachments.
- **Not committed.**

### Defense moved to Thursday 1 October; test day prepared (about 01:20–01:40)

- **The team reports the defense is now Thursday 1 October** (was Friday 2 October). 30 September is the test day at school; **features are frozen**.
- **Data check against the Chapter 4 test plan.** Missing or not representative:
  - **room accuracy:** Run 1 (56.2 %) used the older proximity firmware; Run 2 stopped after 53 lines;
  - **stability**, **SOS latency and dismiss**, **heart rate vs a reference**, a clean **door-reliability** count, and **Wi-Fi loss**.
  - **Battery runtime cannot be measured:** no Li-Po, no fuel gauge. It is reported as a limitation.
  - **Test 1 fit:** re-run on the 21 Sep capture gives n = 0.55, R² = 0.30. It is reported honestly as evidence that distance is unreliable indoors, which justifies the strongest-beacon rule.
- **Test-day sheet:** [[Test Day 2026-09-30]] (PDF in Attachments and on the Desktop). It covers:
  - A: Test 2 Run 3 + Test 3 at the same 15 points as Run 1;
  - B: SOS (10 single presses, the patterns, escalation, 5 dismisses, 3 Wi-Fi-loss trials);
  - C: 10 heart-rate readings against the team's pulse oximeter;
  - D: 20 door cycles;
  - E: a timed demo rehearsal with a fallback drill.
- **Wearable, flashed:** it now logs `[DELIVERED] <type> <N> ms after it was raised`. Alert latency is timed on the wearable's own clock and works the same with the hub or the laptop.
- **New tool:** `tools/field/test_day_report.py` (`sos`, `hr`, `doors`), checked on synthetic captures.
- **To check at school:** the laptop's MAPUA address. The wearable's laptop-mode fallback is fixed to 10.2.46.66.
- **Not committed.**

### Informal three-beacon walk (00:22–00:37): all three beacons heard for the first time

- **Setup:**
  - all three beacons powered (B1 bedroom_wing, B2 dining_hall, B3 medicine_room);
  - the wearable reported to the SESEMSG hub;
  - the team walked between the beacons.
  - The wearable's serial log was captured to `C:\TroDesData\2026-09-30_beacon_walk_serial.txt`.
- **Heard:** B1 −53 to −84 dBm, B2 −56 to −93 dBm, B3 −51 to −82 dBm.
- **10 room changes in three walks.** Each entry into the medicine room raised "Entered restricted zone" (3 of them).

| Time | Wearable decided | Strongest reading |
|---|---|---|
| 00:25:13 | Medicine Room (restricted) | −51.3 dBm |
| 00:25:25 | Dining Hall | −71.8 dBm |
| 00:25:26 | Bedroom Wing | −66.3 dBm |
| 00:27:21 | Medicine Room (restricted) | −56.1 dBm |
| 00:27:37 | Bedroom Wing | −64.8 dBm |
| 00:27:45 | Dining Hall | −59.4 dBm |
| 00:27:59 | Bedroom Wing | −63.2 dBm |
| 00:32:35 | Medicine Room (restricted) | −56.3 dBm |
| 00:32:41 | Bedroom Wing | −75.0 dBm |
| 00:33:06 | Dining Hall | −56.9 dBm |
| 00:33:24 | Bedroom Wing | −53.8 dBm |

- **Limits:** this is an **informal walk, not a Test 2 run**.
  - The true position at each moment was not recorded, so accuracy cannot be scored from it.
  - The distances printed in the log come from the uncalibrated path-loss model and are not measurements.
  - The Dining Hall → Bedroom Wing switch within 1 s (00:25:25–26) is either walking through, or a flicker. The team should say which.

### Hub on the bench: the wearable joins it; team phone test; stall and duplicate-SOS bugs fixed

- **Wearable on the hub (29 Sep, 23:10):**
  - The wearable joined SESEMSG and stayed on it for 10 min with **no drops**, at −34 to −52 dBm.
  - The earlier drop-offs are consistent with the two boards being centimetres apart on adjacent USB ports. That is plausible, not proven.
- **Laptop on SESEMSG** (temporary Wi-Fi profile, with the team's approval; deleted afterwards):
  - **17/17 checks** over the hub's own network;
  - 4 simulated phones: median reply 32 ms.
- **Team phone test:**
  - the dashboard **opened by itself** after joining;
  - the heart-rate tile showed a number;
  - no freeze.
  - **Problems:**
    - Android updated more slowly than the iPhone;
    - on the iPhone the keyboard kept coming back after typing the name;
    - a second SOS press made **no new alert**, and whether Acknowledge cleared the wearable is unclear.
- **Found and fixed:**
  - **Hub stall under phone load.** From 00:30 the wearable's reports timed out (> 4 s). The hub wrote each reply in one blocking call, and one slow phone (Wi-Fi power save, a 10 KB summary through a 5.7 KB send buffer) held up everyone.
    - Replies are now sent **non-blocking**, piece by piece.
    - Phones polling in the same moment share **one summary**.
    - Up to 10 connections.
  - **Duplicate SOS.** A report re-sent after a timeout became a second SOS; one Acknowledge then left the other open, so the wearable stayed in SOS mode and ignored presses.
    - The hub and the laptop server now treat a repeat as the same event (same device, type, uptime and detail within 30 s).
    - Server self-test still **38/38**; the duplicate check passes.
  - **iPhone name box:** it lets go on Done, on a tap elsewhere, and on scrolling.
  - **Wearable Wi-Fi:** after the hub restarted, the wearable kept retrying MAPUA Wi-Fi (not in range) and never saw the hub again.
    - It now does its own reconnection every 10 s (was 20 s), choosing the network each time.
    - It rejoined the hub 5 s after boot.
- **Laptop server** restarted with the duplicate guard.

### SOS button patterns and a phone alarm (team request)

| Button | Message to the caregivers |
|---|---|
| 1 press | SOS: Needs assistance |
| 2 quick presses | SOS: URGENT - please come now |
| 3 quick presses | SOS: EMERGENCY - immediate help needed |
| Hold 3 s | Dismiss (unchanged) |

- **Timing:** each press beeps at once. The alert goes out 0.7 s after the last press, with 1–3 confirmation beeps.
- **Escalation:** a stronger pattern while an SOS is open escalates it. The weaker alert is retired ("replaced by a more urgent SOS"), so one Acknowledge still clears the wearable.
- **Dashboard:** every open dashboard shows the message as the headline, **sounds an alarm**, vibrates (Android) and flashes the tab title until Acknowledge.
  - The first tap on the page arms the sound (the passcode keypad counts).
  - It uses an audio element, so it plays on an iPhone set to silent.
- **Tested on a scratch server:** 1 press then 3 presses gives one open alert with the EMERGENCY headline; the alarm sounds; one Acknowledge stops it, and the wearable's next status reply gets `sos_open = 0`.
- **Flashed** to the hub and the wearable at 01:05; **not yet tried with real presses**.
- **Open:**
  - the wording is proposed, and must be confirmed with the adviser (`SOS_MSG_1..3` in the wearable's `config.h`);
  - notifications while the page is closed need a push service (e.g. the free ntfy app). That touches the "no native mobile app" rule, so it is **waiting for the team's decision**.

### Remote viewing from any network: SESEMSG cloud relay (built, not yet live)

- **Team request:** watch the monitoring from another network or on mobile data.
- **What was built:** `relay/`, a Cloudflare Worker.
  - The hub pushes its summary there every 3 s whenever it has internet (MAPUA, the ZTE pocket router, or a phone hotspot: up to three uplink networks in `secrets.h`).
  - Caregivers open a fixed `https://…workers.dev` address with the same page and passcode.
  - **Acknowledge works remotely**, and the relay's reply also sets the hub's clock.
- **Tested locally (wrangler dev): 15/15 checks.**
  - It pushed a real 23 KB summary from the laptop database.
  - Also checked: the passcode and lockout, the remote Acknowledge round trip, and a "Hub not reporting to the relay" warning while the last data is kept.
  - The hub code for it builds.
- **Needs from the team:**
  - a free Cloudflare account, then `wrangler login`;
  - the ZTE router's password in the door node's `secrets.h` (`WIFI2_SSID` / `WIFI2_PASSWORD`).
- **Open with the adviser:** local vs cloud hosting. The relay is optional; with `RELAY_URL` empty, nothing leaves the building.

### State at 01:20

- Door node: **standalone hub build** (no uplink).
- Wearable: prefers the hub, with the button patterns.
- Laptop server: running with the duplicate guard.
- **Not committed.**

## 2026-09-29

### Night: SESEMSG hub (runs with no laptop) built; wearable cannot join it yet

- **Team question:** can the panel use the app with no laptop, just a QR code? Yes: the **door node runs everything**. Details in [[SESEMSG Hub (No Laptop)]].
- **What it provides:**
  - its own Wi-Fi network "SESEMSG" and a captive portal (the dashboard pops up on joining);
  - the same v2 page, packed into the firmware;
  - the laptop server's API in RAM, including the passcode, alerts, Acknowledge, "not reporting" and `sos_open`;
  - optional forwarding to the laptop over MAPUA.
- **Tested from the laptop: 17/17 checks pass.**
  - Page load 0.1 s; 4 phones polling each second: median reply 39 ms.
  - The phones' captive-portal checks redirect correctly.
- **Wearable → hub fails on the bench.** It joins, gets 192.168.4.2, and is dropped within 0.3 s.
  - **Not the cause:** the password, the uplink channel, or BLE load (each tested).
  - **Suspect:** both boards were in **adjacent USB ports** (receiver overload at centimetre range).
  - **Next test:** boards at least 1 m apart. Signal logging has been added to the hub.
  - Test builds were flashed on the wearable board during this; its **real firmware was put back**.
- **State left:**
  - **Wearable:** hub preference **off**, so it runs on MAPUA + laptop as before. Two fixes rode along:
    - it now connects **at boot** (it used to wait 20 s);
    - it re-chooses the network after 4 failed reports, and "up" now needs a real IP address.
  - **Door node:** running the **standalone hub build**. The laptop dashboard will show the door **Offline** until it is reflashed.
  - **Laptop Wi-Fi was disconnected**, and both boards were unplugged, at 22:36.
- **Panel QR card made:** `SESEMSG_Panel_QR_Card.pdf` (A4, two A5 cards). It has the Wi-Fi QR, the dashboard QR and the passcode; both codes were verified by decoding.
- **Not committed.**

### Dashboard: light/dark now follows the phone's setting

- **Team report:** dark and light mode did not follow the device.
- **Cause:** after anyone pressed the theme button once, the choice was saved for good (`trodes.theme`) and the phone's setting was ignored.
- **Now:**
  - the page follows the phone's setting **live**, with no reload;
  - the button is a temporary override, and a phone setting change ends it;
  - the old saved choice is removed on the first load.
- Checked in the browser: dark → light → dark live, the override, and the old key cleared.

### Evening: wearable fixes flashed (heart rate, rooms, SOS button/LED, battery); door and page faster

- **Wearable flashed** on COM8. It rejoined MAPUA and reports every 5 s.
- **Button "not registering" and LED "not fixed" had one cause.** After a caregiver pressed Acknowledge, the wearable stayed in SOS mode: the LED stayed lit and later presses were ignored.
  - The server's status reply now carries `sos_open`.
  - When it reaches 0, the wearable leaves SOS mode: an "acknowledged" tone, the LED back to its heartbeat blink, and the next press raises a **new** alert.
- **Rooms:**
  - scan tick 300 → 200 ms; a beacon counts as gone after 2.5 s (was 4 s);
  - **adaptive confirmation:** 0.4 s when the new room is ≥ 10 dB stronger, 1.6 s when it leads by only 5–10 dB. This stops the flicker between two similar beacons (bodies near the wearable change the signal), while clear moves stay fast.
- **Heart rate rewrite:**
  - reads every sample the sensor buffers (none skipped);
  - finger detection and a 1.5 s settle time;
  - beat intervals limited to 40–180 bpm, and outliers over ±25 % from the median are rejected;
  - **BPM from the median of the last 8 beats**, shown after 4.
- **Battery:** below 2.5 V (power bank, no Li-Po) it reports "no battery" (dash), not 0 % with false alerts. With no finger, the heart rate shows a dash, not 0.
- **Door node:** Wi-Fi sleep off (mains powered), so events leave at once. Flashed on COM13.
- **Dashboard pages** refresh every 1 s (was 2 s).
- **Answered:**
  - the wearable output is **not cloud-based**: the ESP32s use BLE (beacons → wearable) and Wi-Fi to the laptop on the same network;
  - it works with no internet.
- **Not committed.**

### New design is the default page; no-battery / 0 bpm fix (built, not yet flashed)

- **Team saw the old classic page** at `http://10.2.46.66:8000/` and asked why the design changed. The new "home" design was only at `/static/v2/index.html`. At the team's request it is now the default:
  - `/` serves `static/v2/index.html` (open; it holds the lock screen, no data);
  - the classic page moved to **`/classic`** (passcode required);
  - after a 401 the classic page goes to `/`, the lock screen's "Classic view" link points to `/classic`, and the lock-screen title is now **SESEMSG** (team request).
  - Verified on scratch servers: self-test 38/38 with the passcode off; with it on, `/` 200, `/classic` → 303 to `/`, summary 401, then 200 after login.
  - Live server restarted with the change; the wearable resumed posting at once.
- **Wearable firmware fix** (team: "no battery, powered by a power bank"):
  - below `BATTERY_ABSENT_V` = 2.5 V the wearable reports battery **−1** ("no battery": the dashboard shows a dash, no battery alerts) instead of 0 % with false low/critical alerts;
  - `hr_bpm` is sent as **−1 when the BPM is 0** (no finger), so the dashboard shows a dash, not "0 bpm".
  - **Built OK; not flashed yet**: the wearable is on the power bank and has to be plugged into the laptop (COM8).
- **Not committed.**

### Door node integrated and tested with the live dashboard

- **Setup:**
  - door node (door-11, medicine_room, reed on IO18) on **COM13**;
  - new git-ignored `firmware/door_sensor/include/secrets.h` (MAPUA Wi-Fi, open; backend http://10.2.46.66:8000);
  - flashed with an explicit `--upload-port COM13`. `platformio.ini` still names COM8, which is the **wearable**; always pass the port.
- **Online:** joined Wi-Fi as 10.2.10.130; boot, state and heartbeat POSTs return 200.
- **Open/close test (18:57–18:58), team moving the magnet:**
  - 3 open/close cycles, each one on the dashboard;
  - delivery from event to server **0.09–0.96 s**;
  - the dashboard door card followed within about 0.5 s;
  - every "Restricted door opened" alert was acknowledged from a phone by **"isha"**, 4–18 s after the event.
- **Also:** 18:24 wearable firmware flashed with Wi-Fi (see the entry above). Before the door test, a check reset the wearable once, which caused one extra restricted-zone alert and a "Device not reporting" gap; its reads no longer reset it.
- **Not committed.**

### Real wearable integrated with the dashboard (simulation stopped)

- **Simulation stopped.** The live dashboard runs from the repository with a fresh real database, `dashboard/data/trodes_live_2026-09-29.db` (git-ignored).
  - It listens on the network (0.0.0.0:8000); viewer passcode 123456.
  - Windows Firewall already allowed Python 3.12 inbound on the Public profile, so no settings were changed.
- **Network:** MAPUA Wi-Fi is **open** (no password), and it lets the ESP32 reach the laptop directly (no client isolation seen). Laptop 10.2.46.66, wearable 10.2.39.19.
- **Wearable:**
  - on COM8 (CP210x);
  - new git-ignored `firmware/wearable/include/secrets.h` (SSID "MAPUA Wi-Fi", no password, backend http://10.2.46.66:8000);
  - built and flashed (hash verified). Two uploads failed at first because COM8 kept dropping out briefly, which points to a loose USB cable or port.
  - The flashed code is the working copy, which already had today's **uncommitted** edits (by someone else, 18:21): SOS raised **on press**, hold 3 s dismisses, and an LED heartbeat blink. The board was already running that version.
- **Result:**
  - Wi-Fi connected, and the queued restricted-zone alert was delivered;
  - status POSTs every 5 s return 200;
  - the dashboard shows Resident A in **Medicine Room (restricted)**, RSSI −81, with the "Entered restricted zone" alert.
- **Beacons heard:** only **B3 medicine_room** (−77 to −86 dBm). B1 bedroom_wing and B2 dining_hall were not heard (not powered, or out of range).
- **Found:**
  - **Battery:** on USB without a Li-Po, the divider reads ~0.28 V, so the dashboard shows 0 % and raises a false "Battery critically low" alert.
  - **Heart rate:** with no finger on the sensor the wearable sends `hr_bpm = 0` (not −1), so the dashboard shows "0 bpm", which reads as a flatline.
  - Both need a small fix (firmware or dashboard); offered to the team, **not done yet**.
- **Door node:** not connected (no secrets.h, not plugged in); the dashboard correctly shows it Offline.
- **Not committed.**

## 2026-09-28

### 3D prints: ESP32 height and fit allowances checked and fixed; Bambu Studio plate files

- **Team question:** "did you consider the height for the ESP32 and some allowance?" An audit found two problems, now fixed.
  - **Beacon and door-node boxes had no room for an ESP32 heatsink:** a 5 mm heatsink would have hit the lid (-0.3 mm).
    - Fix: lid raised 2.1 mm (box now 55 × 75 × 26 mm).
    - Allowance now 1.8 mm with a heatsink, 7.3 mm without.
    - Beacon LED base now about 8 mm above the board.
  - **ESP32 USB-C openings were tight:** only 0.33 mm each side, and on the wearable the plug must pass ~7 mm through the wall.
    - Fix: openings enlarged to **15 × 9 mm** on the wearable ESP32 and on all node boxes, giving 1.3 mm spare.
- **PETG fit allowances:**
  - lid lip gap 0.2 → **0.3 mm** per side, snap bump 0.5 → **0.7 mm** (wearable and nodes);
  - wearable shelf gap 0.2 → **0.4 mm**.
- **Already fine:** wearable ESP32 + 5 mm heatsink → lid 1.8 mm; SW2 and caps 6.5 mm; fuel gauge 4.4 mm; MAX30102 0.4 mm (0.8 mm in the relief).
- **Bambu Studio** (team's slicer): plate files **`TroDes_Wearable_A1_plate.3mf`** (5 parts) and **`TroDes_Nodes_A1_plate.3mf`** (8 parts).
  - Parts are laid out on the 256 × 256 A1 bed and already oriented; open, then slice.
  - Checked by reading them back: all 13 objects closed.
- **Also updated:**
  - all 13 STLs re-exported (0 open edges);
  - the Fusion script matched (gap 0.3, bump 0.7, ESP32 opening 15 × 9, shelf 0.4) and reinstalled;
  - [[Wearable Enclosure Build]] and [[Node Enclosures Build]] now have allowance tables and Bambu steps;
  - zips rebuilt in `Desktop\TroDes Deliverables\_Download (zip)`.

## 2026-09-27

### Beacon and door-node enclosures modelled

- **Model:** `trodes_node_boxes.py` (Blender 4.5, parametric). Details in [[Node Enclosures Build]].
- **Box:** 55 × 75 × 24 mm, built around the 5 × 7 cm perfboard with the ESP32 soldered directly.
  - 4 corner posts under the board, and 4 hold-down pins in the lid, so no screws hold the board;
  - USB-C opening (13 × 8) in the bottom wall;
  - two keyhole slots in the back for a wall screw (or tape);
  - snap lid with side bumps and grooves;
  - vents over the ESP32 module.
- **Per node:**
  - beacons get a status-LED hole;
  - the door node gets a cable notch in the right wall (and lid lip) beside screw terminal J1.
- **Engraved lids:** B1 / BEDROOM WING, B2 / DINING HALL, B3 / MEDICINE ROOM, DOOR / MEDICINE ROOM, plus "UP" and "TroDes". The font is Arial Bold (Blender's default drew "1" like "I").
- **Output:** 8 STLs, all manifold, in `Attachments` (`Beacon_B*_*.stl`, `DoorNode_D11_*.stl`), with renders `Node_Enclosures_*.png`.
- **Printing:** all 8 fit on one A1 plate, about 80 g of PETG.
- **To confirm:** perfboard 50 × 70, beacon ESP32 USB-C, reed cable ≤ 5 mm, terminal ≤ 10.5 mm tall.

### Wearable enclosure STLs fixed for the real parts

- **SW2 is 13 mm (not 7.3):**
  - the old plunger would have hit the switch and kept the lid from closing;
  - `SW2_H = 13.0`; the plunger is now **9.1 mm** tall (stem 4.9 mm, 0.6 mm free travel).
- **ESP32 devkit is USB-C:** the right-wall opening is now **13 × 8 mm** (fits a USB-C plug overmold up to 12.35 × 6.5 mm). The TP4056 USB-C opening was already 13 × 8.
- **Height check against the lid underside (35.8 mm):**
  - SW2 +6.5 mm;
  - C1/C3 (13 mm) +6.5;
  - ESP32 + 5 mm heatsink +2.3;
  - MAX17043 + JST +4.4;
  - MAX30102 sensor face +0.4, just under the finger window as designed;
  - the LED dome is flush in its lid hole.
- **Checks:** all 5 STLs re-exported and still closed and manifold (0 open edges).
- **Notes updated:**
  - [[Wearable Enclosure Build]]: heights table, plus **Bambu Lab A1 / PETG / Bambu Studio** settings (textured PEI, 0.20 mm, 3 walls, 15–20 % gyroid, no supports, brim only on the clip, all 5 parts on one plate, about 45–55 g and 4–5 h);
  - [[Shopping List 2026-09-27]]: SW2 marked as the team's 13 mm part.
- The Fusion script already used `sw2_h = 13` and the 13 × 8 USB-C openings.

### Dashboard: floating alert notification (team request)

- **Before and after:** the alert card used to sit at the top of the page and push everything down. On the v2 page it is now a **floating notification**: it slides down over the content, so the layout underneath never moves.
- **Hide:** the ⌃ button tucks it into a small pulsing pill at the top ("● Entered restricted zone · +1"). Tapping the pill opens it again.
- **Safety:** a **new** alert id re-opens the full card by itself, and a new critical alert vibrates the phone where the browser supports it (Android Chrome; iPhone Safari doesn't).
  - The card is rebuilt only when the alerts change; between polls just its "x ago" text updates, so the slide-in plays once per new alert.
  - The bell badge and the Alerts tab still list everything.
- **Verified** on a private test server:
  - pop-up over content with no layout shift;
  - hide → pill → tap → card;
  - a new alert while hidden re-opens the card ("All 2");
  - the timer counts while the node is kept.
- **Also:**
  - Live demo passcode changed to the team's choice (restarted; phones must sign in again).
  - Seen in the live demo: two test alerts I injected were acknowledged by **"path"** from a phone through the tunnel, so the team is watching live. I stopped injecting test alerts into the live demo.
- **Not committed.**

### Dashboard: passcode lock + dark mode (team request)

- **Passcode (server-side, not cosmetic):** new `dashboard/app/auth.py`, wired into `app/main.py`.
  - **Off unless** the environment variable `TRODES_PASSCODE` (4–8 digits) is set.
  - **Needs the passcode:** the pages, all read endpoints and Acknowledge. Without a session, page requests are redirected to the lock screen and API requests get 401.
  - **Still open:** device ingest (`POST /status`, `/alert`, `/door`) and `/health`, so the wearable and door node need **no firmware change**.
  - **Session:** HMAC cookie, 12 h; a server restart signs everyone out.
  - **Lockout:** 60 s after 5 wrong codes.
- **Page (`static/v2/`):**
  - lock screen with a phone-style keypad (6 dots, shake on a wrong code, "tries left" and lockout messages; typing digits also works);
  - lock button in the header;
  - the classic page (`app.js`) now jumps to the lock screen on a 401.
- **Dark mode:** light/dark switch (sun/moon) in the header and on the lock screen.
  - Saved per phone; the first visit follows the phone's own setting; applied before first paint.
  - All colours come from one set of theme variables, and alerts stay loud in both themes.
- **Verified:**
  - self-test **38/38** with the passcode off;
  - with a passcode on, curl checks:
    - summary 401 and ack 401;
    - `/` redirects (303) to the lock screen, and the lock page itself loads (200);
    - device POST 200;
    - a wrong code gives 401 with the tries left, the right code opens a session, and a forged cookie gets 401;
    - 5 wrong codes lock the login (429);
  - in the browser: wrong code → message, right code → dashboard, lock button → lock screen, theme switch works.
- **Live demo on the laptop** now runs with a passcode (given to the team in chat; not recorded here).
- **Not committed.**

### Dashboard: new "Home" design (v2) + remote viewing via Cloudflare tunnel

- **New look (team's reference: a Daily UI "Home Monitoring" video):** `dashboard/static/v2/` (`index.html`, `home.css`, `home.js`), opened at **`/static/v2/index.html`**.
  - Light theme with a greeting header (caregiver name, bell with an alert count).
  - Pastel tile grid: the resident's current zone, battery and status; the door tile (lock icon); the heart-rate tile.
  - A "Live" facility-map card with the resident's dot and the door state.
  - Zone cards (occupied or empty, safe or restricted), and a bottom tab bar: Home / Alerts / Activity.
- **Same safety rules as the original page:**
  - the top alert card is sticky and can't be scrolled away (red = critical, amber = warning);
  - a quiet wearable shows "Not reporting";
  - an offline door node shows "Offline", never "Closed";
  - missing heart rate or battery shows an em dash;
  - times follow the server clock.
- **Scope:**
  - Presentation only: the API and backend are unchanged, so the self-test (38/38) is unaffected. The original page stays at `/`.
  - Checked in the browser at phone width: render, tabs, and Acknowledge (it cleared the banner and the badge).
  - **Not committed.**
- **Remote viewing (team request, while away):**
  - dashboard running on the laptop with a scratch database and the random simulator;
  - public link through a **Cloudflare quick tunnel** (`cloudflared.exe`, official, signature checked).
  - The link has **no login**. Stop it when done.
  - The app's safety check blocked me from opening the tunnel link in its browser; the link was checked from the laptop instead (HTTP 200).

### Dashboard Build Status updated

- **Re-verified:** dashboard self-test **38/38** on 27 Sep, from the repository copy (`dashboard/`), against a scratch database. Config: 3 zones, 1 door, 1 resident.
- **[[Dashboard Build Status]] now records:**
  - the code lives in the repository; the old `C:\TroDesData\dashboard` copy still has six zones, so don't run it;
  - the field-test and runtime tools that read the dashboard;
  - step 8 (real wearable → dashboard) is still pending, planned for the house field test on 28–29 Sep;
  - a proposed "last heart-rate reading + age" display for the fingertip spot check (not implemented).
- **No code changed.**

### UV masks printed (short bond acetate)

- **Print shop:** laser only, and acetate only in short bond (US Letter). So the masks were rebuilt for Letter:
  - `TroDes_Wearable_RevC3_LETTER_UV_Mask_POSITIVE_x9.pdf` and `…_NEGATIVE_x9.pdf`;
  - 9 copies each, equal 6.35 mm margins;
  - each sheet labelled in the column gaps;
  - in `KiCad Rev C/artwork/`.
  - Also made: `TroDes_Wearable_RevC3_LETTER_Sticker_x9.pdf`. The sticker itself is to be printed on **A4 matte** sticker paper (`…A4_Sticker_x12.pdf`); glossy wasn't available.
- **Printed (team):** the **positive** mask on laser transparency film. The photo showed a correct result: 9 copies, mostly black, not mirrored.
- **Before exposing:** check the outline is 69 × 66 mm, check the black is opaque (stack 2 copies if not), and find the toner side (it goes down on the board).
- **Why printed positive:** the team's board is **pre-sensitised positive FR-2**.

### Etching method settled: pre-sensitised positive FR-2 board

- **Board:** the team's board is **paper phenolic (FR-2), pre-sensitised (positive)**.
- **Process:** print **page 2 (POSITIVE)** of the A4 mask sheet on acetate, expose 2–4 min (test strip first), develop in NaOH about 7 g/L (or the kit developer) for 20–60 s, etch in FeCl₃, then remove the resist with acetone.
- **Not needed:** dry film, washing soda, laminator, scrubbing.
- **Updated:** [[Shopping List 2026-09-27]] section E and [[Wearable PCB UV Etching Plan]] section 1.
- **Also covered (team questions, 27 Sep):** the iron / toner-transfer method (now section 6 of the plan), how to apply the sticker, and the difference between FR-2 and pre-sensitised boards.

### Fusion script for the wearable enclosure (written, not yet run)

- **Script:** `TroDes_Wearable_Enclosure.py` (+ `.manifest`).
  - Installed in Fusion's Scripts folder (`%APPDATA%\Autodesk\Autodesk Fusion 360\API\Scripts\TroDes_Wearable_Enclosure\`).
  - Source kept in Desktop `TroDes Deliverables\Enclosuresusion\`.
  - Vault copy: `Attachments/TroDes_Wearable_Enclosure_FUSION.py`, renamed so it doesn't overwrite the Blender script on a case-insensitive disk.
- **What it builds:** a new parametric design with one component per printed part (Base, Shelf, Lid, SOS Plunger, Belt Clip). Plus grey, see-through "Reference parts (not printed)" stand-ins for the PCB, modules, battery and SW2.
- **Parameters:** all **heights** are Fusion user parameters (Modify → Change Parameters): `floor_t`, `lid_t`, `deck_top`, `shelf_t`, `post_h`, `hdr_h`, `stack_h`, `sw2_h` = **13 mm**, `clear_top`, `lip_h`, … The derived `pcb_top`, `lid_in` and `lid_top` follow automatically. The plan-view layout is fixed to PCB Rev C3.
- **Changes from the Blender model:**
  - SW2 13 mm, so the plunger stem is 4.9 mm;
  - the ESP32 USB-C opening is 13 × 8 mm.
- **Export:** 5 STLs and a `.f3d` archive to `Enclosuresusion\` at the end.
- **Printing:** Bambu Lab A1, PETG, Bambu Studio. In Bambu Studio:
  - base as is;
  - lid and plunger flipped;
  - belt clip on its side.
- **Not run yet:** the team declined screen control of Fusion, so the team runs it. If it fails, the message box shows the error.

### No female headers on the beacons and door node; team inputs for Fusion

- **Decision (team):** the ESP32s on the **beacons and the door node are soldered directly** to the perfboard, with **no female headers**. The door node was already built this way (25 Sep). Only the wearable uses headers.
  - Updated [[Beacon Node Perfboard Build]]:
    - check the zone before soldering;
    - place the ESP32 pins straight into columns 1 and 11, rows 4–22;
    - solder the 4 corners, then all 38 pins;
    - the LED height waits for the beacon box design.
  - Perfboard pictures regenerated from `tools/deliverables/perfboard_beacon.js` (not committed).
  - [[Shopping List 2026-09-27]] female headers are now **1×20 ×4, 1×5 ×3, 1×3 ×3**, all for the wearable including spares.
  - **PR3 section 2.5** still says the beacons plug into 1×19 female headers. The team is editing the PR3 in Word and will change that sentence.
- **Team inputs for the Fusion enclosure:**
  - printer **Bambu Lab A1** (256 mm bed), **PETG**, Bambu Studio;
  - **SW2 is 13 mm tall**, the same as the electrolytic capacitors;
  - the **ESP32 devkit is USB-C**, so the wearable's side opening becomes 13 × 8 mm.
- **Heart rate at the waist (team question):**
  - It is a **fingertip spot check**, not continuous: the resident presses a finger on the lid window over the MAX30102.
  - The firmware already works this way: BPM is reported only while the IR reading shows a finger (IR > 50 000), averaged over 8 beats; otherwise it reports "no reading".
  - Continuous heart rate isn't possible at the waist through clothing. That goes in the paper and deck as a design constraint, with a wrist or finger sensor as a recommendation.
  - Wearing position and heart-rate method are still listed for the adviser's approval in PR3 §6.

### 3D-print design moves to Autodesk Fusion

- **Decision (team, 27 Sep):** enclosure design continues in **Autodesk Fusion** (installed; first-run setup done by the team).
- **How we'll work:**
  - Each part is built by a Fusion Python script into an editable, parametric model. The key sizes are Fusion *User Parameters*, changeable in Modify → Change Parameters.
  - The team runs the script from Utilities → Add-Ins → Scripts, then exports STL/3MF for printing.
  - The Blender model and STLs stay as the reference until the Fusion version replaces them.
- **Info requested from the team:**
  - printer model, bed size, nozzle, material and slicer;
  - a few confirmations for the wearable (SW2, C3 and heatsink heights, TP4056 USB-C module size and port height, toggle-switch size, ESP32 USB type, belt size);
  - the beacon and door-node box details (perfboard size, mounting method, USB plug size, reed switch and magnet type).
  - The list is in the chat answer; it is to be added to [[Enclosure Measurement Sheet]] as the answers come in.

### A4 print sheets (UV masks and a component-side sticker); TP4056 is USB Type-C

- **A4 UV-mask sheet:** `Current Design/KiCad Rev C/artwork/TroDes_Wearable_RevC3_A4_UV_Masks_x12.pdf`, for printing on acetate.
  - Page 1 is the **negative** (dry film); page 2 is the **positive** (pre-sensitised board).
  - **12 copies per page**, 1:1, taken as vectors from the KiCad-plotted masks (B.Cu + Edge.Cuts, not mirrored).
  - A4 landscape, 4 × 3 layout, **equal 4.5 mm margins** on all four sides; gaps 3.8 mm across and 1.3 mm down.
  - Print at 100 % (Actual size), printed side against the copper. Measure one outline first: it must be 69.0 × 66.0 mm.
- **Component-side sticker:** `Current Design/KiCad Rev C/artwork/TroDes_Wearable_RevC3_A4_Sticker_x12.pdf`, 12 copies in the same layout.
  - **Look:** styled like the KiCad 3D render (solder-mask green, white silkscreen, copper pads with dark drill holes). It also shows the R1–R6 references, which the render hid under the 3D parts.
  - **Built from:** `kicad-cli` SVG plots of F.Silkscreen, F.Cu and Edge.Cuts.
  - **Printing:** not mirrored, on A4 sticker paper.
  - **Fitting:**
    - cut along the outline, and cut out the antenna slot;
    - stick it on the component side after drilling;
    - push a pin through each hole from the copper side.
- **Sticker credit block (team's request):** added in the top-right corner, in the free 10.4 × 13 mm between U3, D2 and the board edge:
  - "Electronics Design", "ECEA120D - C1", "Cirio, Chester John B.", "Cruz, Pathrish Anne R.", and **SESEMSG** in bold;
  - right-aligned, in KiCad's stroke font slightly condensed (names 0.95 mm tall, SESEMSG 2.0 mm).
  - It was added on a **scratch copy** of the board and plotted from there, so it appears on the sticker only. The real Rev C3 board file and the copper are unchanged.
- **Correction from the team:** the TP4056 module is **USB Type-C**, not micro-USB.
  - Enclosure: the left-wall charging opening was widened to **13 × 8 mm** for a USB-C plug overmold (up to 12.35 × 6.5 mm). The base STL was re-exported and is still manifold.
  - Fixed in: [[Shopping List 2026-09-27]], [[Wearable Enclosure Build]], [[Enclosure Measurement Sheet]], the Rev C3 README and the PR3 generator.
- **PR3:** the team is editing `TroDes_Progress_Report_3.docx` in Word:
  - signature block rewritten;
  - OR placeholder removed;
  - "micro-USB" changed to "typer-C" (typo — should read "USB Type-C").
  - The copy in `Progress Reports/` is still the 09:57 version. Replace it with the team's edited file when they're done.

### Beacon perfboard, shopping list, wearable enclosure, PR3 finalised

- **Beacon nodes (perfboard, ×3):** [[Beacon Node Perfboard Build]].
  - KiCad schematic `beacon_node.kicad_sch`, ERC 0.
  - Hole-by-hole 5 × 7 cm layout, with component-side and solder-side pictures, and a step-by-step build.
  - ESP32 on 2 × 1×19 female headers (columns 1 and 11, rows 4–22), powered by USB 5 V.
  - Optional status LED: IO2 → 330 Ω → LED → GND pin 26.
  - Files in `Attachments/`: `Beacon_Node_Schematic.pdf`, `Beacon_Perfboard_ComponentSide.png`, `Beacon_Perfboard_SolderSide.png`.
  - KiCad source: Desktop `TroDes Deliverables\Beacon Node\`.
- **Shopping list:** [[Shopping List 2026-09-27]].
  - Wearable parts are final from the Rev C3 BOM.
  - Female headers, all 5 mm tall: 1×20 ×10, 1×5 ×3, 1×3 ×3. Plus 2 × 1×6 stackable headers to raise the MAX30102.
  - UV-etching materials: 26 items.
  - Belt-clip screws corrected to **M3 × 6**.
- **Wearable enclosure modelled** (Blender 4.5, parametric): [[Wearable Enclosure Build]].
  - **Size:** 74 × 74 × 37.8 mm, two storeys.
  - **Power compartment:**
    - the 50 × 33 × 5 mm Li-Po;
    - the TP4056, with its USB Type-C port through the left wall;
    - the MT3608;
    - the toggle switch in the right wall.
  - **Inside:** a shelf with six PCB posts.
  - **Lid:** snap-on, with the SOS plunger, the finger window and dish, the LED and buzzer holes, and vents.
  - **Other features:** an ESP32 USB opening, and a belt clip held by 2 × M3 × 6.
  - **Output:** five STLs, all closed and manifold, oriented to print without supports. They and the renders are in `Attachments/` (`Wearable_*.stl`, `Wearable_Enclosure_*.png`, script `trodes_wearable_enclosure.py`).
  - **Model bug fixed:** the boolean unions had silently done nothing, because the mirrored boxes were inside-out.
- **Progress Report 3 finalised:** `TroDes_Progress_Report_3.docx` / `.pdf`, 10 pages, in `Progress Reports/`. Built on the PR2 template.
  - **New content:**
    - construction approach: the wearable is etched, the other nodes are on perfboard;
    - PCB Rev C3 design, with a verification table and Figure 1;
    - the enclosure design, with Figure 2;
    - the beacon perfboards;
    - the new feature, interrupt-driven I/O;
    - the defense-briefing requirements.
  - **Updated:** problems, risks, the dated plan to 2 Oct, and completion **~70 %** (weighted 68.75 %).
  - **Still to fill in:** the OR number, presentation time and panel (highlighted in the report).
  - **Needs:** the adviser's signature. Due Mon 28 Sep.
- **Interrupt-driven I/O:** added to the project features. **Planned, not coded yet.**
  - SOS (IO27) and reed (IO18) move from polling to GPIO interrupts. The ISR only flags; the main task waits on a notification.
  - Light sleep with GPIO wake-up between scans, and 80 MHz in low-power mode.
  - Behind a config switch until it is verified by alert latency and runtime.
- **Rev C3 3D render refreshed:** the silk now reads 2026-09-27.
- **Not committed:**
  - Rev C3 KiCad files;
  - `tools/deliverables/perfboard_beacon.js`;
  - the beacon KiCad project;
  - the enclosure script.

### Wearable Rev C3 — re-checked for UV etching on paper phenolic (FR-2)

- **Etching method changed:** the team will UV-etch on paper phenolic (FR-2) instead of toner transfer.
- **Rule problem found and fixed:**
  - The project's netclass clearance had been silently reset from 0.4 mm to KiCad's 0.2 mm default by the scripted KiCad saves (26 Sep), so the "0 clearance errors" results since then were checked against 0.2 mm.
  - I measured the real copper: every different-net gap was ≥ 0.47 mm (my hand-calculated routing held).
  - Restored 0.4 mm and added `trodes_wearable.kicad_dru` for FR-2: tracks/pads ≥ 1 mm from the edge, pad ring ≥ 0.45 mm, track ≥ 0.5 mm.
- **FR-2 changes:**
  - Pads enlarged: 0.8 mm holes → 2.0 mm pads (0.6 mm ring); U2/U3/SW1 → 1.9 mm; LED → 2.0 mm; SOS switch → 3.2 × 2.5 mm.
  - Fuel-gauge tracks widened to 0.6 mm.
  - J1 moved up (was 0.85 mm from the edge).
  - Left +3V3 track moved inward (was 0.9 mm).
  - One VBAT corner moved (was 0.399 mm from SW1's spare pad).
- **Final worst cases:** net-to-net 0.47 mm, to pour 0.45 mm, track 0.6 mm, copper to edge 1.1 mm, pad ring 0.45 mm, hole to hole 1.5 mm.
- **Checks:** KiCad GUI and CLI DRC 0/0/0, ERC 0, parity 0.
- **UV masks plotted in KiCad (File → Plot):**
  - `UV_MASK_NEGATIVE_…` for dry film;
  - `UV_MASK_POSITIVE_…` for pre-sensitised/positive resist;
  - both 69.0 × 66.0 mm, not mirrored (expose printed side down).
- **Plan:** step-by-step procedure in [[Wearable PCB UV Etching Plan]].
- **Not committed.**

### Wearable Rev C3 — copper text removed, print sheet plotted in KiCad

- **Copper text removed:** at the team's request, "TRODES C3 COPPER SIDE" is gone from the copper. The edit was made in the KiCad PCB Editor (select, delete, refill); the GND pour fills the space.
- **Checks:**
  - KiCad GUI DRC: 0 violations, 0 unconnected, 0 errors/warnings;
  - `kicad-cli`: DRC 0, ERC 0, parity 0;
  - 6 checked courtyard exclusions kept.
- **Print sheet made in KiCad (File → Plot):**
  - PDF, B.Cu with Edge.Cuts on all layers;
  - small drill marks, 1:1, not mirrored, black and white, no drawing sheet;
  - output `artwork/trodes_wearable-B_Cu.pdf`: A4 landscape, outline measured 69.0 × 66.0 mm, no text.
  - The plot settings are saved in the board.
- **Removed:** my earlier composed C3 sheets (print, copper-side check, drill guide), deleted from the Desktop folder and both vaults because they carried the text.
- **New orientation check:**
  - antenna slot on the LEFT on the paper;
  - on the RIGHT on the copper after transfer.
- **Not committed:** the repo still has C2 (`aaa0826`).

## 2026-09-26

### Schematic status; enclosures started

- **Schematics not final.** Wearable (KiCad Rev B/C, 23 Sep) is electrically
  correct and matches the firmware (checked net by net; D1, D2 and Q1
  polarity correct). Open: (1) the six resistors use the IEC rectangle — the
  course requires IEEE/ANSI symbols (zigzag); polarised capacitors should use
  the curved-plate ANSI symbol; (2) title block still Rev B / 23 Sep; (3)
  KiCad ERC reports 73 items — 27 unused ESP32 pins without no-connect flags,
  27 library-version mismatches, 9 library-configuration notices, 4 off-grid
  endpoints, 4 undriven inputs, 1 missing power flag on VSW, 1 power-flag
  conflict on the M2 OUT− net — none is a wiring error; (4) adviser review
  pending. **Door node has no schematic yet** (only the wiring diagram).
  Offered to finalise both; awaiting the go-ahead.
- **Build as actually assembled (team, 26 Sep):** the ESP32 and the heart-rate
  sensor are on **female headers** after all (supersedes the 25 Sep
  "soldered directly" note), and a **5 mm heatsink** is fitted on the ESP32.
- **Enclosures:** the adviser requires an enclosure for the perfboard
  prototype; the team will **3D-print** them. Design requested for the
  wearable, the door node and the three beacons. **Wearing position decided
  by the team: belt/waist clip**, heart rate read by fingertip through a
  window on the front (adviser to confirm — it was an open question).
  Modelling in Blender 4.5 (installed) once the parts are measured —
  see [[Enclosure Measurement Sheet]].
- **Enclosures ON HOLD (team's instruction, 26 Sep):** no modelling until the
  team sends the caliper measurements, photos with a ruler, and the printer
  details from [[Enclosure Measurement Sheet]]. Nothing modelled yet.
- **Defense briefing meeting** — requirements recorded in
  [[Defense Meeting Notes 2026-09-26]]: deck/paper must cover constraints,
  standards, design and what was let go; 10 min max; 4 copies, user manual,
  recommendation form copy, receipt photocopy; backup demo video; holding
  room N205B; business attire.
- **New plan — wearable goes on an etched PCB** (Rev C, single-sided); the
  beacons and the door node stay on perfboard. Rev C PCB verification started.
- **Rev C PCB verification (KiCad 9.0.3 DRC + parity, zone filled, on a
  scratch copy — vault files untouched): NOT ready to etch.**
  - Correct: all 11 ESP32 pin assignments match the team pinout (3V3 1, IO34
    5, IO25 9, IO27 11, GND 14/20/26, V5 19, SDA IO22 22, SCL IO21 25, IO2
    34); every net routed on B.Cu; GND pour on B.Cu is one connected island;
    antenna slot sits under the antenna; row spacing 25.4 mm is confirmed by
    the door node (devkit fits perfboard columns 1 and 11).
  - Must fix: **D1 and Q1 collector holes are 0.92 mm apart** (0.12 mm web —
    cannot be drilled as two holes); **buzzer footprint is 14 mm / 10 mm
    pitch** but the BOM part is a 12 mm passive buzzer (6.5 or 7.6 mm pitch)
    and its body overlaps Q1; **4 clearances of 0.35–0.37 mm** (+5V next to
    BZ1 and SW2, SOS next to IO14) — risky for toner transfer.
  - Must confirm against the real parts: MAX30102 module pin order (board
    has VIN-GND-SCL-SDA-INT, which does not match the common modules); Q1
    E-B-C; slide switch pin pitch.
  - Cosmetic: silkscreen still says "Rev B" and mentions wire links; the
    `artwork/` PDFs predate any fix — **do not print them yet**.
- **Team confirmed the real parts:**
  - MAX30102 module: 8 pins, one side VIN SDA SCL GND, other side GND RD IRD
    INT;
  - buzzer 12 mm, legs 7–8 mm apart;
  - 2N2222A E-B-C;
  - power switch: panel-mount SPDT mini toggle, 3 A.
- **Rev C1 done and verified (KiCad 9.0.3): DRC 0 unconnected, 0 clearance,
  0 hole errors; schematic ↔ PCB match** (only intended exceptions: MAX30102
  INT unused, U3 CELL unrouted).
  - D1 moved clear of Q1.
  - Buzzer → `Buzzer_12x9.5RM7.6`.
  - U2 → 1×4, VIN SDA SCL GND.
  - +5V and SOS rerouted (all gaps ≥ 0.4 mm).
  - C1/C2 moved.
  - SW2 legs joined.
  - U3 GND onto the pour.
  - Silkscreen updated.
  - Schematic footprints synced; MAX30102 symbol pins renumbered.
- **Old etching artwork was mirrored the wrong way.** The Rev C README said
  to print `BottomCopper_MIRRORED_for_toner_transfer.pdf`. A toner transfer
  flips that sheet, so it would have etched a mirror-image board. The new
  `TroDes_Wearable_RevC1_PRINT_THIS_BottomCopper.pdf` is the un-mirrored view.
  The copper carries "TRODES C1 COPPER SIDE", which must read correctly on the
  copper after transfer.
- **Where the Rev C1 files are:**
  - both vaults, `KiCad Rev C` folder (Rev C kept as `.bak`);
  - Desktop `TroDes Deliverables\Wearable PCB Rev C1\`.
  Not committed.
- **Battery mounting (advice given):**
  - The cell sits flat under the PCB or beside it, on a 2 mm foam or printed
    spacer — never directly against the sharp solder joints.
  - Hold it with double-sided foam tape; no zip ties and no clamping.
  - Its leads go to BT1 through a JST-PH socket pigtail so it unplugs.
    **Check polarity with a meter first.**
  - The TP4056 USB-C faces a case opening.
- **Power-part placement (recommended, 26 Sep): a "power deck" under the
  PCB.** Battery, TP4056 and MT3608 sit side by side in one layer beneath the
  solder side, on a 1–2 mm insulating spacer (foam or a printed tray).
  - **Battery:** under the top half of the board, beneath the devkit.
  - **TP4056:** under the bottom-left corner, right below the BT1/M1 pads, with
    its USB-C facing the left wall and 14 mm clear of the antenna.
  - **MT3608:** under the bottom-right strip, near the M2 pads.
  - **SW1 toggle:** in the case wall beside the USB-C.
  - **Result:** all wires stay under ~3 cm and the case has one face size of
    about 75 × 72 mm. Depth is about 34–36 mm: the heatsink top is ~18 mm above
    the board, plus the PCB, plus a deck of about 12 mm (the MT3608 trimmer is
    the tallest part).
  - **Alternative:** put the deck beside the PCB — ~24 mm thick, but the case
    face is ~75 × 110 mm.
  - Final dimensions wait on the measurements (W20–W22 in
    [[Enclosure Measurement Sheet]]).
- **Rev C3 — TP4056/MT3608 pads corrected (team spotted it).** In C2 the power modules were plain 1×4 rows in the wrong order (M1 B+ B− OUT+ OUT−, module edge OUT+ B+ B− OUT−; M2 IN+ IN− OUT+ OUT−, module has VIN at one end and VOUT at the other). The battery also went onto the board and straight back out. The nets themselves were right.
  - **Team choice:** keep the modules off-board (the easier option — no caliper-measured module footprints, board stays 69 × 66 mm).
  - **Changes:**
    - BT1, M1 and M2 are now off-board in the schematic;
    - new wire pads **J1 = TP4056 OUT+/OUT−**;
    - new wire pads **J2 = MT3608 2 × 2** (top row VIN+ VIN−, bottom row VOUT+ VOUT−), labelled like the modules;
    - the **battery solders straight to the TP4056 B+/B−** (JST pigtail on the module).
  - **Board move:** the team's move of the whole board onto the A4 sheet (+112, +53.5 mm) was kept.
  - **Result:** DRC 0/0/0, ERC 0, parity 0; 6 courtyard exclusions kept.
  - **Files:**
    - both vaults, `KiCad Rev C` folder (C2 kept as `.bak`);
    - Desktop `TroDes Deliverables\Wearable PCB Rev C3\`.
  - **Print `TroDes_Wearable_RevC3_PRINT_THIS_BottomCopper.pdf`, not C2.** The repo still has C2 (`aaa0826`); C3 is not committed yet.
  - **Lesson:** saving a board from KiCad Python also rewrites the project file (it lost the DRC exclusions once). Save to a scratch copy and copy back only the `.kicad_pcb`.
- **Rev C2 — wearable PCB re-verified and rebuilt in KiCad 9 (GUI + CLI).**
  - **Team inputs:**
    - the fuel gauge **will be fitted** (red SparkFun-layout MAX17043, 24 × 10 mm, 2 × 3 pins, JST);
    - SOS switch is **12 × 12 mm** (legs 12.4 × 5 mm);
    - **female headers** for the ESP32, the MAX30102 and the fuel gauge, **5 mm** tall;
    - ESP32 devkit **55 × 28 mm**;
    - module photos: MAX30102 20 × 15 mm (2 × 4), MT3608 36 × 18 × 6 mm, TP4056 28 × 17 mm micro-USB.
  - **Changes:**
    - new socket footprints for the ESP32 (55 × 28 outline), the MAX30102 (2 × 4, rows 10.16 mm, sensor up) and the MAX17043 (2 × 3, rows 7.62 mm);
    - 12 mm SOS switch;
    - top band re-laid out: C3, U2, U3, R5/R6 under U2, LED moved to the top right;
    - +3V3 routed along the board edge and the top edge, clear of the antenna, with a pour keep-out under the antenna and the slot moved under it.
  - **Fuel gauge on its own I²C bus:** FG_SDA = IO4, FG_SCL = IO16 (`Wire1`). This is the only way both modules route on one copper layer. The heart-rate bus is unchanged (IO22/IO21).
  - **Fuel-gauge battery lead:** JST red → TP4056 OUT+; black left unconnected (joining it would bypass the DW01).
  - **Result:**
    - DRC 0 errors, 0 warnings, 0 unconnected;
    - ERC 0;
    - schematic ↔ PCB 0 differences (50 nets);
    - every net checked pad by pad (table in the KiCad Rev C README);
    - 7 courtyard overlaps excluded after checking the physical clearance.
  - **Firmware:** `config.h` PIN_FG_SDA 4 / PIN_FG_SCL 16; `main.cpp` `Wire1.begin()` + `gGauge.begin(Wire1)`. Builds clean; **not committed**.
  - **Files:**
    - both vaults, `KiCad Rev C` folder (Rev C1 kept as `.bak`; sheets in `artwork/`);
    - Desktop `TroDes Deliverables\Wearable PCB Rev C2\`.
    **Print `TroDes_Wearable_RevC2_PRINT_THIS_BottomCopper.pdf`.**
  - **Still to confirm:**
    - the fuel gauge's back labels when it arrives;
    - ESP32 pin 1 → antenna edge distance (assumed 7.0 mm);
    - MAX30102 pull-up jumper set to 3V3.

## 2026-09-25

### Deliverables drafted

The instructor's requirements slide (received 24 Sep) was recorded in
[[Deliverables Tracker]]. Two items from it: **progress reports are Weeks 4, 6
and 8** (upload the following Monday), and **"Project must be in PCB"** —
which conflicts with the adviser's perfboard allowance; written confirmation
requested (also listed in PR3 §6).

All drafts are in `Desktop\TroDes Deliverables\` (Word/PowerPoint + PDF).
Yellow highlights mark values that are not yet measured or decided — nothing
was invented.

| Deliverable | Draft | Notes |
|---|---|---|
| User's Manual | v0.1, 15 pp. | Names filled from PR2 |
| Defense presentation | v0.1, 13 slides / 10 min | Speaker notes with timings; opens in PowerPoint (an earlier build failed to open — upward arrows had negative extents; fixed) |
| IEEE paper | Rev 3, 21 pp. | Ch. 1 carried from Rev 2 and corrected (no floor plan on the dashboard, three zones, perfboard, PSA 2020 figure cited); Ch. 2–5, abstract, 12 references, 3 figures new |
| Progress Report 3 | draft, 4 pp. | PR2 structure; due Mon 28 Sep (confirm) with adviser's dated signature |

**Literature (Ch. 2)** — every reference verified against its publisher or
index page: Zafari et al. 2019 (IEEE COMST), Faragher & Harle 2015 (IEEE JSAC),
Kolakowski et al. 2020 (Sensors), Garcia & Inoue 2024 (Sensors), Cipriani et
al. 2014 (Psychogeriatrics — cited qualitatively only; its prevalence figures
could not be read from an accessible abstract), Rappaport 2002, PSA 2020 CPH
(65+ = 5.4 %, 5.86 M). §1.7 still needs the team to name commercial products.

**Two prediction figures exist for Test 2:** PR2 states 85 % (three point
types, no boundaries); `Test2_Prediction.md` states 74 % (four point types
including boundaries). The paper compares Run 1 against 74 % and explains both.

**Correction:** prediction 1 (bimodal) held at **15 of 16 points** (not 13 as
first stated); the exception is BW-boundary from inside, 54 %.

**Saved (on request):** drafts committed and pushed to the repository as
`fd13c2d` (`deliverables/drafts/`, generators in `tools/deliverables/`), and
saved into both vaults — `Attachments/` + `Progress Reports/` here,
`05 Attachments/` + `06 Progress Reports/` in the Obsidian vault. Copies were
written through Word and PowerPoint, which Controlled Folder Access allows.

### Progress Report 3 in the PR1/PR2 format; field test planned

- **PR3 rebuilt on PR2's own Word file** as the template — same Calibri
  styles, title block, info table, dash/numbered lists, ruled tables and
  signature block. 6 pages. Headings and table headers kept with the text that
  follows. Saved to `Desktop\TroDes Deliverables\` only (the repository and
  vault copies are still the earlier layout — re-save on request).
- **Progress estimate ≈ 65 %** (PR2: 48 %), same weighting; team to confirm.
- **Field test planned** at a multi-room private residence: each zone in its
  own room — the deployment case school testing could not provide. Plan in
  [[Field Test Plan]]: Test 2 Run 2 (room-level), Test 3, SOS/restricted-zone
  alert latency, door-node reliability (20 cycles, offline detection), network
  loss, a filmed live demo, optional overnight runtime, heart rate vs a
  reference. Captures go to `C:\TroDesData\field\` (folder created). PR3 §7
  includes it.

### Field-test preparation (committed and pushed as `3d8d05e`)

- **Door node firmware:** WiFi name/password/backend address moved to a
  git-ignored `include/secrets.h` (template added), like the wearable; the
  six-zone comment corrected to the one-door demo scope. Compiles.
- **`tools/field/field_report.py`:** `latency` pairs each `[ALERT]` in a serial
  capture with the dashboard's `received_at` (same laptop clock) for end-to-end
  alert latency; `doors` counts open/close events, door-opened alerts and
  heartbeat gaps in a time window. Tested against a live dashboard on a
  temporary database: measured 0.40 s against a deliberate 0.4 s delay; 5 of 5
  door openings counted. Commands added to [[Field Test Plan]] Parts C and D.

### Wearable perfboard placement

- Perfboards and female headers ordered (in transit). Wearable board first.
- Field test at the house planned for **next week** — to feed the defense it
  must happen by Tue 29 / Wed 30 Sep; it can use the breadboard wearable.
- **Placement map** for the 6 × 8 cm board turned landscape (28 × 22 holes
  assumed): devkit on the left with the antenna overhanging the top edge and
  USB the bottom edge; parts in the right-hand 15 columns; battery divider under
  the devkit; Li-Po + TP4056 + MT3608 on the back, bottom-right. See
  [[Wearable Perfboard Layout]] (image `Attachments/Wearable_Perfboard_Map.png`;
  generator `tools/deliverables/perfboard_map.js`, not yet committed).
- Two 5 × 7 cm perfboards already in hand → **door node built on one of them
  now** (the wearable is too crowded for 5 × 7). Map and build steps in
  [[Door Node Perfboard Layout]] (18 × 24 holes assumed; devkit with USB at the
  bottom edge as the power input; J1 screw terminal for the reed on IO27;
  optional LED on IO2). Everything except the devkit headers can be soldered
  before the headers arrive. Generator `tools/deliverables/perfboard_door_map.js`
  (not yet committed).
- **Decision (team, 25 Sep): devkits soldered directly, no female headers** —
  keeps the wearable thin. Only the used pins plus the four corners are
  soldered, so a failed devkit can still be removed (one spare left). Wearable
  map redrawn: battery divider moved out from under the devkit; the MT3608 is
  set to 5.0 V on its own **before** its OUT+ wire is connected; C1/C3 laid on
  their sides. Both layout notes updated.
- **Door node reed moved from GPIO 27 to GPIO 18** (no hookup wire available):
  IO18 sits two rows below a GND pin on the right-hand header, so the node
  needs only two short links made from leg offcuts. External LED dropped (the
  devkit's LED on IO2 remains). Firmware `PIN_REED 18` compiles (repository
  working copy, not yet committed). Still to update for GPIO 18: slide 5 of the
  presentation, `Hardware BOM - Door Sensor.md`, and the door-node schematic
  when drawn.
- **Pinout reference adopted** (team's ESP32 DevKitC 38-pin image): saved as
  `Attachments/ESP32_DevKitC_Pinout.png` with [[ESP32 DevKitC Pinout]] in
  `Reference/`. Both perfboard maps checked against it position by position —
  all pins match. Caution recorded: the image labels G21 = SDA / G22 = SCL,
  while the wearable deliberately uses SDA = IO22 / SCL = IO21.
- **Door node complete wiring diagram** (all 38 pins as on the pinout, J1,
  reed S1 and magnet, USB adapter, behaviour and firmware constants):
  `Attachments/Door_Node_Wiring.png`, embedded in [[Door Node Perfboard Layout]];
  generator `tools/deliverables/door_wiring.js` (not yet committed). Usable as
  the door-node figure in the paper until the KiCad schematic is drawn.
- **Door node solder-side view** added (board flipped sideways, links drawn
  where they are soldered): `Attachments/Door_Node_Solder_Side.png`, embedded
  in [[Door Node Perfboard Layout]]; generator
  `tools/deliverables/perfboard_door_underside.js` (not yet committed).
- **Door node flashed and bench-tested** (ESP32 MAC 20:50:0d:ce:24:18, COM8;
  firmware with the reed on **G18**, offline — no WiFi yet). Boot, identity
  (`door-11`, medicine_room, restricted) and 30 s heartbeats correct. Reed on
  G18/GND: magnet test **3 closes + 3 opens, one event per movement, correct
  polarity** (magnet near = CLOSED). A burst of 8 changes in ~2.5 s preceded
  it — attributed to the hand-held G18–GND jumper test (to be confirmed; if it
  was the magnet at the edge of range, raise `REED_DEBOUNCE_MS` to ~150).
  Offline queue grew to 11 with nothing dropped. Log:
  `C:\TroDesData\field\door_bench_test2.log`.
- **Second bench run: 8 opens + 8 closes, clean, no chatter** — so the earlier
  burst was the jumper test and the 50 ms debounce is adequate. **But the
  offline queue overflowed: `q=16 dropped=3`.** Cause: while WiFi was down the
  node also queued a heartbeat every 30 s, and a full queue discards the
  oldest entry — door events. **The wearable had the same flaw, worse:** a
  status every 5 s into a 24-slot queue would push out an SOS pressed during an
  outage after about 2 minutes (Field Test Part E).
- **Fix (both boards):** while offline, only real events are queued (door
  changes; wearable alerts/SOS) — heartbeats and status snapshots are sent
  only while the link is up. Queues enlarged: door 16 → 64, wearable 24 → 48.
  Door node re-flashed; verified offline: after 30 s the queue held only the
  boot event (`q=1`, was `q=2` with a heartbeat). Wearable compiles (RAM 19 %),
  to be flashed when next connected.
- **Committed and pushed as `73f979b`:** the queue fix (both boards), the
  door reed on GPIO 18, and all four diagram generators (`perfboard_map.js`,
  `perfboard_door_map.js`, `perfboard_door_underside.js`, `door_wiring.js`) —
  the "not yet committed" notes above are superseded.

## 2026-09-24

### Night — Test 2 Run 1, proximity mode, low-power profile

**Adviser decision (24 Sep): perfboard is allowed for the final prototype.**
Etching is no longer required; the Rev C PCB layout remains as design
documentation. Recorded in [[Decisions Log]]. The Mon 28 Sep fallback now
applies to the perfboard builds. Door node to be built on perfboard too;
its schematic is not yet drawn.

**Test 2 Run 1 (school, 17:22–17:37).** Two rooms available: `bedroom_wing`
and `medicine_room` beacons in the **same room**, `dining_hall` in the other.
Wearable on the committed test firmware (`f5b2e92`, room mode). Capture
`C:\TroDesData\test2\test2_run1.csv` (raw, untouched); labels corrected in
`test2_run1_labelled.csv` (short labels given their zone prefix, four
`transit` typos); results in `test2_run1_results.txt`.

| | Predicted | Measured |
|---|---|---|
| Overall accuracy | 74 % | **56.2 %** (278/495) |
| Unresolved | 21 % | **23.2 %** |
| Recall BW / DH / MR | — | 49 % / **85 %** / 47 % |

- **Across the wall: zero cross-room errors.** `dining_hall` interior points
  100 %, precision 1.00; nothing in the shared room was ever reported as
  `dining_hall`.
- **Same room:** BW-mid and BW-far read the MR beacon 2–4 dB stronger than
  their own (−80 vs −82, −84 vs −88 dBm) → reported `medicine_room`. MR-mid:
  margin under the 4 dB hysteresis → held `bedroom_wing`. Only the 1 m points
  were reliable (100 % once arrived).
- **All 115 unresolved samples at doorway points**, where every beacon was
  below the −88 dBm floor (−89 to −105 dBm). None at far corners.
- BW-near's first 24 s were wrong because the label was typed while still
  walking in (BW rose −86 → −72 dBm); 100 % after arrival.
- Predictions: 1 ✓ bimodal; 2 partly (DH highest recall, but never the wrong
  answer); 3 ✓ unresolved only at boundaries; 4 ✓ direction (in > out) but via
  "unknown", not neighbour hold; 5 ✓ after arrival.
- Fewer than 30 samples at 8 points — hold 60 s next time.

**The defense is in one room**, so all three zones will share it — the Run 1
same-room case. Only two rooms were available at school. Plan: retest in the
single-room dorm as a rehearsal of the defense — see [[Defense Demo Plan]].

**Firmware (committed and pushed as `5c5803f`), compiled in all modes, not
flashed:**
- `POWER_PROFILE` (0 test, default / 1 low power: passive scan 30 % duty,
  CPU 80 MHz, status every 10 s). Override with
  `PLATFORMIO_BUILD_FLAGS=-DPOWER_PROFILE=1`.
- `ZONE_ENTRY_DBM` proximity mode (default off): a zone is entered only above
  the threshold; between beacons the last zone is kept. For zones sharing one
  room. Calibrate in the room (plan §2).
- WiFi name/password/backend address moved to `include/secrets.h`
  (git-ignored; template `secrets.h.example`).
- `tools/runtime/runtime_report.py`: runtime and discharge curve from the
  dashboard database after an overnight battery test.

### Evening — wearable replaced, firmware updated, beacons verified, billing form done

**Incident — wearable devkit destroyed by the boost module.**
- On first power-up of the breadboard wearable (cell → TP4056 → SW1 →
  MT3608 → +5 V rail → devkit 5V pin), the ESP32 devkit sparked and died.
- **Cause, measured:** the MT3608 output was at its factory setting,
  **17.64 V** (no load). That exceeds the devkit's AMS1117 input rating
  (~15 V); the regulator failed and took the ESP32 with it.
- **Not the cause:** the buzzer stage (BZ1 + D1 1N4148 cathode to +5 V, anode
  to Q1 collector) was wired correctly, as were the switch and the rail.
- Afterwards the MT3608 input read 0 V: the TP4056/DW01 protection had
  tripped on the short. Reset by plugging USB-C into the TP4056; input then
  read 3.8 V.
- **Fix:** MT3608 trimmed to **5.03 V** with nothing connected. C1 checked
  (rated 50 V — undamaged). Spare devkit fitted; 3V3 rail confirmed.
- **Devkits:** 7 owned, 1 destroyed, 6 working, 5 needed for the demo
  (3 beacons, 1 wearable, 1 door node) → **1 spare**. Buying one more
  (~₱249) recommended.
- **Rule going forward:** measure the MT3608 output = 5.0 V before any ESP32
  is connected — every build, every spare module, and the perfboard.

**Build method:** the wearable will be hand-soldered on perfboard
(`Perfboard_Build_Guide.md`, SDA = IO22, SCL = IO21). The guide describes
perfboard as the backup to the etched Rev C board — **confirm with the adviser
that perfboard is acceptable as the graded prototype.**

**Firmware (committed and pushed to GitHub as `f5b2e92`):**
- Zone table cut to the approved three zones: `bedroom_wing` (1),
  `dining_hall` (2), `medicine_room` (11, restricted).
- Fuel gauge corrected from MAX17048 to **MAX17043** (U3 on the Rev B/C
  schematic) — the old setting would have misread cell voltage.
- Battery via the R3/R4 divider on IO34: 16-sample average using calibrated
  `analogReadMilliVolts`, and a piecewise Li-Po voltage→percentage table
  instead of a linear map.
- I²C pins SDA = IO22, SCL = IO21 (Rev C / perfboard).
- Checked every schematic/PCB part against the firmware: all six ESP32 nets
  on the Rev C PCB match the firmware pins. MAX17043 CELL has no PCB track —
  hand-wire it to M1 OUT+ if the gauge is fitted.
- Same changes applied to the vault snapshot `Firmware/trodes_phase1`
  (firmware + `docs/ZONE_CONFIG.md`, `docs/PHASE1_TEST_GUIDE.md`).
- Dashboard (repository copy): `zones.json` cut to three zones, one door
  node, one resident; `simulate.py` demo script rewritten to match.
  Self-tests 38/38 and the scripted demo run clean. **`C:\TroDesData\dashboard`
  still has six zones — run the dashboard from the repository.**
- `docs/ZONE_CONFIG.md`: beacon TX power corrected to **P9** (it still said P3).

**New wearable flashed (COM8, ESP32-D0WD-V3, MAC 30:76:f5:e5:4b:94).** Boot
log confirms `Zones : 3` and the divider battery path. MAX30102 not found —
expected if not yet wired; if wired, check SDA/SCL follow the new pins.

**Beacon check with the new wearable** — all three heard, zone switching and
the restricted alert work:

| Arrangement (1 m) | bedroom_wing | dining_hall | medicine_room | Spread |
|---|---|---|---|---|
| Side by side | −72.8 dBm | −62.2 dBm | −61.7 dBm | 11 dB |
| Arc, 30 cm apart, bedroom ↔ dining swapped | −67.0 dBm | −71.1 dBm | −69.1 dBm | 4 dB |

The weak reading stayed with the position, not the board: the beacons are
matched, and the 11 dB gap was placement (multipath fading plus antennas
crowding each other). Position alone moved a beacon 5–10 dB — consistent
with the Test 1 fading finding. Useful for Chapter 4. **Clear for Test 2.**

**Billing form:** reported complete by the team on 24 Sep. Record the OR
number, presentation time and panel in [[Deliverables Tracker]] when known.

**Test 2 prepared:** [[Test 2 Field Sheet]] — 15 sample points (near, mid,
far corner, boundary approached from inside and from the neighbouring zone),
one continuous capture into `C:\TroDesData\test2\`. The analyzer
(`tools/rssi_calibration/analyze_zone_accuracy.py`, repository working copy)
now accepts `zone@point` labels and adds a per-point table and the
unresolved rate; old captures still analyse unchanged. Tested on synthetic
captures.

**Next:** run Test 2, duty-cycle firmware and the overnight runtime
measurement, perfboard build, Test 3.

### Later — vault ↔ Claude project sync

- **Added to the vault from the Claude project:** [[Resume Here]] (current
  state and ordered next steps), [[Dashboard Build Status]],
  [[Current Design/Final Hardware Plan Rev B]],
  [[Current Design/PCB Layout Notes Rev C]],
  [[Current Design/KiCad Project Notes]],
  [[Archive/PCB Layout Notes Rev B]] (superseded by Rev C) and
  [[Reference/Adviser Decision Sheet]] (historical).
- **Sent to the Claude project from the vault:** this Work Log,
  [[Code Repository]], [[Decisions Log]], [[Open Questions]] and the corrected
  [[Deliverables Tracker]].
- **Billing form filed:** `Billing Form/` — FM-EEC-25 *Design Oral Presentation
  and Billing Form*, signed by the adviser 24 Sep. **Defense: Friday
  2 October 2026**, time TBA. Pending: panel, payment (₱8,000) and OR number,
  course instructor and program chair approval. The form ticks *Proposal* —
  confirm that is the right presentation type.
- **Breadboard-fallback trigger** (four days before the defense) is **Monday
  28 September**.
- **[[Deliverables Tracker]] corrected** — the stale-notes item below is closed:
  PR1 signed, PR2 drafted (PDF dated 21 Sep, predates Rev B), billing form in
  progress.
- **Dashboard code located:** `C:\TroDesData\dashboard` (see
  [[Dashboard Build Status]]). Still to be committed to `dashboard/` in the
  repository.
- **Firmware change owed for Rev C:** `PIN_I2C_SDA 22`, `PIN_I2C_SCL 21` in
  `wearable/include/config.h` — make it in the repository before flashing a
  board for the Rev C carrier.
- **Stale notes flagged in place:** [[Hardware BOM - Wearable]] (power section
  superseded by Rev B) and [[Phase 1 BLE POC]] (status superseded by
  [[Resume Here]]). [[00 Start Here]] now links the new notes.
- **Obsidian vault brought up to date:** `Jeju_Data` (vault ID
  `bf3d9a0782ad4ea4`) → `TroDes - Elderly Monitoring`, which had not been
  touched since 26 Aug. It now mirrors this folder in its numbered layout
  (`01 Current Design`, `02 Archive`, `03 Firmware`, `04 Reference`,
  `05 Attachments`, plus new `06 Progress Reports` and `07 Billing Form`). The
  August versions of the notes it replaced are kept in
  `02 Archive/Aug 2026 notes/` with an `(Aug 2026)` suffix.
- **Rev C KiCad project filed:** `TroDes_Wearable_KiCad_5.zip` (69 × 66 mm,
  zero wire links) extracted to `Current Design/KiCad Rev C/` here and
  `01 Current Design/KiCad Rev C/` in the Obsidian vault; linked from
  [[Current Design/PCB Layout Notes Rev C]]. The schematic's title block still
  reads **Rev B** — update it before the schematic goes into a report.
- **Carried back from the Obsidian vault** (existed only there):
  [[Full Build Process]] (August plan, now marked historical), the newer
  [[Current Design/PCB Design Plan Rev2]] (adds the August self-fabrication
  section), and `Attachments/Component List for Adviser.md` and
  `Attachments/TroDes_Estimated_BOM.xlsx`.

### Earlier — repository set-up

- **Record-keeping rule set:** from now on every session is logged here, and all
  code (firmware, tools, dashboard/database) is kept in the GitHub repository
  `Jeju2004/SESEM` — see [[Code Repository]].
- **Repository seeded** (commit `4e8225c`) from `Firmware/trodes_phase1` as of
  2026-09-21: all three firmware projects, RSSI calibration tools, test and
  programming docs, `CLAUDE.md`/`AGENTS.md`, and the [[Dashboard Build Brief]]
  as `docs/DASHBOARD_BUILD_BRIEF.md`. No code behaviour changed.
- **Dashboard code not found on this laptop.** `CLAUDE.md` states the caregiver
  dashboard is built with 38/38 self-tests passing, but no FastAPI/SQLite code
  exists in the vault or `Desktop\Vaya`. Needs to be located and committed to
  `dashboard/` in the repo.
- **Stale notes spotted, not yet fixed:** [[Deliverables Tracker]] still shows
  PR1 and PR2 as "Not started" although both PDFs are in `Progress Reports/`.

## Related

[[00 Start Here]] · [[Code Repository]] · [[Decisions Log]] · [[Open Questions]]
