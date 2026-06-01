from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Event
from app.models import Session


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def create_event(
    visitor_id: str,
    event_type: str,
    camera_id: str,
    zone_id: str,
    timestamp: str,
    confidence: float,
):
    db = SessionLocal()

    try:
        event = Event(
            visitor_id=visitor_id,
            event_type=event_type,
            camera_id=camera_id,
            zone_id=zone_id,
            timestamp=timestamp,
            confidence=confidence,
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        return event

    finally:
        db.close()


def get_all_events():
    db = SessionLocal()

    try:
        return db.query(Event).all()

    finally:
        db.close()

def create_session(
    visitor_id,
    entry_time,
    exit_time,
    duration_seconds
):
    db = SessionLocal()

    try:

        session_obj = Session(
            visitor_id=visitor_id,
            entry_time=entry_time,
            exit_time=exit_time,
            duration_seconds=duration_seconds,
        )

        db.add(session_obj)
        db.commit()

        return session_obj

    finally:
        db.close()


def get_all_sessions():

    db = SessionLocal()

    try:
        return db.query(Session).all()

    finally:
        db.close()