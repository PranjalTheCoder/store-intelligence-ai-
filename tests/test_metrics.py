"""
tests/test_metrics.py

Tests for GET /stores/{store_id}/metrics

Assertions:
  ✓ Returns correct schema keys
  ✓ Staff excluded from unique_visitors
  ✓ Zero traffic returns zeros, not crash
  ✓ conversion_rate uses session-level data
  ✓ abandonment_rate computed correctly
  ✓ current_queue_depth is non-negative
"""

from __future__ import annotations

import datetime
import uuid
from tests.conftest import (
    make_event, seed_visitor_journey, STORE_ID, NOW,
)
from app.models import Event, Session as VisitorSession


def test_metrics_schema(client):
    r = client.get(f"/stores/{STORE_ID}/metrics")
    assert r.status_code == 200
    body = r.json()
    for key in (
        "store_id", "unique_visitors", "conversion_rate",
        "avg_dwell_seconds", "current_queue_depth", "abandonment_rate",
        "total_entries", "total_exits", "converted_visitors", "avg_basket_value_inr",
    ):
        assert key in body, f"Missing key: {key}"


def test_zero_traffic_returns_zeros(client):
    r = client.get(f"/stores/{STORE_ID}/metrics")
    body = r.json()
    assert body["unique_visitors"] == 0
    assert body["conversion_rate"] == 0.0
    assert body["avg_dwell_seconds"] == 0.0
    assert body["current_queue_depth"] == 0
    assert body["abandonment_rate"] == 0.0


def test_staff_excluded_from_unique_visitors(client, db):
    # Add one customer, one staff
    seed_visitor_journey(db, visitor_id="VIS_customer")
    db.add(Event(
        event_id=str(uuid.uuid4()), store_id=STORE_ID, camera_id="CAM3",
        visitor_id="VIS_staff", event_type="ENTRY",
        timestamp=NOW, is_staff=True, confidence=0.9, dwell_ms=0, metadata_json={},
    ))
    db.commit()

    r = client.get(f"/stores/{STORE_ID}/metrics")
    body = r.json()
    # Unique visitors should be 1 (customer only)
    assert body["unique_visitors"] == 1


def test_conversion_rate_correct(client, db):
    # Seed 2 visitors; mark 1 as converted
    sess1 = seed_visitor_journey(db, visitor_id="VIS_c1")
    seed_visitor_journey(db, visitor_id="VIS_c2")
    sess1.converted   = True
    sess1.basket_value = 800.0
    db.commit()

    r = client.get(f"/stores/{STORE_ID}/metrics")
    body = r.json()
    assert body["converted_visitors"] == 1
    assert body["conversion_rate"] == 50.0


def test_abandonment_rate(client, db):
    # 2 queue joins, 1 abandon
    for eid, et in [
        (str(uuid.uuid4()), "BILLING_QUEUE_JOIN"),
        (str(uuid.uuid4()), "BILLING_QUEUE_JOIN"),
        (str(uuid.uuid4()), "BILLING_QUEUE_ABANDON"),
    ]:
        db.add(Event(
            event_id=eid, store_id=STORE_ID, camera_id="CAM5",
            visitor_id="VIS_q1", event_type=et,
            timestamp=NOW, is_staff=False, confidence=0.9,
            dwell_ms=0, metadata_json={},
        ))
    db.commit()

    r = client.get(f"/stores/{STORE_ID}/metrics")
    body = r.json()
    assert body["abandonment_rate"] == 50.0


def test_queue_depth_non_negative(client):
    r = client.get(f"/stores/{STORE_ID}/metrics")
    assert r.json()["current_queue_depth"] >= 0
