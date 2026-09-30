---
title: Code Repository
tags: [code, github, sesem]
---

# Code Repository

**All project code lives in GitHub: `https://github.com/Jeju2004/SESEM`** (private).
Local clone: `C:\Users\Chester\Desktop\Vaya\SESEM`.

This vault holds design notes, decisions and reports. The repository holds
code: firmware, analysis tools, and the caregiver dashboard backend and
database. Every code change is committed there and noted in its
`CHANGELOG.md`; the session is also summarised in [[Work Log]].

## Layout

| Path | Contents |
|---|---|
| `firmware/beacon_node` | ESP32 iBeacon advertiser, one per zone |
| `firmware/wearable` | ESP32 wearable — BLE scan, zone logic, SOS, HR, battery, WiFi |
| `firmware/door_sensor` | ESP32 reed switch node |
| `tools/rssi_calibration` | Serial capture and Test 1/2/3 analysis |
| `dashboard/` | Caregiver dashboard — FastAPI + SQLite, simulator, self-tests (committed `50d3a13`, 38/38 pass) |
| `tools/vault_sync` | `Sync-TroDesVault.ps1` — two-way sync between this folder and the Obsidian vault |
| `tools/runtime` | `runtime_report.py` — battery runtime and discharge curve from the dashboard database |
| `data/` | Raw Test 1 / Test 2 captures (backup of `C:\TroDesData`), with a README of which files are usable |
| `deliverables/drafts/` | Defense deliverable drafts — manual, presentation, IEEE paper, Progress Report 3 (Word/PowerPoint + PDF) |
| `tools/deliverables` | Generators for those drafts (`node paper.js …` etc.; see its README) |
| `docs/` | Programming guide, test guides, zone config, [[Dashboard Build Brief]] |

## Source of truth

The repository is now the working copy for code. `Firmware/trodes_phase1` in
this vault is the pre-repository snapshot (2026-09-21), and
`C:\TroDesData\dashboard` is the pre-repository dashboard copy (2026-09-13) —
edit the repository, not those copies. The live dashboard database
(`data/trodes.db`) is deliberately not committed.

The repository path has no parentheses, so PlatformIO and Python work there
directly; the `C:\pio\` build directory in each `platformio.ini` still applies.

## Related

[[00 Start Here]] · [[Work Log]] · [[Phase 1 BLE POC]]
