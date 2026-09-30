---
title: Defense Demo Plan
tags: [defense, demo, test2, sesem]
updated: 2026-09-24
---

# Defense Demo Plan — one shared room

The defense (Fri 2 Oct 2026) is held in **one room**, so all three zones share
it. Test 2 Run 1 (24 Sep) measured exactly this case:

- Within ~1 m of a beacon, classification was reliable (`BW-near`, `MR-near`
  100 % once the tester had arrived; near points read −65 to −73 dBm).
- Mid-room, two beacons a few metres apart read within 2–4 dB of each other
  (−80 to −86 dBm), and those points were misclassified.
- Across a wall (the `dining_hall` room) there were **zero** cross-room errors.

So the demo treats each zone as a **proximity area around its beacon**, and
the firmware's proximity mode makes that robust.

---

## 1. Firmware: proximity mode

`ZONE_ENTRY_DBM` in `firmware/wearable/include/config.h` (repository):

| Setting | Behaviour | Use for |
|---|---|---|
| `-999` (default, off) | Strongest beacon above −88 dBm wins, with 4 dB hysteresis | One beacon per room, walls between zones (deployment, school Test 2) |
| e.g. `-72` | A zone is **entered** only when its beacon is at least this strong (~1 m); between beacons the wearable **keeps its last zone** — no flicker, no false `zone_lost` | Zones sharing one room (dorm rehearsal, defense) |

Flash in proximity mode without editing any file (one board plugged in,
SW1 off):

```powershell
cd C:\Users\Chester\Desktop\Vaya\SESEM\firmware\wearable
$env:PLATFORMIO_BUILD_FLAGS="-DZONE_ENTRY_DBM=-72"
& "C:\Users\Chester\.platformio\penv\Scripts\pio.exe" run -t upload --upload-port COM8
Remove-Item Env:PLATFORMIO_BUILD_FLAGS
```

The boot log must show `Zones    : proximity mode - enter a zone only above -72 dBm`.

## 2. Calibrate the threshold in the room (10 min)

Do this in the dorm now, and again in the defense room if you can get in
before 2 Oct — signal levels depend on the room.

1. Place the beacons (layout below). Flash normally (room mode) or use the
   board as it is.
2. Stand **1 m** from each beacon for 20 s; note its `[RSSI]` value.
3. Stand **midway** between each pair of beacons for 20 s; note both values.
4. Threshold = about **3 dB below the weakest 1 m reading**, and it must be
   **above every midway reading**. Example: 1 m readings −66/−70/−71, midway
   readings −80 to −85 → use −74.
5. If no value satisfies both, move the beacons further apart.

| Beacon | At 1 m (dBm) | Midway BW–MR | Midway MR–DH | Midway DH–BW |
|---|---|---|---|---|
| bedroom_wing | | | — | |
| dining_hall | | — | | |
| medicine_room | | | | — |
| **Chosen threshold** | | | | |

## 3. Dorm rehearsal = Test 2 Run 2 (single room)

This is the defense scenario, so it is the right thing to test. Run it
**twice with the same beacon layout**: once in room mode, once in proximity
mode. The before/after comparison is the Chapter 4 result for the demo
configuration.

**Points** (stand still first, *then* type the full label, hold 60 s):

| Label | Where |
|---|---|
| `bedroom_wing@BW-near` | 0.5–1 m from the BW beacon |
| `bedroom_wing@BW-1.5m` | 1.5 m from the BW beacon |
| `dining_hall@DH-near` | 0.5–1 m from the DH beacon |
| `dining_hall@DH-1.5m` | 1.5 m from the DH beacon |
| `medicine_room@MR-near` | 0.5–1 m from the MR beacon |
| `medicine_room@MR-1.5m` | 1.5 m from the MR beacon |

**Midway points** — label `mid@BW-MR`, `mid@MR-DH`, `mid@DH-BW`, 60 s each.
There is no single correct zone there; they are for **stability** (zone
changes while standing still). Analyse them separately:

```powershell
cd C:\Users\Chester\Desktop\Vaya\SESEM\tools\rssi_calibration
$py = "C:\Users\Chester\.platformio\penv\Scripts\python.exe"
# accuracy at the zone points
& $py analyze_zone_accuracy.py --settle 5 --ignore transit,mid C:\TroDesData\test2\test2_run2_room.csv
# stability at the midway points: read "Per stationary segment" -> changes
& $py analyze_zone_accuracy.py --settle 5 C:\TroDesData\test2\test2_run2_room.csv
```

Repeat with `test2_run2_prox.csv` after flashing proximity mode.

**Walk test** (the demo itself): BW → MR → DH → BW, standing ~1 m from each
beacon for 10 s. Record, per transition, whether the right zone appeared and
how many seconds it took. The MR arrival must raise the restricted alert.

| Transition | Room mode: correct? / s | Proximity mode: correct? / s |
|---|---|---|
| BW → MR | | |
| MR → DH | | |
| DH → BW | | |

## 4. Demo layout (dorm and defense room)

- Three beacons in **separate corners, as far apart as the room allows**
  (aim for ≥ 3–4 m; in a small dorm room use the corners and the doorway),
  same height (1.2–1.5 m), antenna end up, clear of metal and not touching
  anything. The closer the beacons, the smaller each proximity zone must be.
- `medicine_room` beacon beside a **medicine-cabinet prop**, with the **door
  node** on a door or a prop box next to it: open the door → door alert;
  walk up → restricted-zone alert.
- Dashboard on a laptop from the repository (`dashboard/`, three zones),
  wearable pointed at it (WiFi details in `include/secrets.h`). Start the
  backend and leave the window open, then browse to `http://localhost:8000`:

```powershell
cd C:\Users\Chester\Desktop\Vaya\SESEM\dashboard
& "C:\TroDesData\dashboard\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 5. Choreography

1. Start at `bedroom_wing` — dashboard shows *Bedroom Wing*, safe (green).
2. Walk to `dining_hall`, stand ~1 m away for ~5 s — zone change.
3. Open the medicine-room door node — door alert.
4. Walk to `medicine_room` — restricted alert, buzzer, red card.
5. Press SOS (short) — SOS banner; long-press — dismissed.
6. Acknowledge alerts on the dashboard (recorded with time).

Stand still at each stop; the zone settles in about 1–3 s.

## 6. What to say to the panel

> "In deployment there is one beacon per room, separated by walls. We tested
> that at school: across a wall the system made zero cross-room errors. This
> demo room is a single space, so each zone is represented as a proximity area
> around its beacon — our single-room test showed zones separate reliably
> within about one metre, which is why the demo firmware only enters a zone
> close to its beacon."

Have the Run 1 and Run 2 tables ready as backup slides.

## 7. Backup if the radio misbehaves on the day

Run the scripted scenario against the same dashboard and **say that it is
simulated**:

```powershell
cd C:\Users\Chester\Desktop\Vaya\SESEM\dashboard
& "C:\TroDesData\dashboard\.venv\Scripts\python.exe" simulate.py --scenario demo --speed 2
```

## Related

[[Test 2 Field Sheet]] · [[Work Log]] · [[Resume Here]] · [[Deliverables Tracker]]
