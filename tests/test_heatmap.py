"""
tests/test_heatmap.py

Assertions:
  ✓ Returns correct schema
  ✓ data_confidence=LOW when sessions < 20
  ✓ data_confidence=HIGH when sessions >= 20
  ✓ Scores normalised 0-100 (max zone = 100)
  ✓ Empty store returns empty zones list, not crash
  ✓ Zone with most visits gets score=100
"""

from __future__ import annotations

import datetime
import uuid

from app.models import Event, Session as VisitorSession
from tests.conftest import STORE_ID, NOW


def _add_zone_events(db, zone_id, n_enters, n_exits_with_dwell, dwell_ms=60000):
    for i in range(n_enters):
        db.add(Event(
            event_id=str(uuid.uuid4()), store_id=STORE_ID, camera_id="CAM1",
            visitor_id=f"VIS_h{i}", event_type="ZONE_ENTER",
            timestamp=NOW + datetime.timedelta(seconds=i),
            zone_id=zone_id, is_staff=False, confidence=0.9,
            dwell_ms=0, metadata_json={"zone_type": "SHELF"},
        ))
    for i in range(n_exits_with_dwell):
        db.add(Event(
            event_id=str(uuid.uuid4()), store_id=STORE_ID, camera_id="CAM1",
            visitor_id=f"VIS_h{i}", event_type="ZONE_EXIT",
            timestamp=NOW + datetime.timedelta(seconds=i+30),
            zone_id=zone_id, is_staff=False, confidence=0.9,
            dwell_ms=dwell_ms, metadata_json={"zone_type": "SHELF"},
        ))
    db.commit()


def test_heatmap_schema(client):
    r = client.get(f"/stores/{STORE_ID}/heatmap")
    assert r.status_code == 200
    body = r.json()
    for key in ("store_id", "zones", "data_confidence", "session_count"):
        assert key in body


def test_empty_store_returns_empty_zones(client):
    r = client.get(f"/stores/{STORE_ID}/heatmap")
    body = r.json()
    assert body["zones"] == []
    assert body["data_confidence"] == "LOW"


def test_data_confidence_low_under_20_sessions(client, db):
    # Add 5 sessions
    for i in range(5):
        db.add(VisitorSession(
            session_id=str(uuid.uuid4()), visitor_id=f"VIS_{i}",
            store_id=STORE_ID, entry_time=NOW, is_staff=False,
        ))
    db.commit()
    r = client.get(f"/stores/{STORE_ID}/heatmap")
    assert r.json()["data_confidence"] == "LOW"


def test_data_confidence_high_over_20_sessions(client, db):
    for i in range(25):
        db.add(VisitorSession(
            session_id=str(uuid.uuid4()), visitor_id=f"VIS_{i}",
            store_id=STORE_ID, entry_time=NOW, is_staff=False,
        ))
    db.commit()
    r = client.get(f"/stores/{STORE_ID}/heatmap")
    assert r.json()["data_confidence"] == "HIGH"


def test_scores_normalised_0_to_100(client, db):
    _add_zone_events(db, "SKINCARE", 10, 10, dwell_ms=90000)
    _add_zone_events(db, "MAKEUP",   5,  5,  dwell_ms=40000)
    r = client.get(f"/stores/{STORE_ID}/heatmap")
    zones = r.json()["zones"]
    scores = [z["score"] for z in zones]
    assert max(scores) == 100.0
    for s in scores:
        assert 0.0 <= s <= 100.0


def test_busiest_zone_gets_100(client, db):
    _add_zone_events(db, "SKINCARE", 20, 20, dwell_ms=120000)
    _add_zone_events(db, "MAKEUP",   5,  5,  dwell_ms=30000)
    r = client.get(f"/stores/{STORE_ID}/heatmap")
    zones = {z["zone_id"]: z for z in r.json()["zones"]}
    assert zones["SKINCARE"]["score"] == 100.0
    assert zones["MAKEUP"]["score"] < 100.0
