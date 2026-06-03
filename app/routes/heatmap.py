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
