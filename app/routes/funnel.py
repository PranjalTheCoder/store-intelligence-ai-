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
