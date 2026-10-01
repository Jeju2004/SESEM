---
title: TroDes Project Dashboard
tags: [dashboard, sesem, electronics-design]
updated: 2026-09-24
---

# TroDes — Smart Elderly Safety and Emergency Monitoring System with Geofencing

BS Electronics and Communications Engineering — Electronics Design | Mapua University

This vault is the working database for the project. It replaces loose chat exports — every design decision, open question, and document lives here as a linked note.

## Current direction (one paragraph)

A wearable ([[Hardware BOM - Wearable]], power per [[Current Design/Final Hardware Plan Rev B]]: ESP32-WROOM-32 devkit + MAX30102 heart rate + SOS button + battery sense on GPIO 34, MAX17043 gauge optional) scans fixed BLE beacons (one per [[Zone Map|zone]]) to determine which room the resident is in. Magnetic reed sensors ([[Hardware BOM - Door Sensor]]) at restricted doors push immediate alerts on open. A web-based caregiver dashboard shows zone, alerts, battery, and heart rate in real time, with a defined local fallback when WiFi is down.

**This pivoted from an earlier GPS + GSM/SIM800L outdoor design — see [[Archive/Original GPS-GSM Draft]] and [[Archive/Original PCB Plan (GPS-GSM)]]. Those are archived. Do not build from them.**

## Core notes

- [[Resume Here]] — **current state and the ordered next steps. Read this first.**
- [[Work Log]] — dated record of every work session (newest first)
- [[Code Repository]] — all code lives in GitHub `Jeju2004/SESEM`
- [[Decisions Log]] — settled, adviser-approved decisions
- [[Open Questions]] — still needs adviser input, do not assume answers
- [[Deliverables Tracker]] — course deadlines and status (**defense Fri 2 Oct 2026**; billing form in `Billing Form/`)
- [[Dashboard Build Status]] — caregiver dashboard, 38/38 self-tests, code at `C:\TroDesData\dashboard`
- [[Zone Map]] — facility zones, safe vs. restricted
- [[Hardware BOM - Wearable]]
- [[Hardware BOM - Door Sensor]]
- [[Bill of Materials - Complete]] — consolidated list, all three boards, current finalization status

## Design documents

- [[Current Design/System Design Plan]]
- [[Current Design/PCB Design Plan Rev2]]
- [[Current Design/IEEE Paper Draft]]
- [[Current Design/Final Hardware Plan Rev B]] — current wearable power chain and parts list
- [[Current Design/PCB Layout Notes Rev C]] — **current board layout; etch this one**
- [[Current Design/KiCad Project Notes]] — schematic project notes and devkit pin-order check
- `Current Design/KiCad Rev C/` — the Rev C KiCad project; etching artwork in `artwork/` ([[Current Design/KiCad Rev C/artwork/BottomCopper_MIRRORED_for_toner_transfer.pdf|print this one]])

## Firmware / testing

- [[Phase 1 BLE POC]] — Phase 1 bring-up history (zone detection confirmed 3 Sep 2026)
- Test procedures and findings live in `Firmware/trodes_phase1/docs/project/` (snapshot as of 21 Sep); code is in the repository — see [[Code Repository]]

## Reference

- [[Reference/Project Instructions]] — full scope, hardware baseline, course rules
- [[Reference/Adviser Decision Sheet]] — the 21 Sep consultation sheet (outcomes are in [[Decisions Log]])
- [[Full Build Process]] — August end-to-end build plan, kept for history

## Where the copies live

- **This folder** (`Documents\AA_Electronics Design (SESEM)`) — the project folder: notes, PDFs, KiCad files, firmware snapshot.
- **Obsidian** — mirrored into the `Jeju_Data` vault (ID `bf3d9a0782ad4ea4`) as `TroDes - Elderly Monitoring`, in a numbered folder layout.
- **Claude project "TroDes"** — status and guide documents, kept in step with this folder.
- **GitHub `Jeju2004/SESEM`** — all code. See [[Code Repository]].

## Original formatted documents

Original `.docx` files (for submission-quality formatting) are kept in `Attachments/` — the notes above are the working/linkable versions of the same content.

## What's genuinely next

**Defense: Friday 2 October 2026.** The full ordered list is in [[Resume Here]]; the top of it:

1. **Finish the billing form** — payment and OR number, instructor and chair approvals. No form, no defense.
2. **Buy the MT3608 boost modules** and set the trimpot to 5.0 V before connecting the devkit — see [[Current Design/Final Hardware Plan Rev B]].
3. **Run Test 2 at three zones** — the confusion matrix is the headline result.
4. **Etch the Rev C board** ([[Current Design/PCB Layout Notes Rev C]]) and have it working by **Monday 28 September**, or the agreed breadboard fallback applies.
5. Chapters 2–5 of the IEEE paper are still TODO skeletons — literature review needs real citations (do not fabricate), Chapter 4 needs the test data.
