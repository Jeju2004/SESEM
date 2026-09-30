# Adviser Consultation — Agenda

Prepared 2026-09-12. Bring this to the next consultation. Two purposes:
get PR1 signed, and clear the four decisions currently blocking hardware work.

Ask for a decision on each item, not discussion. Where we have a recommendation
we have said so, with the reasoning, so the adviser can approve or overrule
quickly.

---

## Part 1 — Progress Report 1 (needs signature with date)

PR1 is due **Monday, 21 September 2026**. It requires the adviser's signature
and date, and must be submitted as PDF (no links).

**What we can report as accomplished:**

- Design pivot from GPS/GSM outdoor geofencing to indoor BLE zone localization
- Three firmware builds complete and **working on real hardware**: zone beacon,
  wearable, door sensor node
- **BLE zone detection confirmed on hardware** — zone acquired in under 1 s,
  RSSI −48 to −52 dBm, iBeacon frame verified byte-for-byte on air
- Four firmware defects found and fixed during bring-up, documented with
  evidence (three were byte-order faults in the ESP32 BLE library)
- Measurement and analysis toolchain built and validated end to end

**Outstanding:** Chapter 4 test data, the caregiver dashboard, both PCB layouts,
and the user manual.

---

## Part 2 — Decisions blocking work (critical path)

### 2.1 Number of zones and beacons for the demo

**Why it blocks:** Test 2 (zone classification accuracy) — the headline number
of the whole project — requires at least two beacons in separate rooms. We have
one. Until this is settled, the core test cannot run.

**Our recommendation:** three zones (one restricted, two safe). Three
well-separated zones that classify reliably are more defensible than six that
flicker at the boundaries.

**Decision needed:** how many zones, and how many door sensor nodes.

### 2.2 Backend hosting — local server vs cloud

**Why it blocks:** the caregiver dashboard is a large share of remaining
prototype work and cannot begin until this is decided. It is also adviser
priority #2.

**Trade-off:** a local server (e.g. Raspberry Pi) works without internet, keeps
resident health data on-premises, and demos reliably without campus WiFi. Cloud
hosting is easier to reach remotely but depends on facility internet and raises
data-privacy questions for health information.

### 2.3 PCB fabrication approach and schedule

**Why it matters:** we intend to fabricate the boards ourselves rather than
order them. This removes shipping delay entirely, but should be explicitly
approved against the course's "working PCB prototype" requirement.

**Decision needed:** is in-house fabrication acceptable? Is a module-carrier
design (sensor ICs used as breakout modules, mounted on our own etched board)
acceptable? Will the adviser review the schematic and layout before we etch?

### 2.4 Door sensor node MCU — ESP32 or ESP8266

**Why it matters:** the BOM specifies ESP8266; the firmware and the board tested
on the bench are ESP32. This contradiction is currently in writing in our own
documents.

**Our recommendation:** standardize on ESP32 across all boards — one MCU family,
one toolchain, shared spares, and the node is mains-powered so the higher
current draw costs nothing.

---

## Part 3 — Design concern to raise before the PCB is committed

**The MCP1700-3.3 regulator may be under-specced for the wearable.** It is rated
250 mA maximum. ESP32 WiFi transmit bursts commonly draw 250–350 mA. An
under-specced regulator causes brownout resets that present as random crashes
and are very difficult to diagnose once the board is fabricated.

**Ask:** should we substitute a higher-current LDO or a buck converter for the
wearable, accepting higher quiescent current, before layout?

---

## Part 4 — Shorter open items

| Item | Current state | Needed |
|---|---|---|
| Target battery runtime | Unset | A number, to size duty cycle and cell capacity |
| WiFi-down fallback | Queue-and-retry + local buzzer/LED implemented as proposed | Approve or revise |
| SOS long-press threshold | 3000 ms, proposed | Confirm |
| Heart rate alerting | Display-only in firmware | Own thresholds, or display-only? |
| Beacon power source | Mains assumed, never stated | Confirm |
| Door node battery backup | None | Required or not? |
| IEC/IEEE standards for Ch 3 | Candidates: IEC 62133, IEC 62368-1, IEEE 802.15.1, IEEE 802.11 | Which to cite |

---

## Part 5 — Dates to confirm

The class suspensions shifted the schedule. We know PR1 is 21 September. We need
confirmed dates for:

- [ ] Progress Report 2
- [ ] Progress Report 3
- [ ] **Request for Billing Form** — no form means no defense, automatic 5
- [ ] **Defense / oral presentation**

The defense date determines how much slack the hardware has, so this is the
single most important thing to leave the meeting with.
