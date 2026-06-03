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
