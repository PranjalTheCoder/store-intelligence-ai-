"""
tests/conftest.py — pytest fixtures shared across all test modules.

Uses an in-memory SQLite database so tests are fully isolated and fast.
"""
from __future__ import annotations

import datetime
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, Event, Session as VisitorSession, ZoneStat
from app.database import get_db
from app.main import app

# ── In-memory test database ──────────────────────────────────────────────────

TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def reset_db():
    """Drop and recreate all tables before each test."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Seed helpers ─────────────────────────────────────────────────────────────

STORE_ID = "STORE_TEST_001"
NOW      = datetime.datetime(2026, 3, 3, 14, 30, 0)


def make_event(
    store_id:   str = STORE_ID,
    visitor_id: str = "VIS_aaa001",
    event_type: str = "ENTRY",
    camera_id:  str = "CAM3",
    zone_id:    str | None = None,
    dwell_ms:   int = 0,
    is_staff:   bool = False,
    confidence: float = 0.92,
    ts:         datetime.datetime | None = None,
    metadata:   dict | None = None,
) -> dict:
    return {
        "event_id":   str(uuid.uuid4()),
        "store_id":   store_id,
        "camera_id":  camera_id,
        "visitor_id": visitor_id,
        "event_type": event_type,
        "timestamp":  (ts or NOW).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "zone_id":    zone_id,
        "dwell_ms":   dwell_ms,
        "is_staff":   is_staff,
        "confidence": confidence,
        "metadata": metadata or {"queue_depth": None, "sku_zone": None, "session_seq": 1},
    }


def seed_visitor_journey(db, store_id=STORE_ID, visitor_id="VIS_test_001", base_ts=None):
    """Insert a full visitor journey: ENTRY → ZONE_ENTER → BILLING_QUEUE_JOIN → EXIT."""
    if base_ts is None:
        base_ts = NOW
    events = [
        Event(event_id=str(uuid.uuid4()), store_id=store_id, camera_id="CAM3",
              visitor_id=visitor_id, event_type="ENTRY",
              timestamp=base_ts, is_staff=False, confidence=0.95, dwell_ms=0,
              metadata_json={}),
        Event(event_id=str(uuid.uuid4()), store_id=store_id, camera_id="CAM1",
              visitor_id=visitor_id, event_type="ZONE_ENTER",
              timestamp=base_ts + datetime.timedelta(minutes=2),
              zone_id="SKINCARE", is_staff=False, confidence=0.88, dwell_ms=0,
              metadata_json={"sku_zone": "SKINCARE", "zone_type": "SHELF"}),
        Event(event_id=str(uuid.uuid4()), store_id=store_id, camera_id="CAM1",
              visitor_id=visitor_id, event_type="ZONE_EXIT",
              timestamp=base_ts + datetime.timedelta(minutes=4),
              zone_id="SKINCARE", is_staff=False, confidence=0.88, dwell_ms=120000,
              metadata_json={"sku_zone": "SKINCARE", "zone_type": "SHELF"}),
        Event(event_id=str(uuid.uuid4()), store_id=store_id, camera_id="CAM5",
              visitor_id=visitor_id, event_type="BILLING_QUEUE_JOIN",
              timestamp=base_ts + datetime.timedelta(minutes=6),
              zone_id="Z_CASH_COUNTER", is_staff=False, confidence=0.91, dwell_ms=0,
              metadata_json={"queue_depth": 2, "sku_zone": "BILLING"}),
        Event(event_id=str(uuid.uuid4()), store_id=store_id, camera_id="CAM3",
              visitor_id=visitor_id, event_type="EXIT",
              timestamp=base_ts + datetime.timedelta(minutes=10),
              is_staff=False, confidence=0.90, dwell_ms=0, metadata_json={}),
    ]
    for ev in events:
        db.add(ev)

    sess = VisitorSession(
        session_id    = str(uuid.uuid4()),
        visitor_id    = visitor_id,
        store_id      = store_id,
        entry_time    = base_ts,
        exit_time     = base_ts + datetime.timedelta(minutes=10),
        duration_sec  = 600,
        zones_visited = ["SKINCARE"],
        is_staff      = False,
        converted     = False,
    )
    db.add(sess)
    db.commit()
    return sess
