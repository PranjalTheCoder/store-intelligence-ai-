from fastapi import FastAPI
from fastapi import Depends
from sqlalchemy.orm import Session 
from app.models import Event
from app.repository import get_db

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