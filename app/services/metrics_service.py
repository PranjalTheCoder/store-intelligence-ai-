"""
metrics_service.py — Real-time store metrics.

Computes:
  • unique_visitors     (distinct visitor_ids with ENTRY, excluding staff)
  • conversion_rate     (converted sessions / total customer sessions * 100)
  • avg_dwell_seconds   (mean session duration)
  • current_queue_depth (live count from BILLING_QUEUE_JOIN without matching ABANDON/EXIT)
  • abandonment_rate    (BILLING_QUEUE_ABANDON / BILLING_QUEUE_JOIN * 100)

Rules enforced:
  - is_staff=True sessions excluded from all customer metrics
  - Re-entries use the SAME visitor_id — so distinct count is correct
  - Zero traffic → returns zeros, never crashes
  - Zero purchases → conversion_rate=0.0, never divides by zero
"""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session as DBSession

from app.models import Event, Session as VisitorSession


class MetricsService:

    def __init__(self, db: DBSession):
        self.db = db

    def get_metrics(self, store_id: str) -> dict:
        """Compute all metrics for a store. Safe against zero traffic."""

        # ── Unique visitors (distinct visitor_ids with ENTRY, non-staff) ──
        unique_visitors = (
            self.db.query(func.count(distinct(VisitorSession.visitor_id)))
            .filter(
                VisitorSession.store_id == store_id,
                VisitorSession.is_staff == False,
            )
            .scalar()
        ) or 0

        # ── Total sessions (each re-entry is a new session, but same visitor_id
        #    means the distinct count above is not inflated by re-entries) ──
        total_sessions = (
            self.db.query(func.count(VisitorSession.session_id))
            .filter(
                VisitorSession.store_id == store_id,
                VisitorSession.is_staff == False,
            )
            .scalar()
        ) or 0

        # ── Entries / Exits ──
        total_entries = (
            self.db.query(func.count(Event.event_id))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "ENTRY",
                Event.is_staff   == False,
            )
            .scalar()
        ) or 0

        total_exits = (
            self.db.query(func.count(Event.event_id))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "EXIT",
                Event.is_staff   == False,
            )
            .scalar()
        ) or 0

        # ── Conversion ──
        converted_sessions = (
            self.db.query(func.count(VisitorSession.session_id))
            .filter(
                VisitorSession.store_id == store_id,
                VisitorSession.is_staff == False,
                VisitorSession.converted == True,
            )
            .scalar()
        ) or 0

        conversion_rate = round(
            (converted_sessions / total_sessions * 100) if total_sessions > 0 else 0.0, 2
        )

        # ── Average dwell (session duration) ──
        avg_duration = (
            self.db.query(func.avg(VisitorSession.duration_sec))
            .filter(
                VisitorSession.store_id  == store_id,
                VisitorSession.is_staff  == False,
                VisitorSession.duration_sec > 0,
            )
            .scalar()
        )
        avg_dwell_seconds = round(float(avg_duration), 1) if avg_duration else 0.0

        # ── Average basket value ──
        avg_basket = (
            self.db.query(func.avg(VisitorSession.basket_value))
            .filter(
                VisitorSession.store_id == store_id,
                VisitorSession.is_staff == False,
                VisitorSession.converted == True,
                VisitorSession.basket_value > 0,
            )
            .scalar()
        )
        avg_basket_value = round(float(avg_basket), 2) if avg_basket else 0.0

        # ── Current queue depth ──
        # Count BILLING_QUEUE_JOIN events that do NOT have a corresponding
        # BILLING_QUEUE_ABANDON in the last 30 minutes (proxy for live depth)
        thirty_min_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
        queue_joins = (
            self.db.query(func.count(distinct(Event.visitor_id)))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "BILLING_QUEUE_JOIN",
                Event.is_staff   == False,
                Event.timestamp  >= thirty_min_ago,
            )
            .scalar()
        ) or 0

        queue_abandons_recent = (
            self.db.query(func.count(distinct(Event.visitor_id)))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "BILLING_QUEUE_ABANDON",
                Event.is_staff   == False,
                Event.timestamp  >= thirty_min_ago,
            )
            .scalar()
        ) or 0

        current_queue_depth = max(0, queue_joins - queue_abandons_recent)

        # ── Abandonment rate ──
        total_joins = (
            self.db.query(func.count(Event.event_id))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "BILLING_QUEUE_JOIN",
                Event.is_staff   == False,
            )
            .scalar()
        ) or 0

        total_abandons = (
            self.db.query(func.count(Event.event_id))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "BILLING_QUEUE_ABANDON",
                Event.is_staff   == False,
            )
            .scalar()
        ) or 0

        abandonment_rate = round(
            (total_abandons / total_joins * 100) if total_joins > 0 else 0.0, 2
        )

        return {
            "store_id":             store_id,
            "unique_visitors":      unique_visitors,
            "conversion_rate":      conversion_rate,
            "avg_dwell_seconds":    avg_dwell_seconds,
            "current_queue_depth":  current_queue_depth,
            "abandonment_rate":     abandonment_rate,
            "total_entries":        total_entries,
            "total_exits":          total_exits,
            "converted_visitors":   converted_sessions,
            "avg_basket_value_inr": avg_basket_value,
        }
