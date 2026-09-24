#!/usr/bin/env python3
"""Device simulator for the TroDes caregiver dashboard.

Posts the same JSON the firmware posts, so the dashboard can be built,
tested and demonstrated with no hardware attached. The boards are needed for
radio testing; this keeps the two tracks independent.

It also reproduces the awkward cases the panel will ask about:

  * Wi-Fi dropping out, the wearable queueing events, and the whole queue
    arriving in a burst - out of order relative to wall-clock - when the link
    returns. Run with --wifi-drop.
  * A door node going silent, which must read as a fault rather than as a
    closed door. Run with --kill-door.

Usage
-----
    python simulate.py                          # two residents, runs forever
    python simulate.py --speed 4                # 4x faster, for rehearsal
    python simulate.py --scenario demo          # scripted defense run
    python simulate.py --wifi-drop 30           # drop Wi-Fi after 30 s
    python simulate.py --once                   # one status each, then exit

Ctrl-C to stop.
"""

from __future__ import annotations

import argparse
import json
import random
import signal
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests is not installed.  pip install requests")

CONFIG_PATH = Path(__file__).resolve().parent / "config" / "zones.json"

STATUS_PERIOD_S = 5.0     # firmware posts status every 5 s
DOOR_HEARTBEAT_S = 30.0   # door node heartbeat every 30 s
BATTERY_LOW_PCT = 20
BATTERY_CRIT_PCT = 10


# ---------------------------------------------------------------------------

def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


@dataclass
class Wearable:
    """One simulated wearable.

    Mirrors what the firmware does, including which alerts it raises, so the
    dashboard sees exactly the traffic it will see from a real board.
    """

    device_id: str
    zones: list[dict]
    batt_pct: float = 100.0
    started: float = field(default_factory=time.time)
    zone: dict | None = None
    zone_since: float = 0.0
    sos_active: bool = False
    sos_at: float = 0.0
    battery_low_sent: bool = False
    battery_crit_sent: bool = False
    queue: list[tuple[str, dict]] = field(default_factory=list)

    def __post_init__(self):
        self.zone = self.zones[0]
        self.zone_since = time.time()

    @property
    def uptime_s(self) -> int:
        return int(time.time() - self.started)

    # -- radio model ----------------------------------------------------
    def rssi(self) -> int:
        """RSSI for the zone the resident is standing in.

        Centred near the bench figure from 2026-09-03 (-45 to -56 dBm) with a
        couple of dB of jitter. This is a plausible shape for testing the UI -
        it is NOT measured data, and nothing from this simulator belongs in
        Chapter 4.
        """
        if self.zone is None:
            return -99
        return int(random.gauss(-52, 3))

    def distance_m(self) -> float:
        # Log-distance model with the placeholder constants still in the
        # firmware: A = -59 dBm at 1 m, n = 2.5. Displayed as approximate only.
        rssi = self.rssi()
        return round(max(0.2, 10 ** ((-59 - rssi) / (10 * 2.5))), 2)

    def hr_bpm(self) -> int:
        # Occasionally the sensor sees no finger. -1 is the firmware's
        # "no reading" value and the dashboard must render it as an em dash.
        if random.random() < 0.08:
            return -1
        return int(random.gauss(74, 6))

    # -- payloads -------------------------------------------------------
    def status_payload(self) -> dict:
        z = self.zone
        return {
            "device_id": self.device_id,
            "zone_id": z["id"] if z else 0,
            "zone": z["key"] if z else "unknown",
            "restricted": bool(z and z["class"] == "restricted"),
            "rssi": self.rssi() if z else -99,
            "distance_m": self.distance_m() if z else 0.0,
            "hr_bpm": self.hr_bpm(),
            "batt_pct": int(self.batt_pct),
            "batt_v": round(3.30 + (self.batt_pct / 100.0) * 0.90, 2),
            "sos": self.sos_active,
            "uptime_s": self.uptime_s,
        }

    def alert_payload(self, type_: str, detail: str) -> dict:
        z = self.zone
        return {
            "device_id": self.device_id,
            "type": type_,
            "detail": detail,
            "zone": z["key"] if z else "unknown",
            "zone_id": z["id"] if z else 0,
            "batt_pct": int(self.batt_pct),
            "hr_bpm": self.hr_bpm(),
            "uptime_s": self.uptime_s,
        }

    # -- behaviour ------------------------------------------------------
    def move_to(self, zone: dict | None) -> list[tuple[str, dict]]:
        """Change zone and return the alerts the firmware would raise."""
        out: list[tuple[str, dict]] = []
        prev = self.zone
        self.zone = zone
        self.zone_since = time.time()

        if zone is None:
            out.append(("alert", self.alert_payload(
                "zone_lost", "no beacon in range")))
            return out

        out.append(("alert", self.alert_payload(
            "zone_change",
            f"{(prev or {}).get('key', 'unknown')} -> {zone['key']}")))
        if zone["class"] == "restricted":
            out.append(("alert", self.alert_payload(
                "zone_restricted", f"entered {zone['key']}")))
        return out

    def drain(self, dt: float, rate_pct_per_s: float) -> list[tuple[str, dict]]:
        out: list[tuple[str, dict]] = []
        self.batt_pct = max(0.0, self.batt_pct - rate_pct_per_s * dt)
        if self.batt_pct <= BATTERY_CRIT_PCT and not self.battery_crit_sent:
            self.battery_crit_sent = True
            out.append(("alert", self.alert_payload(
                "battery_critical", f"battery at {int(self.batt_pct)}%")))
        elif self.batt_pct <= BATTERY_LOW_PCT and not self.battery_low_sent:
            self.battery_low_sent = True
            out.append(("alert", self.alert_payload(
                "battery_low", f"battery at {int(self.batt_pct)}%")))
        return out

    def press_sos(self) -> list[tuple[str, dict]]:
        self.sos_active = True
        self.sos_at = time.time()
        return [("alert", self.alert_payload("sos", "button short press"))]

    def dismiss_sos(self) -> list[tuple[str, dict]]:
        self.sos_active = False
        return [("alert", self.alert_payload(
            "sos_dismissed", "button long press (3 s)"))]


@dataclass
class DoorNode:
    node_id: str
    door_id: int
    door: str
    state: str = "closed"
    started: float = field(default_factory=time.time)
    last_heartbeat: float = 0.0
    dead: bool = False

    @property
    def uptime_s(self) -> int:
        return int(time.time() - self.started)

    def payload(self, type_: str) -> dict:
        return {
            "node_id": self.node_id,
            "door_id": self.door_id,
            "door": self.door,
            "type": type_,
            "state": self.state,
            "rssi": int(random.gauss(-58, 4)),
            "uptime_s": self.uptime_s,
        }


# ---------------------------------------------------------------------------

class Poster:
    """Posts to the backend, with a Wi-Fi-down queue like the firmware's."""

    def __init__(self, base_url: str, verbose: bool = True):
        self.base = base_url.rstrip("/")
        self.session = requests.Session()
        self.online = True
        self.queue: list[tuple[str, dict, float]] = []
        self.verbose = verbose
        self.sent = 0
        self.dropped = 0

    def set_online(self, online: bool) -> None:
        if online == self.online:
            return
        self.online = online
        if online:
            log(f"Wi-Fi RESTORED - flushing {len(self.queue)} queued events "
                f"in a burst")
            # The firmware flushes its queue oldest-first as fast as the link
            # allows. Everything lands within a second or two of wall-clock,
            # which is exactly the case the dashboard has to survive.
            for path, body, _ in self.queue:
                self._send(path, body)
            self.queue.clear()
        else:
            log("Wi-Fi DOWN - wearable now queueing events and buzzing locally")

    def post(self, path: str, body: dict) -> None:
        if not self.online:
            # Status packets are transient; only events are worth queueing.
            # This matches the firmware, which keeps a bounded event queue.
            if path != "status":
                self.queue.append((path, body, time.time()))
                self.dropped += 1
            return
        self._send(path, body)

    def _send(self, path: str, body: dict) -> None:
        url = f"{self.base}/api/v1/{path}"
        try:
            r = self.session.post(url, json=body, timeout=4)
            self.sent += 1
            if self.verbose and path != "status":
                log(f"  -> {path}: {body.get('type', body.get('state'))} "
                    f"[{r.status_code}]")
            elif r.status_code >= 400:
                log(f"  !! {path} {r.status_code}: {r.text[:160]}")
        except requests.RequestException as exc:
            log(f"  !! {path} failed: {exc}")


# ---------------------------------------------------------------------------

def load_facility() -> tuple[list[dict], list[dict], list[dict]]:
    with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
        cfg = json.load(fh)
    return cfg["zones"], cfg["doors"], cfg["residents"]


def build_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="TroDes device simulator")
    p.add_argument("--base-url", default="http://127.0.0.1:8000",
                   help="backend base URL (default: %(default)s)")
    p.add_argument("--speed", type=float, default=1.0,
                   help="time multiplier; 4 runs four times faster")
    p.add_argument("--residents", type=int, default=0,
                   help="how many wearables (default: all in zones.json)")
    p.add_argument("--battery-minutes", type=float, default=20.0,
                   help="simulated minutes to drain 100%%->0%% (default: %(default)s)")
    p.add_argument("--scenario", choices=["random", "demo"], default="random",
                   help="random wandering, or the scripted defense sequence")
    p.add_argument("--wifi-drop", type=float, default=0.0,
                   help="seconds in, drop Wi-Fi for --wifi-drop-for seconds")
    p.add_argument("--wifi-drop-for", type=float, default=25.0)
    p.add_argument("--kill-door", type=float, default=0.0,
                   help="seconds in, stop one door node's heartbeats")
    p.add_argument("--duration", type=float, default=0.0,
                   help="stop after N seconds (0 = run forever)")
    p.add_argument("--once", action="store_true",
                   help="post one status per device and one door boot, then exit")
    p.add_argument("--seed", type=int, default=None)
    return p.parse_args()


# The scripted run for rehearsing the defense. Times are seconds from start,
# scaled by --speed. Every graded behaviour appears at least once. Matches the
# approved demo scope: one wearable, three zones, one door node.
DEMO_SCRIPT = [
    (10,  "move",        {"who": 0, "zone": "dining_hall"}),
    (25,  "move",        {"who": 0, "zone": "bedroom_wing"}),
    (40,  "door",        {"door": "medicine_room", "state": "open"}),
    (50,  "move",        {"who": 0, "zone": "medicine_room"}),
    (65,  "door",        {"door": "medicine_room", "state": "closed"}),
    (70,  "move",        {"who": 0, "zone": "dining_hall"}),
    (85,  "sos",         {"who": 0}),
    (100, "sos_dismiss", {"who": 0}),
    (115, "zone_lost",   {"who": 0}),
    (130, "move",        {"who": 0, "zone": "bedroom_wing"}),
    (145, "battery",     {"who": 0, "pct": 22}),
    (160, "battery",     {"who": 0, "pct": 11}),
    (175, "door",        {"door": "medicine_room", "state": "open"}),
    (190, "door",        {"door": "medicine_room", "state": "closed"}),
]


def main() -> int:
    args = build_args()
    if args.seed is not None:
        random.seed(args.seed)

    zones, doors_cfg, residents_cfg = load_facility()
    safe = [z for z in zones if z["class"] == "safe"]
    restricted = [z for z in zones if z["class"] == "restricted"]
    by_key = {z["key"]: z for z in zones}

    n = args.residents or len(residents_cfg)
    wearables = [
        Wearable(device_id=residents_cfg[i]["device_id"] if i < len(residents_cfg)
                 else f"wearable-{i+1:02d}", zones=safe)
        for i in range(n)
    ]
    doors = [DoorNode(node_id=d["node_id"], door_id=d["id"], door=d["key"])
             for d in doors_cfg]

    poster = Poster(args.base_url)

    try:
        poster.session.get(f"{poster.base}/api/v1/health", timeout=4).raise_for_status()
    except Exception as exc:
        log(f"Backend not reachable at {poster.base} ({exc})")
        log("Start it first:  uvicorn app.main:app --host 0.0.0.0 --port 8000")
        return 1

    log(f"Simulating {len(wearables)} wearable(s) and {len(doors)} door node(s) "
        f"-> {poster.base}  (speed x{args.speed}, scenario={args.scenario})")

    for d in doors:
        poster.post("door", d.payload("boot"))

    if args.once:
        for w in wearables:
            poster.post("status", w.status_payload())
        log("--once: sent one status per device. Done.")
        return 0

    stop = False

    def _sigint(_sig, _frm):
        nonlocal stop
        stop = True
    signal.signal(signal.SIGINT, _sigint)

    t0 = time.time()
    last_status = 0.0
    drain_rate = 100.0 / max(1.0, args.battery_minutes * 60.0)
    script = list(DEMO_SCRIPT) if args.scenario == "demo" else []
    wifi_down_until = 0.0

    while not stop:
        loop_start = time.time()
        elapsed = (loop_start - t0) * args.speed

        if args.duration and elapsed > args.duration:
            log("Duration reached.")
            break

        # -- Wi-Fi outage window ----------------------------------------
        if args.wifi_drop and elapsed >= args.wifi_drop and poster.online \
                and wifi_down_until == 0.0:
            wifi_down_until = elapsed + args.wifi_drop_for
            poster.set_online(False)
        if wifi_down_until and not poster.online and elapsed >= wifi_down_until:
            poster.set_online(True)

        # -- door node death --------------------------------------------
        if args.kill_door and elapsed >= args.kill_door:
            if doors and not doors[0].dead:
                doors[0].dead = True
                log(f"Door node {doors[0].node_id} has stopped responding "
                    f"(should show OFFLINE, not 'closed')")

        events: list[tuple[str, dict]] = []

        # -- scripted scenario ------------------------------------------
        while script and elapsed >= script[0][0]:
            _, action, arg = script.pop(0)
            w = wearables[min(arg.get("who", 0), len(wearables) - 1)] \
                if "who" in arg else None
            if action == "move":
                log(f"SCRIPT: {w.device_id} -> {arg['zone']}")
                events += w.move_to(by_key[arg["zone"]])
            elif action == "zone_lost":
                log(f"SCRIPT: {w.device_id} loses all beacons")
                events += w.move_to(None)
            elif action == "sos":
                log(f"SCRIPT: {w.device_id} presses SOS")
                events += w.press_sos()
            elif action == "sos_dismiss":
                log(f"SCRIPT: {w.device_id} long-presses to dismiss")
                events += w.dismiss_sos()
            elif action == "battery":
                w.batt_pct = float(arg["pct"]) + 0.9
                log(f"SCRIPT: {w.device_id} battery forced to {arg['pct']}%")
            elif action == "door":
                for d in doors:
                    if d.door == arg["door"] and not d.dead:
                        d.state = arg["state"]
                        log(f"SCRIPT: {d.door} {d.state}")
                        poster.post("door", d.payload("state_change"))

        # -- random wandering -------------------------------------------
        if args.scenario == "random":
            for w in wearables:
                dwell = (loop_start - w.zone_since) * args.speed
                if dwell > random.uniform(20, 60):
                    roll = random.random()
                    if roll < 0.12:
                        target = None                       # lost the beacon
                    elif roll < 0.30:
                        target = random.choice(restricted)  # wandered somewhere
                    else:                                   # it shouldn't be
                        target = random.choice(safe)
                    events += w.move_to(target)

                if not w.sos_active and random.random() < 0.004:
                    log(f"{w.device_id} presses SOS")
                    events += w.press_sos()
                elif w.sos_active and (loop_start - w.sos_at) * args.speed > 30 \
                        and random.random() < 0.25:
                    events += w.dismiss_sos()

            for d in doors:
                if d.dead:
                    continue
                if random.random() < 0.01:
                    d.state = "open" if d.state == "closed" else "closed"
                    poster.post("door", d.payload("state_change"))

        # -- battery ----------------------------------------------------
        for w in wearables:
            events += w.drain((loop_start - (last_status or loop_start))
                              * args.speed, drain_rate)

        for path, body in events:
            poster.post(path, body)

        # -- periodic status --------------------------------------------
        if loop_start - last_status >= STATUS_PERIOD_S / args.speed:
            last_status = loop_start
            for w in wearables:
                poster.post("status", w.status_payload())

        # -- door heartbeats --------------------------------------------
        for d in doors:
            if d.dead:
                continue
            if loop_start - d.last_heartbeat >= DOOR_HEARTBEAT_S / args.speed:
                d.last_heartbeat = loop_start
                poster.post("door", d.payload("heartbeat"))

        time.sleep(max(0.05, 1.0 / args.speed))

    if not poster.online:
        poster.set_online(True)
    log(f"Stopped. {poster.sent} posted, {poster.dropped} queued during outage.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
