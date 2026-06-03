"""
health_service.py — Service health and STALE_FEED detection.

Rules:
  • ACTIVE     : last event within 10 minutes
  • STALE_FEED : last event >10 minutes ago
  • NO_DATA    : no events found for this store at all
"""

from __future__ import annotations

import datetime
from typing import List

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session as DBSession

from app.models import Event


STALE_THRESHOLD_MINUTES = 10


class HealthService:

    def __init__(self, db: DBSession):
        self.db = db

    def get_health(self) -> dict:
        now = datetime.datetime.utcnow()

        # Discover all known store_ids
        store_rows = (
            self.db.query(distinct(Event.store_id))
            .filter(Event.store_id.isnot(None))
            .all()
        )
        store_ids = [row[0] for row in store_rows]

        stores: List[dict] = []
        any_stale = False

        for store_id in sorted(store_ids):
            store_health = self._store_health(store_id, now)
            stores.append(store_health)
            if store_health["feed_status"] != "ACTIVE":
                any_stale = True

        overall_status = "degraded" if any_stale else "healthy"

        return {
            "status":     overall_status,
            "stores":     stores,
            "checked_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    def _store_health(self, store_id: str, now: datetime.datetime) -> dict:
        # Most recent event timestamp for this store
        last_ts = (
            self.db.query(func.max(Event.timestamp))
            .filter(Event.store_id == store_id)
            .scalar()
        )

        # Events in the last hour
        one_hour_ago = now - datetime.timedelta(hours=1)
        events_last_hour = (
            self.db.query(func.count(Event.event_id))
            .filter(
                Event.store_id  == store_id,
                Event.timestamp >= one_hour_ago,
            )
            .scalar()
        ) or 0

        if last_ts is None:
            return {
                "store_id":         store_id,
                "last_event":       None,
                "feed_status":      "NO_DATA",
                "events_last_hour": 0,
                "lag_minutes":      None,
            }

        lag_minutes = (now - last_ts).total_seconds() / 60.0
        feed_status = "ACTIVE" if lag_minutes <= STALE_THRESHOLD_MINUTES else "STALE_FEED"

        return {
            "store_id":         store_id,
            "last_event":       last_ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "feed_status":      feed_status,
            "events_last_hour": events_last_hour,
            "lag_minutes":      round(lag_minutes, 1),
        }
