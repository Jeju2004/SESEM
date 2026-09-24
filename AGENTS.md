# TroDes — Indoor Elderly Localization and Safety Monitoring System

Electronics Design capstone, BS ECE, Mapúa University. Two-person team.
Course requires a **working PCB prototype** defended before a panel, plus an
IEEE-format paper and a user manual.

A wearable worn by an elderly resident uses BLE to determine which zone of a
care facility they are in, by scanning fixed beacons placed one per room.
Magnetic reed sensors at restricted doors raise alerts on open. A web-based
caregiver dashboard shows zone, alerts, battery and heart rate in real time.

---

## Out of scope — do not reintroduce

These were removed by adviser decision. If a request pulls the design back
toward any of them, **flag it rather than going along with it**:

- GPS module or outdoor geofencing — performs poorly indoors
- Accelerometer/gyroscope fall detection — removed; priority is localization
- GSM/cellular, especially SIM800L — 2G sunset risk in PH, and unnecessary on facility WiFi
- Native mobile app — the caregiver interface is a browser page

## Settled — do not re-litigate without adviser sign-off

| Item | Decision |
|---|---|
| Localization | BLE, ESP32 built-in radio, one beacon per zone, room-level |
| Caregiver interface | Web app, browser-based, works on phone |
| SOS button | Short press = alert; long press ≈3 s = dismiss (exact threshold still open) |
| PCB fabrication | Self-fabricated, hand-etched, **single-sided with jumper wires** |
| PCB design | **Module-carrier** — ESP32/MAX30102/MAX17048/TP4056 on headers, not bare ICs |
| Demo zone count | **Three**: `bedroom_wing`, `dining_hall` (safe), `medicine_room` (restricted) |
| Door node MCU | **ESP32** (BOM still wrongly says ESP8266 — correct it) |
| Battery runtime target | **24 h** — see the gap below |
| Defense contingency | If the etched board fails, demo on breadboard with the board shown as under-debug |

**Battery gap, open:** 24 h target with a 1000 mAh cell needs average draw
≈35 mA. Present draw is ~60 mA, giving ~14–16 h. Closing it is a firmware
duty-cycle change — longer scan and report intervals. Measure the result; do
not calculate it and call it measured.

## Zone table — three files must agree

iBeacon UUID `5ca9015e-adc8-40a9-a1e2-d539f3b065bd`, major `1`. The wearable
discards any advertisement whose UUID or major does not match.

| Minor | Zone | Class |
|---|---|---|
| 1 | `bedroom_wing` | Safe |
| 2 | `dining_hall` | Safe |
| 3 | `common_area_garden` | Safe |
| 11 | `medicine_room` | Restricted |
| 12 | `main_exit` | Restricted |
| 13 | `stairwell` | Restricted |

Safe = 1–9, restricted = 11–19. Kept in sync across
`beacon_node/include/zone_config.h`, `wearable/include/zone_table.h`,
`door_sensor/include/config.h`. Disagreement fails **silently** — the wearable
simply never sees a beacon it recognises.

---

## Environment — these waste an hour each if forgotten

- **Builds go to `C:\pio\`.** The vault path contains `(SESEM)`; the
  parentheses break PlatformIO's SCons layer on Windows and Python file
  creation. Already configured in each `platformio.ini` — do not "fix" it.
- **Captures go to `C:\TroDesData\`.** Same reason.
- **Flash one board at a time, with only that board plugged in.** CH340 chips
  have no unique serial; Windows reassigns COM ports by USB socket. Prefer
  `pio run -t upload --upload-port COMxx` over editing `platformio.ini`.
- **Use PlatformIO's Python** for the analysis tools — pyserial and matplotlib
  are installed there, not in the system Python:
  `& "C:\Users\Chester\.platformio\penv\Scripts\python.exe"`
- The `.zip` beside this folder is **stale**. Edit the folder.
- The wearable needs `board_build.partitions = huge_app.csv` — BLE + WiFi +
  ArduinoJson + two SparkFun libraries exceed the default app partition.

## `zone_config.h` is a per-flash file — the main footgun

Every beacon runs identical code; only `ZONE_ID` / `ZONE_NAME` differ, and they
are **edited before each flash**. Two beacons flashed with the same zone id
present as wild RSSI noise, not as a configuration error.

**Current state: set to `dining_hall` / id 2.** Set it back before reflashing
any other beacon.

**All beacons must stay at `ESP_PWR_LVL_P9`.** Mismatched transmit power makes
RSSI values non-comparable between zones and destroys the meaning of the Test 2
confusion matrix.

---

## Where things stand

**Working:** all three board types bring up clean. BLE zone detection confirmed
on hardware. Two beacons matched within 1 dB at P9, usable range ≈8 m to the
−88 dBm floor. Caregiver dashboard built, 38/38 self-tests passing, not yet fed
real hardware. Progress Report 1 signed.

**Firmware constants are still placeholders** in `wearable/include/config.h`:
`PATH_LOSS_EXPONENT 2.5f` and `MEASURED_POWER_1M (-59.0f)`. Test 1 replaces
both. `HYSTERESIS_DB 4.0f`, `CONFIRM_TICKS 3`, `RSSI_FLOOR_DBM -88.0f`.

**`RSSI_FLOOR_DBM` is a classification threshold, not a hardware clip.** The
radio reports well below it (captures show −96 dBm). Do not exclude
sub-threshold samples when fitting path loss — that biases the exponent.

**Tests:** Test 1 needs a clean redo. The existing `C:\TroDesData\dryrun.csv`
is from 6 Sep — before the P9 change on 13 Sep, single-beacon, and captured on
a `DEBUG_BLE_SNIFF = 1` build. Not reusable. Tests 2 and 3 not started.

**Not started:** both PCB layouts, user manual, battery runtime measurement,
all Chapter 4 data, Chapter 2 literature review, Chapter 3 decision matrix.

---

## Course rules that cost marks

- Schematics must use **IEEE/ANSI standard symbols only** — in KiCad pick the
  `_US` variants (`Device:R_US` zigzag, not `Device:R` rectangle)
- Progress reports need the adviser's signature **with date**, PDF only
- **No Request for Billing Form = no defense = automatic grade of 5**
- Chapter 3 needs a decision matrix tied to an SDG (SDG 3 fits)
- Chapter 4 needs, per test: title, purpose, assumptions/constants, full
  procedure, data table, analysis
- Chapter 5 = directions for further study, not excuses for incomplete work

## How to help

- **Be direct.** If a design choice will not survive the panel, say so.
- **Distinguish settled from open.** Never present a guess as a decision the
  group already made. `docs/project/` and the vault's `Open Questions.md` say
  which is which.
- **Prefer concrete numbers** — current draw, runtime, RSSI, latency. Panelists
  ask for measured values.
- **Never fabricate a citation or a statistic.** If a figure is needed, say
  what to search for.
- Conversational Taglish is fine; **all document output in formal academic
  English**.

## Docs

`docs/` — board programming guide, test guides, zone config
`docs/project/` — status and design docs mirrored from the Codex project
Vault root — `Decisions Log.md`, `Open Questions.md`, `Deliverables Tracker.md`
