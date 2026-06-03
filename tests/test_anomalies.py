"""
tests/test_anomalies.py

Assertions:
  ✓ Returns schema with anomalies list and severity
  ✓ Each anomaly has suggested_action
  ✓ Empty store returns empty anomalies (no crash)
  ✓ DEAD_ZONE detected when zone goes silent
  ✓ Severity values are INFO / WARN / CRITICAL only
"""

from __future__ import annotations

import datetime
import uuid

from app.models import Event, Session as VisitorSession
from tests.conftest import STORE_ID, NOW


VALID_SEVERITIES = {"INFO", "WARN", "CRITICAL"}


def test_anomalies_schema(client):
    r = client.get(f"/stores/{STORE_ID}/anomalies")
    assert r.status_code == 200
    body = r.json()
    assert "store_id" in body
    assert "anomalies" in body
    assert "checked_at" in body
    assert isinstance(body["anomalies"], list)


def test_empty_store_no_crash(client):
    r = client.get(f"/stores/{STORE_ID}/anomalies")
    assert r.status_code == 200
    assert r.json()["anomalies"] == []


def test_each_anomaly_has_required_fields(client, db):
    # Create enough historical zone events to trigger dead-zone detection
    past = NOW - datetime.timedelta(hours=2)
    for i in range(5):
        db.add(Event(
            event_id=str(uuid.uuid4()), store_id=STORE_ID, camera_id="CAM1",
            visitor_id=f"VIS_{i}", event_type="ZONE_ENTER",
            timestamp=past + datetime.timedelta(minutes=i),
            zone_id="SKINCARE", is_staff=False, confidence=0.9,
            dwell_ms=0, metadata_json={},
        ))
    db.commit()

    r = client.get(f"/stores/{STORE_ID}/anomalies")
    for anomaly in r.json()["anomalies"]:
        assert "type" in anomaly
        assert "severity" in anomaly
        assert "message" in anomaly
        assert "suggested_action" in anomaly
        assert anomaly["severity"] in VALID_SEVERITIES


def test_dead_zone_detected(client, db):
    """Zone SKINCARE has 5 historical visits but none in last 30 min."""
    old_ts = datetime.datetime.utcnow() - datetime.timedelta(hours=2)
    for i in range(5):
        db.add(Event(
            event_id=str(uuid.uuid4()), store_id=STORE_ID, camera_id="CAM1",
            visitor_id=f"VIS_dz{i}", event_type="ZONE_ENTER",
            timestamp=old_ts + datetime.timedelta(minutes=i),
            zone_id="SKINCARE", is_staff=False, confidence=0.9,
            dwell_ms=0, metadata_json={},
        ))
    db.commit()

    r = client.get(f"/stores/{STORE_ID}/anomalies")
    anomalies = r.json()["anomalies"]
    dead_zone_anomalies = [a for a in anomalies if a["type"] == "DEAD_ZONE"]
    assert len(dead_zone_anomalies) >= 1
    dz = dead_zone_anomalies[0]
    assert dz["zone_id"] == "SKINCARE"
    assert dz["severity"] == "INFO"
    assert len(dz["suggested_action"]) > 0


def test_severity_values_are_valid(client, db):
    old_ts = datetime.datetime.utcnow() - datetime.timedelta(hours=3)
    for i in range(5):
        db.add(Event(
            event_id=str(uuid.uuid4()), store_id=STORE_ID, camera_id="CAM1",
            visitor_id=f"VIS_{i}", event_type="ZONE_ENTER",
            timestamp=old_ts, zone_id=f"ZONE_{i}", is_staff=False,
            confidence=0.9, dwell_ms=0, metadata_json={},
        ))
    db.commit()

    r = client.get(f"/stores/{STORE_ID}/anomalies")
    for a in r.json()["anomalies"]:
        assert a["severity"] in VALID_SEVERITIES
