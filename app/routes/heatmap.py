"""routes/heatmap.py"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.services.heatmap_service import HeatmapService
from app.schemas.response_schema import HeatmapResponse

router = APIRouter(tags=["Analytics"])


@router.get(
    "/stores/{store_id}/heatmap",
    response_model=HeatmapResponse,
    summary="Zone visit frequency and dwell heatmap",
    description=(
        "Returns zone visit counts, average dwell time, and a normalised score 0-100. "
        "data_confidence=LOW if fewer than 20 sessions in the store; HIGH otherwise."
    ),
)
def get_heatmap(store_id: str, db: DBSession = Depends(get_db)):
    svc = HeatmapService(db)
    return svc.get_heatmap(store_id)


# """routes/heatmap.py"""
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session as DBSession
# from sqlalchemy import func
# from app.database import get_db
# from app.models import Event, Session as VisitorSession

# router = APIRouter(tags=["Analytics"])

# @router.get("/stores/{store_id}/heatmap")
# def get_heatmap(store_id: str, db: DBSession = Depends(get_db)):
#     session_count = db.query(func.count(func.distinct(VisitorSession.visitor_id)))\
#         .filter(VisitorSession.store_id == store_id, VisitorSession.is_staff == False).scalar() or 0

#     data_confidence = "LOW" if session_count < 20 else "HIGH"

#     zone_stats = db.query(
#         Event.zone_id,
#         func.count(func.distinct(Event.visitor_id)).label('freq'),
#         func.avg(Event.dwell_ms).label('avg_dwell')
#     ).filter(
#         Event.store_id == store_id,
#         Event.is_staff == False,
#         Event.zone_id.isnot(None),
#         Event.event_type.in_(['ZONE_ENTER', 'ZONE_DWELL'])
#     ).group_by(Event.zone_id).all()

#     max_dwell = max([z.avg_dwell for z in zone_stats if z.avg_dwell] + [1])
    
#     zones = []
#     for z in zone_stats:
#         zones.append({
#             "zone_id": z.zone_id,
#             "visit_frequency": z.freq,
#             "avg_dwell": round((z.avg_dwell or 0) / 1000.0, 1),
#             "normalized_score": int(((z.avg_dwell or 0) / max_dwell) * 100)
#         })

#     return {
#         "store_id": store_id,
#         "session_count": session_count,
#         "data_confidence": data_confidence,
#         "zones": zones
#     }