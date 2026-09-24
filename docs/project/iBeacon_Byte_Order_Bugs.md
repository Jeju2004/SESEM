# The iBeacon byte-order bugs

Three separate byte-order faults in the ESP32 Arduino `BLEBeacon` helper cost
roughly two weeks of blocked progress between 2026-08-26 and 2026-09-03.

**All three fail silently.** The beacon advertises, appears in scanner apps,
shows strong RSSI and looks completely healthy — while the wearable discards
every packet and `[RSSI]` reads `--` indefinitely.

**Read this before debugging any BLE reception problem in this project.**

---

## The three bugs

`BLEBeacon` stores fields in the library's native little-endian form and does
not swap them back to on-air (big-endian) order.

| # | Field | Wrong | Right | Symptom |
|---|---|---|---|---|
| 1 | Advertisement type | `ADV_TYPE_NONCONN_IND` | `ADV_TYPE_SCAN_IND` | Beacon appears **nameless** in scanners. The non-scannable type never answers scan requests, so the scan response carrying `TRODES_<zone>` never transmits |
| 2 | Company ID | `setManufacturerId(0x4C00)` | `setManufacturerId(0x004C)` | Emits `00 4C` instead of Apple's `4C 00`. Generic scanners don't check this; the wearable's filter does |
| 3 | Proximity UUID | `setProximityUUID(BLEUUID(uuid))` | Build the frame by hand | Transmits the UUID **byte-reversed**. Everything else looks correct |

---

## Bug 3 — the one that blocked Phase 1

Configured with `5ca9015e-adc8-40a9-a1e2-d539f3b065bd`, nRF Connect showed:

```
observed : BD65 B0F3 39D5 E2A1 A940 C8AD 5E01 A95C
intended : 5CA9 015E ADC8 40A9 A1E2 D539 F3B0 65BD
```

The same sixteen bytes in exactly reverse order. Device name, major, minor and
TX power were all correct. The only wrong field was the one the wearable
filters on — which is why the beacon looked perfectly healthy while zone
detection never worked.

**What found it:** a phone screenshot of nRF Connect showing raw manufacturer
data. The wearable's own logs could not have revealed it — from the wearable's
side, a beacon with a foreign UUID and no beacon at all are indistinguishable.

---

## The fix

`beacon_node/src/main.cpp` no longer uses `BLEBeacon`. It builds the 25-byte
manufacturer block directly, so byte order is explicit and reviewable:

```
offset  size  field
0       2     company ID, 4C 00 (Apple), on-air order
2       1     type, 0x02 (proximity beacon)
3       1     length of remainder, 0x15 = 21
4       16    proximity UUID, big-endian exactly as written down
20      2     major, big-endian
22      2     minor, big-endian
24      1     measured power at 1 m, dBm, signed byte
```

Beacon and wearable derive their UUID bytes from the same string with an
identical parser, so the two ends cannot disagree.

---

## Verify after any beacon change

**1. The beacon prints its own frame at boot:**

```
Frame on air : 4C 00 02 15 5C A9 01 5E AD C8 40 A9 A1 E2 D5 39 F3 B0 65 BD 00 01 00 01 C5
```

Bytes 5–20 must match the `UUID` line printed directly above, in the same order.

**2. Cross-check in nRF Connect.** Beacon UUID must read
`5CA9015E-ADC8-40A9-A1E2-D539F3B065BD`. Any rearrangement means the frame is
wrong, however healthy the beacon looks.

---

## Wearable diagnostic mode

`DEBUG_BLE_SNIFF` in `wearable/include/config.h`. **Default 0.** Set to 1 only
while diagnosing reception — it is noisy and pollutes test captures. A capture
containing `[SCAN]` or `[SNIFF]` lines was taken on a sniffer build.

Prints a funnel once per status line:

```
[SCAN] adv=412 mfg=88 ibeacon=31 ours=31
```

The first number that reads zero tells you where the problem is:

| Reading | Meaning |
|---|---|
| `adv=0` | Scanner hears **nothing**. Radio or scan-start problem, not a filter problem |
| `adv>0 mfg=0` | Devices heard, none carry manufacturer data — no beacons in range |
| `mfg>0 ibeacon=0` | Manufacturer data present but not iBeacon-shaped — check the beacon's frame |
| `ibeacon>0 ours=0` | Real iBeacons on air, UUID or major mismatch — **bug 3's signature** |
| `ours>0` | Packets accepted; any remaining problem is classification, not reception |

---

## The general lesson — worth stating in Chapter 5

**A BLE beacon that looks correct in a scanner app is not evidence that it is
correct.** Scanner apps display fields; they do not validate them against
intent. Three separate faults each produced a beacon a scanner rendered as
healthy.

The only reliable proof is comparing the **raw bytes on air** against the bytes
intended. That is why the beacon prints its own frame, why the wearable has a
sniffer mode, and why both ends parse the same string.

This generalises beyond BLE: any protocol field byte-swapped by a library, and
checked only by your own code, will fail silently and look fine from outside.
Build a way to see the wire format before you need it.
