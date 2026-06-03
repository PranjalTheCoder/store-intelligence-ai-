"""
response_schema.py — Pydantic response schemas for all Part B endpoints.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


# ── Metrics ────────────────────────────────────────────────────────────────

class MetricsResponse(BaseModel):
    store_id:            str
    unique_visitors:     int
    conversion_rate:     float          # percentage 0-100
    avg_dwell_seconds:   float
    current_queue_depth: int
    abandonment_rate:    float          # percentage 0-100
    total_entries:       int
    total_exits:         int
    converted_visitors:  int
    avg_basket_value_inr: float
    window_start:        Optional[str] = None
    window_end:          Optional[str] = None


# ── Funnel ─────────────────────────────────────────────────────────────────

class FunnelDropOff(BaseModel):
    entry_to_zone:       float
    zone_to_queue:       float
    queue_to_purchase:   float


class FunnelResponse(BaseModel):
    store_id:     str
    entry:        int
    zone_visit:   int
    billing_queue: int
    purchase:     int
    drop_off:     FunnelDropOff


# ── Heatmap ────────────────────────────────────────────────────────────────

class ZoneHeatEntry(BaseModel):
    zone_id:          str
    zone_name:        Optional[str] = None
    visits:           int
    avg_dwell_seconds: float
    score:            float          # normalised 0-100


class HeatmapResponse(BaseModel):
    store_id:         str
    zones:            List[ZoneHeatEntry]
    data_confidence:  str            # "HIGH" or "LOW"
    session_count:    int


# ── Anomalies ──────────────────────────────────────────────────────────────

class AnomalyItem(BaseModel):
    type:             str
    severity:         str            # INFO / WARN / CRITICAL
    zone_id:          Optional[str] = None
    message:          str
    suggested_action: str
    value:            Optional[float] = None
    threshold:        Optional[float] = None


class AnomaliesResponse(BaseModel):
    store_id:   str
    anomalies:  List[AnomalyItem]
    checked_at: str


# ── Health ─────────────────────────────────────────────────────────────────

class StoreHealth(BaseModel):
    store_id:         str
    last_event:       Optional[str]   # ISO-8601 or null
    feed_status:      str             # ACTIVE | STALE_FEED | NO_DATA
    events_last_hour: int
    lag_minutes:      Optional[float] = None


class HealthResponse(BaseModel):
    status: str                       # healthy | degraded
    stores: List[StoreHealth]
    checked_at: str
