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
