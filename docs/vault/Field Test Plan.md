---
title: Field Test Plan
tags: [field-test, testing, chapter-4, demo, sesem]
updated: 2026-09-25
---

# Field Test — Multi-Room Private Residence

A demonstration and real-life test of the complete prototype in a house, with
**each zone in its own room**. This is the deployment case the design claims
(one beacon per room, walls between zones) — the case the school test could not
provide, where two beacons had to share a room.

In all documents refer to the site as **"a multi-room private residence"**. Do
not record the address, and do not photograph household members; photos show
rooms, devices and the dashboard only. Ask the household's permission for the
test, the photos and the overnight run.

**Time needed:** about 3 hours for Parts A–F; Part G runs overnight.

---

## Before you go — pack list

- [ ] Wearable (perfboard, or breadboard if not ready), charged; MT3608 checked at **5.0 V**
- [ ] 3 beacons + 3 USB adapters (or power banks checked for auto-off)
- [ ] Door node + USB adapter + reed switch/magnet + tape
- [ ] Laptop + charger, USB data cable, the repo on the Desktop
- [ ] WiFi name/password for the house → `firmware/wearable/include/secrets.h`
      (and the door node's) with the laptop's IP as `BACKEND_BASE_URL`
- [ ] Tape measure, masking tape + marker (point labels), phone for photos/video
- [ ] Printed copy of this plan and of [[Test 2 Field Sheet]]
- [ ] Pulse oximeter or smartwatch, if available, for the heart-rate comparison

## 1. Set up (30 min)

1. **Pick three rooms** with walls between them and assign zones:

| Zone | Room in the house | Beacon position | Room size (m) |
|---|---|---|---|
| `bedroom_wing` (safe) | | | |
| `dining_hall` (safe) | | | |
| `medicine_room` (restricted) | | | |

2. Place each beacon **centrally in its room**, 1.2–1.5 m high, antenna end up,
   clear of metal. Sketch the floor plan with beacons, doors and test points —
   a Chapter 4 figure.
3. Fit the **door node** on the `medicine_room` door (reed on the frame, magnet
   on the door).
4. Start the **dashboard** on the laptop and open `http://localhost:8000`:
   ```powershell
   cd C:\Users\Chester\Desktop\Vaya\SESEM\dashboard
   & "C:\TroDesData\dashboard\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   Allow Python through Windows Firewall if asked. Set the laptop never to sleep.
5. Flash the wearable **in room mode** (default firmware) with the house WiFi in
   `secrets.h`. Confirm on the dashboard that the resident card appears and the
   door shows *closed*.

## Part A — Test 2 Run 2: room-level classification (40 min)

Same method as Run 1 ([[Test 2 Field Sheet]]), 15 points: near, mid, far,
boundary-from-inside and boundary-from-outside for each room. **Stand still
first, then type the full label**, hold **60 s**.

```powershell
cd C:\Users\Chester\Desktop\Vaya\SESEM\tools\rssi_calibration
& "C:\Users\Chester\.platformio\penv\Scripts\python.exe" log_serial.py --port COM8 --out C:\TroDesData\field\field_test2.csv --label transit
```

Record, per point, the distance to **all three** beacons.

Expected if the design holds: **no cross-room errors**, near/mid/far points near
100 %, unresolved samples only at doorways (Run 1 showed this across one wall).

## Part B — Test 3: transitions and stability (30 min)

1. **Latency:** walk at normal pace from the centre of one room to the centre of
   the next; type the new zone the moment you cross the doorway. Ten walks, five
   each direction, for the BW↔DH and DH↔MR boundaries. Log to
   `C:\TroDesData\field\field_test3.csv`.
2. **Stability:** stand still in each doorway for **3 minutes**; count zone
   changes.

| Boundary | Mean latency (s) | Worst (s) | Changes in 3 min |
|---|---|---|---|
| BW ↔ DH | | | |
| DH ↔ MR | | | |

## Part C — Alerts end to end (20 min)

Keep the log running (wearable on USB to the laptop) so the wearable's own
timestamps and the dashboard's use the **same laptop clock**.

| Trial | Action | Expected on dashboard | Seen? | Latency (s) |
|---|---|---|---|---|
| 1–5 | Short-press SOS | SOS banner, critical | | |
| 1–5 | Hold SOS 3 s after an SOS | SOS cleared | | — |
| 1–3 | Walk into `medicine_room` | Restricted-zone alert + buzzer | | |

Log this part to its own file, e.g. `C:\TroDesData\field\field_alerts.csv`,
then compute every latency automatically:

```powershell
& "C:\TroDesData\dashboard\.venv\Scripts\python.exe" C:\Users\Chester\Desktop\Vaya\SESEM\tools\field\field_report.py latency --capture C:\TroDesData\field\field_alerts.csv
```

It pairs each `[ALERT]` the wearable raised with the dashboard's `received_at`
for it (both on the laptop clock) and reports per-alert and mean latency, and
any alert that never arrived.

## Part D — Door node reliability (15 min)

Open and close the medicine-room door **20 times** at normal speed, then leave it
closed for 5 minutes.

| Opens | Door-opened alerts | Missed | False alerts while closed |
|---|---|---|---|
| 20 | | | |

Note the start and end times, then count the events automatically:

```powershell
& "C:\TroDesData\dashboard\.venv\Scripts\python.exe" C:\Users\Chester\Desktop\Vaya\SESEM\tools\field\field_report.py doors --since "2026-09-26 14:00" --until "2026-09-26 14:20" --expected 20
```

Then unplug the door node: the dashboard must show **OFFLINE** within about 90 s.

## Part E — Network loss (15 min)

1. Switch the WiFi router off (or walk the wearable out of range) for 2 minutes.
2. Confirm: the wearable chirps every minute; the dashboard card greys out after
   30 s; press SOS once during the outage.
3. Restore WiFi: the queued events, including the SOS, must arrive in order.

| Check | Result |
|---|---|
| Chirp during outage | |
| Card greyed after 30 s | |
| Queued SOS delivered after reconnection | |
| Time to reconnect (s) | |

## Part F — Live demonstration recording (15 min)

Film the dashboard (screen recording) and the wearer together, following the
[[Defense Demo Plan]] choreography, but room to room: bedroom → dining → open the
medicine-room door → enter the medicine room → SOS → cancel → acknowledge. This
is evidence for the paper's appendix and a backup for the defense.

## Part G — Battery runtime (overnight, optional)

Only if the household agrees to leave the laptop and wearable running overnight.

1. Flash the low-power profile with WiFi:
   `PLATFORMIO_BUILD_FLAGS=-DPOWER_PROFILE=1`.
2. Fully charge, unplug USB, switch on, note the time. Leave the dashboard running.
3. Next day:
   ```powershell
   & "C:\Users\Chester\.platformio\penv\Scripts\python.exe" C:\Users\Chester\Desktop\Vaya\SESEM\tools\runtime\runtime_report.py --csv C:\TroDesData\field\runtime.csv
   ```

## Heart rate (5 min, if a reference device is available)

Wear the wearable's sensor and a pulse oximeter at the same time; record 5 pairs
of readings 1 minute apart at rest.

| Time | Wearable (bpm) | Reference (bpm) | Difference |
|---|---|---|---|
| | | | |

---

## After the test

- Keep every capture in `C:\TroDesData\field\` and send them to me — I will
  analyse them and add the results to the paper (Chapter 4), the presentation
  and the user manual.
- Photos of the setup (rooms, beacons, door node, dashboard) for the appendix.

## Related

[[Test 2 Field Sheet]] · [[Defense Demo Plan]] · [[Resume Here]] · [[Work Log]]
