# SESEM — TroDes

Electronics Design — Smart Elderly Safety and Emergency Monitoring System with
Geofencing: An Indoor BLE-Based Localization and Safety Monitoring System for a
Home for the Aged.

BS Electronics and Communications Engineering, Electronics Design — Mapua University

This repository is the single home for all project **code**: device firmware,
analysis tools, and the caregiver dashboard backend/database. Design notes,
decisions and reports live in the Obsidian vault
(`Documents\AA_Electronics Design (SESEM)`), which links back here.

## Layout

```
firmware/
  beacon_node/     ESP32 iBeacon advertiser — one flashed board per zone
  wearable/        ESP32 wearable — BLE scan, zone logic, SOS, HR, battery, WiFi
  door_sensor/     ESP32 reed switch node for restricted doors
tools/
  rssi_calibration/  serial capture + Test 1/2/3 analysis scripts
dashboard/         caregiver web dashboard — FastAPI + SQLite (to be added)
docs/              programming guide, test guides, zone config, project status
CHANGELOG.md       dated log of every code change
CLAUDE.md          project context for AI assistants (AGENTS.md is the same)
```

## Quick start

- Firmware: see `docs/BOARD_PROGRAMMING_GUIDE.md`. Build output goes to
  `C:\pio\` (configured in each `platformio.ini`).
- Tests: see `docs/PHASE1_TEST_GUIDE.md`. Run the Python tools with
  PlatformIO's Python: `C:\Users\Chester\.platformio\penv\Scripts\python.exe`.
- Dashboard data contract (what the firmware POSTs): `docs/DASHBOARD_BUILD_BRIEF.md`.

The original Phase 1 package README is kept at `docs/PHASE1_PACKAGE_README.md`.
