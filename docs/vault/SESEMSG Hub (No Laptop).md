---
title: SESEMSG Hub (No Laptop)
tags: [firmware, dashboard, door-node, defense, sesem]
updated: 2026-09-29 (built and network-tested; wearable join still failing on the bench)
---

# SESEMSG hub: the whole system without a laptop

**Team question (29 Sep):** can the panel use the app with no back end (no laptop), just a QR code?
**Answer:** yes. The **door node becomes the hub**. It runs:
- its own Wi-Fi network;
- the dashboard page;
- the alert rules;
- the passcode.

The panel scans a QR card, joins the network, and the dashboard opens on their phone.

![[SESEMSG_Panel_QR_Card.pdf]]

## How it works

| Part | What it does |
|---|---|
| Wi-Fi network **SESEMSG** (WPA2) | Made by the door node, at `192.168.4.1`. The wearable and the phones join it directly. There is no router and no internet. |
| Captive portal | The hub's DNS answers every name with `192.168.4.1`. A phone checking for internet is sent to the dashboard, so it pops up by itself ("Sign in to network"). |
| Dashboard | The **same page** as the laptop (`dashboard/static/v2`). It is packed into the firmware at build time, gzipped to 14 KB. |
| Server logic | The laptop server's API, kept in RAM, **field for field**, so the page needs no changes. It covers the device reports, the summary, Acknowledge, the passcode (lockout after 5 wrong tries), "Device not reporting" after 30 s, and `sos_open` (so the wearable's SOS/LED clears on Acknowledge). |
| Uplink (optional) | If MAPUA Wi-Fi is in range, the hub also joins it and **forwards everything to the laptop server**, so both dashboards stay live. An SOS acknowledged on the laptop is cleared on the hub too. |
| Wearable | Prefers SESEMSG when it is on the air; otherwise MAPUA + laptop, as before. **Currently switched off**, see *Status*. |

## Limits (fine for the demo; say them if asked)

- **Alerts are kept in RAM.** Restarting the hub starts an empty history.
- **No clock chip.** The first phone that opens the page tells the hub the time. All times are stored relative to the hub's uptime, so events recorded before that still show correctly.
- **At most 8 devices** (the ESP32's DHCP limit): the wearable plus 7 phones.
- Some Android phones send the page over mobile data. **Turn mobile data off** if it does not load; the card says so.

## Status (29 Sep, night)

- **Hub: built and tested.** From the laptop over MAPUA, **17/17 checks pass**:
  - the page (0.1 s), passcode, wrong-code count, 401 without login, summary shape, clock set from the phone, door online;
  - the Android and iPhone captive-portal checks redirect to the dashboard;
  - idle "preconnect" sockets cause no stall;
  - 4 phones polling each second: median 39 ms, worst 57 ms.
- **Wearable → hub: not working yet.** The wearable joins SESEMSG and gets an address (192.168.4.2), then is dropped within 0.1–0.3 s (reason 2 / 6).
  - **Ruled out:** the password (an open network drops too), the uplink / channel changes (uplink off drops too), and BLE scan load (50 % duty, and BLE fully paused, drop too).
  - **Main suspect:** both boards were in **adjacent USB ports of the laptop, centimetres apart**. Two ESP32s that close overload each other's receivers. MAPUA's access points are metres away, which is why they work.
  - **Next test:** boards at least 1 m apart (wearable on the power bank). The hub now logs each device's signal every 30 s; stronger than about −20 dBm means too close.
- Until that passes, the wearable's hub preference is **off** (`HUB_SSID` commented out in `firmware/wearable/include/secrets.h`), so it uses MAPUA + laptop only.
- **The door node is running the standalone hub build (uplink off).** The laptop dashboard will show the door **Offline** until it is reflashed with the normal or the uplink build.
- **Not committed.**

## Build and flash

- **Hub** (door node):

  ```
  pio run -e esp32hub -t upload --upload-port COM13
  ```

- **Standalone** (no MAPUA uplink):

  ```
  PLATFORMIO_BUILD_FLAGS=-DHUB_UPLINK=0 pio run -e esp32hub ...
  ```

- **Bench test with the boards close:** add `-DHUB_TX_POWER=WIFI_POWER_2dBm`.
- **Back to the plain door node:**

  ```
  pio run -e esp32dev -t upload --upload-port COM13
  ```

- **Credentials** go only in the git-ignored `firmware/door_sensor/include/secrets.h`: `HUB_AP_SSID`, `HUB_AP_PASSWORD`, `HUB_PASSCODE`. A build without them stops with an error.
- **Wearable:** `HUB_SSID`, `HUB_PASSWORD` and `HUB_BASE_URL` in `firmware/wearable/include/secrets.h`.
- **Hub diagnostics:** `http://192.168.4.1/api/v1/hub` shows the devices, their signal, the uplink, forwarding counts, free memory and whether the clock is set.

## Files

- **Door node:**
  - `firmware/door_sensor/src/hub.cpp` and `include/hub.h`;
  - `scripts/embed_dashboard.py`, which packs the page into `include/hub_page.h` (generated, git-ignored);
  - `platformio.ini` (new env `esp32hub`) and `include/config.h` (hub section).
- **Wearable:** `firmware/wearable/src/main.cpp` (network choice, link check, Wi-Fi event log) and `include/config.h` (`HUB_*`).
- **Panel card:** `SESEMSG_Panel_QR_Card.pdf` (A4, two A5 cards), plus `SESEMSG_wifi_qr.png` and `SESEMSG_dashboard_qr.png`. Both codes were checked by decoding them.

## Plan B if the wearable still cannot join the hub

Send the wearable's status to the hub **over BLE** instead of Wi-Fi:
- the wearable advertises zone, heart rate, battery and SOS;
- the hub scans for it, and advertises the SOS acknowledgement back;
- the wearable already scans BLE for the beacons.

This is a bigger change, so it is only worth it if the 1 m test fails.

## Related

[[Defense Demo Plan]] · [[Dashboard Build Status]] · [[Door Node Perfboard Layout]] · [[Work Log]]
