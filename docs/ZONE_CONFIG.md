# Zone Configuration — the one table every board must agree on

Every TroDes board derives its behaviour from the values below. If a beacon,
the wearable, and a door node disagree on any of them, zone detection fails
silently — the wearable simply never sees a beacon it recognises.

---

## 1. Shared BLE identity

| Field | Value | Where it lives |
|---|---|---|
| iBeacon proximity UUID | `5ca9015e-adc8-40a9-a1e2-d539f3b065bd` | `beacon_node/include/zone_config.h`, `wearable/include/config.h` |
| Major (site/installation) | `1` | same two files |
| Minor | the zone id from the table below | per-beacon, in `zone_config.h` |

The UUID is what isolates this system from every other iBeacon in radio range.
The wearable discards any advertisement whose UUID or major does not match, so
a stray beacon in a neighbouring building cannot be mistaken for a zone.

**This UUID was generated for this project.** There is no reason to change it,
but if you do, change it in *both* files and reflash *every* board.

---

## 2. Zone table

**Defense demo — three zones, approved by the adviser on 21 Sep 2026:**

| Minor (zone id) | Zone name | Class | Door sensor? |
|---|---|---|---|
| 1 | `bedroom_wing` | Safe | No |
| 2 | `dining_hall` | Safe | No |
| 11 | `medicine_room` | **Restricted** | Yes |

Hardware for the demo: three beacons (one per zone), one door node on the
medicine room, one wearable.

The full facility map, kept for extending the system after the defense, also
had `common_area_garden` (3, safe), `main_exit` (12, restricted, door sensor)
and `stairwell` (13, restricted, door sensor).

Safe zones use ids 1–9, restricted zones 11–19. The gap is deliberate: it keeps
the two classes readable at a glance in a serial log or a database dump.

This table appears in three places and they must stay in sync:

- `firmware/beacon_node/include/zone_config.h` — `ZONE_ID` / `ZONE_NAME`, one
  value per flashed board
- `firmware/wearable/include/zone_table.h` — the full `kZones[]` array
- `firmware/door_sensor/include/config.h` — `DOOR_ID` / `DOOR_NAME`, one value
  per flashed board
- `dashboard/config/zones.json` — zones, doors and residents shown on the
  caregiver dashboard

To add a zone back, add its row to `kZones[]` and `zones.json`, flash a beacon
for it, and (if restricted) flash and register a door node.

---

## 3. Per-beacon flashing checklist

One physical beacon per room. For each board:

1. Open `firmware/beacon_node` in VS Code.
2. Edit `include/zone_config.h`: set `ZONE_ID` and `ZONE_NAME` from the table.
3. Build and upload (see `BOARD_PROGRAMMING_GUIDE.md`).
4. **Label the physical board** with the zone name — masking tape and a marker.
   Two identical ESP32s in a bag are indistinguishable, and reading the zone
   back out requires reflashing or a scanner app.
5. Confirm over the air with nRF Connect: the device should appear as
   `TRODES_<zone_name>`, `Connectable: No`, with a steady packet stream.

Repeat for every zone before starting any test in `PHASE1_TEST_GUIDE.md`.

---

## 4. Radio settings that must match across beacons

| Setting | Value | Why it matters |
|---|---|---|
| `BEACON_TX_POWER` | `ESP_PWR_LVL_P9` (+9 dBm; raised from P3 on 13 Sep 2026) | If one beacon transmits harder than the others, its zone "wins" from further away and the RSSI-to-distance model stops being comparable between rooms. |
| `ADV_INTERVAL_MIN/MAX` | `160` (100 ms) | Sets how quickly the wearable can notice a zone change. Beacons are mains-powered, so a fast interval costs nothing. |
| `MEASURED_POWER_1M` | `-59` dBm (placeholder) | Declared in the iBeacon frame. Replace with the value Test 1 measures. |

---

## 5. Values that are still placeholders

| Value | Current | Replace after |
|---|---|---|
| `MEASURED_POWER_1M` | −59 dBm | Test 1 (distance profile) |
| `PATH_LOSS_EXPONENT` | 2.5 | Test 1 |
| `RSSI_FLOOR_DBM` | −88 dBm | Test 1 |
| `HYSTERESIS_DB` | 4 dB | Test 3 (boundary behaviour) |
| `CONFIRM_TICKS` | 3 (≈900 ms) | Test 3 |
| `SOS_LONG_PRESS_MS` | 3000 ms | Adviser confirmation |
| `BATTERY_LOW_PCT` / `BATTERY_CRITICAL_PCT` | 20% / 10% | Adviser review |
| `BACKEND_BASE_URL` | `http://192.168.1.100:8000` | Backend hosting decision |
