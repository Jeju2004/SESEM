---
title: "ARCHIVED: Original GPS/GSM Design Draft"
tags: [archive, superseded, do-not-use]
superseded_by: "[[Current Design/System Design Plan]]"
---

# ⚠️ ARCHIVED — Superseded by [[Current Design/System Design Plan]]

This is the original working title/concept before adviser consultation: **"Smart Elderly Safety and Emergency Monitoring System with Geofencing"** — outdoor GPS geofencing + GSM/SIM800L alerts + accelerometer-based fall detection.

**Do not build from this.** GPS, GSM/SIM800L, and accelerometer fall detection were all explicitly removed by the adviser. See [[Decisions Log]] for the current settled scope.

Full original document kept for traceability only: `Attachments/Elderly_Geofencing_Design_Draft_ORIGINAL.docx`

## Why archived

- GPS performs poorly indoors — the facility setting is indoor-only.
- SIM800L (2G) carries 2G-sunset risk in the Philippines and is unnecessary since the system runs on facility WiFi.
- Fall detection was removed by adviser decision; priority is localization, not motion sensing.

## Related

[[00 Start Here]] · [[Archive/Original PCB Plan (GPS-GSM)]] · [[Decisions Log]]
