"""Facility configuration loader.

Everything about zones, doors, residents and thresholds comes from
config/zones.json. Nothing here is hard-coded to six zones or three doors,
because the demo zone count is still an open adviser decision.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(os.environ.get("TRODES_CONFIG", BASE_DIR / "config" / "zones.json"))
DB_PATH = Path(os.environ.get("TRODES_DB", BASE_DIR / "data" / "trodes.db"))

# Severity ranking used for ordering and for deciding what goes in the banner.
SEVERITY_CRITICAL = "critical"
SEVERITY_WARNING = "warning"
SEVERITY_INFO = "info"

SEVERITY_RANK = {SEVERITY_CRITICAL: 3, SEVERITY_WARNING: 2, SEVERITY_INFO: 1}

# Maps the alert `type` the firmware sends to a severity. See the build brief
# section 4.2 - this table is the contract, do not change it without changing
# the firmware and the brief together.
ALERT_SEVERITY = {
    "sos": SEVERITY_CRITICAL,
    "sos_dismissed": SEVERITY_INFO,
    "zone_restricted": SEVERITY_CRITICAL,
    "zone_change": SEVERITY_INFO,
    "zone_lost": SEVERITY_WARNING,
    "battery_low": SEVERITY_WARNING,
    "battery_critical": SEVERITY_CRITICAL,
    # Derived server-side from door state_change on a restricted door.
    "door_opened": SEVERITY_CRITICAL,
    "door_closed": SEVERITY_INFO,
    "device_offline": SEVERITY_WARNING,
}

# Human wording for the banner and the alert list.
ALERT_LABEL = {
    "sos": "SOS PRESSED",
    "sos_dismissed": "SOS dismissed by resident",
    "zone_restricted": "Entered restricted zone",
    "zone_change": "Moved zone",
    "zone_lost": "Location unknown - no beacon in range",
    "battery_low": "Battery low",
    "battery_critical": "Battery critically low",
    "door_opened": "Restricted door opened",
    "door_closed": "Restricted door closed",
    "device_offline": "Device not reporting",
}


class FacilityConfig:
    """Parsed view of config/zones.json, reloadable without a restart."""

    def __init__(self, raw: dict[str, Any]):
        self.raw = raw
        self.facility_name: str = raw.get("facility_name", "Facility")

        self.zones: list[dict] = list(raw.get("zones", []))
        self.doors: list[dict] = list(raw.get("doors", []))
        self.residents: list[dict] = list(raw.get("residents", []))
        self.thresholds: dict = dict(raw.get("thresholds", {}))

        self._zone_by_id = {int(z["id"]): z for z in self.zones}
        self._zone_by_key = {str(z["key"]): z for z in self.zones}
        self._door_by_node = {str(d["node_id"]): d for d in self.doors}
        self._door_by_id = {int(d["id"]): d for d in self.doors}
        self._resident_by_device = {str(r["device_id"]): r for r in self.residents}

    # -- thresholds -----------------------------------------------------
    @property
    def wearable_stale_s(self) -> int:
        return int(self.thresholds.get("wearable_stale_s", 30))

    @property
    def door_stale_s(self) -> int:
        return int(self.thresholds.get("door_stale_s", 90))

    @property
    def battery_low_pct(self) -> int:
        return int(self.thresholds.get("battery_low_pct", 20))

    @property
    def battery_critical_pct(self) -> int:
        return int(self.thresholds.get("battery_critical_pct", 10))

    # -- lookups --------------------------------------------------------
    def zone(self, zone_id: int | None, zone_key: str | None = None) -> dict | None:
        """Look up a zone by id, falling back to its key.

        The firmware sends both. Trusting the id alone would silently
        mislabel a zone if a beacon were reprogrammed without updating this
        file, so a mismatch is worth surfacing rather than hiding.
        """
        z = None
        if zone_id is not None:
            z = self._zone_by_id.get(int(zone_id))
        if z is None and zone_key:
            z = self._zone_by_key.get(str(zone_key))
        return z

    def zone_class(self, zone_id: int | None, zone_key: str | None = None) -> str:
        """'safe', 'restricted', or 'unknown'."""
        if (zone_id in (0, None)) and (zone_key in (None, "", "unknown")):
            return "unknown"
        z = self.zone(zone_id, zone_key)
        if z is None:
            return "unknown"
        return str(z.get("class", "unknown"))

    def zone_name(self, zone_id: int | None, zone_key: str | None = None) -> str:
        z = self.zone(zone_id, zone_key)
        if z is not None:
            return str(z["name"])
        if zone_key and zone_key != "unknown":
            # Beacon reporting a zone this config does not know about.
            return f"{zone_key} (unconfigured)"
        return "Unknown"

    def door_for_node(self, node_id: str, door_id: int | None = None) -> dict | None:
        d = self._door_by_node.get(str(node_id))
        if d is None and door_id is not None:
            d = self._door_by_id.get(int(door_id))
        return d

    def resident_name(self, device_id: str) -> str:
        r = self._resident_by_device.get(str(device_id))
        return str(r["name"]) if r else str(device_id)

    def resident(self, device_id: str) -> dict | None:
        return self._resident_by_device.get(str(device_id))


_cached: FacilityConfig | None = None


def load_config(force: bool = False) -> FacilityConfig:
    global _cached
    if _cached is None or force:
        with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
            _cached = FacilityConfig(json.load(fh))
    return _cached
