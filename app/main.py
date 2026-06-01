from fastapi import FastAPI
from fastapi import Depends
from app.models import Session 
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

    # events = get_all_events()

    # return [
    #     {
    #         "visitor_id": event.visitor_id,
    #         "event_type": event.event_type,
    #         "camera_id": event.camera_id,
    #         "timestamp": event.timestamp
    #     }
    #     for event in events
    # ]
    return db.query(Event).all()