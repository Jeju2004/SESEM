# Board Programming Guide (Windows + PlatformIO)

A simple, reusable reference for flashing any TroDes ESP32/ESP8266 board.
This consolidates everything learned getting the beacon and wearable running
for the first time — read this once, then it should be routine.

A copy of this file also lives in the project as
`guides/Board_Programming_Guide.md`, so it can be found without digging
through the firmware zip.

---

## 1. One-time setup (do this once per laptop, not per board)

1. Install **VS Code**: https://code.visualstudio.com/
2. In VS Code, open Extensions (`Ctrl+Shift+X`), search **"PlatformIO IDE"**,
   install it. First install downloads its own toolchain in the background
   (5–10 min) — wait for the alien-head icon to appear in the left sidebar,
   then reload VS Code if prompted.
3. Install the USB-to-serial driver for your board's chip (check the small
   chip near the USB port on the board):
   - **CP2102 / CP2104** (Silicon Labs) — most common:
     https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
   - **CH340 / CH340C** — common on clone boards:
     search "CH340 driver Windows"
   - Check Device Manager → "Ports (COM & LPT)" after plugging a board in.
     If it shows a COM port, the driver is already fine — skip this.

The first build of each project also downloads that project's platform and
libraries. Expect the first `beacon_node` build to take several minutes and
the first `wearable` build to take longer; after that they are cached.

---

## 2. Flashing any single board — the routine

Every firmware folder (`beacon_node/`, `wearable/`, `door_sensor/`) is its own
PlatformIO project. The steps are identical for all three:

1. **Open the specific folder** in VS Code: File → Open Folder → navigate into
   `firmware/<project_name>` (not the repo root).
2. **Trust the folder** if prompted ("Restricted Mode" banner → Manage → Trust).
3. Wait for the PlatformIO icon row to appear at the very bottom of the window
   (house, checkmark, right-arrow, trash, flask, plug, terminal).
4. Plug in the board via USB.
5. Click the **checkmark (✓)** = Build. Wait for `SUCCESS`.
6. Click the **right-arrow (→)** = Upload.
   - If it hangs on `Connecting.....` and then fails with "the chip stopped
     responding" — **hold the board's BOOT button** the moment
     `Connecting.....` appears, keep holding until it starts writing (progress
     percentages appear), then release. Some boards need this every time, some
     auto-reset fine on their own — no way to tell except trying.
7. Click the **plug icon** = Serial Monitor, to see what the board prints.

---

## 3. Per-board notes

| Project | Purpose | Edit before flashing? | Notes |
|---|---|---|---|
| `beacon_node/` | Zone beacon (one per room) | `include/zone_config.h`: set `ZONE_ID`/`ZONE_NAME` per physical unit (see `ZONE_CONFIG.md`) | Small/fast build, no external libraries |
| `wearable/` | The resident's wearable | `include/config.h`: `WIFI_SSID`/`WIFI_PASSWORD` (optional — leave empty for pure BLE testing) | Bigger build (BLE+WiFi+sensors); needs `board_build.partitions = huge_app.csv` (already set) or it will not fit |
| `door_sensor/` | Restricted-door reed switch | `include/config.h`: `DOOR_ID`/`DOOR_NAME` per unit | ESP8266 by default (`env:d1_mini`); an ESP32 variant is commented out in `platformio.ini` |

**Label every board physically** as you flash it. Two identical ESP32s in a
bag are indistinguishable, and reading the zone back out means reflashing or
scanning it with a phone.

---

## 4. Flashing two (or more) boards at the same time

This is where it gets easy to accidentally flash the wrong board — and you
need at least two boards live for any real zone-detection test. Do this:

1. Plug in all boards you are working with.
2. Open Device Manager → "Ports (COM & LPT)". Note every COM port shown.
3. To match a port to a specific physical board: unplug just that one board,
   see which COM port disappears from the list, note it, plug it back in.
4. In **each** project's `platformio.ini`, uncomment these two lines under
   `[env:esp32dev]` (or `[env:d1_mini]` for the door sensor), filling in that
   board's actual port:
   ```ini
   upload_port  = COM5
   monitor_port = COM5
   ```
   Every `platformio.ini` in this package already has these lines pre-written
   as commented-out examples — just uncomment and fill in the real port.
5. Without this, PlatformIO auto-detects a port, and with two or more boards
   connected it can guess wrong — worst case, flashing one board's firmware
   onto a different board than you meant to.

You can have multiple VS Code windows open at once, one per board's project
folder — that is the easiest way to keep track of which window targets which
board.

---

## 5. Fixes already baked into this package (don't re-discover these)

These were found and fixed during the first hardware bring-up (2026-08-26).
If something below looks oddly specific, this is why.

- **Wearable needs `board_build.partitions = huge_app.csv`.** Without it, the
  build fails with `program size ... greater than maximum allowed` — the
  combined BLE + WiFi + HTTPClient + ArduinoJson + two sensor libraries do not
  fit in the default ~1.25 MB app partition. This trades away the second OTA
  update slot (unused here — flashing is over USB) for a ~3 MB app partition.
- **Beacon's `setManufacturerId()` must be called with `0x004C`, not
  `0x4C00`.** The library stores the value low-byte-first, and Apple's iBeacon
  company ID must go out on the wire as bytes `4C 00`. Passing `0x4C00`
  silently transmits `00 4C` instead — the beacon still advertises fine and
  shows up in generic scanner apps (they do not check), but the wearable's own
  filter correctly rejects every packet from it, so RSSI never updates.
- **Beacon's advertisement type is `ADV_TYPE_SCAN_IND`, not
  `ADV_TYPE_NONCONN_IND`.** The non-connectable-and-non-scannable type is
  spec-valid for a pure iBeacon, but it never responds to scan requests — so
  the human-readable name (`TRODES_<zone>`) never actually transmits and the
  beacon appears nameless in scanner apps. `SCAN_IND` keeps it non-connectable
  (correct — a beacon should never accept a connection) while letting the name
  broadcast, which makes identifying a specific zone's beacon during placement
  far easier.

---

## 6. Quick troubleshooting table

| Symptom | Likely cause | Fix |
|---|---|---|
| Upload can't find a port | Missing USB driver | Install CP2102 or CH340 driver (§1.3) |
| "A fatal error occurred: The chip stopped responding" | Board didn't enter bootloader mode automatically | Hold BOOT during the "Connecting....." phase |
| "program size ... greater than maximum allowed" | Firmware too big for default partition | Add `board_build.partitions = huge_app.csv` |
| Build/upload seems to target the wrong board | Multiple boards connected, port not pinned | Set `upload_port`/`monitor_port` explicitly (§4) |
| Beacon doesn't show up by name in a scanner app | Old firmware using `ADV_TYPE_NONCONN_IND` | Already fixed here — reflash if you have an older copy |
| Wearable's `[RSSI]` line never shows a number for a zone | Beacon manufacturer-ID byte order, or beacon not powered / out of range | Confirm the beacon is advertising in a scanner app, and that the `0x004C` build is what is actually flashed |
| Serial Monitor shows garbled text | Baud rate mismatch | Confirm the monitor is at 115200 (matches `monitor_speed`) |
| `log_serial.py` says the port is busy | PlatformIO Serial Monitor still holding it | Close the Serial Monitor — one program per COM port |
| Wearable reboots repeatedly at boot | Brown-out: USB port can't supply the BLE+WiFi current peak | Use a powered hub or a different USB port |

---

## 7. Build fails before it compiles anything (Windows path problem)

Found 2026-09-03. Symptom, running Build on a project stored inside the
Obsidian vault:

```
Can not remove temporary directory `...\door_sensor\.pio\build`.
FileNotFoundError: [WinError 3] The system cannot find the path specified:
  '...\AA_Electronics Design (SESEM)\...\door_sensor\.pio\libdeps\esp32dev'
```

PlatformIO parses `platformio.ini` fine (it prints `Processing esp32dev`) and
then dies trying to create its own `.pio` folder. Nothing has been compiled at
that point, so it is never a code fault.

**Cause.** The vault path contains parentheses — `AA_Electronics Design
(SESEM)` — and PlatformIO's SCons layer mishandles them on Windows.

**Fix, already applied to all three projects.** Send build output to a path
with no spaces or parentheses, by adding this to `platformio.ini`:

```ini
[platformio]
build_dir   = C:/pio/<board>/build
libdeps_dir = C:/pio/<board>/libdeps
```

Confirmed working: `door_sensor` built, uploaded and ran on real hardware
immediately after this change.

This is worth keeping even if the folder is ever renamed. A PlatformIO build
tree is thousands of files; left inside the vault, Obsidian indexes all of
them and any sync client tries to upload them. Nothing in `C:\pio` is
precious — delete the whole folder any time to force a clean rebuild.

**If it ever comes back**, read which path the error names:

| Error names | Meaning | Fix |
|---|---|---|
| `C:\pio\...` | Redirect is working, different problem | Read the actual error |
| `...(SESEM)\...\.pio` | Parentheses breaking more than the output dir | Copy the project to `C:\TroDes` and build there |
| `Access is denied` / `PermissionError` | Files written by the Cowork bridge, not by your Windows account | Extract/copy them yourself in File Explorer |

---

## 8. Bench-testing a door node without a reed switch

Confirmed working 2026-09-03. The reed input is `INPUT_PULLUP`, so grounding
it is exactly what a magnet does:

1. Flash `door_sensor`, open the Serial Monitor at 115200.
2. Boot prints `[DOOR] Initial state: OPEN` — correct with nothing wired, since
   the floating pin is held high by the internal pull-up.
3. Jumper **GPIO27 to GND** (silkscreened `G27` on boards that use the `G`
   prefix; its neighbours read `G26` and `G14`).
4. Expect `[DOOR] medicine_room -> CLOSED`, then `-> OPEN` on release.
5. `[HB]` heartbeat lines every 30 s show `wifi=down q=N` — expected while
   `WIFI_SSID` is empty. The queue caps at 16 and then reports `dropped=`.

Safe because the pin is an input pulled up through ~45 kΩ (~70 µA to GND).
Never do this to an output pin (e.g. GPIO2, the LED) or across 3V3/5V and GND.

Pins to avoid if you relocate the reed input: **GPIO34–39** are input-only with
no internal pull-up, so `INPUT_PULLUP` silently does nothing; **GPIO0, 2, 12,
15** are strapping pins, and a closed reed switch on one changes boot
behaviour. GPIO27, 26, 25, 33, 32, 14, 13 and 4 are all safe.

---

## 9. The iBeacon byte-order bugs (three of them, same library)

Found 2026-08-26 and 2026-09-03. These cost two debugging sessions between
them, and every one of them **fails silently** — the beacon advertises
happily, shows up in scanner apps, and looks completely healthy, while the
wearable discards every packet and `[RSSI]` shows `--` forever.

The ESP32 Arduino `BLEBeacon` helper stores fields in the library's native
little-endian form and does not swap them back to on-air order. Three fields
were affected:

| # | Field | Wrong | Right | Symptom |
|---|---|---|---|---|
| 1 | Advertisement type | `ADV_TYPE_NONCONN_IND` | `ADV_TYPE_SCAN_IND` | Beacon appears nameless in scanner apps — the scan response carrying `TRODES_<zone>` is never requested |
| 2 | Company ID | `setManufacturerId(0x4C00)` | `0x004C` | Emits `00 4C` instead of Apple's `4C 00`. Generic scanners don't check; the wearable's filter does |
| 3 | Proximity UUID | `setProximityUUID(BLEUUID(...))` | build the frame by hand | Transmits the UUID **byte-reversed** |

Bug 3 is the nastiest and was the one that blocked Phase 1 for a week. A
beacon configured with `5ca9015e-adc8-40a9-a1e2-d539f3b065bd` transmitted:

```
BD65 B0F3 39D5 E2A1 A940 C8AD 5E01 A95C     <- what nRF Connect showed
5CA9 015E ADC8 40A9 A1E2 D539 F3B0 65BD     <- what it should have been
```

Exactly the same sixteen bytes, in reverse. The name was right, the major and
minor were right, the RSSI was strong — everything looked correct except the
one field the wearable filters on.

**The fix, now in `beacon_node/src/main.cpp`:** don't use `BLEBeacon` at all.
Build the 25-byte manufacturer block directly, so byte order is explicit and
visible:

```
offset  size  field
0       2     company ID, 4C 00 (Apple), on-air order
2       1     type, 0x02
3       1     length of remainder, 0x15 = 21
4       16    proximity UUID, big-endian exactly as written down
20      2     major, big-endian
22      2     minor, big-endian
24      1     measured power at 1 m, dBm, signed byte
```

**How to verify, every time you change the beacon.** The firmware now prints
its own frame at boot:

```
Frame on air : 4C 00 02 15 5C A9 01 5E AD C8 40 A9 A1 E2 D5 39 F3 B0 65 BD 00 01 00 01 C5
```

Bytes 5–20 must match the `UUID` line printed just above it, in the same
order. Cross-check in nRF Connect: **Beacon UUID** there must read
`5CA9015E-ADC8-40A9-A1E2-D539F3B065BD`. If either shows a rearrangement of
those bytes, the frame is wrong — no matter how healthy the beacon looks.

Confirmed correct on hardware 2026-09-03, beacon on COM7.

### The general lesson

A BLE beacon that looks right in a scanner app is not evidence that it is
right. Scanner apps display fields; they do not validate them. The only proof
is comparing the **raw bytes on air** against the bytes you intended. That is
why the beacon prints its frame and why the wearable has `DEBUG_BLE_SNIFF`.

---

## 10. Wearable diagnostic mode

`DEBUG_BLE_SNIFF` in `wearable/include/config.h` (default `1` while Phase 1 is
being brought up; set to `0` once zone detection is confirmed — it is noisy).

When on, the wearable prints per-tick counters showing how far each
advertisement got through the filter:

```
[SCAN] adv=412 mfg=88 ibeacon=31 ours=31
```

Read it as a funnel — the first number that is zero tells you where to look:

| Reading | Meaning |
|---|---|
| `adv=0` | The scanner hears **nothing**. Radio or scan-start problem, not a filter problem |
| `adv>0 mfg=0` | Devices heard, but none carry manufacturer data — no beacons in range |
| `mfg>0 ibeacon=0` | Manufacturer data present but not iBeacon-shaped — check the beacon's frame |
| `ibeacon>0 ours=0` | Real iBeacons on air, but UUID or major doesn't match ours — **this was bug 3** |
| `ours>0` | Packets accepted. Any remaining problem is in classification, not reception |

It also dumps raw manufacturer data, throttled to ~3 lines/second:

```
[SNIFF] rssi= -49 len=25 4C 00 02 15 5C A9 01 5E ... <-- iBeacon shape
```

and echoes the expected UUID bytes at boot, so the two can be compared
directly on screen.
