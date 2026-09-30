# House test and pre-demo, 30 September 2026 (night)

Record of the evening session held the night before the defense (Thursday
1 October). Times are the laptop's clock; times marked ~ are approximate because no
timestamp was printed. Only what was observed or logged is stated here.

## Setup

| Item | State |
|---|---|
| Location | A house with several rooms; one beacon per room |
| Beacons online | `dining_hall` (DH, minor 2) and `medicine_room` (MR, minor 11). `bedroom_wing` offline |
| Door node | SESEMSG hub, standalone build (`env:esp32hub`, `HUB_UPLINK=0`), on a wall charger |
| Wearable | Carried by the tester; reports to the hub over SESEMSG |
| Laptop | On SESEMSG: `192.168.4.7`, later `192.168.4.2`; gateway `192.168.4.1` |

## What was done

- **Pre-demo dry run and video demonstration: completed** (reported by the
  team). The steps followed the demo sequence: zone in DH, door opened,
  restricted-zone entry with buzzer, return, SOS, dismiss, acknowledge.
- **No serial capture** was made during either run, so no delivery time or
  zone-accuracy figure comes from this session.
- **Evidence kept:** the phone video of the walk and the dashboard screen
  recording, which are held by the team and not in the repository.

## Data recovery attempts

| Time | Action | Result |
|---|---|---|
| 22:20 | Export the laptop dashboard database (`C:\TroDesData\dashboard\data\trodes.db`) | **0 rows** for 30 Sep. Last modified 24 Sep. The laptop server was not in use because the hub was standalone. Backup saved as `C:\TroDesData\trodes_2026-09-30.db` |
| 00:25 (1 Oct) | `GET /api/v1/hub` from the laptop | Saved as `data/demo/2026-09-30/hub_diag_after_video.json`. **`uptime_s` 633, `alerts_stored` 0**, `ap_clients` 1, `free_heap` 179 928, `min_free_heap` 160 424, `clock_set` true |
| ~00:40 | `GET /api/v1/hub` | **`uptime_s` 118**, `ap_clients` 1 |
| 01:07–01:12 | Polled `/api/v1/hub` every 30 s | **10 × no reply** |

The summary endpoint (`/api/v1/summary`) was not saved: the first login
attempts sent a placeholder passcode, and the laptop then dropped off SESEMSG.

## Findings

1. **The hub restarted at about 00:14**, after the video: the uptime was 633 s
   at 00:25.
   - Because the hub keeps alerts in RAM only, **the dry-run and video alerts
     were lost** (`alerts_stored` 0).
   - The video recordings are therefore the only record of the demonstration.
   - Any timing taken from them must be reported as read from video.
2. **A second restart** appears at about 00:38 (uptime 118 s at about 00:40).
   It is not known whether the node was replugged at that moment.
3. **No reply from 01:07 to 01:12.** Not yet distinguished: whether the laptop
   had left SESEMSG, or whether the hub was down or restarting.
4. **Heap was healthy at every reading** (minimum free heap about 160 KB), and
   the firmware has no self-restart call. The restarts therefore point to
   power (a brownout from the charger or cable), a crash, or replugging.
   **Not yet confirmed.**
5. **Only one client** (the laptop) was on SESEMSG at each reading. The wearable
   was not connected at those moments.
6. **Laptop Wi-Fi:** Windows repeatedly moved the laptop from SESEMSG to the
   home network. Auto-connect for `ZTE_5G_2AhHth` was set to manual. To
   restore it after the defense:
   `netsh wlan set profileparameter name="ZTE_5G_2AhHth" connectionmode=auto`.

## Open actions before the defense

- [ ] **Find the restart cause.**
  - Put the door node on the laptop's USB and capture its serial output with `log_serial.py`.
  - On the next boot, read the `rst:0x..` line:
    - `0xf` means a brownout;
    - `Guru Meditation Error` means a crash, followed by a backtrace.
  - Then retry on a different charger and cable (1 A or more).
- [ ] **Stability check:** leave the hub on its charger. `uptime_s` should keep rising (check `http://192.168.4.1/api/v1/hub`).
- [ ] **Wearable joins SESEMSG:** `ap_clients` should count it.
- [ ] **Plan B ready:**
  - the plain door-node build (`pio run -e esp32dev`);
  - the laptop dashboard over MAPUA Wi-Fi;
  - the wearable falls back to the laptop at `10.2.46.66`, so confirm the laptop's address at school.
- [ ] **Keep the video files on two devices**, with a USB copy for the defense.

## Test Day plan status

- **Tests A–D** from `Test_Day_2026-09-30.md` (Run 3, SOS, heart rate, doors) **have not been captured**.
  - A search of `C:\TroDesData` found no CSV newer than 25 September.
- **Chapter 4 still needs:**
  - Test 2 Run 3 accuracy;
  - SOS delivery time;
  - heart rate against an oximeter;
  - door reliability;
  - battery runtime.
