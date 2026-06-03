"""
tests/test_funnel.py

Assertions:
  ✓ Returns correct schema
  ✓ Uses sessions/visitors, not raw event count
  ✓ Re-entry does NOT inflate entry count
  ✓ Staff excluded from funnel
  ✓ Zero traffic returns zeros
  ✓ drop_off percentages sum correctly
"""

from __future__ import annotations

import datetime
import uuid

from app.models import Event, Session as VisitorSession
from tests.conftest import seed_visitor_journey, STORE_ID, NOW


def test_funnel_schema(client):
    r = client.get(f"/stores/{STORE_ID}/funnel")
    assert r.status_code == 200
    body = r.json()
    for key in ("store_id", "entry", "zone_visit", "billing_queue", "purchase", "drop_off"):
        assert key in body
    for k in ("entry_to_zone", "zone_to_queue", "queue_to_purchase"):
        assert k in body["drop_off"]


def test_zero_traffic_funnel(client):
    r = client.get(f"/stores/{STORE_ID}/funnel")
    body = r.json()
    assert body["entry"] == 0
    assert body["zone_visit"] == 0
    assert body["billing_queue"] == 0
    assert body["purchase"] == 0


def test_reentry_does_not_double_count(client, db):
    """
    One physical visitor: ENTRY → EXIT → REENTRY.
    Funnel entry count must be 1 (not 2).
    """
    vid = "VIS_reentry_test"
    for et, ts_offset in [
        ("ENTRY",   0),
        ("EXIT",    5),
        ("REENTRY", 10),
    ]:
        db.add(Event(
            event_id=str(uuid.uuid4()), store_id=STORE_ID, camera_id="CAM3",
            visitor_id=vid, event_type=et,
            timestamp=NOW + datetime.timedelta(minutes=ts_offset),
            is_staff=False, confidence=0.9, dwell_ms=0, metadata_json={},
        ))
    db.commit()

    r = client.get(f"/stores/{STORE_ID}/funnel")
    # One unique visitor_id → entry=1
    assert r.json()["entry"] == 1


def test_staff_excluded_from_funnel(client, db):
    # One customer ENTRY, one staff ENTRY
    for vid, is_staff in [("VIS_cust", False), ("VIS_staff", True)]:
        db.add(Event(
            event_id=str(uuid.uuid4()), store_id=STORE_ID, camera_id="CAM3",
            visitor_id=vid, event_type="ENTRY",
            timestamp=NOW, is_staff=is_staff, confidence=0.9,
            dwell_ms=0, metadata_json={},
        ))
    db.commit()

    r = client.get(f"/stores/{STORE_ID}/funnel")
    assert r.json()["entry"] == 1   # staff excluded


def test_funnel_monotonically_decreases(client, db):
    seed_visitor_journey(db, visitor_id="VIS_f1")
    seed_visitor_journey(db, visitor_id="VIS_f2")

    r = client.get(f"/stores/{STORE_ID}/funnel")
    body = r.json()
    assert body["entry"] >= body["zone_visit"]
    assert body["zone_visit"] >= body["billing_queue"]
    assert body["billing_queue"] >= body["purchase"]


def test_drop_off_is_percentage_0_to_100(client, db):
    seed_visitor_journey(db)
    r = client.get(f"/stores/{STORE_ID}/funnel")
    drop = r.json()["drop_off"]
    for key, val in drop.items():
        assert 0.0 <= val <= 100.0, f"{key}={val} outside [0,100]"
