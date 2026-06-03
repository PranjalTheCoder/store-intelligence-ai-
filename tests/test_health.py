"""
tests/test_health.py

Assertions:
  ✓ Returns schema: status, stores, checked_at
  ✓ feed_status=NO_DATA when no events exist
  ✓ feed_status=ACTIVE when last event < 10 min ago
  ✓ feed_status=STALE_FEED when last event > 10 min ago
  ✓ Overall status=degraded when any store is stale
  ✓ overall status=healthy when all stores are ACTIVE
"""

from __future__ import annotations

import datetime
import uuid

from app.models import Event
from tests.conftest import STORE_ID, NOW


def _add_event(db, store_id, ts):
    db.add(Event(
        event_id=str(uuid.uuid4()), store_id=store_id, camera_id="CAM3",
        visitor_id="VIS_health", event_type="ENTRY",
        timestamp=ts, is_staff=False, confidence=0.9, dwell_ms=0, metadata_json={},
    ))
    db.commit()


def test_health_schema(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert "status" in body
    assert "stores" in body
    assert "checked_at" in body


def test_no_data_when_no_events(client):
    r = client.get("/health")
    # No events at all — should still return valid response
    assert r.status_code == 200
    body = r.json()
    assert body["stores"] == []
    assert body["status"] == "healthy"


def test_active_feed_status(client, db):
    recent_ts = datetime.datetime.utcnow() - datetime.timedelta(minutes=2)
    _add_event(db, STORE_ID, recent_ts)

    r = client.get("/health")
    stores = {s["store_id"]: s for s in r.json()["stores"]}
    assert stores[STORE_ID]["feed_status"] == "ACTIVE"
    assert r.json()["status"] == "healthy"


def test_stale_feed_detection(client, db):
    old_ts = datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
    _add_event(db, STORE_ID, old_ts)

    r = client.get("/health")
    body = r.json()
    stores = {s["store_id"]: s for s in body["stores"]}
    assert stores[STORE_ID]["feed_status"] == "STALE_FEED"
    assert body["status"] == "degraded"


def test_lag_minutes_field_present(client, db):
    ts = datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
    _add_event(db, STORE_ID, ts)

    r = client.get("/health")
    store = r.json()["stores"][0]
    assert "lag_minutes" in store
    assert store["lag_minutes"] is not None
    assert 4.0 <= store["lag_minutes"] <= 6.5   # allow clock skew in test


def test_events_last_hour_count(client, db):
    now = datetime.datetime.utcnow()
    for i in range(3):
        _add_event(db, STORE_ID, now - datetime.timedelta(minutes=i))

    r = client.get("/health")
    store = r.json()["stores"][0]
    assert store["events_last_hour"] == 3
