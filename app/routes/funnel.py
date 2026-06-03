"""routes/funnel.py"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.services.funnel_service import FunnelService
from app.schemas.response_schema import FunnelResponse

router = APIRouter(tags=["Analytics"])


@router.get(
    "/stores/{store_id}/funnel",
    response_model=FunnelResponse,
    summary="Session-based conversion funnel",
    description=(
        "Computes funnel as distinct visitor counts at each stage. "
        "Unit is sessions/visitors — NOT raw event counts. "
        "Re-entries share visitor_id so are never double-counted."
    ),
)
def get_funnel(store_id: str, db: DBSession = Depends(get_db)):
    svc = FunnelService(db)
    return svc.get_funnel(store_id)


# """routes/funnel.py"""
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session as DBSession
# from sqlalchemy import func
# from app.database import get_db
# from app.models import Event, Session as VisitorSession
# from pipeline.correlate_pos import POSCorrelator

# router = APIRouter(tags=["Analytics"])

# @router.get("/stores/{store_id}/funnel")
# def get_funnel(store_id: str, db: DBSession = Depends(get_db)):
#     # Calculate strictly distinct visitors per funnel stage (excluding staff)
    
#     entries = db.query(func.count(func.distinct(VisitorSession.visitor_id)))\
#         .filter(VisitorSession.store_id == store_id, VisitorSession.is_staff == False).scalar() or 0

#     zone_visits = db.query(func.count(func.distinct(Event.visitor_id)))\
#         .filter(Event.store_id == store_id, Event.is_staff == False, Event.event_type.in_(["ZONE_ENTER", "ZONE_DWELL"])).scalar() or 0

#     queues = db.query(func.count(func.distinct(Event.visitor_id)))\
#         .filter(Event.store_id == store_id, Event.is_staff == False, Event.event_type == "BILLING_QUEUE_JOIN").scalar() or 0

#     pos = POSCorrelator(db).get_metrics(store_id=store_id)
#     purchases = pos.get("converted_visitors", 0)

#     # Guarantee monotonic property physically 
#     # (prevents rogue camera triggers from inflating downstream metrics)
#     entry = entries
#     zone_visit = min(entry, zone_visits)
#     billing_queue = min(zone_visit, queues)
#     purchase = min(billing_queue, purchases)

#     return {
#         "entry": entry,
#         "zone_visit": zone_visit,
#         "billing_queue": billing_queue,
#         "purchase": purchase
#     }