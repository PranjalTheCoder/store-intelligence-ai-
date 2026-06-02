from fastapi import FastAPI
from fastapi import Depends
from app.models import VisitorSession as Session 
from app.models import Event
from app.repository import get_db
from app.repository import (
    get_all_events,
    get_all_sessions,
    get_total_events,
    get_total_sessions
)

app = FastAPI(
    title="Store Intelligence API",
    version="1.0.0"
)


@app.get("/")
def root():

    return {
        "service": "Store Intelligence API",
        "version": "1.0.0"
    }


@app.get("/health")
def health():

    return {
        "status": "ok"
    }

@app.get("/events")
def events(
    db: Session = Depends(get_db)
):

    events = db.query(Event).all()

    return [
        {
            "id": event.id,
            "visitor_id": event.visitor_id,
            "event_type": event.event_type,
            "camera_id": event.camera_id,
            "zone_id": event.zone_id,
            "timestamp": event.timestamp,
            "confidence": event.confidence
        }
        for event in events
    ]

@app.get("/metrics")
def metrics(
    db: Session = Depends(get_db)
):

    events = db.query(Event).all()

    entries = sum(
        1 for event in events
        if event.event_type == "ENTRY"
    )

    exits = sum(
        1 for event in events
        if event.event_type == "EXIT"
    )

    return {
        "total_events": len(events),
        "entries": entries,
        "exits": exits
    }

@app.get("/funnel")
def funnel(
    db: Session = Depends(get_db)
):

    events = db.query(Event).all()

    entries = sum(
        1
        for event in events
        if event.event_type == "ENTRY"
    )

    exits = sum(
        1
        for event in events
        if event.event_type == "EXIT"
    )

    return {
        "entry_count": entries,
        "exit_count": exits,
        "drop_off": entries - exits
    }

@app.get("/visitors")
def visitors(
    db: Session = Depends(get_db)
):

    events = db.query(Event).all()

    visitor_ids = sorted(
        list(
            {
                event.visitor_id
                for event in events
            }
        )
    )

    return {
        "total_visitors": len(visitor_ids),
        "visitors": visitor_ids
    }

@app.get("/visitors/{visitor_id}")
def visitor_details(
    visitor_id: str,
    db: Session = Depends(get_db)
):

    events = (
        db.query(Event)
        .filter(
            Event.visitor_id == visitor_id
        )
        .all()
    )

    return {
        "visitor_id": visitor_id,
        "event_count": len(events),
        "events": [
            {
                "event_type": event.event_type,
                "camera_id": event.camera_id,
                "zone_id": event.zone_id,
                "timestamp": event.timestamp,
                "confidence": event.confidence
            }
            for event in events
        ]
    }


@app.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db)
):

    return {
        "analytics": analytics(db),
        "recent_events": [
            {
                "visitor_id": e.visitor_id,
                "event_type": e.event_type,
                "timestamp": e.timestamp
            }
            for e in (
                db.query(Event)
                .order_by(Event.id.desc())
                .limit(10)
                .all()
            )
        ]
    }


@app.get("/sessions")
def sessions():

    sessions = get_all_sessions()

    return [
        {
            "visitor_id": session.visitor_id,
            "entry_time": session.entry_time,
            "exit_time": session.exit_time,
            "duration_seconds": session.duration_seconds
        }
        for session in sessions
    ]

@app.get("/analytics")
def analytics(
    db: Session = Depends(get_db)
):

    total_events = db.query(Event).count()

    total_entries = (
        db.query(Event)
        .filter(Event.event_type == "ENTRY")
        .count()
    )

    total_exits = (
        db.query(Event)
        .filter(Event.event_type == "EXIT")
        .count()
    )

    total_sessions = (
        db.query(Session)
        .count()
    )

    avg_dwell_time = 0

    sessions = db.query(Session).all()

    if sessions:

        avg_dwell_time = (
            sum(
                s.duration_seconds
                for s in sessions
            )
            / len(sessions)
        )

    return {
        "total_events": total_events,
        "entries": total_entries,
        "exits": total_exits,
        "sessions": total_sessions,
        "average_dwell_time_seconds":
            round(avg_dwell_time, 2)
    }