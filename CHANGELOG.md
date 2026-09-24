# Changelog

Dated record of every code change. Newest first. Each entry says what changed,
why, and whether it has been verified on hardware.

## 2026-09-24

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
