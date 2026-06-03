"""routes/anomalies.py"""
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.services.anomaly_service import AnomalyService
from app.schemas.response_schema import AnomaliesResponse

router = APIRouter(tags=["Analytics"])


@router.get(
    "/stores/{store_id}/anomalies",
    response_model=AnomaliesResponse,
    summary="Active anomalies for a store",
    description=(
        "Detects: QUEUE_SPIKE (queue > 2× historical avg), "
        "CONVERSION_DROP (today < 7-day avg by 20%+), "
        "DEAD_ZONE (no visits in last 30 min for zones with history). "
        "Each anomaly includes severity (INFO/WARN/CRITICAL) and suggested_action."
    ),
)
def get_anomalies(store_id: str, db: DBSession = Depends(get_db)):
    svc = AnomalyService(db)
    anomalies = svc.get_anomalies(store_id)
    return AnomaliesResponse(
        store_id   = store_id,
        anomalies  = anomalies,
        checked_at = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    )

# """routes/anomalies.py"""
# import datetime
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session as DBSession
# from app.database import get_db
# from app.models import Event

# router = APIRouter(tags=["Analytics"])

# @router.get("/stores/{store_id}/anomalies")
# def get_anomalies(store_id: str, db: DBSession = Depends(get_db)):
#     anomalies = []

#     joins = db.query(Event).filter(Event.store_id == store_id, Event.event_type == "BILLING_QUEUE_JOIN").count()
#     abandons = db.query(Event).filter(Event.store_id == store_id, Event.event_type == "BILLING_QUEUE_ABANDON").count()

#     latest_join = db.query(Event).filter(Event.store_id == store_id, Event.event_type == 'BILLING_QUEUE_JOIN')\
#         .order_by(Event.timestamp.desc()).first()

#     # Rule 1: High queue depth spike
#     if latest_join and latest_join.metadata_json and latest_join.metadata_json.get("queue_depth", 0) > 5:
#         anomalies.append({
#             "type": "QUEUE_SPIKE",
#             "severity": "CRITICAL",
#             "suggested_action": "Open additional checkout counter immediately to disperse queue."
#         })

#     # Rule 2: High abandonment
#     if joins > 5 and (abandons / joins) > 0.3:
#         anomalies.append({
#             "type": "HIGH_ABANDON_RATE",
#             "severity": "WARN",
#             "suggested_action": "Review billing counter CCTV for operational friction causing walk-outs."
#         })

#     # Rule 3: Dead zone check (Zero visits store-wide implies issue)
#     total_zone_visits = db.query(Event).filter(Event.store_id == store_id, Event.zone_id.isnot(None)).count()
#     if total_zone_visits == 0:
#         anomalies.append({
#             "type": "DEAD_ZONE",
#             "severity": "INFO",
#             "suggested_action": "Verify camera alignment and zone layout bounding boxes; no visits tracked."
#         })

#     return {
#         "store_id": store_id,
#         "anomalies": anomalies,
#         "timestamp": datetime.datetime.utcnow().isoformat()
#     }
