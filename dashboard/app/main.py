"""TroDes caregiver dashboard - FastAPI backend.

Run:
    uvicorn app.main:app --host 0.0.0.0 --port 8000

Ingest endpoints (firmware -> server):
    POST /api/v1/status      wearable heartbeat, every 5 s
    POST /api/v1/alert       wearable events
    POST /api/v1/door        door sensor nodes

Read endpoints (dashboard -> server):
    GET  /api/v1/residents
    GET  /api/v1/alerts?active=true
    POST /api/v1/alerts/{id}/ack
    GET  /api/v1/doors
    GET  /api/v1/config
    GET  /api/v1/summary     everything in one call - what the page polls

Optional passcode (TRODES_PASSCODE, off by default): see app/auth.py.
"""

from __future__ import annotations

import asyncio
import contextlib
import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import (
    ALERT_LABEL,
    ALERT_SEVERITY,
    SEVERITY_CRITICAL,
    SEVERITY_INFO,
    SEVERITY_RANK,
    SEVERITY_WARNING,
    load_config,
)
from . import auth
from .db import DELAYED_S, connect, init_db, now, reconcile_uptime, rows_to_dicts
from .models import AckIn, AlertIn, DoorIn, StatusIn

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

# Severities that a caregiver has to act on. Info events are recorded and
# shown in the activity feed, but they do not sit in the active alert list -
# otherwise every zone_change would bury the one SOS that matters.
ACTIONABLE = (SEVERITY_CRITICAL, SEVERITY_WARNING)


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_config(force=True)
    task = asyncio.create_task(_watchdog_loop())
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="TroDes Caregiver Dashboard", version="1.0.0", lifespan=lifespan)

# The page is served from the same origin, so CORS is not strictly needed.
# It is permitted anyway so the dashboard can be opened from a phone against
# a backend on another host during testing.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional passcode for the caregiver screens (off unless TRODES_PASSCODE is
# set). Device ingest stays open. See app/auth.py.
app.middleware("http")(auth.middleware)
app.include_router(auth.router)


@app.middleware("http")
async def no_stale_pages(request, call_next):
    # Phones otherwise keep showing an old copy of the page after an update.
    # "no-cache" still lets the browser reuse its copy - it just checks first.
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/classic") or path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


# ---------------------------------------------------------------------------
# Alert helpers
# ---------------------------------------------------------------------------

def _uncleared_alert_exists(conn, *, type_: str, device_id: str) -> bool:
    """Not yet cleared, acknowledged or not.

    Used where one alert stands for one whole episode: an acknowledged "not
    reporting" or "location unknown" is still true until the wearable is back
    (1 Oct: an acknowledged offline alert was raised again every 5 s during a
    single outage).
    """
    row = conn.execute(
        "SELECT 1 FROM alerts WHERE type = ? AND device_id = ? AND cleared_at IS NULL LIMIT 1",
        (type_, device_id),
    ).fetchone()
    return row is not None


def _insert_alert(
    conn,
    *,
    source: str,
    type_: str,
    received_at: float,
    event_at: float,
    device_id: str | None = None,
    node_id: str | None = None,
    detail: str | None = None,
    zone: str | None = None,
    zone_id: int | None = None,
    door: str | None = None,
    door_id: int | None = None,
    batt_pct: int | None = None,
    hr_bpm: int | None = None,
    uptime_s: int | None = None,
    is_late: bool = False,
) -> int:
    severity = ALERT_SEVERITY.get(type_, SEVERITY_INFO)
    cur = conn.execute(
        """INSERT INTO alerts
           (source, device_id, node_id, type, severity, detail, zone, zone_id,
            door, door_id, batt_pct, hr_bpm, uptime_s, received_at, event_at, is_late)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (source, device_id, node_id, type_, severity, detail, zone, zone_id,
         door, door_id, batt_pct, hr_bpm, uptime_s, received_at, event_at,
         1 if is_late else 0),
    )
    return int(cur.lastrowid)


def _clear_alerts(conn, *, type_: str, device_id: str, reason: str, at: float) -> int:
    cur = conn.execute(
        """UPDATE alerts SET cleared_at = ?, cleared_reason = ?
           WHERE type = ? AND device_id = ? AND cleared_at IS NULL""",
        (at, reason, type_, device_id),
    )
    return cur.rowcount


# ---------------------------------------------------------------------------
# Ingest: wearable status
# ---------------------------------------------------------------------------

@app.post("/api/v1/status")
def post_status(payload: StatusIn):
    cfg = load_config()
    received_at = now()
    conn = connect()
    try:
        prev = conn.execute(
            "SELECT * FROM device_state WHERE device_id = ?", (payload.device_id,)
        ).fetchone()

        boot_id, boot_epoch, event_at, is_late = reconcile_uptime(
            prev["boot_id"] if prev else None,
            prev["boot_epoch"] if prev else None,
            prev["last_uptime_s"] if prev else None,
            payload.uptime_s,
            received_at,
        )

        conn.execute(
            """INSERT INTO status_log
               (device_id, received_at, event_at, boot_id, uptime_s, zone_id, zone,
                restricted, rssi, distance_m, hr_bpm, batt_pct, batt_v, sos, is_late)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (payload.device_id, received_at, event_at, boot_id, payload.uptime_s,
             payload.zone_id, payload.zone, 1 if payload.restricted else 0,
             payload.rssi, payload.distance_m, payload.hr_bpm, payload.batt_pct,
             payload.batt_v, 1 if payload.sos else 0, 1 if is_late else 0),
        )

        if is_late:
            # A replayed packet from the Wi-Fi-down queue. It is in the history
            # now, but it must not pull the live card back to an older zone.
            # boot_epoch may still have improved, so persist that much.
            conn.execute(
                "UPDATE device_state SET boot_epoch = ? WHERE device_id = ?",
                (boot_epoch, payload.device_id),
            )
            conn.commit()
            return {"ok": True, "accepted": False, "reason": "late_or_duplicate",
                    "event_at": event_at}

        zone_changed = (prev is None) or (prev["zone"] != payload.zone)
        zone_entered_at = event_at if zone_changed else prev["zone_entered_at"]

        conn.execute(
            """INSERT INTO device_state
               (device_id, first_seen_at, last_seen_at, last_event_at, boot_id,
                boot_epoch, last_uptime_s, zone_id, zone, restricted,
                zone_entered_at, rssi, distance_m, hr_bpm, batt_pct, batt_v, sos)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(device_id) DO UPDATE SET
                 last_seen_at   = excluded.last_seen_at,
                 last_event_at  = excluded.last_event_at,
                 boot_id        = excluded.boot_id,
                 boot_epoch     = excluded.boot_epoch,
                 last_uptime_s  = excluded.last_uptime_s,
                 zone_id        = excluded.zone_id,
                 zone           = excluded.zone,
                 restricted     = excluded.restricted,
                 zone_entered_at= excluded.zone_entered_at,
                 rssi           = excluded.rssi,
                 distance_m     = excluded.distance_m,
                 hr_bpm         = excluded.hr_bpm,
                 batt_pct       = excluded.batt_pct,
                 batt_v         = excluded.batt_v,
                 sos            = excluded.sos""",
            (payload.device_id, received_at, received_at, event_at, boot_id,
             boot_epoch, payload.uptime_s, payload.zone_id, payload.zone,
             1 if payload.restricted else 0, zone_entered_at, payload.rssi,
             payload.distance_m, payload.hr_bpm, payload.batt_pct, payload.batt_v,
             1 if payload.sos else 0),
        )

        # The device is reporting again, so any "not reporting" alert the
        # server raised is no longer true. This is the only auto-clearing
        # alert besides sos/sos_dismissed, and it is server-derived rather
        # than something a caregiver was asked to act on.
        _clear_alerts(conn, type_="device_offline", device_id=payload.device_id,
                      reason="device reporting again", at=received_at)
        # A known zone again ends a "location unknown" episode by itself, so the
        # caregiver is not left with a pile of them to acknowledge.
        if payload.zone_id:
            _clear_alerts(conn, type_="zone_lost", device_id=payload.device_id,
                          reason="back in range", at=received_at)

        # Tell the wearable whether its SOS is still waiting for a caregiver, so
        # it leaves SOS mode (LED, repeat presses) once one is acknowledged.
        sos_open = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE device_id = ? AND type = 'sos' "
            "AND acknowledged_at IS NULL AND cleared_at IS NULL",
            (payload.device_id,)).fetchone()[0]

        conn.commit()
        return {"ok": True, "accepted": True, "event_at": event_at, "boot_id": boot_id,
                "sos_open": sos_open}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Ingest: wearable alerts
# ---------------------------------------------------------------------------

@app.post("/api/v1/alert")
def post_alert(payload: AlertIn):
    received_at = now()
    conn = connect()
    try:
        # The wearable sends an alert again when the reply timed out, even if
        # the server had stored it. That repeat is the same event: a duplicate
        # SOS would stay open after the first is acknowledged, so the wearable
        # (which leaves SOS mode on sos_open == 0) would never clear. Same
        # device, type, uptime and detail within 30 s = the same event.
        dup = conn.execute(
            """SELECT id, event_at FROM alerts
               WHERE device_id = ? AND type = ? AND uptime_s = ?
                 AND COALESCE(detail, '') = COALESCE(?, '') AND received_at > ?
               ORDER BY id DESC LIMIT 1""",
            (payload.device_id, payload.type, payload.uptime_s, payload.detail,
             received_at - 30),
        ).fetchone()
        if dup is not None:
            return {"ok": True, "alert_id": dup["id"], "duplicate": True,
                    "cleared_sos": 0, "event_at": dup["event_at"]}

        # One "location unknown" per episode: while one is still uncleared, a
        # repeat is the same episode (1 Oct: walking through rooms with no
        # beacon filled the dashboard with them).
        if payload.type == "zone_lost" and _uncleared_alert_exists(
                conn, type_="zone_lost", device_id=payload.device_id):
            return {"ok": True, "duplicate": True, "cleared_sos": 0}
        if payload.type in ("zone_change", "zone_restricted"):
            _clear_alerts(conn, type_="zone_lost", device_id=payload.device_id,
                          reason="back in range", at=received_at)

        prev = conn.execute(
            "SELECT * FROM device_state WHERE device_id = ?", (payload.device_id,)
        ).fetchone()

        # An alert must not be allowed to create a device or advance its uptime
        # bookkeeping - only status packets do that. Here we just place the
        # event on the reconstructed device clock.
        if prev and prev["boot_epoch"] is not None:
            event_at = float(prev["boot_epoch"]) + int(payload.uptime_s or 0)
            # Alerts never re-anchor the clock - they are exactly the packets
            # the wearable queues while Wi-Fi is down. They are placed on the
            # clock the status heartbeats established.
            is_late = event_at < received_at - DELAYED_S
        else:
            event_at = received_at
            is_late = False

        alert_id = _insert_alert(
            conn,
            source="wearable",
            type_=payload.type,
            device_id=payload.device_id,
            detail=payload.detail,
            zone=payload.zone,
            zone_id=payload.zone_id,
            batt_pct=payload.batt_pct,
            hr_bpm=payload.hr_bpm,
            uptime_s=payload.uptime_s,
            received_at=received_at,
            event_at=event_at,
            is_late=is_late,
        )

        cleared = 0
        if payload.type == "sos_dismissed":
            # The one documented auto-dismiss: the resident long-pressed to
            # cancel a false alarm, so the SOS it cancels is cleared.
            cleared = _clear_alerts(
                conn, type_="sos", device_id=payload.device_id,
                reason="dismissed by resident (long press)", at=received_at,
            )
            conn.execute(
                "UPDATE device_state SET sos = 0 WHERE device_id = ?",
                (payload.device_id,),
            )
        elif payload.type == "sos":
            conn.execute(
                "UPDATE device_state SET sos = 1 WHERE device_id = ?",
                (payload.device_id,),
            )
            # A new SOS while one is open is an escalation: 2 or 3 presses
            # after 1 (the wearable sends nothing for a same or weaker pattern).
            # The older one is retired, so one Acknowledge clears the wearable.
            conn.execute(
                """UPDATE alerts SET cleared_at = ?, cleared_reason = ?
                   WHERE device_id = ? AND type = 'sos' AND id != ?
                     AND acknowledged_at IS NULL AND cleared_at IS NULL""",
                (received_at, "replaced by a more urgent SOS", payload.device_id, alert_id),
            )

        conn.commit()
        return {"ok": True, "alert_id": alert_id, "cleared_sos": cleared,
                "event_at": event_at}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Ingest: door nodes
# ---------------------------------------------------------------------------

@app.post("/api/v1/door")
def post_door(payload: DoorIn):
    cfg = load_config()
    received_at = now()
    conn = connect()
    try:
        prev = conn.execute(
            "SELECT * FROM door_state WHERE node_id = ?", (payload.node_id,)
        ).fetchone()

        boot_id, boot_epoch, event_at, is_late = reconcile_uptime(
            prev["boot_id"] if prev else None,
            prev["boot_epoch"] if prev else None,
            prev["last_uptime_s"] if prev else None,
            payload.uptime_s,
            received_at,
            live=payload.type in ("heartbeat", "boot"),
            # The door node says when it restarted. Its uptime going backwards
            # means a queued packet arriving late, not a restart.
            explicit_boot=(payload.type == "boot"),
        )

        door_cfg = cfg.door_for_node(payload.node_id, payload.door_id)
        door_name = (door_cfg or {}).get("name") or payload.door or payload.node_id
        door_key = payload.door or (door_cfg or {}).get("key")
        door_id = payload.door_id if payload.door_id is not None else (door_cfg or {}).get("id")
        is_restricted = bool((door_cfg or {}).get("restricted", True))

        conn.execute(
            """INSERT INTO door_log
               (node_id, door_id, door, type, state, rssi, uptime_s,
                received_at, event_at, is_late)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (payload.node_id, door_id, door_key, payload.type, payload.state,
             payload.rssi, payload.uptime_s, received_at, event_at,
             1 if is_late else 0),
        )

        if is_late:
            # The packet is stale, so it must not change what the doors panel
            # shows. But a door that opened during a Wi-Fi outage DID open, and
            # dropping the event entirely would hide exactly the kind of
            # incident this system exists to catch. Record the alert, marked as
            # delivered late, and leave the live state alone.
            #
            # (node_id, type, uptime_s) is the idempotency key: a retransmission
            # of the same event carries the same uptime and is not logged twice.
            late_alert_id = None
            if payload.type == "state_change" and is_restricted and payload.state:
                type_ = "door_opened" if payload.state == "open" else "door_closed"
                dup = conn.execute(
                    """SELECT id FROM alerts
                       WHERE node_id = ? AND type = ? AND uptime_s = ? LIMIT 1""",
                    (payload.node_id, type_, payload.uptime_s),
                ).fetchone()
                if dup is None:
                    late_alert_id = _insert_alert(
                        conn,
                        source="door",
                        type_=type_,
                        node_id=payload.node_id,
                        door=door_key,
                        door_id=door_id,
                        detail=f"{door_name} {payload.state} (delivered late)",
                        received_at=received_at,
                        event_at=event_at,
                        uptime_s=payload.uptime_s,
                        is_late=True,
                    )
            conn.commit()
            return {"ok": True, "accepted": False, "reason": "late_or_duplicate",
                    "alert_id": late_alert_id, "event_at": event_at}

        state_changed = (
            payload.type == "state_change"
            and payload.state is not None
            and (prev is None or prev["state"] != payload.state)
        )
        new_state = payload.state if payload.state is not None else (
            prev["state"] if prev else None
        )
        state_changed_at = event_at if state_changed else (
            prev["state_changed_at"] if prev else event_at
        )

        conn.execute(
            """INSERT INTO door_state
               (node_id, door_id, door, state, boot_id, boot_epoch, last_uptime_s,
                first_seen_at, last_seen_at, last_event_at, state_changed_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(node_id) DO UPDATE SET
                 door_id          = excluded.door_id,
                 door             = excluded.door,
                 state            = excluded.state,
                 boot_id          = excluded.boot_id,
                 boot_epoch       = excluded.boot_epoch,
                 last_uptime_s    = excluded.last_uptime_s,
                 last_seen_at     = excluded.last_seen_at,
                 last_event_at    = excluded.last_event_at,
                 state_changed_at = excluded.state_changed_at""",
            (payload.node_id, door_id, door_key, new_state, boot_id, boot_epoch,
             payload.uptime_s, received_at, received_at, event_at, state_changed_at),
        )

        # The door node reports state only - it does not raise alerts. Turning
        # "the medicine room door just opened" into something a caregiver sees
        # is the server's job.
        alert_id = None
        if state_changed and is_restricted:
            type_ = "door_opened" if payload.state == "open" else "door_closed"
            alert_id = _insert_alert(
                conn,
                source="door",
                type_=type_,
                node_id=payload.node_id,
                door=door_key,
                door_id=door_id,
                detail=f"{door_name} {payload.state}",
                received_at=received_at,
                event_at=event_at,
                uptime_s=payload.uptime_s,
            )

        conn.commit()
        return {"ok": True, "accepted": True, "alert_id": alert_id,
                "state_changed": state_changed, "event_at": event_at}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Watchdog - silence is a safety event
# ---------------------------------------------------------------------------

def _check_stale_once() -> None:
    """Raise device_offline for wearables that have stopped reporting.

    A silent wearable is not a resident who has not moved. The card greys out
    in the UI regardless, but this also puts a durable, acknowledgeable record
    in the alert table so a caregiver cannot simply not notice a grey card.
    """
    cfg = load_config()
    t = now()
    conn = connect()
    try:
        rows = conn.execute("SELECT * FROM device_state").fetchall()
        for r in rows:
            silent_for = t - float(r["last_seen_at"] or 0)
            if silent_for > cfg.wearable_stale_s:
                if not _uncleared_alert_exists(conn, type_="device_offline",
                                               device_id=r["device_id"]):
                    _insert_alert(
                        conn,
                        source="server",
                        type_="device_offline",
                        device_id=r["device_id"],
                        detail=(f"No status for {int(silent_for)} s "
                                f"(threshold {cfg.wearable_stale_s} s)"),
                        zone=r["zone"],
                        zone_id=r["zone_id"],
                        received_at=t,
                        event_at=t,
                    )
        conn.commit()
    finally:
        conn.close()


async def _watchdog_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(_check_stale_once)
        except Exception as exc:  # never let the watchdog kill the server
            print(f"[watchdog] {exc!r}")
        await asyncio.sleep(5)


# ---------------------------------------------------------------------------
# Read endpoints
# ---------------------------------------------------------------------------

def _battery_level(cfg, pct: int | None) -> str:
    if pct is None or pct < 0:
        return "unknown"
    if pct <= cfg.battery_critical_pct:
        return "critical"
    if pct <= cfg.battery_low_pct:
        return "low"
    return "ok"


def _resident_view(cfg, row: sqlite3.Row, t: float, open_counts: dict) -> dict:
    device_id = row["device_id"]
    last_seen = float(row["last_seen_at"] or 0)
    since_seen = t - last_seen
    zone_class = cfg.zone_class(row["zone_id"], row["zone"])
    hr = row["hr_bpm"]
    batt = row["batt_pct"]
    resident = cfg.resident(device_id) or {}

    return {
        "device_id": device_id,
        "name": cfg.resident_name(device_id),
        "room": resident.get("room"),
        "zone": {
            "id": row["zone_id"],
            "key": row["zone"],
            "name": cfg.zone_name(row["zone_id"], row["zone"]),
            "class": zone_class,
        },
        "zone_entered_at": row["zone_entered_at"],
        "seconds_in_zone": (
            max(0, int(t - float(row["zone_entered_at"])))
            if row["zone_entered_at"] else None
        ),
        "last_seen_at": last_seen,
        "seconds_since_seen": int(since_seen),
        "stale": since_seen > cfg.wearable_stale_s,
        "stale_threshold_s": cfg.wearable_stale_s,
        "battery": {
            "pct": None if batt is None or batt < 0 else int(batt),
            "volts": row["batt_v"],
            "level": _battery_level(cfg, batt),
        },
        # -1 means no sensor fitted or no finger detected. The UI shows an
        # em dash, never a zero, because a zero reads as a flatline.
        "hr_bpm": None if hr is None or hr < 0 else int(hr),
        "rssi": row["rssi"],
        # Distance is an estimate from an unfitted path-loss model. Labelled
        # approximate in the UI and never used for zone classification.
        "distance_m_approx": row["distance_m"],
        "sos": bool(row["sos"]),
        "open_alerts": open_counts.get(device_id, 0),
        "boot_id": row["boot_id"],
    }


@app.get("/api/v1/residents")
def get_residents():
    cfg = load_config()
    t = now()
    conn = connect()
    try:
        counts = {
            r["device_id"]: r["n"]
            for r in conn.execute(
                f"""SELECT device_id, COUNT(*) AS n FROM alerts
                    WHERE acknowledged_at IS NULL AND cleared_at IS NULL
                      AND severity IN ({','.join('?' * len(ACTIONABLE))})
                      AND device_id IS NOT NULL
                    GROUP BY device_id""",
                ACTIONABLE,
            ).fetchall()
        }
        rows = conn.execute(
            "SELECT * FROM device_state ORDER BY device_id"
        ).fetchall()
        seen = {r["device_id"] for r in rows}
        residents = [_resident_view(cfg, r, t, counts) for r in rows]

        # Configured residents that have never reported are shown explicitly
        # rather than silently missing from the board.
        for r in cfg.residents:
            if r["device_id"] not in seen:
                residents.append({
                    "device_id": r["device_id"],
                    "name": r.get("name", r["device_id"]),
                    "room": r.get("room"),
                    "zone": {"id": 0, "key": "unknown", "name": "Unknown",
                             "class": "unknown"},
                    "zone_entered_at": None, "seconds_in_zone": None,
                    "last_seen_at": None, "seconds_since_seen": None,
                    "stale": True, "stale_threshold_s": cfg.wearable_stale_s,
                    "battery": {"pct": None, "volts": None, "level": "unknown"},
                    "hr_bpm": None, "rssi": None, "distance_m_approx": None,
                    "sos": False, "open_alerts": 0, "never_seen": True,
                })
        return {"server_time": t, "residents": residents}
    finally:
        conn.close()


@app.get("/api/v1/doors")
def get_doors():
    cfg = load_config()
    t = now()
    conn = connect()
    try:
        rows = {r["node_id"]: r for r in
                conn.execute("SELECT * FROM door_state").fetchall()}
        doors = []
        # Node ids the configured-door loop below accounts for. Anything left
        # over is a node reporting under an id this facility config does not
        # expect, and it must still be shown - see the note at the end.
        claimed: set[str] = set()
        for d in cfg.doors:
            r = rows.get(d["node_id"])
            if r is not None:
                claimed.add(d["node_id"])
            if r is None:
                doors.append({
                    "node_id": d["node_id"], "door_id": d["id"],
                    "name": d["name"], "key": d["key"],
                    "restricted": bool(d.get("restricted", True)),
                    "state": "unknown", "offline": True, "never_seen": True,
                    "seconds_since_seen": None,
                    "stale_threshold_s": cfg.door_stale_s,
                    "state_changed_at": None,
                })
                continue
            since = t - float(r["last_seen_at"] or 0)
            doors.append({
                "node_id": r["node_id"],
                "door_id": r["door_id"] if r["door_id"] is not None else d["id"],
                "name": d["name"],
                "key": d["key"],
                "restricted": bool(d.get("restricted", True)),
                "state": r["state"] or "unknown",
                # A node that stopped sending heartbeats is a fault, not a
                # closed door. Show it as offline rather than trusting the
                # last state it managed to report.
                "offline": since > cfg.door_stale_s,
                "seconds_since_seen": int(since),
                "stale_threshold_s": cfg.door_stale_s,
                "state_changed_at": r["state_changed_at"],
            })

        # Any node that reported but was not matched to a configured door by
        # node_id. Matching on door_id instead is not good enough: a node
        # flashed with the wrong node_id but a valid door_id would resolve to a
        # configured door, fail to match it here, and disappear from the panel
        # altogether - a door silently missing from a safety display.
        for node_id, r in rows.items():
            if node_id not in claimed:
                cfg_hit = cfg.door_for_node(node_id, r["door_id"])
                base_name = (cfg_hit or {}).get("name") or r["door"] or node_id
                since = t - float(r["last_seen_at"] or 0)
                doors.append({
                    "node_id": node_id, "door_id": r["door_id"],
                    "name": f"{base_name} (unexpected node id)",
                    "key": r["door"], "restricted": True, "unconfigured": True,
                    "state": r["state"] or "unknown",
                    "offline": since > cfg.door_stale_s,
                    "seconds_since_seen": int(since),
                    "stale_threshold_s": cfg.door_stale_s,
                    "state_changed_at": r["state_changed_at"],
                })
        return {"server_time": t, "doors": doors}
    finally:
        conn.close()


def _alert_view(cfg, r: sqlite3.Row) -> dict:
    who = cfg.resident_name(r["device_id"]) if r["device_id"] else None
    return {
        "id": r["id"],
        "source": r["source"],
        "type": r["type"],
        "label": ALERT_LABEL.get(r["type"], r["type"]),
        "severity": r["severity"],
        "detail": r["detail"],
        "device_id": r["device_id"],
        "resident": who,
        "node_id": r["node_id"],
        "zone": r["zone"],
        "zone_name": cfg.zone_name(r["zone_id"], r["zone"]) if r["zone"] else None,
        "door": r["door"],
        "door_id": r["door_id"],
        "batt_pct": r["batt_pct"],
        "hr_bpm": r["hr_bpm"],
        "event_at": r["event_at"],
        "received_at": r["received_at"],
        # True when the event reached the server well after it happened -
        # a queued event flushed after Wi-Fi came back.
        "delayed": bool(r["is_late"]) or (r["received_at"] - r["event_at"] > DELAYED_S),
        "acknowledged_at": r["acknowledged_at"],
        "acknowledged_by": r["acknowledged_by"],
        "cleared_at": r["cleared_at"],
        "cleared_reason": r["cleared_reason"],
    }


@app.get("/api/v1/alerts")
def get_alerts(
    active: bool = Query(default=True),
    limit: int = Query(default=100, le=1000),
):
    """active=true returns unacknowledged, uncleared, actionable alerts."""
    return _alerts(active=active, limit=limit)


def _alerts(*, active: bool = True, limit: int = 100) -> dict:
    """Plain-Python core of GET /alerts.

    Kept separate from the route so `get_summary` can reuse it. Calling a
    FastAPI route function directly hands you `Query` objects instead of
    values, which then reach sqlite3 as unbindable parameters.
    """
    cfg = load_config()
    conn = connect()
    try:
        if active:
            rows = conn.execute(
                f"""SELECT * FROM alerts
                    WHERE acknowledged_at IS NULL AND cleared_at IS NULL
                      AND severity IN ({','.join('?' * len(ACTIONABLE))})
                    ORDER BY event_at DESC LIMIT ?""",
                (*ACTIONABLE, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM alerts ORDER BY event_at DESC LIMIT ?", (limit,)
            ).fetchall()
        alerts = [_alert_view(cfg, r) for r in rows]
        alerts.sort(
            key=lambda a: (SEVERITY_RANK.get(a["severity"], 0), a["event_at"]),
            reverse=True,
        )
        return {"server_time": now(), "count": len(alerts), "alerts": alerts}
    finally:
        conn.close()


@app.post("/api/v1/alerts/{alert_id}/ack")
def ack_alert(alert_id: int, payload: AckIn):
    t = now()
    conn = connect()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="alert not found")
        if row["acknowledged_at"] is not None:
            return {"ok": True, "already": True, "alert_id": alert_id,
                    "acknowledged_by": row["acknowledged_by"],
                    "acknowledged_at": row["acknowledged_at"]}
        conn.execute(
            "UPDATE alerts SET acknowledged_at = ?, acknowledged_by = ? WHERE id = ?",
            (t, payload.acked_by, alert_id),
        )
        conn.execute(
            "INSERT INTO ack_log (alert_id, acked_by, acked_at, note) VALUES (?,?,?,?)",
            (alert_id, payload.acked_by, t, payload.note),
        )
        conn.commit()
        return {"ok": True, "alert_id": alert_id,
                "acknowledged_by": payload.acked_by, "acknowledged_at": t}
    finally:
        conn.close()


@app.get("/api/v1/config")
def get_config(reload: bool = False):
    cfg = load_config(force=reload)
    return {
        "facility_name": cfg.facility_name,
        "zones": cfg.zones,
        "doors": cfg.doors,
        "residents": cfg.residents,
        "thresholds": {
            "wearable_stale_s": cfg.wearable_stale_s,
            "door_stale_s": cfg.door_stale_s,
            "battery_low_pct": cfg.battery_low_pct,
            "battery_critical_pct": cfg.battery_critical_pct,
        },
    }


@app.get("/api/v1/summary")
def get_summary():
    """One call for the whole board.

    The page polls every 2 s. Four separate requests per tick from a phone on
    facility Wi-Fi is four times the latency and four chances to get a
    half-updated screen. One call keeps the view internally consistent.
    """
    cfg = load_config()
    residents = get_residents()["residents"]
    doors = get_doors()["doors"]
    active = _alerts(active=True)["alerts"]
    conn = connect()
    try:
        recent = [
            _alert_view(cfg, r)
            for r in conn.execute(
                "SELECT * FROM alerts ORDER BY event_at DESC LIMIT 25"
            ).fetchall()
        ]
    finally:
        conn.close()

    return {
        "server_time": now(),
        "facility_name": cfg.facility_name,
        "thresholds": {
            "wearable_stale_s": cfg.wearable_stale_s,
            "door_stale_s": cfg.door_stale_s,
            "battery_low_pct": cfg.battery_low_pct,
            "battery_critical_pct": cfg.battery_critical_pct,
        },
        "zones": cfg.zones,
        "residents": residents,
        "doors": doors,
        "alerts_active": active,
        "alerts_recent": recent,
        "counts": {
            "residents": len(residents),
            "critical": sum(1 for a in active if a["severity"] == SEVERITY_CRITICAL),
            "warning": sum(1 for a in active if a["severity"] == SEVERITY_WARNING),
            "stale_devices": sum(1 for r in residents if r["stale"]),
            "doors_open": sum(1 for d in doors if d["state"] == "open"),
            "doors_offline": sum(1 for d in doors if d["offline"]),
        },
    }


@app.get("/api/v1/health")
def health():
    return {"ok": True, "server_time": now()}


# ---------------------------------------------------------------------------
# Static page
# ---------------------------------------------------------------------------

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    # The "home" design (static/v2) is the default page since 29 Sep 2026;
    # the original page stays available at /classic.
    return FileResponse(STATIC_DIR / "v2" / "index.html")


@app.get("/classic")
def classic():
    return FileResponse(STATIC_DIR / "index.html")
