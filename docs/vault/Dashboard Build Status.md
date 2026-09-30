---
title: Caregiver Dashboard — Build Status
tags: [dashboard, software, status]
updated: 2026-09-27
source: TroDes Claude project, status/Dashboard_Build_Status.md
---

# Caregiver Dashboard — Build Status

*Updated 27 Sep 2026.*

> **Code location (current): the repository `dashboard/`** (GitHub `Jeju2004/SESEM`, local clone `Desktop\Vaya\SESEM`).
> - Added 24 Sep (`50d3a13`); three-zone scope applied the same day (`f5b2e92`).
> - The old copy at `C:\TroDesData\dashboard` is **out of date**: it still lists six zones. Run the dashboard from the repository. See [[Code Repository]].

## Status at a glance (27 Sep)

| Item | State |
|---|---|
| **Backend + page** | FastAPI + SQLite + one static page. Runs from `dashboard/`: `run_backend.bat`, then open `http://127.0.0.1:8000` |
| **Demo scope** | 3 zones: Bedroom Wing (1, safe), Dining Hall (2, safe), Medicine Room (11, restricted). 1 door node (`door-11`), 1 resident (`wearable-01`). All set in `config/zones.json` |
| **Self-test** | **38/38 passed on 27 Sep 2026**, against a scratch database with the three-zone config. Also passed on 24 Sep, with the scripted demo run clean |
| **Field-test tools that read the dashboard** | `tools/field/field_report.py`: alert latency (serial `[ALERT]` ↔ `received_at`) and door-event counts, tested at 0.40 s against a deliberate 0.4 s delay. `tools/runtime/runtime_report.py`: battery runtime and discharge curve, tested on simulator data only |
| **Real wearable → dashboard (step 8)** | **Not done yet.** Planned for the house field test, Mon 28 – Tue 29 Sep |
| **Heart rate** | Display-only. After the 27 Sep decision (fingertip spot check), the card shows "—" whenever no finger is on the sensor, which is most of the time. **Proposed change (not made):** show the **last valid reading with its age** ("72 bpm · 3 min ago") |
| **Committed?** | Yes, the dashboard code is in the repository. No dashboard changes are pending |

---

## Original build record (13 Sep)

**Built 2026-09-13.** Steps 1–7 of `guides/Dashboard_Build_Brief.md` are done
and verified. Location on Chester's PC: **`C:\TroDesData\dashboard`**.

`C:\TroDes` did not exist and cannot be created through the folder-access
prompt, so the code sits beside the capture data instead. Still a clean path —
the `(SESEM)` parentheses that break PlatformIO and Python file creation are
avoided.

---

## What runs

Python + FastAPI + SQLite backend, one static HTML page polling every 2 s, and
a device simulator. No build step, no framework, no hardware required.

```
pip install -r requirements.txt
run_backend.bat          then, in a second terminal:
run_simulator.bat        then open http://127.0.0.1:8000
```

The scripted demo run produces every graded behaviour in about three minutes:
zone changes, a restricted-zone entry, a door opening and closing, an SOS and
its dismissal, a lost beacon, and both battery warnings.

---

## Brief coverage

| Step | State |
|---|---|
| 1. FastAPI skeleton, three POST endpoints → SQLite | Done |
| 2. `simulate.py` posting realistic traffic | Done, plus Wi-Fi-outage and node-death modes |
| 3. GET endpoints returning current state | Done, plus `/summary` and `/config` |
| 4. Static page, resident cards | Done |
| 5. Alert banner and acknowledgement | Done, with an `ack_log` audit table |
| 6. Doors panel and stale detection | Done |
| 7. Phone-width layout | Done — verified at 390 px, no horizontal scroll |
| 8. Point the real wearable at it | **Not done — needs hardware** |
| 9. Floor-plan view | Not started, deliberately last |

Adviser's hard requirements are all met: zones by name with safe/restricted
distinguished, alerts unmissable, battery visible with an explicit low state,
heart rate shown, works in a phone browser, functions against real device data
rather than being a mockup.

---

## Verification

`tools/selftest.py` — **38/38 checks passing** against a live server. Run it
against a scratch database, not the demo one:

```
set TRODES_DB=%TEMP%\trodes_test.db
python -m uvicorn app.main:app --port 8001
python tools/selftest.py --base-url http://127.0.0.1:8001
```

Three bugs were found and fixed during testing. Each is worth knowing because
each would have shown up as wrong information on a safety display:

1. **A stale device row poisoned the reconstructed device clock**, so live
   events were labelled "delivered late". The boot-moment estimate was a
   running minimum, which can only ever move earlier — one bad sample stuck
   permanently. Packet types that are never queued now re-anchor it.
2. **`uptime_s` has one-second resolution**, so a door state-change arriving in
   the same second as that node's heartbeat was discarded as a replay — the
   door opened and nothing was recorded. The comparison was `<=`; it is now
   strictly `<`.
3. **A door node reporting under an unexpected `node_id` disappeared from the
   doors panel entirely** if its `door_id` matched a configured door. A node
   flashed with the wrong id would have silently vanished from a safety
   display. It now appears, flagged.

---

## Design decisions worth defending

**Nothing is hard-coded.** Zones, doors, residents and thresholds all live in
`config/zones.json`. The demo zone count is still an open adviser decision, so
the code does not assume six.

**The firmware sends no wall clock, only `uptime_s`.** The server reconstructs
when each event actually happened by estimating the device's boot moment.
Without this, a burst of queued events flushed after Wi-Fi returns all
timestamp to the same second and the history is worthless.

**A restart and a delayed packet are told apart differently per board.** The
wearable does not queue status packets, so its uptime going backwards means a
restart. A door node announces restarts with a `boot` message and may queue
state changes, so there the same signal means a delayed packet. Reading either
one the wrong way is a real failure, and both were bugs at some point.

**A door event that arrived late is still recorded.** It cannot move the live
panel, but it is logged and flagged, because a door that opened during an
outage did open. Retransmissions dedupe on `(node_id, type, uptime_s)`.

**Alerts persist until acknowledged**, with two documented exceptions: an
`sos` cleared by the resident's own long press, and a server-raised
`device_offline` that clears when the device reports again — that one is the
server's own inference and is no longer true once the device is back. Both
stay in the history with a reason recorded.

**Information-only events stay out of the active alert list.** Every
`zone_change` in the active list would bury the one SOS that matters. They are
recorded and shown in the activity feed.

**`hr_bpm: -1` and `batt_pct: -1` render as an em dash, never `0`.** A zero in
a heart-rate field reads as a flatline.

**`distance_m` is exposed as `distance_m_approx` and barely displayed**,
because `PATH_LOSS_EXPONENT` and `MEASURED_POWER_1M` are still placeholders
until Test 1. Zone classification does not use it.

**A silent device is a safety event.** 30 s without a status greys the card,
labels it "Not reporting", and raises an alert. 90 s without a door heartbeat
shows OFFLINE with the last known state written out — never as a closed door.

---

## Still blocked on the adviser

The dashboard runs without these; the code does not pretend they are decided.

- **Backend hosting, local vs cloud.** This stack runs either way unchanged —
  it does not force the decision, so the dashboard was no longer blocked on it.
  `status/Resume_Here.md` listed this as blocking; it is not.
- **Heart-rate alert thresholds.** HR is display-only. `hr_low_bpm` and
  `hr_high_bpm` are `null` in the config and raise nothing.
- **Number of zones and door nodes for the demo.** Config-driven.
- **Wi-Fi-down fallback.** What the *server* does is implemented and
  documented. What the *wearable* should do beyond queueing and buzzing is
  still open.
- **Battery backup for door nodes.** A mains-only node goes offline in a power
  cut and the panel will correctly show OFFLINE. That is a design gap, not a
  display one, and the panel may ask about it.

---

## Next (updated 27 Sep)

0. **Before the field test:** start the backend from the **repository** copy (`dashboard/`), not `C:\TroDesData\dashboard`.
   - Use a fresh database for each test run (`set TRODES_DB=…`) so test data doesn't mix.
   - Note the laptop's IPv4 for `BACKEND_BASE_URL`.
0b. **Optional code change:** show the heart rate as "last reading + age" for the fingertip spot check. Small backend and page change, then re-run the self-test.
1. **Step 8 — point the real wearable at it.** Set `WIFI_SSID`,
   `WIFI_PASSWORD` and `BACKEND_BASE_URL` in
   `firmware/wearable/include/config.h` to `http://<this PC's IPv4>:8000`, then
   reflash **one board at a time with only that board plugged in** — CH340
   chips have no unique serial and Windows reassigns COM ports by USB socket.
2. **Test it on an actual phone**, not a narrow browser window. The brief asks
   for this and it is a fair question at the defense.
3. Add the real device ids to `residents` in `config/zones.json` so they show
   names rather than device ids.
4. Screenshots of the running dashboard, with real device data from the field test, belong in the paper, the deck and the backup demo video.

Step 9, the floor-plan view, only after all of that. `GET /api/v1/config`
already returns the zone list it would need.

## Related

[[Dashboard Build Brief]] · [[Code Repository]] · [[Resume Here]] · [[00 Start Here]]
