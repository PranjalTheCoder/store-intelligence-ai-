"""
heatmap_service.py — Zone visit heatmap.

Computes per-zone:
  • visits          (ZONE_ENTER count, non-staff)
  • avg_dwell_seconds (mean of dwell_ms / 1000 from ZONE_EXIT events)
  • score           (normalised 0-100 relative to busiest zone)
  • data_confidence  (LOW if <20 sessions, HIGH otherwise)
"""

from __future__ import annotations

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session as DBSession

from app.models import Event, Session as VisitorSession


class HeatmapService:

    def __init__(self, db: DBSession):
        self.db = db

    def get_heatmap(self, store_id: str) -> dict:
        # ── Session count for confidence ──
        session_count = (
            self.db.query(func.count(VisitorSession.session_id))
            .filter(
                VisitorSession.store_id == store_id,
                VisitorSession.is_staff == False,
            )
            .scalar()
        ) or 0

        data_confidence = "LOW" if session_count < 20 else "HIGH"

        # ── Zone visit counts ──
        visit_rows = (
            self.db.query(
                Event.zone_id,
                func.count(Event.event_id).label("visits"),
            )
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "ZONE_ENTER",
                Event.is_staff   == False,
                Event.zone_id.isnot(None),
            )
            .group_by(Event.zone_id)
            .all()
        )
        visit_map = {row.zone_id: row.visits for row in visit_rows}

        # ── Average dwell per zone (from ZONE_EXIT dwell_ms) ──
        dwell_rows = (
            self.db.query(
                Event.zone_id,
                func.avg(Event.dwell_ms).label("avg_dwell_ms"),
            )
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "ZONE_EXIT",
                Event.is_staff   == False,
                Event.zone_id.isnot(None),
                Event.dwell_ms   > 0,
            )
            .group_by(Event.zone_id)
            .all()
        )
        dwell_map = {row.zone_id: float(row.avg_dwell_ms) for row in dwell_rows}

        # ── Also pull zone names from ZoneStat if available ──
        from app.models import ZoneStat
        zone_name_map: dict = {}
        zone_stat_rows = (
            self.db.query(ZoneStat.zone_id, ZoneStat.zone_name)
            .filter(ZoneStat.store_id == store_id)
            .all()
        )
        for row in zone_stat_rows:
            if row.zone_name:
                zone_name_map[row.zone_id] = row.zone_name

        # ── Merge: all zones that appear in either query ──
        all_zones = set(visit_map.keys()) | set(dwell_map.keys())

        if not all_zones:
            return {
                "store_id":        store_id,
                "zones":           [],
                "data_confidence": data_confidence,
                "session_count":   session_count,
            }

        # ── Build result rows ──
        raw = []
        for zone_id in all_zones:
            visits           = visit_map.get(zone_id, 0)
            avg_dwell_ms     = dwell_map.get(zone_id, 0.0)
            avg_dwell_sec    = round(avg_dwell_ms / 1000.0, 1)
            raw.append({
                "zone_id":           zone_id,
                "zone_name":         zone_name_map.get(zone_id, zone_id),
                "visits":            visits,
                "avg_dwell_seconds": avg_dwell_sec,
                "_raw_score":        visits * avg_dwell_sec,  # composite before normalise
            })

        # ── Normalise score 0-100 ──
        max_score = max(r["_raw_score"] for r in raw) or 1.0
        for r in raw:
            r["score"] = round((r["_raw_score"] / max_score) * 100, 1)
            del r["_raw_score"]

        raw.sort(key=lambda r: r["score"], reverse=True)

        return {
            "store_id":        store_id,
            "zones":           raw,
            "data_confidence": data_confidence,
            "session_count":   session_count,
        }
