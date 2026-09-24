# Changelog

Dated record of every code change. Newest first. Each entry says what changed,
why, and whether it has been verified on hardware.

## 2026-09-24

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
