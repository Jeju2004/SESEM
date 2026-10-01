# Changelog

Dated record of every code change. Newest first. Each entry says what changed,
why, and whether it has been verified on hardware.

## 2026-10-01 (10:30) — paper Rev 7: layout tightened

- **Starting point:** the team's Word copy of Rev 7. Its only change was a third author, Engr. Glenn V. Magwili (BSEE, MSECE), with bold names and italic affiliations. Both are now in `paper_ieee.js`.
- **Measured on the LibreOffice render**, which reproduced the Word layout of the team's copy (21 pages):
  - before: 21 pages, about 78 blank column-inches;
  - after: 17 pages, about 23 blank column-inches.
- **Zone flowchart redrawn** (`flowcharts/c_zone.dot`): 5.2 in tall instead of 8.4 in, with larger text.
  - The equivalent checks "strongest = current?" and "lead > 5 dB?" are merged.
  - The no-beacon branch runs beside the main chain.
  - Connector B carries the shortcut taken when the zone is unknown.
  - The logic is unchanged.
- **Flowchart widths:** each flowchart prints at about 8 pt text, so the main loop, background tasks and SOS charts are narrower and shorter.
- **Table XII** (Run 1 per-point results) moved from full width into a column at 7 pt, removing a half-empty page.
- **Appendices** now start under the references, without a new page. New order:
  - A BOM;
  - B firmware excerpts;
  - C test data;
  - D manual and access card;
  - E signed forms;
  - F schematic (landscape, full width);
  - G PCB;
  - H door node, beacon and enclosures.

  The schematic, copper and beacon share one page; the door wiring and enclosures share the next. The body reference to the schematic (now F) and the copper layout (now G) is updated.
- **Not yet checked:** the result in Word. Word can place figures slightly differently from LibreOffice.

## 2026-10-01 (09:40) — paper title, author block, black-and-white figures

- **Title** set to the team's edited wording: "Smart Elderly Safety and Emergency Monitoring System with Geofencing: An Indoor BLE Based Localization and Safety Monitoring System for a Home for the Aged". No other text in the team's edited copy differed from the generated paper.
- **Author block** now follows the IEEE layout, with one centred column per author: name, programme, school, university and e-mail. The yellow e-mail placeholder is gone.
- **Adviser line** moved from the header to a new Acknowledgment section before the References.
- **Black and white:**
  - Fig. 1 (`arch_col.dot`): white boxes, black lines.
  - The power-path and walk plots (`make_figures.py`) use grey fills, hatching, line styles and markers. `make_figures.py -` skips the KiCad exports.
  - The Test 1 and Test 2 charts are grayscale copies (`*_bw.png`), so their values are unchanged.
  - The flowcharts and tables were already monochrome.
  - Photographs, renders, the PCB, the schematic, the dashboard screenshot and the QR card keep their colour.
- **Check:** the LibreOffice PDF has no coloured text, highlight or table shading and runs to 22 pages.

## 2026-10-01 (09:00) — Fig. 1 single-column

- **System block diagram redrawn for one column** (`tools/deliverables/flowcharts/arch_col.dot` → `figures/f1_arch_col.png`). It is now vertical:
  - (a) stand-alone hub: beacons → wearable → SESEMSG hub ↔ phones;
  - (b) facility-network alternative;
  - the dashed cloud relay (further study) from the hub.

  It keeps every item of the earlier wide figure. The "JSON over HTTP" note moved into the caption.
- **Placed in 3.6 at column width** (about 8 pt printed). The paper body no longer has any full-width figure.
- The wide `f1_arch_v2.png` is still used by the user manual (single-column) and the deck.

## 2026-10-01 (08:30) — flowcharts in-column; appendices in two columns

- **Flowcharts redrawn narrow** (`tools/deliverables/flowcharts/c_*.dot`, shared style `col.inc`) so each fits one IEEE column at 7–11 pt:
  - wearable main loop;
  - background tasks: (a) BLE, (b) network and queue;
  - zone classification, with connector A for the no-beacon branch;
  - SOS button logic;
  - hub request handling and watchdog.

  They are placed in-line in 3.10 as Figs. 3–7, beside the text that describes them. Appendix G (the wide versions) is removed.
- **Appendices use the paper's two-column layout.** The BOM, schematic, PCB, door-node/beacon/enclosure figures and the firmware excerpts span both columns together with their headings; the text appendices are in columns, and the last page's columns are balanced.
- **Appendices relettered:**
  - A BOM;
  - B schematic;
  - C PCB;
  - D door node, beacon and enclosures;
  - E firmware excerpts;
  - F test data;
  - G manual and access card;
  - H signed forms.

  The body refers only to B and C, which are unchanged.
- **Checked** by rendering all 22 pages with LibreOffice: 19 figures and 23 tables in order.

## 2026-10-01 (07:45) — software flowcharts; paper layout check

- **New `tools/deliverables/flowcharts/`:** Graphviz sources for four flowcharts in ANSI symbols (terminator, process, decision, input/output), drawn from the code:
  - the wearable program: `setup()`/`loop()`, the BLE task and the network task;
  - `classifyZone()`;
  - `sosService()`;
  - the hub's ingest, merge, clear and watchdog rules.

  The PNGs are in `figures/`. To re-render: `dot -Tpng -Gdpi=300` after inlining `common.inc`.
- **Paper Rev 6:**
  - new **Appendix G — Software Flowcharts** (Figs. 14–17), referenced from 3.10;
  - Test Data, the manual/QR card and Signed Forms become H, I and J.
  - The charts were first placed in 3.10 as full-width figures, but that left half-empty pages, so they are now in the appendix.
- **Abstract:** the results sentence is now bold like the rest of the abstract, and no longer repeats the wall result stated in the sentence before it.
- **Layout checked** by rendering all 22 pages with LibreOffice:
  - two-column body without gaps;
  - tables I–XXIII and figures 1–18 in order;
  - references [1]–[13].
  - **Remaining:** the author e-mail placeholder.

## 2026-10-01 (07:00) — BOM from the team's purchase record; 2000 mAh cell; PLA

- **Paper Rev 6, Appendix A**, rebuilt from the prices the team gave:
  - 6 ESP32 boards (one failed and was replaced);
  - MAX17043 ordered but not delivered, ₱252;
  - Li-Po **2000 mAh**, ₱154;
  - TP4056 4 × ₱25;
  - MT3608 3 × ₱30;
  - SPDT ₱80;
  - passives and diodes from stock;
  - 2 reed switches ₱90;
  - headers ₱100;
  - screw terminals ₱90 (pack of 10);
  - perfboards 4 × ₱26;
  - presensitized copper-clad ₱700;
  - PLA printing ₱500;
  - 3 USB cables × ₱50.
  - **Still estimates (*), from the August spreadsheet:** ESP32 (₱350), MAX30102 (₱150), tactile switch (₱15).
  - **Total ₱4,774, of which ₱2,265 is estimated.** No JST connectors were used.
- **Battery 2000 mAh:** calculated runtime 20 h at 60 mA and 33 h at 35 mA (was 10 h and 16 h for 1000 mAh). Updated in paper 3.9.1, Table "runtime", conclusions and recommendations, the manual's specifications, and the deck. The schematic still shows 1000 mAh; the paper says so.
- **Enclosures are PLA, not PETG** (paper 3.11, Appendix figure, deck).

## 2026-10-01 (06:30) — drafts completed from the data that exist

The team decided not to repeat Test A. Every remaining placeholder was either replaced with logged data or stated plainly as not done; no value was estimated or invented.

- **Paper Rev 6:**
  - **Abstract:** the results sentence now carries Run 1 (no cross-room errors; 56.2 % in a shared room), SOS delivery (n = 6, median 295 ms) and door detection (4 of 4).
  - **4.5 rewritten as "Final Firmware in a Shared-Room Layout (Signal Snapshot)":**
    - the dorm layout as the team described it;
    - the 9 s of preserved data (open-room beacons within 0–4 dB; the beacon behind the wall 19–24 dB weaker);
    - why the bedroom-wing zone registered slowly;
    - a plain statement that the 15-point capture was overwritten.
  - **4.8:** door detection from the 29 Sep test (3 of 3) and the 30 Sep demo (1 of 1).
  - **4.9:** four events delivered after the link was down (7.5, 8.1 and 11.1 s at start-up; the demo's "delivered late").
  - **4.12:** battery-sense now reads 3.90–3.92 V, against 0.28 V before.
  - **4.13:** Run 3, the 20 door cycles, the outage trials, the ten heart-rate readings and runtime are listed as not performed.
  - **Chapter 5:** conclusions updated.
  - **BOM:** unit costs from the team's estimate spreadsheet (Aug 2026 supplier listings, marked *) where no purchase price is known.
  - **Removed:** placeholders with no material behind them (commercial products, flowcharts, photographs). Appendix J became I (signed forms attached to the printed copies).
  - **Remaining placeholder:** the author e-mail addresses.
- **Manual v0.3:**
  - enclosure renders and the door wiring diagram replace the photo placeholders;
  - wearing position: waist, belt clip;
  - heart-rate reading: fingertip on the sensor window;
  - runtime stated as not measured;
  - 10.2 carries the test-day results.
- **Deck v0.3 results slide:** Run 1 accuracy, SOS n = 6, heart rate n = 2, door 4 of 4.

## 2026-10-01 (05:45) — log_serial.py never overwrites

- **Change:** `tools/rssi_calibration/log_serial.py` now writes to `name_2.csv`, `name_3.csv`, … when the output file already exists and is not empty, and says so at start.
- **Why:** the Test A (Run 3) capture was lost this way. The pushed `test2_run3.csv` holds only 9 s.
- **Verified:** `free_path()` returns `x_2.csv` for an existing file and the name unchanged for a new one.

## 2026-10-01 (03:20) — dashboard: tabs not switching, page pulled up at the bottom

- **Tabs did not switch on the phone (a regression from 01:30).** The guard against swipe-taps used the settle timer that also starts when a finger lifts, so every plain tap on a tab was ignored.
  - **Fix:** only a real scroll event within the last 300 ms blocks a tab tap.
  - **Kept:** the open tab's button still does nothing, so a swipe that ends on the tab bar cannot jump to the top.
- **Page pulled up by a row near the bottom** when an alert cleared (more frequent now that "location unknown" and "not reporting" clear by themselves). Two causes:
  - the height hold was released by the page's own anchor scroll;
  - the hold only kept the height from when it was set.
  - **Fix:** the hold now only grows while you stay near the bottom, and only your own scrolling up releases it.
- **Verified in headless Chromium,** 390 × 664 phone viewport with touch, scroll anchoring turned off to behave like Safari, and the simulator feeding live alerts:
  - Alerts tab over 40 s: the page no longer shrinks under the reader (before, it lost 212 px and jumped up);
  - a tap on each tab switches it;
  - a tap on the open tab at the bottom keeps the position;
  - `node --check` passes, and `embed_dashboard.py` packs the page.
- **Takes effect on the hub after the door node is reflashed** (`pio run -e esp32hub`, COM7). The laptop dashboard needs the copied `static/`.

## 2026-10-01 (03:00) — charging indicator: recommendation only

- **No hardware or firmware change.** The wearable has no signal from the TP4056 to the ESP32, so it cannot know it is charging. A fuel gauge would not solve this either: the MAX17043 reports state of charge only.
- **Paper Rev 6, 5.2:** new recommendation to sense the charger's USB input through a divider on a free input pin (charging below 4.15 V, charged at 4.15 V or above). The fuel-gauge recommendation now names the MAX17048's charge rate.
- **Deck v0.3:** a matching next-steps bullet.
- **Manual v0.3, 6.2:** the dashboard does not show charging; check the charger's lights.

## 2026-10-01 (02:45) — Test B and C results into the drafts

- **Paper Rev 6, Tables "sos" and "hr", and deck v0.3 results slide** now carry the measured values from `data/test_day/`:
  - **SOS delivery:** n = 6, median 295 ms, maximum 408 ms;
  - **patterns:** 6 of 6 with the right message, and 2 escalations;
  - **acknowledgements:** 3 of 3 cleared the wearable;
  - **hold:** 1 of 1 cancelled an open SOS;
  - **heart rate:** n = 2, +3 and +0.5 bpm (MAE 1.75 bpm, preliminary).
- **Procedure text** states the actual counts (n = 6 and n = 2, not the planned 10). The Chapter 5 conclusions quote the same figures.
- **Still yellow:** Run 3 (A), door cycles (D), the network-loss trials, battery runtime, and the abstract sentence.

## 2026-10-01 (02:30) — documents and deliverables

- **Drafts regenerated** in `deliverables/drafts/`:
  - `TroDes_IEEE_Paper_DRAFT_Rev6.docx`;
  - `TroDes_Users_Manual_DRAFT_v0.3.docx`;
  - `TroDes_Defense_Presentation_DRAFT_v0.3.pptx`.
- **Paper Rev 6:**
  - the zone-unknown delay and its Wi-Fi pause (3.5, 3.10);
  - SOS hold ticks and the green cancel notice;
  - one-episode "location unknown" and "not reporting" alerts;
  - the Run 3 constants now ask which build was measured;
  - new paragraph in 4.10: the 30 Sep integrated demonstration, from the dashboard screenshots, with the three defects it exposed.
- **Manual v0.3:**
  - hold ticks and the green cancel notice in 4.1, 4.3 and 6.3;
  - alert table: when "location unknown" and "not reporting" are raised and cleared;
  - troubleshooting for "zone shows unknown";
  - specifications.
- **Deck v0.3:**
  - hardware subtitle and fabrication row now say etched wearable board with perfboard nodes;
  - SOS hold ticks;
  - the zone-unknown bullet;
  - results slide dated 1 Oct.
- **New `docs/project/Defense_Day_Checklist.md`,** from the adviser's briefing. It maps constraints, standards, design and "what we let go" to the deck slides and paper sections 3.8, 3.12 and 3.14.
- **Updated:**
  - `CLAUDE.md` / `AGENTS.md` "Where things stand";
  - `Resume_Here.md`;
  - `docs/project/INDEX.md`.
- **No test numbers added.** Tests B and C were captured on the laptop but are not in the repository yet; A and D are pending. Their cells stay yellow.

## 2026-10-01 (early morning) — alert flood, iPhone scroll, beacon dropouts

From the house test and the video-demo screenshots (`data/demo/2026-09-30/`).

- **"Location unknown" flood (wearable, hub, laptop server).** The alert is kept, but it now stands for one episode.
  - **Wearable:** the zone becomes unknown only after no beacon has been heard for about 8.5 s. That is the 2.5 s beacon timeout, then `ZONE_LOST_CONFIRM_TICKS` = 30 ticks (6 s); it was 0.4 s, so about 3 s in all. The dashboard keeps the last zone meanwhile.
  - **Wearable:** the count pauses while a WiFi scan or connection attempt holds the shared radio (`gRadioBusy`). During those, BLE hears almost nothing, which is why a beacon in the same room could appear to vanish.
  - **Hub and server:**
    - while a `zone_lost` alert is uncleared, a repeat is treated as the same episode;
    - it clears by itself ("back in range") on the first status with a known zone, or on a `zone_change` or `zone_restricted` alert.
- **"Device not reporting" raised every 5 s after an Acknowledge (hub and server).** The watchdog only looked for an *unacknowledged* open alert. It now looks for an *uncleared* one, so one outage gives one alert, which clears when the device reports again.
- **iPhone dashboard jumping to the top at the end of a list (`static/v2`).**
  - **Cause:** at the bottom, a swipe starting on the tab bar barely moves, and iOS treats it as a tap on the open tab. `setTab()` then scrolled to the top.
  - **Fix:** the open tab's button now does nothing, and tab taps while the page is still moving are ignored.
- **SOS long press looked the same as a short press.**
  - **Evidence:** the video run shows two "SOS PRESSED" entries and no "SOS dismissed". The hold was let go before 3 s, so the wearable correctly sent a 1-press SOS.
  - **Wearable:** a soft low tick each second while the button is held (`kBeepHoldTick`). The existing long low tone still marks the cancel at 3 s. The threshold is unchanged (3000 ms, still open with the adviser).
  - **Dashboard (`static/v2`):** a cancel now shows a short green notice, "SOS cancelled by the resident" (8 s, tap to close), instead of the red card just disappearing.
- **Verified:**
  - dashboard self-test 38/38;
  - a scratch-server test of the new rules:
    - a repeat `zone_lost` is merged, even after an Acknowledge;
    - an unknown status keeps it open, and a known zone clears it;
    - a new episode raises a new alert;
    - an Acknowledged offline alert is not raised again over 20 s, and clears on the next status;
  - `node --check` passes on `home.js`;
  - `embed_dashboard.py` packs the page.
- **Not yet verified here:** the firmware was **not compiled in the cloud session**, because the PlatformIO registry is blocked there.
  - **Compiled and flashed on the laptop, 1 Oct, about 03:00:** wearable on COM8, door node on COM7 (`esp32hub`), together with the SOS hold-tick and cancel-notice changes.
  - **Behaviour on hardware:** not yet reported.

## 2026-09-30 (night) — house test, data export

- **Dashboard database export** — `tools/field/export_db.py` writes
  `status_log`, `alerts`, `door_log` and `ack_log` to CSV, with a readable
  local-time column beside every timestamp. Opens the database read-only, so
  it can run while the dashboard is up.
  - **Run on the laptop (30 Sep, 22:20):** `C:\TroDesData\dashboard\data\trodes.db`
    returned 0 rows for 30 Sep. Expected: the house dry run and video used the
    SESEMSG hub (standalone, no uplink), so nothing reached the laptop server.
- **`.gitignore`:** Office lock files (`~$*`) excluded.
- No firmware change. Session record: `docs/project/House_Test_2026-09-30.md`.

## 2026-09-30 (evening) — fixes from the test run

Most of this code was already included in the build commits below. This section
records what each change is and how far it has been verified.

- **Heart rate never detected (wearable).**
  - **Cause:** SparkFun's `checkForBeat()` handles 16-bit samples only. Its DC estimator takes a `uint16_t`, and a pulse only counts if it swings 20–1000. The MAX30102 is set to 18 bits (411 µs pulses), so a finger reads about 100k–250k. The value wrapped at 65536 and strong pulses were rejected.
  - **Fix:** samples go to the detector as `ir >> 2`.
  - **New serial line:** `[HR] …` every 2 s while something is on the sensor, showing the IR level, beats seen and beats kept. It also flags a finger that reads below the 50 000 finger level.
  - **Verified on hardware (30 Sep, fingertip on the bench wearable, 60 s):**
    - IR about 125k–130k;
    - 86 beats detected;
    - about 5 s from finger on to the first reading;
    - it read 78–102 bpm and settled at 86–90 bpm;
    - one outlier re-learn, which recovered in about 4 s.
- **MAX17043 when fitted later (wearable).**
  - **Why:** the gauge is powered from the cell on its own JST lead, so it only answers while a battery is connected.
  - **Detection:** while the gauge is missing, the firmware probes again on every battery read, using a quiet address ping. The first read after it is found still uses the divider, because the gauge's SOC is still settling after its quick-start.
  - **Fallback:** it drops back to the R3/R4 divider if the gauge stops answering or reads outside 2.5–4.5 V. SOC is clamped to 0–100 %.
  - **Timing:** the first battery read is at 5 s instead of 30 s.
  - **Reporting:** the status JSON and the `[STAT]` line now say where the reading came from (`batt_src` / `src=gauge|adc`).
  - **Verified:** compiled. Not tested with a gauge, as none is fitted yet.
- **Status LED (wearable):** it now blinks briefly every 2 s, stays on while an SOS is open, and still flashes with each beep. Before, it only lit during beeps.
- **Dashboard on iPhone (`static/v2`):**
  - **Keyboard popping up:** iOS's "sign in to network" window auto-focused the name box, and AutoFill kept asking for a name. The box is now read-only, with AutoFill off, until a finger touches it. It unlocks on `touchstart`, so the keyboard opens on the first tap. The old blur-on-scroll made the keyboard flicker and is removed.
  - **Page jumping (Safari has no scroll anchoring):**
    - before each 1 s update, the row in view is noted and scrolled back into place afterwards;
    - updates wait while a finger is on the screen or the page is still moving;
    - near the bottom, the page may not get shorter during an update, helped by `main { display: flow-root }` in the CSS;
    - lists are only rewritten when their markup has changed.
  - **Verified in the browser at phone size:**
    - 5 alerts arriving mid-list: the row in view moved 374 px before, 0 px now;
    - rows removed at the end of the page: 0 px;
    - auto-focus on page load leaves the name box read-only (no keyboard).
  - **iPhone re-test pending.**
- **Door node:** it was found boot-looping (`rst:0x3` with no application output, i.e. no valid app in flash). Reflashed with the standalone hub build (`HUB_UPLINK=0`); SESEMSG is back on the air. No code change.

## 2026-09-30

Committed on branch `build-2026-09-30`. The work of 27–30 Sep: code, hardware
files, deliverables and notes.

- **Door node as a stand-alone hub (`env:esp32hub`, `-DHUB_MODE=1`).** New `src/hub.cpp`, `include/hub.h`, and `scripts/embed_dashboard.py`, which packs `dashboard/static/v2` into the generated, git-ignored `hub_page.h`.
  - **Network:** a WPA2 access point, SESEMSG at 192.168.4.1, with a DNS captive portal so phones open the dashboard on joining.
  - **Server:** a non-blocking HTTP server (10 connections), serving the same `/api/v1` contract as the laptop backend.
  - **State:** alerts, sessions and passcode lock-out are kept in RAM.
  - **Forwarding:** optional forwarding to the laptop, and a relay push.
  - **Why:** the system has to run with no laptop, router or internet.
  - **Verified on hardware:**
    - 17 of 17 network checks passed;
    - with 4 phones polling, the median reply is 32 ms;
    - the wearable held its connection for 10 min;
    - the dashboard opens on joining, on both Android and iPhone.
  - **Stall fix:** a phone in power-save mode could stall every client for more than 4 s. Replies are now sent without blocking, and simultaneous polls share one cached summary.
- **Wearable (firmware):**
  - **Networking:** it prefers the hub's network when in range. Auto-reconnect is off; it disconnects before scanning and re-picks a network after 4 failed POSTs.
  - **SOS patterns:** 1, 2 or 3 presses less than 0.7 s apart send three urgency levels, each confirmed by the same number of beeps. A stronger pattern escalates an open SOS.
  - **Acknowledgement:** the SOS state clears when the server reports no unacknowledged SOS.
  - **Timing log:** `[DELIVERED]` records how many ms each alert took to arrive.
  - **Verified:** on the bench, against a scratch server.
- **`firmware/wearable_selftest`** (new): a one-shot hardware report plus a live readout.
  - It covers the battery sense, both I²C buses, the MAX30102 ID, the button, buzzer and LED, and Wi-Fi and BLE scans.
  - **Run on the wearable, 30 Sep:** everything passed except battery sense (0.28 V), which is under investigation.
- **Dashboard:**
  - **New `static/v2` page:**
    - theme follows the phone;
    - alarm sound and vibration for an unacknowledged SOS, with the SOS message in the banner;
    - "reduce motion" respected.
  - **`app/auth.py`:** passcode sessions.
  - **Duplicate guard in `post_alert`:** an identical report within 30 s is merged, so a retried SOS is not stored twice.
  - **SOS escalation:** a new SOS retires the older open SOS.
  - **Classic page:** polls every 1 s.
  - **Verified:** self-test 38/38.
- **`relay/`** (new): a Cloudflare Worker and Durable Object for viewing the hub from any network.
  - **Verified:** local tests 15/15.
  - **Not deployed:** the hosting decision is still open.
- **Hardware files:**
  - **`hardware/wearable_pcb_revC3/`:** the etched board's KiCad project, its artwork and the power-pad map. The unsaved 28 Sep autosave is not included.
  - **`hardware/beacon_node/`:** the beacon node schematic and perfboard layout.
  - **`hardware/enclosures/`:** enclosures Rev A, Rev B and the node boxes, with STLs, A1 plate files and renders.
    - **Wearable Rev B:**
      - +5 mm for the wiring under the PCB;
      - four snap hooks into side-wall windows;
      - a 15 × 11 mm ESP32 USB-C opening;
      - a TP4056 charge-light window;
      - rounded edges;
      - a sliding dovetail belt clip with a detent.
    - **Checked in the model:** all parts manifold, and 31 part and component pairs with 0 overlap. **Not printed yet.**
- **Deliverables:**
  - **Generators:**
    - `paper_ieee.js`: an IEEE two-column full paper with Methods of Research, equations and appendices;
    - `make_figures.py` and `make_appendix_images.py`;
    - `perfboard_beacon.js`;
    - updated `paper.js` (Rev 4), `manual.js` (v0.2) and `deck.js` (v0.2).
  - **Output files:** the drafts, the figures, and the final Progress Report 3.
  - **Test tool:** `tools/field/test_day_report.py`.
- **Credentials:**
  - **The hub's Wi-Fi password is in two committed items**, added in a later commit at the team's request (the repository is private):
    - the panel QR card images (`tools/deliverables/figures/a_qr_card*.png`);
    - the IEEE paper Rev 5, which embeds that card in Appendix H.
  - **The dashboard passcode is kept out:**
    - the door node's `secrets.h.example` now shows a placeholder;
    - the repo copy of the Test Day note has it removed.
- **Docs and data:**
  - `docs/project/`: the hub note, the Test Day procedure and the shopping list;
  - `data/walk/`: the 30 Sep three-beacon walk capture;
  - `data/field/`: the 25 Sep door bench logs.

## 2026-09-26

- **Wearable PCB Rev C2 added** under `hardware/wearable_pcb/` (KiCad 9 project,
  project symbol/footprint libraries, etching/drill/placement PDFs, schematic
  PDF, 3D preview, DRC/ERC reports, README with the net-by-net connection
  table).
  - **Parts:**
    - MAX30102 on a 2 × 4 socket;
    - MAX17043 fuel gauge fitted on a 2 × 3 socket;
    - 12 × 12 mm SOS switch;
    - ESP32 devkit 55 × 28 mm on female headers.
  - **Layout:** no pour under the antenna.
  - **Verified in KiCad 9.0.3:**
    - DRC 0 errors, 0 warnings, 0 unconnected pads;
    - ERC 0;
    - schematic ↔ PCB 0 differences;
    - 7 courtyard overlaps excluded after checking the physical clearance.

- **Fuel gauge on its own I2C bus (wearable PCB Rev C2).** The MAX17043 is now
  fitted and, so that it and the MAX30102 both route on the single-sided board,
  it uses `Wire1` on IO4 (SDA) and IO16 (SCL): new `PIN_FG_SDA` / `PIN_FG_SCL`
  in `config.h`, `Wire1.begin()` and `gGauge.begin(Wire1)` in `main.cpp`. The
  heart-rate bus is unchanged (SDA IO22, SCL IO21). **Compiles**; not yet
  flashed. On a Rev B/C1 board or the perfboard (gauge absent or on the main
  bus) the firmware falls back to the R3/R4 divider as before.

## 2026-09-25

- **Offline queue fix (door node and wearable).** While WiFi was down, both
  boards queued periodic heartbeats/status snapshots, and a full queue discards
  its oldest entry — so real events were lost. Bench test: the door node
  dropped 3 events (`q=16 dropped=3`); the wearable (status every 5 s, 24
  slots) would have lost an SOS pressed during an outage after ~2 minutes.
  Now only real events (door changes; wearable alerts) are queued while
  offline; heartbeats/status are sent only while the link is up. Queue depth:
  door 16 → 64, wearable 24 → 48. **Verified** on the door node (offline, the
  queue held only the boot event after 30 s); wearable compiles, not yet
  flashed.
- **Door node reed moved from GPIO 27 to GPIO 18** (`PIN_REED 18`) so the
  perfboard needs only two short links beside the devkit. **Verified** on the
  bench: 8 opens + 8 closes, one event per movement, correct polarity.
- **Perfboard and wiring diagrams** in `tools/deliverables/`:
  `perfboard_map.js` (wearable, 6 × 8 cm, devkit soldered directly),
  `perfboard_door_map.js` and `perfboard_door_underside.js` (door node,
  5 × 7 cm, component and solder side), `door_wiring.js` (complete door-node
  wiring). Pin names follow the team's ESP32 DevKitC pinout.

- **Door node credentials** moved to a git-ignored
  `firmware/door_sensor/include/secrets.h` (template `secrets.h.example`),
  matching the wearable; `config.h` falls back to offline defaults. Zone
  comment corrected to the one-door demo scope. Compiles (esp32dev); not yet
  flashed.
- **`tools/field/field_report.py`** for the multi-room field test: `latency`
  pairs each `[ALERT]` in a serial capture with the dashboard's `received_at`
  (same laptop clock) for end-to-end alert latency; `doors` counts open/close
  events, door-opened alerts and heartbeat gaps in a time window. Tested
  against a live dashboard on a temporary database (0.40 s measured against a
  deliberate 0.4 s delay; 5 of 5 door openings counted).

- **Defense deliverable drafts** added under `deliverables/drafts/` (Word,
  PowerPoint and PDF): User's Manual v0.1 (15 pp.), defense presentation v0.1
  (13 slides, 10 min), IEEE paper Revision 3 (21 pp.), Progress Report 3 draft
  (4 pp.). Yellow highlights mark values not yet measured or decided.
- **Generators** added under `tools/deliverables/` (`manual.js`, `deck.js`,
  `paper.js`, `pr3.js`, `package.json`, README) with the paper's figures in
  `figures/`. `.gitignore` now allows those figures and ignores `node_modules/`.
- **Verified:** each draft opens in Word/PowerPoint and was rendered to PDF for
  a visual check; `paper.js` and `pr3.js` regenerate from the repository
  location.

## 2026-09-24

- **Proximity mode** (`ZONE_ENTRY_DBM`, default off = unchanged behaviour):
  a zone is entered only when its beacon is at least this strong, and between
  beacons the wearable keeps its last zone. For zones sharing one room (the
  defense room). Motivated by Test 2 Run 1: in one room only the ~1 m points
  classified reliably (−65 to −73 dBm); mid-room beacons were within 2–4 dB.
  Boot log states the mode.
- **Power profile** (`POWER_PROFILE`, default 0 = unchanged): profile 1 uses
  a passive scan at 30 % radio duty, CPU 80 MHz and a 10 s status period.
  Both settings can be overridden with `PLATFORMIO_BUILD_FLAGS` without
  editing `config.h`. Runtime not yet measured.
- **Credentials** moved to `firmware/wearable/include/secrets.h` (git-ignored;
  template `secrets.h.example`); `config.h` falls back to offline defaults.
- **`tools/runtime/runtime_report.py`**: battery runtime, report gaps and
  discharge curve (CSV, optional plot) from the dashboard SQLite database.
- **Verified:** compiles in the default, proximity (−72) and low-power
  configurations. Not yet flashed; proximity mode and profile 1 untested on
  hardware. Runtime report tested on a simulator database only.

- **Three-zone demo scope** (adviser-approved 21 Sep): `bedroom_wing` (1),
  `dining_hall` (2), `medicine_room` (11, restricted). Applied to
  `firmware/wearable/include/zone_table.h`, `dashboard/config/zones.json`
  (also one door node, one resident), the `simulate.py` demo script, and
  `docs/ZONE_CONFIG.md` / `docs/PHASE1_TEST_GUIDE.md` / `dashboard/README.md`.
  Removed zones are noted in each file for later extension.
- **Wearable I²C pins** SDA = IO22, SCL = IO21, for the Rev C PCB and the
  perfboard build.
- **Fuel gauge type** corrected to `MAX1704X_MAX17043` (U3 on the Rev B/C
  schematic); the MAX17048 setting would misread cell voltage.
- **Battery via the R3/R4 divider** (primary source on Rev B/C): 16-sample
  average with calibrated `analogReadMilliVolts`, and a piecewise Li-Po
  voltage→percentage table (`kLipoCurve`, a generic curve, not measured on
  this cell) replacing the linear map. `BATTERY_ADC_REF_V`, `BATTERY_FULL_V`
  and `BATTERY_EMPTY_V` removed; `BATTERY_ADC_SAMPLES` added.
- `docs/ZONE_CONFIG.md`: beacon TX power corrected to `ESP_PWR_LVL_P9`.
- `analyze_zone_accuracy.py`: accepts `zone@point` labels (per-point table)
  and reports the unresolved rate; stationary time excludes walking gaps.
  Labels without `@` analyse exactly as before.
- **Verified:** wearable firmware compiles and was flashed to the replacement
  devkit (ESP32-D0WD-V3); boot log shows `Zones : 3`, all three beacons heard,
  zone switching and the restricted alert work. Dashboard self-tests 38/38 and
  the scripted demo run clean against the three-zone config. Analyzer tested
  on synthetic captures only. Battery reading not yet checked against a
  multimeter on a real cell.

- Added `dashboard/` from `C:\TroDesData\dashboard` (code dated 2026-09-13):
  FastAPI backend (`app/`), SQLite schema in `app/db.py`, zone config,
  static frontend, `simulate.py` and `tools/selftest.py`. The live database
  (`data/trodes.db`), `.venv` and caches are excluded. **Verified 38/38
  self-tests pass** from the repository copy against a fresh temp database.
  Not yet fed real hardware data.

- Added `tools/vault_sync/Sync-TroDesVault.ps1`: two-way, newest-wins sync between the
  Obsidian vault (`Jeju_Data\TroDes - Elderly Monitoring`) and the SESEM folder,
  with folder mapping and backups of overwritten files. Supports `-WhatIf`.

- Seeded the repository from the vault's `Firmware/trodes_phase1` package
  (state as of 2026-09-21): `firmware/` (beacon_node, wearable, door_sensor),
  `tools/rssi_calibration/`, `docs/`, `CLAUDE.md`, `AGENTS.md`.
- Added `docs/DASHBOARD_BUILD_BRIEF.md` (the firmware → backend data contract).
- `.gitignore` extended for SQLite databases, virtualenvs and `.env`.
- No code behaviour changed. Hardware verification status unchanged — see
  `CLAUDE.md` "Where things stand".
