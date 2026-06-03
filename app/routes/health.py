"""routes/health.py"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.services.health_service import HealthService
from app.schemas.response_schema import HealthResponse

router = APIRouter(tags=["System"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health and feed status per store",
    description=(
        "Returns feed_status=ACTIVE if last event < 10 min ago. "
        "Returns feed_status=STALE_FEED if >10 min. "
        "Returns feed_status=NO_DATA if no events ingested yet."
    ),
)
def get_health(db: DBSession = Depends(get_db)):
    svc = HealthService(db)
    return svc.get_health()


# """routes/health.py"""
# import datetime
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session as DBSession
# from sqlalchemy import func
# from app.database import get_db
# from app.models import Event

# router = APIRouter(tags=["System"])

# @router.get("/health")
# def get_health(db: DBSession = Depends(get_db)):
#     store_latest = db.query(
#         Event.store_id,
#         func.max(Event.timestamp).label("last_ts")
#     ).group_by(Event.store_id).all()

#     now = datetime.datetime.utcnow()
#     stores = []

#     for store_id, last_ts in store_latest:
#         if not last_ts:
#             continue
        
#         # Ensure timestamp comparison is safely naive against utcnow
#         if last_ts.tzinfo:
#             last_ts = last_ts.replace(tzinfo=None)

#         diff_seconds = (now - last_ts).total_seconds()
        
#         # Challenge criteria: STALE_FEED if gap > 10 minutes (600 seconds)
#         status = "STALE_FEED" if diff_seconds > 600 else "ACTIVE"

#         stores.append({
#             "store_id": store_id,
#             "last_event_timestamp": last_ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
#             "feed_status": status
#         })

#     return {
#         "status": "healthy",
#         "stores": stores
#     }