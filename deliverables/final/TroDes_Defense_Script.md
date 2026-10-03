# TroDes Defense Script

1 October 2026 · Defense speaking script for deck v0.5 (`deliverables/drafts/TroDes_Defense_Presentation_DRAFT_v0.5.pptx`). Live copy: the TroDes Defense Script doc in Claude.

## How to use this script

The script runs about 8 minutes, demo included, leaving 2 minutes of buffer in the 10-minute slot. Speaker A presents slides 1–6, does the demo actions and closes; Speaker B presents slides 7–11 and narrates the demo.

Speaker A = ____________ · Speaker B = ____________

| Slide | Title | Speaker | Starts at | Length |
| --- | --- | --- | --- | --- |
| 1 | Title | A | 0:00 | 10 s |
| 2 | Introduction | A | 0:10 | 25 s |
| 3 | Background | A | 0:35 | 20 s |
| 4 | System architecture | A | 0:55 | 30 s |
| 5 | Hardware and enclosures | A | 1:25 | 35 s |
| 6 | How it decides | A | 2:00 | 30 s |
| 7 | Design constraints | B | 2:30 | 20 s |
| 8 | Standards | B | 2:50 | 15 s |
| 9 | SDG 3 | B | 3:05 | 15 s |
| 10 | What we let go | B | 3:20 | 20 s |
| 11 | Results | B | 3:40 | 25 s |
| 12 | Live demonstration | B narrates, A demonstrates | 4:05 | 3 min 30 s |
| 13 | Conclusions | A | 7:35 | 20 s |
| 14 | Questions | Both | 7:55 | — |

- Square brackets are actions, not lines.
- Not on the demo slide by 5:00? Skip slides 8–10.

## Slides 1–4: introduction, background, architecture (Speaker A)

### Slide 1 — Title (0:00–0:10)

Good morning. We are Chester John Cirio and Pathrish Anne Cruz, advised by Engineer Glenn Magwili. Our project is TroDes, an indoor safety monitoring system for a home for the aged.

### Slide 2 — Introduction (0:10–0:35)

TroDes tells caregivers where each resident is indoors, and calls them when something is wrong. A wearable on the belt finds its zone from Bluetooth beacons and carries an SOS button and a heart rate sensor. Restricted doors have magnetic sensors. Caregivers follow it all on their phones — no app, no laptop, no internet.

### Slide 3 — Background (0:35–0:55)

About 5.86 million Filipinos were 65 or older in the 2020 Census. In a home for the aged, a few caregivers watch many residents, who may wander into restricted areas or be unable to call for help. GPS fails indoors, so with our adviser we moved to indoor BLE.

### Slide 4 — System architecture (0:55–1:25)

The beacons only broadcast. The wearable compares their signals, decides the zone itself, and reports over Wi-Fi to the door node, which is also the hub: it runs its own network, applies the alert rules and serves the dashboard to phones. A computer on the facility network is the fallback, and with no network at all the wearable keeps its alerts until the link returns.

## Slides 5–6: technical aspect (Speaker A)

### Slide 5 — Hardware and enclosures (1:25–2:00)

[Hold up the wearable.] The wearable is our etched single-sided board, Revision C3, with the ESP32 and the heart rate module on headers. A 2000 milliamp-hour cell feeds a charger and a 5-volt boost converter. Battery level is read through a divider; the fuel-gauge socket is empty because the module was not delivered. It sits in a 3-D printed case with a belt clip. [Hold up a beacon and the door node.] The beacons and the door node are on perfboard, in printed boxes.

### Slide 6 — How it decides (2:00–2:30)

Every 200 milliseconds the wearable smooths each beacon's signal and picks the strongest. A new zone must lead by 5 dB — for 0.4 seconds on a clear lead, or 1.6 seconds when signals are close — so it does not flicker. It never estimates distance; Test 1 showed that fails indoors. One to three SOS presses set the urgency, and a 3-second hold cancels.

## Slides 7–11: constraints, standards, SDG, what we let go, results (Speaker B)

### Slide 7 — Design constraints (2:30–2:50)

BLE scored highest in our decision matrix, 4.30, ahead of UWB, Wi-Fi, RFID and GPS. The materials cost 4,774 pesos, part of it estimated. With no low-dropout regulator available we used a boost converter, so the runtime is about 20 hours, calculated, against a 24-hour target.

### Slide 8 — Standards (2:50–3:05)

We follow IEC 62133-2 and IEC 62368-1 for battery and equipment safety, the Bluetooth and IEEE 802.11 standards, and the Data Privacy Act — so the dashboard is passcode-protected and the data stays on site.

### Slide 9 — SDG 3 (3:05–3:20)

This supports SDG 3, Good Health and Well-Being: residents can call for help from anywhere, an SOS reaches the hub in a median of 295 milliseconds, and the system needs no subscription.

### Slide 10 — What we let go (3:20–3:40)

On our adviser's decision we let go of GPS, GSM and fall detection, and we built no native app. The low-dropout regulator and the fuel gauge did not arrive. The runtime is calculated, not measured, and remote viewing awaits a hosting decision.

### Slide 11 — Results (3:40–4:05)

No errors occurred between rooms separated by a wall; with two zones in one room, accuracy was 56.2 percent on earlier firmware. SOS alerts reached the hub in a median of 295 milliseconds, heart rate was within 3 bpm on two readings, all four door openings were detected, and alerts raised offline were delivered on reconnecting. Now, the demonstration.

## Slide 12: live demonstration (4:05–7:35)

B narrates; A walks with the wearable. Before slide 12, A stands at the Bedroom Wing beacon and B hands out the access cards.

1. **Join by QR (about 30 s)**
   - B: Please scan the first QR code on your card; the dashboard opens on your phone. The two ends of this room are the bedroom wing and the dining hall; the medicine room is behind that door.
   - [Wait for the dashboards; QR code 2 opens the page if needed.]
2. **Walk the zones (about 25 s)**
   - A: [Walk from the Bedroom Wing beacon to the Dining Hall beacon.]
   - B: Bedroom Wing shows as safe. Walking to the dining hall, the zone changes once that beacon leads.
3. **Open the door (about 15 s)**
   - A: [Open the medicine-room door.]
   - B: Opening the medicine-room door raises a door alert.
4. **Enter the Medicine Room (about 20 s)**
   - A: [Walk in and stand near the medicine-room beacon.]
   - B: The restricted zone sounds the buzzer and raises a critical alert.
5. **SOS, one then three presses (about 30 s)**
   - A: [Press once; after the alert, press three times quickly.]
   - B: One press asks for assistance; three escalate it to an emergency, with an alarm on every phone.
6. **Hold 3 s to cancel (about 15 s)**
   - A: [Hold about 3 s, until the long low tone.]
   - B: Holding for three seconds cancels a false alarm; the dashboard turns the alert green.
7. **Acknowledge (about 20 s)**
   - B: [Tap Acknowledge.] A caregiver acknowledges; each acknowledgement is logged with name and time.
   - B: That completes the demonstration.

**If the hub misbehaves, decide within 30 s:** switch to the laptop server, or play the backup video and say that it is the recording of 30 September.

## Slide 13: conclusions (7:35–7:55, Speaker A)

TroDes detects the resident's room with no errors across walls, delivers door, restricted-zone and SOS alerts end to end, and runs without a laptop or internet. Our main limit is runtime, which is calculated, not measured. Thank you — we welcome your questions.

## Prepared answers to likely questions

Answer in one or two sentences, then stop; offer the paper section if the panel wants more.

| Question | Answer | Paper |
| --- | --- | --- |
| Why BLE, not UWB or Wi-Fi? | Highest weighted score, 4.30: UWB costs more per zone, Wi-Fi drains the wearable, and a facility needs the room, not coordinates. | 3.12 |
| Why only 56.2 %? | That is Run 1 on earlier firmware with two zones in one room; across walls there were no errors, since a wall gives about 20 dB of margin. | 4.3, 4.5 |
| Result on the final firmware? | The 15-point run's capture was overwritten before analysis; only 9 s survive, and the logger no longer overwrites. | 4.5, 4.13 |
| Does it run on its battery? | On 30 Sep it ran from USB only because of a power-path loss; on 1 Oct the cell reached the board (3.90–3.92 V), but operation under load was not re-measured. | 4.12 |
| Why under 24 h? | About 20 h at 60 mA and 33 h at 35 mA, both calculated; a buck-boost converter would give about 54 h. | 3.9.1, 5.2 |
| Why is n below 2.0? | Values somewhat below 2 occur indoors, but 0.28 and 0.55 are far lower, and the same pattern with two beacons points to fading at fixed positions. | 4.1 |
| If the Wi-Fi or hub fails? | The wearable keeps its alerts and delivers them with their original time on reconnecting (7.5–11.1 s logged); the laptop server is the fallback. | 3.6, 4.9 |
| How many phones? | Up to seven plus the wearable; with four polling every second, the median reply was 32 ms. | Fig. 1, Table XIX |
| Heart rate accuracy? | Within +3 and +0.5 bpm on two readings (MAE 1.75 bpm): preliminary, and for information only. | 4.7 |
| Why is the fuel-gauge socket empty? | The MAX17043 was ordered but not delivered; the firmware detects it automatically once fitted. | 3.14 |
| Where is the data stored? | On site, behind WPA2 and a passcode, in line with the Data Privacy Act. | 3.8 |
| Why are the nodes on perfboard? | Adviser-approved; only the battery-powered wearable needed the compact etched board. | 3.11 |
| "Geofencing" without GPS? | The beacons define indoor zones; entering a restricted one crosses the fence and raises an alert. | Not defined in the paper |
| Why did the hub restart on 30 Sep? | The cause is not yet identified; its history is kept in memory, and persisting it is a recommendation. | 4.10, 5.2 |
