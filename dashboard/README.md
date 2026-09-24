# TroDes Caregiver Dashboard

Browser-based caregiver dashboard for the Indoor Elderly Localization and
Safety Monitoring System. Built to `guides/Dashboard_Build_Brief.md`, steps
1-7. Runs with no hardware attached, via the simulator.

Backend: Python + FastAPI + SQLite. Frontend: one static page, vanilla JS,
polling every 2 s. No build step.

---

## Quick start

```powershell
cd C:\TroDesData\dashboard
.\setup.bat              # once - creates .venv and installs dependencies
.\run_backend.bat        # leave this window running
```

Then in a **second** terminal:

```powershell
cd C:\TroDesData\dashboard
.\run_simulator.bat
```

Without the `.\` prefix PowerShell will not run a script from the current
directory.

**Why a virtual environment.** On this PC `python` resolves to PlatformIO's
environment while `pip` resolves to a different install, so a `pip install`
that reports success lands in an interpreter the app never runs - producing
`ModuleNotFoundError: No module named 'fastapi'` from a uvicorn that had
already started. The launch scripts call `.venv\Scripts\python.exe` by exact
path and never go through PATH, so the wrong interpreter cannot be picked.
`setup.bat` touches neither PlatformIO nor your system Python.

To run without the scripts, use that interpreter explicitly:

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
.venv\Scripts\python.exe simulate.py --scenario demo --speed 2
```

Open <http://127.0.0.1:8000>. Within about three minutes the scripted run
produces every graded behaviour: zone changes, a restricted-zone entry, a door
opening and closing, an SOS and its dismissal, a lost beacon, and both battery
warnings.

### On a phone

The backend binds `0.0.0.0`, so any device on the same Wi-Fi can reach it. Run
`ipconfig`, take the IPv4 address, and open `http://<that address>:8000` on the
phone. Windows Firewall will prompt on first run — allow it on private
networks. **Test on a real phone, not a narrow browser window**; the brief asks
for this explicitly and it is a fair question at the defense.

---

## Layout

```
dashboard/
  app/
    main.py      routes: three POST ingest endpoints, four GET read endpoints
    db.py        SQLite schema; device-clock reconstruction (read this one)
    config.py    loads config/zones.json; severity and label tables
    models.py    request shapes - the firmware contract
  config/
    zones.json   zones, doors, residents, thresholds.  NOTHING is hard-coded
  static/
    index.html   the page
    styles.css   dark, high-contrast, phone-first
    app.js       polling and rendering
  tools/
    selftest.py  38 contract checks against a running server
  simulate.py    device simulator - wearables, doors, Wi-Fi outages
  setup.bat      one-time: creates .venv and installs dependencies
  .venv/         the dashboard's own Python - created by setup.bat
  data/          SQLite database appears here on first run
```

---

## Changing the facility

Everything about the facility lives in `config/zones.json` — zone count, names,
safe/restricted class, door nodes, resident names, and thresholds. It is set
to the approved defense demo: three zones (`bedroom_wing`, `dining_hall`,
`medicine_room`), one door node and one wearable. Nothing is hard-coded, so to
add zones edit the file and restart the backend, or call
`GET /api/v1/config?reload=true`.

Safe zone ids are 1-9, restricted 11-19, matching the firmware.

---

## API

Ingest (firmware → server). These shapes are the contract with
`firmware/wearable/src/main.cpp` and `firmware/door_sensor/src/main.cpp` —
changing one without the other breaks the system.

| Method | Path | From |
|---|---|---|
| POST | `/api/v1/status` | wearable, every 5 s |
| POST | `/api/v1/alert` | wearable events |
| POST | `/api/v1/door` | door nodes: `state_change`, `heartbeat`, `boot` |

Read (dashboard → server):

| Method | Path | Returns |
|---|---|---|
| GET | `/api/v1/residents` | current state of every wearable |
| GET | `/api/v1/alerts?active=true` | unacknowledged, uncleared, actionable alerts |
| POST | `/api/v1/alerts/{id}/ack` | records `acked_by` and the server time |
| GET | `/api/v1/doors` | door state, with an offline flag |
| GET | `/api/v1/config` | zones, doors, residents, thresholds |
| GET | `/api/v1/summary` | all of the above in one call — what the page polls |
| GET | `/api/v1/health` | liveness |

Interactive API docs at <http://127.0.0.1:8000/docs> while the server runs.

---

## Behaviour the panel is likely to probe

Each of these is implemented deliberately and covered by `tools/selftest.py`.

**What happens when Wi-Fi drops?**
The wearable queues events and buzzes locally; when the link returns the whole
queue arrives in a burst. The firmware sends no wall clock, only `uptime_s`, so
the server reconstructs when each event actually happened by estimating the
device's boot moment (`db.py`, `reconcile_uptime`). Without that, twenty queued
events all timestamp to the same second and the history is worthless. Late
events are marked "delivered late" in the UI. They are recorded but cannot drag
the live display backwards.

**A restart and a delayed packet look alike — how are they told apart?**
Differently for each board, because the two families behave differently. The
wearable does not queue *status* packets, so its uptime going backwards means
a restart. A door node announces its own restart with a `boot` message and may
queue state changes, so there uptime going backwards means a delayed packet.
Getting this backwards in either direction was a real bug during development.

**A door that opened during the outage — is it lost?**
No. A late door event cannot move the live doors panel, but the alert is still
recorded and flagged as delivered late. Retransmissions are deduplicated on
`(node_id, type, uptime_s)`.

**What if the caregiver misses an alert?**
Alerts persist until acknowledged. The only two exceptions: an `sos` is cleared
by the resident's own `sos_dismissed` long press, and a server-raised
`device_offline` clears when the device starts reporting again — it is the
server's own inference, and it is no longer true once the device is back. Both
stay in the history with a reason.

**Is acknowledgement recorded?**
Yes — caregiver name and server timestamp, in `alerts` and in the separate
`ack_log` audit table. A second acknowledgement does not overwrite the first.

**A quiet wearable**
Thirty seconds without a status greys the card out, labels it "Not reporting",
and raises a `device_offline` alert. A silent wearable is a safety event, not a
resident who has not moved.

**A quiet door node**
Ninety seconds without a heartbeat shows the node as OFFLINE with its last
known state written out, never as a closed door.

**Why is `distance_m` barely shown?**
Because `PATH_LOSS_EXPONENT` and `MEASURED_POWER_1M` are still placeholders
until Test 1 is run. Zone classification does not use distance at all. The API
field is named `distance_m_approx` so nobody quotes it as measured.

**Sentinel values**
`hr_bpm: -1` and `batt_pct: -1` mean "no reading", and render as an em dash.
Never as `0` — a zero in a heart-rate field reads as a flatline.

---

## Testing

```powershell
$env:TRODES_DB = "$env:TEMP\trodes_test.db"
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
# then, in a second window:
.venv\Scripts\python.exe tools\selftest.py --base-url http://127.0.0.1:8001
```

Point it at a scratch database, not the one you will demo from.

Simulator options worth knowing:

```powershell
.venv\Scripts\python.exe simulate.py --scenario demo --speed 2          scripted defense run
.venv\Scripts\python.exe simulate.py --wifi-drop 60 --wifi-drop-for 45  Wi-Fi outage and burst replay
.venv\Scripts\python.exe simulate.py --kill-door 90                     a door node stops responding
.venv\Scripts\python.exe simulate.py --once                             one packet each, then exit
```

**Nothing the simulator produces is measured data.** Its RSSI model is a
plausible shape for exercising the UI, not a path-loss measurement. Chapter 4
data comes from Tests 1-3 on real hardware.

---

## Connecting the real hardware (brief step 8)

1. Find this PC's IPv4 address with `ipconfig`.
2. In `firmware/wearable/include/config.h` set `WIFI_SSID`, `WIFI_PASSWORD`
   and `BACKEND_BASE_URL` to `http://<that address>:8000`.
3. Reflash — **one board at a time, with only that board plugged in.** CH340
   chips have no unique serial, so Windows reassigns COM ports by USB socket.
4. Watch the server console: real `POST /api/v1/status` lines should appear
   every 5 s.

Add each real device to the `residents` list in `config/zones.json` so it shows
a name rather than a device id.

---

## Still blocked on the adviser

The dashboard runs without these, but they are not decided and the code does
not pretend otherwise:

- **Backend hosting — local server or cloud.** This stack runs either way
  unchanged. Nothing here forces the decision.
- **Heart-rate alert thresholds.** HR is display-only; `hr_low_bpm` and
  `hr_high_bpm` in `zones.json` are `null` and raise nothing.
- **Number of zones and door nodes for the demo.** Config-driven; change the
  file, not the code.
- **Wi-Fi-down fallback approach.** What the server does is implemented and
  described above; what the *wearable* should do beyond queueing and buzzing
  is still open.
- **Battery backup for door nodes.** A node on mains with no backup goes
  offline in a power cut, and the panel will show OFFLINE — correctly, but
  that is a design gap, not a display one.

---

## Not built (brief step 9)

The floor-plan view — zones drawn as boxes with a dot for the resident. The
brief puts it last for a reason; steps 1-8 come first. `GET /api/v1/config`
already returns the zone list it would need.
