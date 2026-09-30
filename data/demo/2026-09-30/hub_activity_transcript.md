# Video demo, 30 Sep 2026: hub dashboard activity, transcribed

- **Source:** five phone screenshots of the SESEMSG hub dashboard (v2 page, Activity and Home tabs), saved beside this file in `hub_activity_screenshots/`.
- **The hub itself kept these alerts in RAM only**, and they were lost when it restarted at about 00:14. **The screenshots are the only record.**
- **Times** are the hub's clock (set by the first phone that opened the page), 30 Sep, PM.
- **When the phone received this data:** the door heartbeat reads "9 s ago", a value the server sends and the page does not advance. So this is most likely the last update the phone received, just after 09:58 PM.
- **The "3h 3x m ago" labels** kept counting on the phone after that, because they are computed from the phone's clock.
- **Order within one minute:** events inside the same minute are listed in the order the page showed them. That order differs slightly between screenshots 2 and 3, so it is not exact.

## Timeline

| Time | Event | Zone | Acknowledgement / status |
|---|---|---|---|
| 09:51 | Device not reporting: no status for 34 s (threshold 30 s) | Dining Hall | ack'd by path; cleared: device reporting again |
| 09:51 | Device not reporting: 39 s | Dining Hall | ack'd by path; cleared |
| 09:51 | Device not reporting: 44 s | Dining Hall | ack'd by path; cleared |
| 09:51 | Device not reporting: 49 s | Dining Hall | ack'd by path; cleared |
| 09:51 | Moved zone: dining_hall | Dining Hall | **delivered late** (queued on the wearable, sent on reconnect) |
| 09:51 | Device not reporting: 54 s | Dining Hall | ack'd by path; cleared |
| 09:52 | Device not reporting: 59 s | Dining Hall | ack'd by path; cleared |
| 09:52 | Device not reporting: 64 s | Dining Hall | cleared (not acknowledged) |
| 09:53 | Device not reporting: 31 s | Dining Hall | ack'd by ches; cleared |
| 09:53 | Device not reporting: 36 s | Dining Hall | ack'd by path; cleared |
| 09:53 | Device not reporting: 41 s | Dining Hall | ack'd by caregiver; cleared |
| 09:53 | Device not reporting: 51 s | Dining Hall | ack'd by caregiver; cleared |
| 09:53 | Device not reporting: 56 s | Dining Hall | cleared (not acknowledged) |
| 09:55 | Location unknown: no beacon in range | Unknown | ack'd by ches |
| 09:55 | Moved zone: dining_hall | Dining Hall | none |
| 09:56 | **Restricted door opened**: Medicine Room Door open | none | ack'd by ches |
| 09:56 | Location unknown: no beacon in range | Unknown | ack'd by ches |
| 09:56 | **Entered restricted zone**: medicine_room | Medicine Room | ack'd by ches |
| 09:56 | **Restricted door closed**: Medicine Room Door closed | none | none |
| 09:56 | Location unknown: no beacon in range | Unknown | ack'd by ches |
| 09:56 | Moved zone: dining_hall | Dining Hall | none |
| 09:57 | **SOS PRESSED**: Needs assistance | Dining Hall | ack'd by ches |
| 09:58 | **SOS PRESSED**: Needs assistance | Dining Hall | ack'd by ches |
| 09:58 | Device not reporting: 32 s | Dining Hall | **still active** (unacknowledged) at the last update |

- **Home tab at the last update:**
  - one active alert (device not reporting, 32 s);
  - Medicine Room Door `door-11` **Closed**, heartbeat 9 s ago.
- **Page footer:** "Served by the SESEMSG hub - no laptop, no internet."

## What it shows

**Demonstrated on hardware, with no laptop or internet:**
- the zone shown on the dashboard;
- the door-open and door-close alerts;
- the restricted-zone alert;
- the return to a safe zone;
- the SOS alert;
- acknowledgement by named caregivers ("ches", "path", "caregiver") from more than one phone;
- the offline queue: a zone change sent while Wi-Fi was down arrived later and was flagged "delivered late".

**Seen as well, and needing an explanation:**

1. **Wearable Wi-Fi dropouts** at 09:51–09:53: up to 64 s with no status, in two episodes, before the demo sequence. After 09:58 the wearable stopped reporting. That may be the end of the recording, or it may be another dropout.
2. **"Location unknown"** each time the wearer passed through a space with no beacon between the two rooms. This is expected: only DH and MR had beacons, and a beacon is forgotten after 2.5 s.
3. **A new "Device not reporting" alert every ~5 s during one outage** (34, 39, 44 … 64 s). This is a defect:
   - the hub's watchdog (`firmware/door_sensor/src/hub.cpp`, `watchdog()`) only checks for an **unacknowledged** open alert;
   - so as soon as a caregiver acknowledges it while the wearable is still offline, a new one is raised on the next 5 s check;
   - the laptop server has the same rule (`dashboard/app/main.py`, `_open_alert_exists`).
   - **Fix, not yet made:** suppress a new offline alert while one is **uncleared**, whether or not it has been acknowledged.
4. **No delivery time** can be computed from these screenshots: they show minute resolution only, and there was no serial capture.
