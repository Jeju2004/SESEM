# Project docs mirrored from the Claude project

These are copies. The authoritative versions live in the **TroDes** Claude
project, which is reachable from claude.ai on any device and holds the document
tooling (progress reports, the IEEE paper, the user manual).

## Here — everything the bench work needs

| File | What it is |
|---|---|
| `Resume_Here.md` | Current state and the ordered next steps. **Start here.** |
| `Test1_Restart_Plan.md` | RSSI-vs-distance procedure and analysis |
| `Test2_Test3_Field_Protocol.md` | Zone accuracy and hysteresis, in Chapter 4 format |
| `RF_Link_Budget_Findings.md` | Why the beacons run at P9, and the diagnostic method |
| `iBeacon_Byte_Order_Bugs.md` | The three silent byte-order faults. Read before debugging any BLE reception problem |
| `Schematic_Work_Package.md` | KiCad build order and the IEEE symbol rules |
| `SESEMSG_Hub_No_Laptop.md` | The door node as a stand-alone hub: its own Wi-Fi, the dashboard on phones, no laptop or internet (copied from the vault, 30 Sep) |
| `Test_Day_2026-09-30.md` | Test-day procedure for the final data (Run 3, SOS, heart rate, doors, Wi-Fi loss) and the defense-day checklist (passcode removed in this copy) |
| `Shopping_List_2026-09-27.md` | Parts bought for the Rev C3 build |
| `House_Test_2026-09-30.md` | Night-before house test: dry run and video done, hub restarts, what was lost, open actions |
| `Defense_Day_Checklist.md` | Adviser briefing: what to cover, what to bring, after-defense submissions, morning checks |

Also in the vault root: `Decisions Log.md`, `Open Questions.md`,
`Deliverables Tracker.md`, `Wearable Schematic Spec.md`.

## Vault snapshot — `docs/vault/`

A copy of the vault mirror (`Documents\AA_Electronics Design (SESEM)`) taken
30 Sep 22:22: notes, progress reports (signed PDFs), the billing form, design
PDFs and deliverable drafts. **It is a snapshot, not a live sync** — edit the
vault, then copy again. Two things to know:

- It was copied from the **mirror**. The Obsidian primary vault
  (`Documents\Jeju_Data\TroDes - Elderly Monitoring`) is newer if
  `tools/vault_sync/Sync-TroDesVault.ps1` was not run first.
- The dashboard passcode was removed from `Work Log.md` and
  `Test Day 2026-09-30.md` in this copy, as for `docs/project/`.

## Still only in the Claude project

`Dashboard_Build_Status.md`, `Dashboard_Build_Brief.md`, `Plan_To_Defense.md`,
`Adviser_Decision_Sheet.md`, `00_START_HERE.md`, `Phase1_Firmware_Status.md`,
`Bill_of_Materials.md`, and the Progress Report 2 draft. The vault snapshot has
copies of most of these (`Dashboard Build Status.md`, `Plan to Defense.md`,
`Reference/Adviser Decision Sheet.md`, `00 Start Here.md`,
`Bill of Materials - Complete.md`, `Progress Reports/PR2_Progress_Report_2.docx`);
the Claude project versions may be newer.

## Keeping the two in sync

Claude Code does the bench work; the Claude project keeps the record. When
something lands here — a test result, a flashed board, a fitted constant —
write it back to the project so the status stays true on every device.
