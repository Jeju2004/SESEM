#!/usr/bin/env python3
"""Contract self-test for the caregiver dashboard backend.

Runs the awkward cases against a live server and asserts the behaviour the
panel is likely to probe. Start the backend on a scratch database first:

    set TRODES_DB=%TEMP%\\trodes_test.db
    python -m uvicorn app.main:app --port 8001
    python tools/selftest.py --base-url http://127.0.0.1:8001

Do NOT point it at the database you intend to demo from: it posts synthetic
events, and a panel reading the alert history should see the demo, not this.

Every check maps to a claim made in the build brief or the user manual, so a
failure here is a claim that is no longer true.
"""

from __future__ import annotations

import argparse
import sys
import time

import requests

PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str, str]] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    results.append((PASS if condition else FAIL, name, detail))
    print(f"  [{PASS if condition else FAIL}] {name}" + (f"  -- {detail}" if detail else ""))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://127.0.0.1:8001")
    args = ap.parse_args()
    base = args.base_url.rstrip("/") + "/api/v1"
    s = requests.Session()

    dev = f"selftest-{int(time.time())}"
    node = f"selftest-door-{int(time.time())}"

    print("\n1. Ingest and current state")
    s.post(f"{base}/status", json={
        "device_id": dev, "zone_id": 1, "zone": "bedroom_wing", "restricted": False,
        "rssi": -50, "distance_m": 1.2, "hr_bpm": 72, "batt_pct": 88,
        "batt_v": 3.92, "sos": False, "uptime_s": 10})
    r = s.get(f"{base}/residents").json()
    me = next((x for x in r["residents"] if x["device_id"] == dev), None)
    check("status packet creates resident state", me is not None)
    check("zone classified safe", me and me["zone"]["class"] == "safe", me["zone"]["name"])
    check("battery reported", me and me["battery"]["pct"] == 88)
    check("heart rate reported", me and me["hr_bpm"] == 72)

    print("\n2. Sentinel values are not shown as real readings")
    s.post(f"{base}/status", json={
        "device_id": dev, "zone_id": 1, "zone": "bedroom_wing",
        "hr_bpm": -1, "batt_pct": -1, "uptime_s": 15})
    me = next(x for x in s.get(f"{base}/residents").json()["residents"]
              if x["device_id"] == dev)
    check("hr_bpm -1 becomes null, never 0", me["hr_bpm"] is None)
    check("batt_pct -1 becomes null, never 0%", me["battery"]["pct"] is None)
    check("battery level reads 'unknown'", me["battery"]["level"] == "unknown")

    print("\n3. Unknown zone")
    s.post(f"{base}/status", json={"device_id": dev, "zone_id": 0,
                                   "zone": "unknown", "uptime_s": 20})
    me = next(x for x in s.get(f"{base}/residents").json()["residents"]
              if x["device_id"] == dev)
    check("zone_id 0 classifies as unknown, not safe",
          me["zone"]["class"] == "unknown")

    print("\n4. A restart is not a delayed packet, and vice versa")
    # The wearable does not queue status packets, so uptime going backwards
    # there means the board restarted - the new reading is the truth.
    s.post(f"{base}/status", json={"device_id": dev, "zone_id": 2,
                                   "zone": "dining_hall", "uptime_s": 400})
    reboot = s.post(f"{base}/status", json={"device_id": dev, "zone_id": 1,
                                            "zone": "bedroom_wing",
                                            "uptime_s": 3}).json()
    me = next(x for x in s.get(f"{base}/residents").json()["residents"]
              if x["device_id"] == dev)
    check("wearable restart accepted, not discarded as stale",
          reboot.get("accepted") is True)
    check("restart increments the boot counter", me["boot_id"] >= 2,
          f"boot_id={me['boot_id']}")
    check("live zone follows the restarted device",
          me["zone"]["key"] == "bedroom_wing", me["zone"]["key"])

    # A retransmitted status from the same boot must not rewind the view.
    s.post(f"{base}/status", json={"device_id": dev, "zone_id": 2,
                                   "zone": "dining_hall", "uptime_s": 8})
    late = s.post(f"{base}/status", json={"device_id": dev, "zone_id": 1,
                                          "zone": "bedroom_wing",
                                          "uptime_s": 5}).json()
    me = next(x for x in s.get(f"{base}/residents").json()["residents"]
              if x["device_id"] == dev)
    check("reordered status rejected from live state",
          late.get("accepted") is False, late.get("reason", ""))
    check("live zone still the newer one", me["zone"]["key"] == "dining_hall",
          me["zone"]["key"])

    print("\n5. Same-second events are not mistaken for replays")
    s.post(f"{base}/door", json={"node_id": node, "door_id": 11,
                                 "door": "medicine_room", "type": "heartbeat",
                                 "state": "closed", "uptime_s": 50})
    opened = s.post(f"{base}/door", json={"node_id": node, "door_id": 11,
                                          "door": "medicine_room",
                                          "type": "state_change",
                                          "state": "open", "uptime_s": 50}).json()
    check("state_change sharing a second with a heartbeat is accepted",
          opened.get("accepted") is True)
    check("restricted door open raises an alert",
          opened.get("alert_id") is not None)

    # A door that opened while Wi-Fi was down still opened. The event is
    # recorded even though it cannot move the live doors panel.
    s.post(f"{base}/door", json={"node_id": node, "door_id": 11,
                                 "door": "medicine_room", "type": "heartbeat",
                                 "state": "open", "uptime_s": 120})
    queued = s.post(f"{base}/door", json={"node_id": node, "door_id": 11,
                                          "door": "medicine_room",
                                          "type": "state_change",
                                          "state": "closed",
                                          "uptime_s": 80}).json()
    check("queued door event does not move the live panel",
          queued.get("accepted") is False)
    check("queued door event is still recorded as an alert",
          queued.get("alert_id") is not None)
    repeat = s.post(f"{base}/door", json={"node_id": node, "door_id": 11,
                                          "door": "medicine_room",
                                          "type": "state_change",
                                          "state": "closed",
                                          "uptime_s": 80}).json()
    check("a retransmission of it is not logged twice",
          repeat.get("alert_id") is None)
    d = s.get(f"{base}/doors").json()["doors"]
    mine = next((x for x in d if x["node_id"] == node), None)
    check("live door state unchanged by the late packet",
          mine and mine["state"] == "open", mine and mine["state"])

    print("\n6. SOS lifecycle")
    s.post(f"{base}/alert", json={"device_id": dev, "type": "sos",
                                  "detail": "button short press",
                                  "zone": "dining_hall", "zone_id": 2,
                                  "uptime_s": 60})
    active = s.get(f"{base}/alerts", params={"active": "true"}).json()["alerts"]
    sos = [a for a in active if a["type"] == "sos" and a["device_id"] == dev]
    check("SOS appears in active alerts", len(sos) == 1)
    check("SOS ranked critical", sos and sos[0]["severity"] == "critical")

    s.post(f"{base}/alert", json={"device_id": dev, "type": "sos_dismissed",
                                  "detail": "long press", "uptime_s": 65})
    active = s.get(f"{base}/alerts", params={"active": "true"}).json()["alerts"]
    check("long press clears the SOS",
          not [a for a in active if a["type"] == "sos" and a["device_id"] == dev])

    print("\n7. Nothing else auto-dismisses")
    s.post(f"{base}/alert", json={"device_id": dev, "type": "zone_restricted",
                                  "detail": "entered medicine_room",
                                  "zone": "medicine_room", "zone_id": 11,
                                  "uptime_s": 70})
    for up, zone in ((75, "bedroom_wing"), (80, "dining_hall")):
        s.post(f"{base}/status", json={"device_id": dev, "zone_id": 1,
                                       "zone": zone, "uptime_s": up})
    active = s.get(f"{base}/alerts", params={"active": "true"}).json()["alerts"]
    zr = [a for a in active if a["type"] == "zone_restricted" and a["device_id"] == dev]
    check("restricted-zone alert survives the resident leaving", len(zr) == 1)

    print("\n8. Acknowledgement is recorded")
    if zr:
        aid = zr[0]["id"]
        ack = s.post(f"{base}/alerts/{aid}/ack",
                     json={"acked_by": "Selftest Nurse", "note": "checked"}).json()
        check("ack accepted", ack.get("ok") is True)
        check("ack records who", ack.get("acknowledged_by") == "Selftest Nurse")
        again = s.post(f"{base}/alerts/{aid}/ack", json={"acked_by": "Someone Else"}).json()
        check("second ack does not overwrite the first",
              again.get("already") is True and
              again.get("acknowledged_by") == "Selftest Nurse")
        active = s.get(f"{base}/alerts", params={"active": "true"}).json()["alerts"]
        check("acknowledged alert leaves the active list",
              not [a for a in active if a["id"] == aid])
    check("unknown alert id returns 404",
          s.post(f"{base}/alerts/99999999/ack", json={}).status_code == 404)

    print("\n9. Information-only events do not bury the actionable ones")
    s.post(f"{base}/alert", json={"device_id": dev, "type": "zone_change",
                                  "detail": "a -> b", "uptime_s": 90})
    active = s.get(f"{base}/alerts", params={"active": "true"}).json()["alerts"]
    check("zone_change stays out of the active list",
          not [a for a in active if a["type"] == "zone_change"])
    recent = s.get(f"{base}/summary").json()["alerts_recent"]
    check("zone_change still recorded in history",
          any(a["type"] == "zone_change" for a in recent))

    print("\n10. Summary shape")
    d = s.get(f"{base}/summary").json()
    for key in ("residents", "doors", "alerts_active", "alerts_recent",
                "counts", "zones", "thresholds", "server_time"):
        check(f"summary contains '{key}'", key in d)

    failed = [r for r in results if r[0] == FAIL]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed.")
    if failed:
        print("\nFAILED:")
        for _, name, detail in failed:
            print(f"  - {name} {detail}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
