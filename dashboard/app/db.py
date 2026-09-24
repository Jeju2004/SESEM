"""SQLite storage for the caregiver dashboard.

No ORM. Four state tables and three log tables, created on first run.

Two design points worth knowing before reading the rest:

1. The firmware sends no wall-clock timestamp - only `uptime_s`. The server
   stamps `received_at` itself and derives a device-side event time from
   `uptime_s`. See `estimate_event_at`.

2. Packets can arrive late and out of order, because the wearable queues
   events while Wi-Fi is down and flushes them in a burst when it returns.
   Current state is only advanced by a packet that is genuinely newer than
   what we already hold; older packets are still logged, so the history stays
   complete, but they cannot drag the live display backwards.
"""

from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Iterable

from .config import DB_PATH

# A drop in uptime larger than this means the device rebooted rather than a
# packet arriving out of order.
REBOOT_TOLERANCE_S = 5

# If a packet we know was NOT queued implies a boot moment this far from the
# one we hold, the stored estimate is wrong and gets replaced outright.
# See `reconcile_uptime` for why a running minimum alone is not enough.
REANCHOR_S = 10

# A packet whose reconstructed event time is at least this far behind its
# arrival was queued on the device and flushed later.
DELAYED_S = 10

SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS status_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id   TEXT    NOT NULL,
    received_at REAL    NOT NULL,
    event_at    REAL    NOT NULL,
    boot_id     INTEGER NOT NULL,
    uptime_s    INTEGER,
    zone_id     INTEGER,
    zone        TEXT,
    restricted  INTEGER,
    rssi        INTEGER,
    distance_m  REAL,
    hr_bpm      INTEGER,
    batt_pct    INTEGER,
    batt_v      REAL,
    sos         INTEGER,
    is_late     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_status_device_time
    ON status_log(device_id, event_at);

CREATE TABLE IF NOT EXISTS device_state (
    device_id       TEXT PRIMARY KEY,
    first_seen_at   REAL,
    last_seen_at    REAL,
    last_event_at   REAL,
    boot_id         INTEGER NOT NULL DEFAULT 0,
    boot_epoch      REAL,
    last_uptime_s   INTEGER,
    zone_id         INTEGER,
    zone            TEXT,
    restricted      INTEGER,
    zone_entered_at REAL,
    rssi            INTEGER,
    distance_m      REAL,
    hr_bpm          INTEGER,
    batt_pct        INTEGER,
    batt_v          REAL,
    sos             INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source          TEXT    NOT NULL,          -- 'wearable' | 'door' | 'server'
    device_id       TEXT,
    node_id         TEXT,
    type            TEXT    NOT NULL,
    severity        TEXT    NOT NULL,
    detail          TEXT,
    zone            TEXT,
    zone_id         INTEGER,
    door            TEXT,
    door_id         INTEGER,
    batt_pct        INTEGER,
    hr_bpm          INTEGER,
    uptime_s        INTEGER,
    received_at     REAL    NOT NULL,
    event_at        REAL    NOT NULL,
    is_late         INTEGER NOT NULL DEFAULT 0,
    acknowledged_at REAL,
    acknowledged_by TEXT,
    cleared_at      REAL,
    cleared_reason  TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_open
    ON alerts(acknowledged_at, cleared_at, severity);

CREATE TABLE IF NOT EXISTS door_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id     TEXT    NOT NULL,
    door_id     INTEGER,
    door        TEXT,
    type        TEXT    NOT NULL,
    state       TEXT,
    rssi        INTEGER,
    uptime_s    INTEGER,
    received_at REAL    NOT NULL,
    event_at    REAL    NOT NULL,
    is_late     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_door_node_time ON door_log(node_id, event_at);

CREATE TABLE IF NOT EXISTS door_state (
    node_id            TEXT PRIMARY KEY,
    door_id            INTEGER,
    door               TEXT,
    state              TEXT,
    boot_id            INTEGER NOT NULL DEFAULT 0,
    boot_epoch         REAL,
    last_uptime_s      INTEGER,
    first_seen_at      REAL,
    last_seen_at       REAL,
    last_event_at      REAL,
    state_changed_at   REAL
);

CREATE TABLE IF NOT EXISTS ack_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id    INTEGER NOT NULL,
    acked_by    TEXT    NOT NULL,
    acked_at    REAL    NOT NULL,
    note        TEXT
);
"""


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


def rows_to_dicts(rows: Iterable[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Clock reconstruction
# ---------------------------------------------------------------------------

def reconcile_uptime(
    prev_boot_id: int | None,
    prev_boot_epoch: float | None,
    prev_uptime_s: int | None,
    uptime_s: int | None,
    received_at: float,
    live: bool = True,
    explicit_boot: bool | None = None,
) -> tuple[int, float, float, bool]:
    """Work out when a packet actually happened on the device.

    Returns (boot_id, boot_epoch, event_at, is_late).

    `live` says whether this packet type is known never to be queued on the
    device - a status heartbeat or a door heartbeat. Those arrive promptly or
    not at all, so their arrival time is trustworthy evidence about the
    device's clock. A queued event's is not.

    `explicit_boot` decides how a restart is recognised, and the two device
    families need different rules:

      * The wearable posts status every 5 s and does NOT queue status packets
        (it queues events). So a status whose uptime has gone backwards can
        only mean the board restarted. Pass explicit_boot=None to use that
        rule.

      * A door node announces its own restart with a `boot` message, and its
        state changes may have sat in a queue. There, uptime going backwards
        means a delayed packet, not a restart. Pass explicit_boot=True/False
        from the message type and the uptime rule is not applied.

    Getting this wrong either way is a real failure: read a restart as a
    delayed packet and the board's first minutes never appear; read a delayed
    packet as a restart and it overwrites the live view with stale data.

    The device only tells us how long it has been running. If we assume
    `received_at` is the event time, a burst of twenty queued packets flushed
    after Wi-Fi returns all land within a second of each other and the history
    becomes useless - every event looks simultaneous.

    Instead we estimate the moment the device booted:

        boot_epoch = received_at - uptime_s

    A packet delayed in the queue inflates that figure, because it was
    received later than it happened. A packet delivered promptly gives the
    smallest figure. So the *minimum* observed value is the best estimate of
    the true boot moment, and

        event_at = boot_epoch + uptime_s

    reconstructs when each queued event really occurred. Twenty packets
    flushed at once then spread back out across the minutes they cover.

    `is_late` marks a packet whose uptime is not ahead of what we already
    hold - a replayed or reordered packet. It is logged but must not advance
    the live state.
    """
    up = int(uptime_s) if uptime_s is not None else 0
    boot_id = int(prev_boot_id or 0)
    rebooted = False

    if prev_uptime_s is None or prev_boot_epoch is None:
        rebooted = True  # first packet from this device
    elif explicit_boot is not None:
        # Device family that announces its own restarts. Trust only that.
        rebooted = bool(explicit_boot)
    elif up + REBOOT_TOLERANCE_S < int(prev_uptime_s):
        # Uptime went backwards on a packet type that is never queued, so the
        # board restarted.
        rebooted = True

    candidate = received_at - up
    # Strictly less-than, not <=. `uptime_s` has one-second resolution, so two
    # genuine events in the same second carry the same value - a door
    # state_change landing in the same second as that node's heartbeat, for
    # instance. Treating equality as a replay silently swallowed the state
    # change and the alert that should have come with it. A true duplicate
    # retransmission is harmless instead: status writes are idempotent, and a
    # door alert is only raised when the state actually differs.
    is_late = (not rebooted) and prev_uptime_s is not None and up < int(prev_uptime_s)

    if rebooted:
        boot_id += 1
        boot_epoch = candidate
    elif is_late:
        # A replay or a reordered packet tells us nothing reliable about the
        # device clock - its arrival time is late by definition. Keep what we
        # have.
        boot_epoch = float(prev_boot_epoch)
    elif live and abs(candidate - float(prev_boot_epoch)) > REANCHOR_S:
        # A running minimum can only ever move earlier, so one bad sample
        # sticks forever: every subsequent event then looks seconds old and
        # the dashboard cries "delivered late" about live traffic. A packet
        # that cannot have been queued is authoritative, so when it disagrees
        # with the stored estimate by more than the re-anchor window, the
        # stored estimate is discarded rather than blended.
        #
        # This also covers a device restarting fast enough that its uptime
        # never appears to go backwards, and a stale row left by an earlier
        # test run.
        boot_epoch = candidate
    else:
        boot_epoch = min(float(prev_boot_epoch), candidate)

    event_at = boot_epoch + up
    return boot_id, boot_epoch, event_at, is_late


def dumps(obj: Any) -> str:
    return json.dumps(obj, separators=(",", ":"), default=str)


def now() -> float:
    return time.time()
