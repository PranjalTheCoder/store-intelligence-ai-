"""routes/metrics.py"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.services.metrics_service import MetricsService
from app.schemas.response_schema import MetricsResponse

router = APIRouter(tags=["Analytics"])


@router.get(
    "/stores/{store_id}/metrics",
    response_model=MetricsResponse,
    summary="Real-time store metrics",
    description=(
        "Returns unique_visitors, conversion_rate, avg_dwell_seconds, "
        "current_queue_depth, and abandonment_rate. "
        "Staff (is_staff=true) are excluded from all metrics. "
        "Handles zero traffic and zero purchases safely."
    ),
)
def get_metrics(store_id: str, db: DBSession = Depends(get_db)):
    svc = MetricsService(db)
    result = svc.get_metrics(store_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Store {store_id} not found")
    return result

# """routes/metrics.py"""
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session as DBSession
# from sqlalchemy import func
# from app.database import get_db
# from app.models import Event, Session as VisitorSession
# from pipeline.correlate_pos import POSCorrelator

# router = APIRouter(tags=["Analytics"])

# @router.get("/stores/{store_id}/metrics")
# def get_metrics(store_id: str, db: DBSession = Depends(get_db)):
#     # 1. Unique visitors (strictly excluding staff)
#     unique_visitors = db.query(func.count(func.distinct(VisitorSession.visitor_id)))\
#         .filter(VisitorSession.store_id == store_id, VisitorSession.is_staff == False).scalar() or 0

#     # 2. POS Conversion
#     pos_metrics = POSCorrelator(db).get_metrics(store_id=store_id)
#     conv_rate = pos_metrics.get("conversion_rate", 0.0)

#     # 3. Average dwell per zone
#     zone_dwells = db.query(Event.zone_id, func.avg(Event.dwell_ms))\
#         .filter(Event.store_id == store_id, Event.is_staff == False, 
#                 Event.event_type == 'ZONE_DWELL', Event.zone_id.isnot(None))\
#         .group_by(Event.zone_id).all()
#     avg_dwell_per_zone = {z: round((d or 0)/1000.0, 1) for z, d in zone_dwells}

#     # 4. Queue depth & Abandonment (Safe zero-traffic handling)
#     latest_join = db.query(Event).filter(Event.store_id == store_id, Event.event_type == 'BILLING_QUEUE_JOIN')\
#         .order_by(Event.timestamp.desc()).first()
#     current_queue_depth = (latest_join.metadata_json.get("queue_depth") or 0) if (latest_join and latest_join.metadata_json) else 0

#     joins = db.query(Event).filter(Event.store_id == store_id, Event.event_type == 'BILLING_QUEUE_JOIN').count()
#     abandons = db.query(Event).filter(Event.store_id == store_id, Event.event_type == 'BILLING_QUEUE_ABANDON').count()
#     abandonment_rate = round((abandons / joins * 100), 1) if joins > 0 else 0.0

#     return {
#         "store_id": store_id,
#         "unique_visitors": unique_visitors,
#         "conversion_rate": conv_rate,
#         "avg_dwell_per_zone": avg_dwell_per_zone,
#         "current_queue_depth": current_queue_depth,
#         "abandonment_rate": abandonment_rate
#     }