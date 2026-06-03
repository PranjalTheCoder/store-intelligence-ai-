"""
repository.py — All database operations.

Keeps all SQLAlchemy queries in one place.
"""

from __future__ import annotations

import datetime
import uuid
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models import Event, Session as VisitorSession, ZoneStat, POSTransaction, Alert
from pipeline.event_engine import RetailEvent


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class EventRepository:

    def __init__(self, db: Session):
        self.db = db

    def save_event(self, ev: RetailEvent) -> Event:
        record = Event(
            event_id      = ev.event_id,
            store_id      = ev.store_id,
            camera_id     = ev.camera_id,
            visitor_id    = ev.visitor_id,
            event_type    = ev.event_type,
            timestamp     = ev.timestamp,
            zone_id       = ev.zone_id,
            dwell_ms      = ev.dwell_ms,
            is_staff      = ev.is_staff,
            confidence    = ev.confidence,
            metadata_json = ev.metadata,
            gender_pred   = ev.gender_pred,
            age_pred      = ev.age_pred,
            age_bucket    = ev.age_bucket,
            group_id      = ev.group_id,
            group_size    = ev.group_size,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def save_events_bulk(self, events: List[RetailEvent]) -> int:
        records = [
            Event(
                event_id      = ev.event_id,
                store_id      = ev.store_id,
                camera_id     = ev.camera_id,
                visitor_id    = ev.visitor_id,
                event_type    = ev.event_type,
                timestamp     = ev.timestamp,
                zone_id       = ev.zone_id,
                dwell_ms      = ev.dwell_ms,
                is_staff      = ev.is_staff,
                confidence    = ev.confidence,
                metadata_json = ev.metadata,
                gender_pred   = ev.gender_pred,
                age_pred      = ev.age_pred,
                age_bucket    = ev.age_bucket,
                group_id      = ev.group_id,
                group_size    = ev.group_size,
            ) for ev in events
        ]
        self.db.bulk_save_objects(records)
        self.db.commit()
        return len(records)

    def get_events(
        self,
        store_id:   Optional[str] = None,
        event_type: Optional[str] = None,
        visitor_id: Optional[str] = None,
        limit:      int = 100,
        offset:     int = 0,
        since:      Optional[datetime.datetime] = None,
        exclude_staff: bool = False,
    ) -> List[Event]:
        q = self.db.query(Event)
        if store_id:
            q = q.filter(Event.store_id == store_id)
        if event_type:
            q = q.filter(Event.event_type == event_type)
        if visitor_id:
            q = q.filter(Event.visitor_id == visitor_id)
        if since:
            q = q.filter(Event.timestamp >= since)
        if exclude_staff:
            q = q.filter(Event.is_staff == False)
        return q.order_by(desc(Event.timestamp)).offset(offset).limit(limit).all()

    def count_events(
        self,
        store_id:      Optional[str] = None,
        event_type:    Optional[str] = None,
        exclude_staff: bool = False,
    ) -> int:
        q = self.db.query(func.count(Event.event_id))
        if store_id:
            q = q.filter(Event.store_id == store_id)
        if event_type:
            q = q.filter(Event.event_type == event_type)
        if exclude_staff:
            q = q.filter(Event.is_staff == False)
        return q.scalar() or 0


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

class SessionRepository:

    def __init__(self, db: Session):
        self.db = db

    def create_session(
        self,
        visitor_id: str,
        store_id:   str,
        entry_time: datetime.datetime,
        is_staff:   bool = False,
    ) -> VisitorSession:
        sess = VisitorSession(
            session_id  = str(uuid.uuid4()),
            visitor_id  = visitor_id,
            store_id    = store_id,
            entry_time  = entry_time,
            is_staff    = is_staff,
        )
        self.db.add(sess)
        self.db.commit()
        self.db.refresh(sess)
        return sess

    def close_session(
        self,
        visitor_id: str,
        store_id:   str,
        exit_time:  datetime.datetime,
    ) -> Optional[VisitorSession]:
        sess = (
            self.db.query(VisitorSession)
            .filter(
                VisitorSession.visitor_id == visitor_id,
                VisitorSession.store_id   == store_id,
                VisitorSession.exit_time.is_(None),
            )
            .order_by(desc(VisitorSession.entry_time))
            .first()
        )
        if sess:
            sess.exit_time    = exit_time
            sess.duration_sec = int((exit_time - sess.entry_time).total_seconds()) if sess.entry_time else 0
            self.db.commit()
        return sess

    def add_zone_to_session(self, visitor_id: str, store_id: str, zone_id: str):
        sess = (
            self.db.query(VisitorSession)
            .filter(
                VisitorSession.visitor_id == visitor_id,
                VisitorSession.store_id   == store_id,
                VisitorSession.exit_time.is_(None),
            )
            .first()
        )
        if sess:
            zones = list(sess.zones_visited or [])
            if zone_id not in zones:
                zones.append(zone_id)
            sess.zones_visited = zones
            self.db.commit()

    def increment_reentry(self, visitor_id: str, store_id: str):
        sess = (
            self.db.query(VisitorSession)
            .filter(
                VisitorSession.visitor_id == visitor_id,
                VisitorSession.store_id   == store_id,
            )
            .order_by(desc(VisitorSession.entry_time))
            .first()
        )
        if sess:
            sess.reentry_count = (sess.reentry_count or 0) + 1
            self.db.commit()

    def get_sessions(
        self,
        store_id:      Optional[str] = None,
        exclude_staff: bool = True,
        limit:         int = 100,
        offset:        int = 0,
    ) -> List[VisitorSession]:
        q = self.db.query(VisitorSession)
        if store_id:
            q = q.filter(VisitorSession.store_id == store_id)
        if exclude_staff:
            q = q.filter(VisitorSession.is_staff == False)
        return q.order_by(desc(VisitorSession.entry_time)).offset(offset).limit(limit).all()

    def get_session(self, session_id: str) -> Optional[VisitorSession]:
        return self.db.get(VisitorSession, session_id)

    def get_visitor_sessions(self, visitor_id: str) -> List[VisitorSession]:
        return (
            self.db.query(VisitorSession)
            .filter(VisitorSession.visitor_id == visitor_id)
            .order_by(VisitorSession.entry_time)
            .all()
        )


# ---------------------------------------------------------------------------
# Zone Stats
# ---------------------------------------------------------------------------

class ZoneStatRepository:

    def __init__(self, db: Session):
        self.db = db

    def upsert_zone_stat(
        self,
        store_id:   str,
        zone_id:    str,
        zone_name:  str,
        dwell_ms:   int,
        visitor_id: str,
    ):
        stat = (
            self.db.query(ZoneStat)
            .filter(ZoneStat.store_id == store_id, ZoneStat.zone_id == zone_id)
            .first()
        )
        if not stat:
            stat = ZoneStat(store_id=store_id, zone_id=zone_id, zone_name=zone_name)
            self.db.add(stat)

        stat.total_visits    = (stat.total_visits or 0) + 1
        stat.total_dwell_ms  = (stat.total_dwell_ms or 0) + dwell_ms
        stat.avg_dwell_ms    = stat.total_dwell_ms / stat.total_visits
        stat.last_updated    = datetime.datetime.utcnow()

        # Count unique visitors (approximate)
        unique_count = (
            self.db.query(func.count(func.distinct(Event.visitor_id)))
            .filter(Event.store_id == store_id, Event.zone_id == zone_id)
            .scalar()
        ) or 0
        stat.unique_visitors = unique_count

        # Heatmap score: normalised dwell
        stat.heatmap_score = min(stat.avg_dwell_ms / 60000.0, 1.0)  # cap at 1 min

        self.db.commit()

    def get_zone_stats(self, store_id: Optional[str] = None) -> List[ZoneStat]:
        q = self.db.query(ZoneStat)
        if store_id:
            q = q.filter(ZoneStat.store_id == store_id)
        return q.order_by(desc(ZoneStat.heatmap_score)).all()

    def get_zone_ranking(self, store_id: str) -> List[dict]:
        stats = self.get_zone_stats(store_id)
        return [
            {
                "rank":           i + 1,
                "zone_id":        s.zone_id,
                "zone_name":      s.zone_name,
                "total_visits":   s.total_visits,
                "avg_dwell_ms":   round(s.avg_dwell_ms, 0),
                "unique_visitors": s.unique_visitors,
                "heatmap_score":  round(s.heatmap_score, 4),
            }
            for i, s in enumerate(stats)
        ]


# ---------------------------------------------------------------------------
# POS Transactions
# ---------------------------------------------------------------------------

class POSRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_transactions(
        self,
        store_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[POSTransaction]:
        q = self.db.query(POSTransaction)
        if store_id:
            q = q.filter(POSTransaction.store_id == store_id)
        return q.order_by(desc(POSTransaction.timestamp)).limit(limit).all()


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class AlertRepository:

    def __init__(self, db: Session):
        self.db = db

    def create_alert(
        self,
        store_id:   str,
        alert_type: str,
        message:    str,
        severity:   str = "INFO",
        metadata:   Optional[dict] = None,
    ) -> Alert:
        alert = Alert(
            alert_id      = str(uuid.uuid4()),
            store_id      = store_id,
            alert_type    = alert_type,
            severity      = severity,
            message       = message,
            metadata_json = metadata or {},
        )
        self.db.add(alert)
        self.db.commit()
        return alert

    def get_alerts(
        self,
        store_id:  Optional[str] = None,
        resolved:  Optional[bool] = None,
        limit:     int = 50,
    ) -> List[Alert]:
        q = self.db.query(Alert)
        if store_id:
            q = q.filter(Alert.store_id == store_id)
        if resolved is not None:
            q = q.filter(Alert.resolved == resolved)
        return q.order_by(desc(Alert.created_at)).limit(limit).all()
