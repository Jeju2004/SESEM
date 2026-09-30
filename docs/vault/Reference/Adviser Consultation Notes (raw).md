# Adviser Consultation Notes

**Project:** Indoor Elderly Localization and Safety Monitoring System (BLE-Based)
**Course:** Electronics Design | **Program:** BS Electronics and Communications Engineering
**Setting:** Home for the aged (indoor care facility)

---

## 1. Decisions Made in Consultation

These came directly from the adviser/professor discussion and are considered settled unless revisited.

### Scope changes

| Item | Decision |
|---|---|
| Setting | Indoor only — a home for the aged. Outdoor tracking is out of scope. |
| GPS module | **Removed.** GPS is for outdoor use and performs poorly indoors. |
| Outdoor geofencing | **Removed.** Replaced by indoor zone detection. |
| Localization technology | **BLE (Bluetooth Low Energy)** using the ESP32's built-in radio, scanning fixed beacons per zone. |
| Fall detection (accelerometer/gyroscope) | **Removed.** Not required. Priority is localization and tracking, not motion analysis. |
| Caregiver interface | **Web application**, not a native mobile app. Accessible from any browser including a phone. |

### Features added

- **Heart rate sensor** on the wearable
- **Door sensors** at restricted-area entry points — door closed = safe, door opened = warning pushed to caregiver
- **Battery/power monitoring** on the wearable, surfaced on the GUI with a low-battery alert
- **SOS button** on the wearable, detected by the ESP32
- **WiFi-down fallback behavior** — required, approach still to be confirmed
- **User manual** — confirmed as a critical deliverable, not optional

### Confirmed behaviors

**SOS button logic**
- Short press → sends SOS alert to caregiver dashboard
- Long press (hold) → cancels/dismisses a false alarm

**Localization granularity**
- Room-level zone detection (which room the resident is in), **plus**
- Proximity to specific restricted points (door, medicine cabinet, etc.)

---

## 2. Critical Points Emphasized by Adviser

> These were flagged as the things that matter most for this project.

1. **Localization is the core deliverable.** Tracking the elderly resident indoors is the priority — not motion sensing, not outdoor coverage.
2. **The GUI is critical.** Caregiver-facing dashboard with predefined locations, safe vs. restricted zones clearly identified, and notifications.
3. **Power management is critical.** The wearable's battery must be monitored and reported, including a low-battery state on the GUI.
4. **The system must actually work.** A functioning prototype is required, not a mockup.
5. **The user manual is critical.** Treat it as a graded deliverable, not an afterthought.

---

## 3. Zone Map (sample facility layout)

### Safe zones
- Bedroom wing
- Dining hall
- Common area / garden

### Restricted zones — each requires a door sensor
- Medicine room
- Main exit door
- Stairwell

**Infrastructure:** one BLE beacon per zone for room-level tracking; magnetic reed sensors at each restricted-zone entry point.

---

## 4. Open Items — Bring to Next Consultation

- [ ] **Backend hosting** — local server (e.g. Raspberry Pi in the facility) or cloud-hosted? Affects budget, design constraints, and defense demo setup.
- [ ] **WiFi-down fallback approach** — proposed default: wearable buzzes locally + LED blinks a distinct pattern, queues status, retries connection. Needs approval or an alternative.
- [ ] **SOS long-press threshold** — confirm exact hold duration (proposed: ~3 seconds).
- [ ] **Number of zones/beacons for the demo** — a full facility is likely too large to build; confirm a scaled-down representative area is acceptable.
- [ ] **Heart rate alert thresholds** — does an abnormal reading trigger its own alert, or is it display-only?
- [ ] **Number of door sensor nodes** needed for the defense demonstration.
- [ ] **Target battery runtime** for the wearable — needed to size the duty cycle and battery capacity.
- [ ] **Battery backup for door nodes** — should they keep working during a power interruption?
- [ ] **Board layer count** — is 2-layer acceptable for both boards?
- [ ] **PCB fabrication vendor** and expected turnaround time.
- [ ] **Schematic/layout review** — will the adviser review both before fabrication is ordered?
- [ ] **Safety standards** — confirm which specific IEC/IEEE standards to cite in Chapter 3.

---

## 5. Technical Notes and Risks

### Two PCBs required
1. **Wearable device board** — ESP32, heart rate sensor (MAX30102), SOS button, buzzer, battery gauge (MAX17048), TP4056 charger, MCP1700-3.3 LDO
2. **Door sensor node board** — ESP8266/ESP32 + magnetic reed switch, mains-powered

### Key risks flagged

**Duty cycle drives battery life — and it's a firmware decision, not a hardware one.**
Continuous BLE scanning plus frequent WiFi reporting will drain the wearable within a working day. Rough estimate: ~60 mA average draw on a 1000 mAh cell gives ~16 hours. Set the target runtime first, then design the scan/report interval to meet it.

**Breadboard the BLE localization before committing to a PCB layout.**
Confirming that zone detection works at the intended beacon spacing matters more than having a finished board, and the result may change component or placement decisions.

**Antenna keep-out is non-negotiable.**
A compromised BLE antenna degrades RSSI readings, which directly degrades zone detection — the core function of the entire project. No copper pour, traces, or components in the keep-out area.

**Order PCBs early.**
Fabrication and shipping delays are the most common cause of missed defense deadlines. A board respin after a layout error can consume weeks.

---

## 6. Deliverables Tracker

| Deliverable | Due | Status |
|---|---|---|
| Progress Report 1 | Monday, Week 5 | Not started |
| Progress Report 2 | Monday, Week 7 | Not started |
| Progress Report 3 | Monday, Week 9 | Not started |
| Request for Billing Form | ~Week 7 | Not started |
| Defense / Oral Presentation | Week 9 (likely Friday) | Not started |
| IEEE Paper (initial) | Before/at defense | Ch. 1 drafted |
| User's Manual | With defense materials | Not started |
| Culminating Design Recommendation Form | At/after defense | Not started |
| Proof of Submission of Prototype | After defense | Not started |
| Revised IEEE Paper | After defense | Not started |

**Reminders:**
- Progress reports need adviser signature **with date**
- Upload as PDF only, no links
- No Request for Billing Form = no defense = automatic grade of 5
- Schematics must use IEEE standard symbols only
- Grading: 30% progress reports, 70% prototype

---

## 7. Consultation Log

> Add a new entry after each meeting.

### Meeting 1 — [date]
**Attendees:**
**Discussed:**
**Decisions:**
**Action items:**

### Meeting 2 — [date]
**Attendees:**
**Discussed:**
**Decisions:**
**Action items:**
