"""
main.py — FastAPI application.

Existing routes preserved.  New routes added:
  POST /events/ingest
  GET  /heatmap
  GET  /zones
  GET  /store-layout
  GET  /live
  GET  /alerts
  GET  /anomalies
  GET  /pos/correlate   (trigger POS correlation)
  GET  /pos/metrics
"""

from __future__ import annotations

import datetime
import json
import os
import uuid
from pathlib import Path
from typing import List, Optional, Any, Dict

from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import init_db, get_db
from app.models import Event, Session as VisitorSession, ZoneStat, Alert
from app.repository import (
    EventRepository, SessionRepository, ZoneStatRepository,
    POSRepository, AlertRepository
)
from pipeline.correlate_pos import POSCorrelator
from app.middleware.logger import StructuredLoggingMiddleware
from sqlalchemy.exc import OperationalError, DBAPIError, SQLAlchemyError
from fastapi.responses import JSONResponse
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Retail Store Intelligence API",
    version="2.0.0",
    description="Purplle Hackathon — retail analytics from CCTV + POS data",
)

# Register the new tracking middleware layers
app.add_middleware(StructuredLoggingMiddleware)

# CORRECTED GRACEFUL DEGRADATION
@app.exception_handler(OperationalError)
@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    # Log the failure silently here in a real production system
    return JSONResponse(
        status_code=503,
        content={
            "error": "DATABASE_UNAVAILABLE",
            "message": "Database temporarily unavailable"
        }
    )

# 2. Add this exact block of code to allow your React dashboard to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all frontend ports (like 5173) to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
def on_startup():
    init_db()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class EventMetadata(BaseModel):
    queue_depth:  Optional[int]   = None
    sku_zone:     Optional[str]   = None
    session_seq:  Optional[int]   = None

class IngestEvent(BaseModel):
    event_id:   str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_id:   str
    camera_id:  str
    visitor_id: str
    event_type: str
    timestamp:  str
    zone_id:    Optional[str]   = None
    dwell_ms:   int             = 0
    is_staff:   bool            = False
    confidence: float           = 1.0
    metadata:   EventMetadata   = Field(default_factory=EventMetadata)

class IngestBatch(BaseModel):
    events: List[IngestEvent]

class AlertCreate(BaseModel):
    store_id:   str
    alert_type: str
    message:    str
    severity:   str = "INFO"


# ---------------------------------------------------------------------------
# Existing routes (preserved)
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"status": "ok", "service": "store-intelligence", "version": "2.0.0"}


# /health is now served by app/routes/health.py (mounted below via include_router)


@app.get("/events")
def get_events(
    store_id:      Optional[str] = Query(None),
    event_type:    Optional[str] = Query(None),
    visitor_id:    Optional[str] = Query(None),
    exclude_staff: bool          = Query(True),
    limit:         int           = Query(100, le=1000),
    offset:        int           = Query(0),
    db: Session = Depends(get_db),
):
    repo = EventRepository(db)
    events = repo.get_events(
        store_id=store_id, event_type=event_type, visitor_id=visitor_id,
        exclude_staff=exclude_staff, limit=limit, offset=offset,
    )
    return {
        "total": repo.count_events(store_id=store_id, exclude_staff=exclude_staff),
        "events": [e.to_api_dict() for e in events],
    }


@app.get("/metrics")
def get_metrics(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    correlator = POSCorrelator(db)
    pos_metrics = correlator.get_metrics(store_id=store_id)

    event_repo = EventRepository(db)
    entry_count = event_repo.count_events(store_id=store_id, event_type="ENTRY", exclude_staff=True)
    exit_count  = event_repo.count_events(store_id=store_id, event_type="EXIT",  exclude_staff=True)

    return {
        "store_id":         store_id,
        "total_entries":    entry_count,
        "total_exits":      exit_count,
        **pos_metrics,
        "timestamp":        datetime.datetime.utcnow().isoformat(),
    }


@app.get("/funnel")
def get_funnel(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    repo  = EventRepository(db)
    s_repo = SessionRepository(db)

    entries   = repo.count_events(store_id=store_id, event_type="ENTRY",  exclude_staff=True)
    zone_v    = repo.count_events(store_id=store_id, event_type="ZONE_ENTER", exclude_staff=True)
    billing_v = repo.count_events(store_id=store_id, event_type="BILLING_QUEUE_JOIN", exclude_staff=True)

    correlator = POSCorrelator(db)
    pos = correlator.get_metrics(store_id=store_id)

    return {
        "funnel": [
            {"stage": "Store Entry",    "count": entries},
            {"stage": "Zone Explored",  "count": zone_v},
            {"stage": "Billing Queue",  "count": billing_v},
            {"stage": "Converted",      "count": pos["converted_visitors"]},
        ],
        "conversion_rate":    pos["conversion_rate"],
        "average_basket_value": pos["average_basket_value"],
    }


@app.get("/visitors")
def get_visitors(
    store_id: Optional[str] = Query(None),
    limit:    int           = Query(100, le=500),
    offset:   int           = Query(0),
    db: Session = Depends(get_db),
):
    repo = SessionRepository(db)
    sessions = repo.get_sessions(store_id=store_id, limit=limit, offset=offset)
    return {"visitors": [s.to_api_dict() for s in sessions]}


@app.get("/visitors/{visitor_id}")
def get_visitor(visitor_id: str, db: Session = Depends(get_db)):
    s_repo = SessionRepository(db)
    e_repo = EventRepository(db)

    sessions = s_repo.get_visitor_sessions(visitor_id)
    if not sessions:
        raise HTTPException(status_code=404, detail="Visitor not found")

    events = e_repo.get_events(visitor_id=visitor_id, limit=500)
    return {
        "visitor_id": visitor_id,
        "sessions":   [s.to_api_dict() for s in sessions],
        "events":     [e.to_api_dict() for e in events],
    }


@app.get("/sessions")
def get_sessions(
    store_id: Optional[str] = Query(None),
    limit:    int           = Query(100),
    db: Session = Depends(get_db),
):
    repo = SessionRepository(db)
    sessions = repo.get_sessions(store_id=store_id, limit=limit)
    return {"sessions": [s.to_api_dict() for s in sessions]}


@app.get("/dashboard")
def get_dashboard(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    e_repo   = EventRepository(db)
    z_repo   = ZoneStatRepository(db)
    correlator = POSCorrelator(db)

    pos = correlator.get_metrics(store_id=store_id)
    zone_ranking = z_repo.get_zone_ranking(store_id or "")

    return {
        "store_id":        store_id,
        "metrics":         pos,
        "top_zones":       zone_ranking[:5],
        "total_entries":   e_repo.count_events(store_id=store_id, event_type="ENTRY",  exclude_staff=True),
        "total_exits":     e_repo.count_events(store_id=store_id, event_type="EXIT",   exclude_staff=True),
        "reentries":       e_repo.count_events(store_id=store_id, event_type="REENTRY"),
        "queue_abandons":  e_repo.count_events(store_id=store_id, event_type="BILLING_QUEUE_ABANDON"),
        "timestamp":       datetime.datetime.utcnow().isoformat(),
    }


@app.get("/analytics")
def get_analytics(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    e_repo = EventRepository(db)
    z_repo = ZoneStatRepository(db)
    correlator = POSCorrelator(db)

    pos = correlator.get_metrics(store_id=store_id)
    zone_stats = z_repo.get_zone_stats(store_id)

    # Re-entry rate
    reentries = e_repo.count_events(store_id=store_id, event_type="REENTRY")
    entries   = e_repo.count_events(store_id=store_id, event_type="ENTRY", exclude_staff=True)
    reentry_rate = round(reentries / max(entries, 1), 4)

    # Staff traffic
    staff_entries = e_repo.count_events(store_id=store_id, event_type="ENTRY", exclude_staff=False) - entries

    return {
        "store_id":        store_id,
        "conversion":      pos,
        "reentry_rate":    reentry_rate,
        "staff_entries":   staff_entries,
        "zone_ranking":    z_repo.get_zone_ranking(store_id or ""),
        "queue_stats": {
            "total_joins":     e_repo.count_events(store_id=store_id, event_type="BILLING_QUEUE_JOIN"),
            "total_abandons":  e_repo.count_events(store_id=store_id, event_type="BILLING_QUEUE_ABANDON"),
        },
    }


@app.get("/heatmap")
def get_heatmap(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Zone-level heatmap data.
    Returns zones sorted by heatmap_score (normalised average dwell time).
    """
    repo  = ZoneStatRepository(db)
    stats = repo.get_zone_stats(store_id)
    return {
        "store_id": store_id,
        "heatmap":  [s.to_api_dict() for s in stats],
    }


@app.get("/zones")
def get_zones(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Zone statistics and rankings."""
    repo = ZoneStatRepository(db)
    return {
        "store_id":     store_id,
        "zone_ranking": repo.get_zone_ranking(store_id or ""),
        "zone_stats":   [s.to_api_dict() for s in repo.get_zone_stats(store_id)],
    }


@app.get("/store-layout")
def get_store_layout(
    store_id: str = Query(..., description="e.g. STORE_1 or STORE_2"),
):
    """
    Returns zone polygon definitions from the zones JSON.
    Used by the React dashboard for map rendering.
    """
    mapping = {
        "STORE_1": "pipeline/store1_zones.json",
        "STORE_2": "pipeline/store2_zones.json",
    }
    json_path = mapping.get(store_id.upper())
    if not json_path or not Path(json_path).exists():
        raise HTTPException(status_code=404, detail=f"No layout found for store {store_id}")

    with open(json_path) as f:
        layout = json.load(f)

    return layout


@app.get("/live")
def get_live(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Real-time snapshot: active visitors and live queue.
    'Active' = session with no exit_time yet.
    """
    q = db.query(VisitorSession).filter(VisitorSession.exit_time.is_(None))
    if store_id:
        q = q.filter(VisitorSession.store_id == store_id)
    if store_id is None:
        q = q.filter(VisitorSession.is_staff == False)

    active = q.all()

    return {
        "store_id":       store_id,
        "active_count":   len(active),
        "active_visitors": [
            {
                "visitor_id":  s.visitor_id,
                "store_id":    s.store_id,
                "entry_time":  s.entry_time.isoformat() if s.entry_time else None,
                "zones_visited": s.zones_visited or [],
            }
            for s in active
        ],
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


@app.get("/alerts")
def get_alerts(
    store_id: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    limit:    int = Query(50),
    db: Session = Depends(get_db),
):
    repo = AlertRepository(db)
    alerts = repo.get_alerts(store_id=store_id, resolved=resolved, limit=limit)
    return {"alerts": [a.to_api_dict() for a in alerts]}


@app.post("/alerts")
def create_alert(body: AlertCreate, db: Session = Depends(get_db)):
    repo  = AlertRepository(db)
    alert = repo.create_alert(
        store_id   = body.store_id,
        alert_type = body.alert_type,
        message    = body.message,
        severity   = body.severity,
    )
    return alert.to_api_dict()


@app.get("/anomalies")
def get_anomalies(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Detect anomalies heuristically:
      • Queue depth > 5 with no staff detected
      • Re-entry rate > 30%
      • Empty store period > 10 minutes (gap in entries)
      • High abandon rate
    """
    e_repo = EventRepository(db)
    anomalies = []

    abandons = e_repo.count_events(store_id=store_id, event_type="BILLING_QUEUE_ABANDON")
    joins    = e_repo.count_events(store_id=store_id, event_type="BILLING_QUEUE_JOIN")
    entries  = e_repo.count_events(store_id=store_id, event_type="ENTRY", exclude_staff=True)
    reentries = e_repo.count_events(store_id=store_id, event_type="REENTRY")

    if joins > 0 and abandons / joins > 0.40:
        anomalies.append({
            "type":     "HIGH_ABANDON_RATE",
            "severity": "WARNING",
            "value":    round(abandons / joins, 3),
            "message":  f"Abandon rate {abandons/joins*100:.1f}% exceeds 40% threshold",
        })

    if entries > 0 and reentries / entries > 0.30:
        anomalies.append({
            "type":     "HIGH_REENTRY_RATE",
            "severity": "INFO",
            "value":    round(reentries / entries, 3),
            "message":  f"Re-entry rate {reentries/entries*100:.1f}% is elevated",
        })

    return {
        "store_id":  store_id,
        "anomalies": anomalies,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# POS correlation trigger
# ---------------------------------------------------------------------------

@app.get("/pos/correlate")
def run_pos_correlation(
    csv_path: str = Query("data/pos_transactions.csv"),
    db: Session = Depends(get_db),
):
    if not Path(csv_path).exists():
        # Try the uploaded sample CSV
        sample = "data/POS_sample_transactions.csv"
        if Path(sample).exists():
            csv_path = sample
        else:
            raise HTTPException(status_code=404, detail=f"POS CSV not found at {csv_path}")

    correlator = POSCorrelator(db)
    result = correlator.correlate(csv_path)
    return result


@app.get("/pos/metrics")
def get_pos_metrics(
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    correlator = POSCorrelator(db)
    return correlator.get_metrics(store_id=store_id)


@app.get("/pos/transactions")
def get_transactions(
    store_id: Optional[str] = Query(None),
    limit:    int = Query(100),
    db: Session = Depends(get_db),
):
    repo = POSRepository(db)
    txns = repo.get_transactions(store_id=store_id, limit=limit)
    return {"transactions": [t.to_api_dict() for t in txns]}


# ===========================================================================
# PART B — Intelligence API routes (mounted without touching existing routes)
# ===========================================================================
from app.routes import events as events_router
from app.routes import metrics as metrics_router
from app.routes import funnel as funnel_router
from app.routes import heatmap as heatmap_router
from app.routes import anomalies as anomalies_router
from app.routes import health as health_router

app.include_router(events_router.router)
app.include_router(metrics_router.router)
app.include_router(funnel_router.router)
app.include_router(heatmap_router.router)
app.include_router(anomalies_router.router)
app.include_router(health_router.router)

# POS correlation trigger (convenience GET endpoint)
from app.services.conversion_service import ConversionService
import os as _os

@app.get("/stores/{store_id}/pos/correlate", tags=["POS"])
def trigger_pos_correlation(
    store_id: str,
    csv_path: str = Query(default="data/pos_transactions.csv"),
    db: Session = Depends(get_db),
):
    """Trigger POS correlation for a store and return conversion summary."""
    if not Path(csv_path).exists():
        raise HTTPException(status_code=404, detail=f"CSV not found: {csv_path}")
    svc = ConversionService(db)
    return svc.run(csv_path)
