---
title: Open Questions
tags: [open-questions, sesem, needs-adviser]
status: open
---

# Open Questions — Bring to Next Consultation

Do not invent answers to these. If a task depends on one, say so and ask rather than assuming. See [[Decisions Log]] for what's already settled.

> **Settled 21 Sep 2026** and moved to [[Decisions Log]]: demo zone count (three),
> door node MCU (ESP32), target battery runtime (24 h), PCB approach
> (self-fabricated single-sided module-carrier), and the breadboard demo
> contingency. Board layer count and fabrication vendor are superseded by the
> self-fabrication decision.

- [ ] **Backend hosting** — local server (e.g., Raspberry Pi in the facility) or cloud-hosted? Affects budget, [[Current Design/PCB Design Plan Rev2|design constraints]], and defense demo setup.
- [ ] **WiFi-down fallback approach** — proposed default: wearable buzzes locally + LED blinks a distinct pattern, queues status, retries connection. Needs approval or an alternative (e.g. mesh relay through fixed beacon nodes).
- [ ] **SOS long-press threshold** — confirm exact hold duration (proposed: ~3 seconds).
- [ ] **Heart rate alert thresholds** — does an abnormal reading trigger its own alert, or is it display-only?
- [ ] **Number of door sensor nodes** needed for the defense demonstration.
- [ ] **Beacon node power source** — mains-powered (matching the door sensor node, since beacons are also fixed infrastructure) or battery-powered? Not stated in the current design docs; needed to finalize the beacon materials list.
- [ ] **Battery backup for door nodes** — should they keep working during a power interruption?
- [ ] **Schematic/layout review** — will the adviser review both before fabrication is ordered?
- [ ] **Safety standards** — confirm which specific IEC/IEEE standards to cite. Candidates: IEC 62133 (Li-Po battery safety), IEC 62368-1, IEEE 802.15.1 (Bluetooth), IEEE 802.11 (WiFi).
- [ ] **Measurable objective targets** — acceptable zone misclassification rate, maximum alert latency (seconds), minimum battery runtime (hours) — needed so Chapter 4 results can demonstrate objectives were met.
- [ ] **Commercial product comparison** — name at least one or two specific commercial elderly-monitoring products, with citation, for IEEE Paper §1.7.

## Related

[[00 Start Here]] · [[Decisions Log]] · [[Deliverables Tracker]]
