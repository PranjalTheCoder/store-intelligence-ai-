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
