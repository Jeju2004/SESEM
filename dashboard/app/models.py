"""Request models matching the firmware payloads exactly.

These shapes are the contract with the firmware
(`firmware/wearable/src/main.cpp` -> buildStatusJson / buildAlertJson and
`firmware/door_sensor/src/main.cpp` -> buildEventJson).

Do not rename or retype a field here without changing the firmware in the
same commit. `extra="allow"` means a firmware build that adds a field will
still be accepted rather than rejected with a 422 mid-demo.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class StatusIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    device_id: str
    zone_id: int = 0
    zone: str = "unknown"
    restricted: bool = False
    rssi: int | None = None
    distance_m: float | None = None
    hr_bpm: int = -1          # -1 = no sensor fitted / no finger detected
    batt_pct: int = -1        # -1 = no battery reading yet
    batt_v: float | None = None
    sos: bool = False
    uptime_s: int = 0


class AlertIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    device_id: str
    type: str
    detail: str | None = None
    zone: str | None = None
    zone_id: int | None = None
    batt_pct: int | None = None
    hr_bpm: int | None = None
    uptime_s: int = 0


class DoorIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    node_id: str
    door_id: int | None = None
    door: str | None = None
    type: str = "state_change"   # state_change | heartbeat | boot
    state: str | None = None     # open | closed
    rssi: int | None = None
    uptime_s: int = 0


class AckIn(BaseModel):
    """Who acknowledged, and optionally what they did about it.

    The panel will ask whether acknowledgement is recorded. It is: caregiver
    name and server timestamp go into `alerts` and into `ack_log`.
    """

    acked_by: str = Field(default="caregiver", max_length=64)
    note: str | None = Field(default=None, max_length=500)
