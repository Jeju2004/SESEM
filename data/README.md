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
