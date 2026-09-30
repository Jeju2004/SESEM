---
title: IEEE Paper Draft (Revision 2)
tags: [design, current, paper, ieee]
status: "Chapter 1 drafted, Chapters 2-5 skeleton with TODOs"
---

# IEEE Paper Draft — Indoor Elderly Localization and Safety Monitoring System for a Home for the Aged

Full formatted version: `Attachments/IEEE_Paper_Draft_Rev2.docx`

## Chapter status

| Chapter | Status |
|---|---|
| 1. Background and Introduction | Drafted — overview, target customer, problem statement, proposed solution, objectives, scope/limitations, comparison to existing products, significance |
| 2. Review of Related Literature | TODO — needs real citations, prioritize IEEE Xplore. See search terms below. |
| 3. Design Procedures | TODO — conceptual framework, block diagram, schematic, safety standards, component computations, software flowcharts, decision matrix |
| 4. Testing, Presentation, and Interpretation of Data | TODO — depends on [[Phase 1 BLE POC]] test results |
| 5. Conclusion and Recommendation | TODO — write after testing |
| Bibliography | TODO — IEEE citation format |
| Appendices | TODO — user manual, photos, datasheets, source code, floor plan, signed forms |

## Chapter 1 — key content

**Problem:** caregiver-to-resident ratios make continuous supervision impractical; wandering is a documented risk in elderly residents with dementia; no reliable way to summon help; existing commercial products are outdoor-GPS-focused with recurring subscription costs, poorly matched to indoor institutional use.

**TODO:** strengthen the problem statement with citable figures (falls among older Filipinos, dementia wandering prevalence) — pull actual papers, cite properly, do not cite numbers secondhand.

**Objectives:** see [[Current Design/System Design Plan]] (same objectives, restated for the paper).

**Limitations:** BLE gives zone-level not coordinate-level accuracy; system depends on facility infrastructure; no fall detection; heart rate readings are indicative, not clinical-grade.

## Chapter 2 — literature search terms

BLE RSSI indoor localization; indoor positioning elderly care facility; wandering prevention technology dementia; geofencing indoor beacon; IoT elderly monitoring system. Structure: (1) indoor localization techniques (BLE RSSI vs. WiFi/RFID/UWB), (2) wandering behavior in elderly/dementia populations, (3) existing institutional IoT elderly-monitoring systems, (4) the gap this project addresses. Prioritize IEEE Xplore; include ASEAN/local sources for Philippine context.

## Chapter 3 — design constraints (decision matrix, incomplete)

| Constraint | Trade-off | Alternatives considered | Decision + justification |
|---|---|---|---|
| Localization technology | Accuracy vs. cost and indoor reliability | WiFi RSSI, RFID, UWB, GPS | *(pending)* |
| Beacon density | Zone resolution vs. installation cost | Fewer beacons, coarser zones | *(pending)* |
| Battery capacity | Runtime vs. wearable size/weight | Larger cell, shorter charge cycle | *(pending)* |
| Caregiver interface | Accessibility vs. dev effort | Native mobile app | *(pending)* |
| Backend hosting | Reliability vs. infrastructure cost | Cloud vs. local server | *(pending)* |

Tie at least one row to **SDG 3** (Good Health and Well-Being); SDG 10 (Reduced Inequalities) supports the affordability argument.

Candidate safety standards: IEC 62133 (Li-Po battery safety), IEC 62368-1, IEEE 802.15.1 (Bluetooth), IEEE 802.11 (WiFi) — confirm with adviser.

## Chapter 4 — recommended test plan

| Test | Purpose | Key measurement |
|---|---|---|
| Zone detection accuracy | Verify correct zone identification | Correct vs. incorrect classifications across trials |
| Zone boundary behavior | Characterize flickering near boundaries | Frequency of misclassification/flicker |
| RSSI vs. distance profile | Establish distance-vs-signal relationship | RSSI (dBm) at measured distances |
| Door sensor reliability | Verify every open produces an alert, no false triggers | Detection rate over open/close cycles |
| SOS alert latency | Button press → dashboard alert time | Latency in seconds, averaged |
| SOS dismiss function | Long-press cancels, short-press doesn't | Success rate over trials |
| Heart rate accuracy | vs. reference device | Deviation in BPM |
| Battery endurance | Runtime on full charge, normal duty cycle | Runtime in hours to low-battery threshold |
| Low-battery alerting | Dashboard raises alert at defined threshold | Threshold voltage/percentage |
| Network loss fallback | Verify fallback behavior when WiFi drops | Activation time, recovery on reconnect |

This test plan feeds directly from [[Phase 1 BLE POC]] — the RSSI-vs-distance and zone-accuracy tests there ARE the first two rows of this table.

## Related

[[00 Start Here]] · [[Current Design/System Design Plan]] · [[Open Questions]] · [[Phase 1 BLE POC]]
