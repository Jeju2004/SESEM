# Raw test data

Serial captures from `tools/rssi_calibration/log_serial.py` (columns:
`iso_time, elapsed_s, label, line`). Originals live in `C:\TroDesData\`; these
are the backed-up copies. **Never edit a raw capture** — write corrected
copies alongside with a suffix, as `test2_run1_labelled.csv` does.

| File | What it is | Usable? |
|---|---|---|
| `dryrun/dryrun.csv` | 6 Sep bring-up capture — before the P9 power change (13 Sep), single beacon, `DEBUG_BLE_SNIFF = 1` build | **No** — kept for the record only |
| `test1/test1_los.csv` | Test 1 clean redo, 21 Sep (RSSI vs distance, line of sight) | Yes |
| `test1/test1_run3_dining_hall.csv` | Byte-identical copy of `test1_los.csv` | Duplicate |
| `test2/test2_run1.csv` | **Test 2 Run 1**, school, 24 Sep 17:22–17:37. BW and MR beacons in one room, DH in the other. Firmware `f5b2e92` (room mode, test power profile). Raw labels as typed | Yes (raw) |
| `test2/test2_run1_labelled.csv` | Run 1 with labels corrected: short labels given their zone prefix (`BW-mid` → `bedroom_wing@BW-mid`), `-in`/`-out` → `-bnd-in`/`-bnd-out`, four `transit` typos → `transit`, second BW-near visit → `BW-near-2` | **Use this one** |
| `test2/test2_run1_results.txt` | `analyze_zone_accuracy.py --settle 5` output for the labelled file | Yes |
| `test2/test2_run2.csv` | 11 s, 24 Sep 17:43, label `transit` only — an aborted start, no test points | No |

Run 1 summary: 56.2 % overall, 23.2 % unresolved; zero cross-room errors;
in the shared room only ~1 m points were reliable; all unresolved samples at
doorway points. Full write-up in the vault's `Work Log.md` (24 Sep, night).

Planned: `test2_run2_room.csv` and `test2_run2_prox.csv` (dorm, single room,
room mode vs proximity mode) — see the vault's `Defense Demo Plan.md`.

## Added 30 Sep 2026

| File | What it is | Usable? |
|---|---|---|
| `walk/2026-09-30_beacon_walk_serial.txt` | Informal three-beacon walk on the final firmware, 30 Sep 00:22–00:37 (wearable on the SESEMSG hub). Filtered serial log: `[RSSI]` every 30 s plus every `[ZONE]`/`[ALERT]`/`[NET]` line. **No ground truth** - a functional check, not a Test 2 run | Yes, for the zone timeline (paper Fig. 6); not for accuracy |
| `field/door_bench_test*.log` | Door node bench serial logs, 25 Sep 11:26–12:10: boot, reed state, heartbeats with Wi-Fi down and the queue counters (`q=`, `dropped=`), around the offline-queue fix | Yes (record) |

## Added 1 Oct 2026 (house test, night of 30 Sep)

| File | What it is | Usable? |
|---|---|---|
| `demo/2026-09-30/hub_diag_after_video.json` | SESEMSG hub `/api/v1/hub` at 00:25, after the video demo: uptime 633 s, `alerts_stored` 0 - the hub had restarted and its RAM-only alert history was gone | Yes, as the record of that restart; it holds no demo alerts |

The dry run and video demo themselves have no data file: no serial capture was
made and the hub lost its alerts on restart. The team's video recordings are
the record. See `docs/project/House_Test_2026-09-30.md`.
