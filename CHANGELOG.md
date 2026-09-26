# Changelog

Dated record of every code change. Newest first. Each entry says what changed,
why, and whether it has been verified on hardware.

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
