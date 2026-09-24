# Caregiver Dashboard — Build Brief

Written 2026-09-12. Hand this to whoever builds the dashboard. It contains the
exact data contract the firmware already sends, so the backend can be written
and tested **before** any hardware is connected.

**Use this as the prompt.** Paste the whole document into a new Claude
conversation and say: *"Build this. Start with the backend and the simulator,
then the page."*

---

## 1. What this is

A browser-based dashboard for caregivers in a home for the aged. It shows, in
real time, which zone each resident is in, their device status, and any active
alerts. It must work on a phone browser — it is **not** a native mobile app.

This is the adviser's **second-highest priority** after localization itself, and
it is explicitly graded. It is currently the largest unstarted piece of the
project.

---

## 2. Hard requirements (from the adviser)

- Predefined zones shown by name, with **safe and restricted clearly
  distinguished**
- Notifications/alerts surfaced prominently — an SOS must be impossible to miss
- **Battery state visible**, including an explicit low-battery state
- Heart rate displayed
- Must work in a phone browser
- Must actually function against real device data, not be a mockup

---

## 3. Recommended stack

**Backend:** Python + FastAPI (or Node + Express). Small, single file to start.
**Storage:** SQLite. No ORM needed; two or three tables is enough.
**Frontend:** one static HTML page with vanilla JavaScript polling the API every
2 seconds. No build step, no framework.

**Why this shape:** it runs locally on a laptop or a Raspberry Pi today, and the
same code deploys to a cloud host later without rewriting. **Backend hosting
(local vs cloud) is still an open adviser decision** — this stack does not force
that choice, so work can start now.

---

## 4. The data contract — already implemented in firmware

The devices POST JSON to these endpoints. **Do not change these shapes** without
changing the firmware to match. Base URL is configured in firmware as
`http://<host>:8000`.

### 4.1 `POST /api/v1/status` — wearable heartbeat, every 5 seconds

```json
{
  "device_id":  "wearable-01",
  "zone_id":    1,
  "zone":       "bedroom_wing",
  "restricted": false,
  "rssi":       -49,
  "distance_m": 1.82,
  "hr_bpm":     72,
  "batt_pct":   87,
  "batt_v":     3.92,
  "sos":        false,
  "uptime_s":   1432
}
```

Notes:
- `hr_bpm` is `-1` when no heart rate sensor is fitted or no finger is detected
- `batt_pct` is `-1` before the first battery reading
- `zone` is `"unknown"` and `zone_id` is `0` when no beacon is in range
- `distance_m` is an estimate only — **display it as approximate or not at all.**
  Zone classification does not use it

### 4.2 `POST /api/v1/alert` — wearable events

```json
{
  "device_id": "wearable-01",
  "type":      "sos",
  "detail":    "button short press",
  "zone":      "bedroom_wing",
  "zone_id":   1,
  "batt_pct":  87,
  "hr_bpm":    72,
  "uptime_s":  1432
}
```

`type` is one of:

| Type | Meaning | Suggested severity |
|---|---|---|
| `sos` | Resident pressed the SOS button | **Critical** |
| `sos_dismissed` | Resident long-pressed to cancel a false alarm | Info — clears the SOS |
| `zone_restricted` | Resident entered a restricted zone | **Critical** |
| `zone_change` | Resident moved between zones | Info |
| `zone_lost` | No beacon in range — location unknown | Warning |
| `battery_low` | Battery at or below 20 % | Warning |
| `battery_critical` | Battery at or below 10 % | **Critical** |

### 4.3 `POST /api/v1/door` — door sensor nodes

```json
{
  "node_id":  "door-11",
  "door_id":  11,
  "door":     "medicine_room",
  "type":     "state_change",
  "state":    "open",
  "rssi":     -58,
  "uptime_s": 903
}
```

`type` is `state_change`, `heartbeat` (every 30 s), or `boot`.
`state` is `open` or `closed`.

**A door node that stops sending heartbeats is a fault, not a closed door.**
Mark a node stale if no heartbeat arrives for 90 seconds and show it as
"offline" rather than silently showing its last state.

### 4.4 Zone reference

| id | Zone | Class |
|---|---|---|
| 1 | `bedroom_wing` | Safe |
| 2 | `dining_hall` | Safe |
| 3 | `common_area_garden` | Safe |
| 11 | `medicine_room` | **Restricted** |
| 12 | `main_exit` | **Restricted** |
| 13 | `stairwell` | **Restricted** |

Safe zones use ids 1–9, restricted 11–19. The demo may use fewer, so **do not
hard-code six**. Read the list from a config file or a database table.

### 4.5 Endpoints the dashboard itself needs

- `GET /api/v1/residents` — current state of every wearable
- `GET /api/v1/alerts?active=true` — unacknowledged alerts
- `POST /api/v1/alerts/{id}/ack` — caregiver acknowledges an alert
- `GET /api/v1/doors` — current state of every door node

---

## 5. Build this without hardware — write the simulator first

**Write a `simulate.py` before anything else.** It POSTs the payloads above on a
timer: a wearable moving between zones, a battery draining, an occasional SOS, a
door opening and closing.

This matters because the hardware is being used for radio testing in parallel.
The simulator lets the dashboard be built and demonstrated independently, and it
is also what you use to rehearse the defense demo without depending on live
hardware behaving on the day.

---

## 6. Screen layout

**Main view — one card per resident:**

- Resident name and device id
- **Current zone, large**, colour-coded: green for safe, red for restricted,
  grey for unknown
- Time in current zone
- Battery percentage with an icon; amber below 20 %, red below 10 %
- Heart rate, or "—" when unavailable
- "Last seen" timestamp — **grey the whole card out if no status for 30 seconds**,
  because a silent wearable is a safety event, not a resident who has not moved

**Alert banner:** a persistent, unmissable banner at the top of the page while
any critical alert is unacknowledged. Red, with the resident, the zone, the time,
and an acknowledge button. An SOS should be visible from across a room.

**Doors panel:** each restricted door with open/closed state and an offline
indicator.

**Optional if time allows:** a simple floor-plan view with zones drawn as boxes
and a dot for the resident. Visually effective in a defense, but only after
everything above works.

---

## 7. Things that will be asked at the defense

- **What happens when Wi-Fi drops?** The wearable queues events and retries, and
  buzzes locally. The dashboard should show the device as stale, and queued
  events will arrive in a burst when the link returns — **handle out-of-order and
  delayed timestamps without corrupting the display.**
- **What happens if the caregiver misses an alert?** Alerts persist until
  acknowledged. Nothing auto-dismisses except `sos` cleared by `sos_dismissed`.
- **How is an alert acknowledged, and is that recorded?** Store who acknowledged
  and when.
- **Does it work on a phone?** Test it on an actual phone, not a narrow browser
  window.

---

## 8. Suggested order of work

1. FastAPI skeleton with the three POST endpoints, writing to SQLite
2. `simulate.py` posting realistic traffic
3. `GET` endpoints returning current state
4. Static HTML page polling `GET /api/v1/residents`, one resident card
5. Alert banner and acknowledgement
6. Doors panel and stale detection
7. Phone-width layout check
8. Point the real wearable at it: set `WIFI_SSID`, `WIFI_PASSWORD` and
   `BACKEND_BASE_URL` in `firmware/wearable/include/config.h`, reflash, confirm
   real data arrives
9. Floor-plan view, only if steps 1–8 are done

Steps 1 to 4 are a working demo. Get there first, then improve.

---

## 9. Firmware source of truth for these payloads

`Firmware/trodes_phase1/firmware/wearable/src/main.cpp` (`buildStatusJson`,
`buildAlertJson`) and `firmware/door_sensor/src/main.cpp` (`buildEventJson`).
