"""
zone_engine.py — Zone Intelligence (Phase 2)

Responsibilities:
  • Load zone polygon definitions from store{n}_zones.json
  • For each detection, determine which zone (if any) the visitor centroid is in
  • Emit ZONE_ENTER, ZONE_EXIT, ZONE_DWELL events
  • ZONE_DWELL fired every 30 s of continuous presence
"""

from __future__ import annotations

import json
import datetime
from pathlib import Path
from typing import Optional, Dict, List, Tuple

try:
    from shapely.geometry import Point, Polygon
    SHAPELY_AVAILABLE = True
except ImportError:
    SHAPELY_AVAILABLE = False
    print("[zone_engine] WARNING: shapely not installed. Zone detection disabled.")

import uuid

from pipeline.event_engine import RetailEvent


# ---------------------------------------------------------------------------
# Zone definition loader
# ---------------------------------------------------------------------------

def load_zones(json_path: str) -> List[dict]:
    """Load zone definitions from JSON file."""
    with open(json_path, "r") as f:
        data = json.load(f)
    return data.get("zones", [])


# ---------------------------------------------------------------------------
# Zone Engine
# ---------------------------------------------------------------------------

class ZoneEngine:
    """
    Tracks visitor→zone transitions and emits ZONE_* events.

    Zone JSON format (store1_zones.json / store2_zones.json):
    {
      "store_id": "STORE_1",
      "zones": [
        {
          "zone_id": "Z_SKINCARE",
          "zone_name": "Skincare",
          "sku_zone": "SKINCARE",
          "camera_id": "CAM1",
          "polygon": [[x1,y1],[x2,y2],...],   // pixel coords in camera frame
          "zone_type": "SHELF"
        },
        ...
      ]
    }
    """

    DWELL_INTERVAL_SEC = 30   # emit ZONE_DWELL every N seconds

    def __init__(self, zones_json_path: str):
        self.zones_path = zones_json_path
        raw = load_zones(zones_json_path)
        self.zones: List[dict] = raw
        if SHAPELY_AVAILABLE:
            self._polys: Dict[str, Polygon] = {
                z["zone_id"]: Polygon(z["polygon"]) for z in raw if z.get("polygon")
            }
        else:
            self._polys = {}

        # visitor_id → {zone_id: entered_ts, last_dwell_ts}
        self._visitor_zone: Dict[str, Optional[str]] = {}
        self._entered_ts:   Dict[str, Dict[str, datetime.datetime]] = {}
        self._dwell_ts:     Dict[str, Dict[str, datetime.datetime]] = {}

    # ------------------------------------------------------------------

    def process_detection(
        self,
        visitor_id: str,
        bbox: Tuple[float, float, float, float],
        timestamp: datetime.datetime,
        is_staff: bool,
        confidence: float,
        store_id: str,
        camera_id: str,
    ) -> List[RetailEvent]:
        """
        Given a bounding box in the camera frame, determine zone membership
        and emit appropriate events.
        """
        events: List[RetailEvent] = []

        if not SHAPELY_AVAILABLE:
            return events

        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        pt = Point(cx, cy)

        # Find which zone centroid is in (first match wins)
        current_zone = None
        current_zone_meta = {}
        for z in self.zones:
            poly = self._polys.get(z["zone_id"])
            if poly and poly.contains(pt):
                current_zone = z["zone_id"]
                current_zone_meta = z
                break

        prev_zone = self._visitor_zone.get(visitor_id)

        if current_zone != prev_zone:
            # ZONE_EXIT from previous zone
            if prev_zone is not None:
                entered = self._entered_ts.get(visitor_id, {}).get(prev_zone)
                dwell_ms = 0
                if entered:
                    dwell_ms = int((timestamp - entered).total_seconds() * 1000)

                events.append(self._make_zone_event(
                    visitor_id=visitor_id,
                    event_type="ZONE_EXIT",
                    zone_id=prev_zone,
                    zone_meta=self._zone_meta(prev_zone),
                    timestamp=timestamp,
                    dwell_ms=dwell_ms,
                    is_staff=is_staff,
                    confidence=confidence,
                    store_id=store_id,
                    camera_id=camera_id,
                ))

            # ZONE_ENTER to new zone
            if current_zone is not None:
                self._entered_ts.setdefault(visitor_id, {})[current_zone] = timestamp
                self._dwell_ts.setdefault(visitor_id, {})[current_zone] = timestamp

                events.append(self._make_zone_event(
                    visitor_id=visitor_id,
                    event_type="ZONE_ENTER",
                    zone_id=current_zone,
                    zone_meta=current_zone_meta,
                    timestamp=timestamp,
                    dwell_ms=0,
                    is_staff=is_staff,
                    confidence=confidence,
                    store_id=store_id,
                    camera_id=camera_id,
                ))

            self._visitor_zone[visitor_id] = current_zone

        # ZONE_DWELL — emit every 30s while inside zone
        if current_zone is not None:
            last_dwell = self._dwell_ts.get(visitor_id, {}).get(current_zone)
            if last_dwell:
                elapsed = (timestamp - last_dwell).total_seconds()
                if elapsed >= self.DWELL_INTERVAL_SEC:
                    entered = self._entered_ts.get(visitor_id, {}).get(current_zone)
                    total_dwell_ms = int((timestamp - entered).total_seconds() * 1000) if entered else 0

                    events.append(self._make_zone_event(
                        visitor_id=visitor_id,
                        event_type="ZONE_DWELL",
                        zone_id=current_zone,
                        zone_meta=current_zone_meta or self._zone_meta(current_zone),
                        timestamp=timestamp,
                        dwell_ms=total_dwell_ms,
                        is_staff=is_staff,
                        confidence=confidence,
                        store_id=store_id,
                        camera_id=camera_id,
                    ))
                    self._dwell_ts.setdefault(visitor_id, {})[current_zone] = timestamp

        return events

    def visitor_left(self, visitor_id: str):
        """Call when visitor exits store — clean up state."""
        self._visitor_zone.pop(visitor_id, None)
        self._entered_ts.pop(visitor_id, None)
        self._dwell_ts.pop(visitor_id, None)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _zone_meta(self, zone_id: str) -> dict:
        for z in self.zones:
            if z["zone_id"] == zone_id:
                return z
        return {}

    def _make_zone_event(
        self,
        visitor_id, event_type, zone_id, zone_meta,
        timestamp, dwell_ms, is_staff, confidence,
        store_id, camera_id,
    ) -> RetailEvent:
        return RetailEvent(
            event_id   = str(uuid.uuid4()),
            store_id   = store_id,
            camera_id  = camera_id,
            visitor_id = visitor_id,
            event_type = event_type,
            timestamp  = timestamp,
            zone_id    = zone_id,
            dwell_ms   = dwell_ms,
            is_staff   = is_staff,
            confidence = confidence,
            metadata   = {
                "sku_zone":    zone_meta.get("sku_zone"),
                "zone_name":   zone_meta.get("zone_name"),
                "zone_type":   zone_meta.get("zone_type"),
                "queue_depth": None,
                "session_seq": None,   # filled by EventEngine
            },
        )
