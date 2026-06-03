"""
anomaly_service.py — Anomaly detection (fixed version)

FIX-7: dead_zone now uses the latest event timestamp in DB as 'now'
       so historical data doesn't trigger all zones as dead simultaneously.
FIX: queue spike boundary: threshold is >= not > (boundary case passes)
"""

from __future__ import annotations

import datetime
from typing import List

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session as DBSession

from app.models import Event, Session as VisitorSession


class AnomalyService:

    QUEUE_SPIKE_WARN_MULT     = 2.0
    QUEUE_SPIKE_CRITICAL_MULT = 3.0
    CONVERSION_WARN_DROP      = 0.20
    CONVERSION_CRITICAL_DROP  = 0.30
    DEAD_ZONE_WINDOW_MIN      = 30
    DEAD_ZONE_MIN_HIST_VISITS = 3

    def __init__(self, db: DBSession):
        self.db = db

    def _reference_now(self, store_id: str) -> datetime.datetime:
        """
        Use the most recent event timestamp for this store as 'now'.
        Falls back to utcnow() only if no events exist.
        This makes anomaly detection work correctly with historical/pre-loaded data.
        """
        latest = (
            self.db.query(func.max(Event.timestamp))
            .filter(Event.store_id == store_id)
            .scalar()
        )
        if latest is None:
            return datetime.datetime.utcnow()
        # Use latest + 1 second as reference so window calculations work
        return latest + datetime.timedelta(seconds=1)

    def get_anomalies(self, store_id: str) -> List[dict]:
        now       = self._reference_now(store_id)
        anomalies = []
        anomalies.extend(self._check_queue_spike(store_id, now))
        anomalies.extend(self._check_conversion_drop(store_id, now))
        anomalies.extend(self._check_dead_zones(store_id, now))
        return anomalies

    # ── Queue spike ────────────────────────────────────────────────────────

    def _check_queue_spike(self, store_id: str, now: datetime.datetime) -> List[dict]:
        results = []
        window_start = now - datetime.timedelta(minutes=30)

        joins_recent = (
            self.db.query(func.count(distinct(Event.visitor_id)))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "BILLING_QUEUE_JOIN",
                Event.is_staff   == False,
                Event.timestamp  >= window_start,
            )
            .scalar()
        ) or 0

        abandons_recent = (
            self.db.query(func.count(distinct(Event.visitor_id)))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "BILLING_QUEUE_ABANDON",
                Event.is_staff   == False,
                Event.timestamp  >= window_start,
            )
            .scalar()
        ) or 0

        current_depth = max(0, joins_recent - abandons_recent)

        seven_days_ago = now - datetime.timedelta(days=7)
        total_joins_7d = (
            self.db.query(func.count(Event.event_id))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "BILLING_QUEUE_JOIN",
                Event.is_staff   == False,
                Event.timestamp  >= seven_days_ago,
                Event.timestamp  <  window_start,   # exclude current window
            )
            .scalar()
        ) or 0

        # Historical average per 30-min window (6 days × 48 windows = 288 windows)
        avg_depth = total_joins_7d / 288.0

        if avg_depth > 0:
            ratio = current_depth / avg_depth
            # Use >= for boundary: ratio >= 3 → CRITICAL, >= 2 → WARN
            if ratio >= self.QUEUE_SPIKE_CRITICAL_MULT:
                results.append({
                    "type":             "QUEUE_SPIKE",
                    "severity":         "CRITICAL",
                    "zone_id":          None,
                    "message":          f"Queue depth {current_depth} is {ratio:.1f}× historical average ({avg_depth:.1f})",
                    "suggested_action": "Open second billing counter immediately",
                    "value":            float(current_depth),
                    "threshold":        round(avg_depth * self.QUEUE_SPIKE_CRITICAL_MULT, 2),
                })
            elif ratio >= self.QUEUE_SPIKE_WARN_MULT:
                results.append({
                    "type":             "QUEUE_SPIKE",
                    "severity":         "WARN",
                    "zone_id":          None,
                    "message":          f"Queue depth {current_depth} is {ratio:.1f}× historical average ({avg_depth:.1f})",
                    "suggested_action": "Monitor queue — consider opening second billing counter",
                    "value":            float(current_depth),
                    "threshold":        round(avg_depth * self.QUEUE_SPIKE_WARN_MULT, 2),
                })
        elif current_depth >= 5:
            results.append({
                "type":             "QUEUE_SPIKE",
                "severity":         "WARN",
                "zone_id":          None,
                "message":          f"Queue depth {current_depth} with no historical baseline",
                "suggested_action": "Monitor queue closely",
                "value":            float(current_depth),
                "threshold":        5.0,
            })

        return results

    # ── Conversion drop ────────────────────────────────────────────────────

    def _check_conversion_drop(self, store_id: str, now: datetime.datetime) -> List[dict]:
        results = []
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        today_sessions = (
            self.db.query(func.count(VisitorSession.session_id))
            .filter(
                VisitorSession.store_id   == store_id,
                VisitorSession.is_staff   == False,
                VisitorSession.entry_time >= today_start,
            )
            .scalar()
        ) or 0

        today_converted = (
            self.db.query(func.count(VisitorSession.session_id))
            .filter(
                VisitorSession.store_id   == store_id,
                VisitorSession.is_staff   == False,
                VisitorSession.converted  == True,
                VisitorSession.entry_time >= today_start,
            )
            .scalar()
        ) or 0

        today_rate = today_converted / today_sessions if today_sessions > 0 else None

        seven_days_ago = today_start - datetime.timedelta(days=7)
        hist_sessions = (
            self.db.query(func.count(VisitorSession.session_id))
            .filter(
                VisitorSession.store_id   == store_id,
                VisitorSession.is_staff   == False,
                VisitorSession.entry_time >= seven_days_ago,
                VisitorSession.entry_time <  today_start,
            )
            .scalar()
        ) or 0

        hist_converted = (
            self.db.query(func.count(VisitorSession.session_id))
            .filter(
                VisitorSession.store_id   == store_id,
                VisitorSession.is_staff   == False,
                VisitorSession.converted  == True,
                VisitorSession.entry_time >= seven_days_ago,
                VisitorSession.entry_time <  today_start,
            )
            .scalar()
        ) or 0

        hist_rate = hist_converted / hist_sessions if hist_sessions > 0 else None

        if today_rate is not None and hist_rate is not None and hist_rate > 0:
            drop = (hist_rate - today_rate) / hist_rate
            if drop >= self.CONVERSION_CRITICAL_DROP:
                results.append({
                    "type":             "CONVERSION_DROP",
                    "severity":         "CRITICAL",
                    "zone_id":          None,
                    "message":          f"Conversion {today_rate*100:.1f}% is {drop*100:.0f}% below 7-day avg ({hist_rate*100:.1f}%)",
                    "suggested_action": "Review merchandising and staff performance. Check for product stock-outs.",
                    "value":            round(today_rate * 100, 2),
                    "threshold":        round(hist_rate * (1 - self.CONVERSION_CRITICAL_DROP) * 100, 2),
                })
            elif drop >= self.CONVERSION_WARN_DROP:
                results.append({
                    "type":             "CONVERSION_DROP",
                    "severity":         "WARN",
                    "zone_id":          None,
                    "message":          f"Conversion {today_rate*100:.1f}% is {drop*100:.0f}% below 7-day avg ({hist_rate*100:.1f}%)",
                    "suggested_action": "Investigate conversion funnel — check billing zone traffic.",
                    "value":            round(today_rate * 100, 2),
                    "threshold":        round(hist_rate * (1 - self.CONVERSION_WARN_DROP) * 100, 2),
                })

        return results

    # ── Dead zones ─────────────────────────────────────────────────────────

    def _check_dead_zones(self, store_id: str, now: datetime.datetime) -> List[dict]:
        results = []
        window_start = now - datetime.timedelta(minutes=self.DEAD_ZONE_WINDOW_MIN)

        # Zones with sufficient historical visits
        hist_zones = (
            self.db.query(Event.zone_id, func.count(Event.event_id).label("cnt"))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "ZONE_ENTER",
                Event.is_staff   == False,
                Event.zone_id.isnot(None),
            )
            .group_by(Event.zone_id)
            .having(func.count(Event.event_id) >= self.DEAD_ZONE_MIN_HIST_VISITS)
            .all()
        )
        hist_zone_ids = {row.zone_id for row in hist_zones}

        if not hist_zone_ids:
            return results

        # Zones with visits in the recent window
        recent_zones = (
            self.db.query(distinct(Event.zone_id))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "ZONE_ENTER",
                Event.is_staff   == False,
                Event.zone_id.isnot(None),
                Event.timestamp  >= window_start,
            )
            .all()
        )
        recent_zone_ids = {row[0] for row in recent_zones}

        for zone_id in hist_zone_ids - recent_zone_ids:
            results.append({
                "type":             "DEAD_ZONE",
                "severity":         "INFO",
                "zone_id":          zone_id,
                "message":          f"Zone '{zone_id}' has no visits in last {self.DEAD_ZONE_WINDOW_MIN} min",
                "suggested_action": "Review product placement and signage for this zone",
                "value":            None,
                "threshold":        None,
            })

        return results
