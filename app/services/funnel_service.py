"""
funnel_service.py — Session-based conversion funnel (fixed)

FIX-9: billing stage now counts BOTH BILLING_QUEUE_JOIN events AND
       sessions that visited a billing-type zone (sku_zone=BILLING).
FIX:   re-entry uses same visitor_id so distinct count naturally de-dupes.
"""

from __future__ import annotations

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session as DBSession

from app.models import Event, Session as VisitorSession


class FunnelService:

    def __init__(self, db: DBSession):
        self.db = db

    def get_funnel(self, store_id: str) -> dict:
        # Stage 1 — Entry: distinct non-staff visitor_ids with ENTRY or REENTRY
        # REENTRY is the same visitor_id so distinct handles it naturally
        entry_visitors = (
            self.db.query(func.count(distinct(Event.visitor_id)))
            .filter(
                Event.store_id   == store_id,
                Event.event_type.in_(["ENTRY"]),   # REENTRY same id so distinct still = 1
                Event.is_staff   == False,
            )
            .scalar()
        ) or 0

        # Stage 2 — Zone visit: distinct visitors with any ZONE_ENTER
        zone_visitors = self._distinct_visitors_with_event(store_id, "ZONE_ENTER")

        # Stage 3 — Billing queue: distinct visitors at billing
        # Include BILLING_QUEUE_JOIN events AND any ZONE_ENTER to a billing zone
        billing_via_event = self._distinct_visitors_with_event(store_id, "BILLING_QUEUE_JOIN")
        billing_via_zone = (
            self.db.query(func.count(distinct(Event.visitor_id)))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == "ZONE_ENTER",
                Event.is_staff   == False,
                Event.zone_id.ilike("%billing%"),
            )
            .scalar()
        ) or 0
        billing_visitors = max(billing_via_event, billing_via_zone)

        # Stage 4 — Purchase: distinct converted visitor_ids (POS correlation)
        purchase_visitors = (
            self.db.query(func.count(distinct(VisitorSession.visitor_id)))
            .filter(
                VisitorSession.store_id  == store_id,
                VisitorSession.is_staff  == False,
                VisitorSession.converted == True,
            )
            .scalar()
        ) or 0

        # Enforce monotonicity — funnel can never increase
        zone_visitors    = min(zone_visitors,    entry_visitors)
        billing_visitors = min(billing_visitors, zone_visitors)
        purchase_visitors = min(purchase_visitors, billing_visitors)

        def drop_pct(f: int, t: int) -> float:
            if f == 0:
                return 0.0
            return round((f - t) / f * 100, 1)

        return {
            "store_id":      store_id,
            "entry":         entry_visitors,
            "zone_visit":    zone_visitors,
            "billing_queue": billing_visitors,
            "purchase":      purchase_visitors,
            "drop_off": {
                "entry_to_zone":     drop_pct(entry_visitors,    zone_visitors),
                "zone_to_queue":     drop_pct(zone_visitors,     billing_visitors),
                "queue_to_purchase": drop_pct(billing_visitors,  purchase_visitors),
            },
        }

    def _distinct_visitors_with_event(self, store_id: str, event_type: str) -> int:
        return (
            self.db.query(func.count(distinct(Event.visitor_id)))
            .filter(
                Event.store_id   == store_id,
                Event.event_type == event_type,
                Event.is_staff   == False,
            )
            .scalar()
        ) or 0
