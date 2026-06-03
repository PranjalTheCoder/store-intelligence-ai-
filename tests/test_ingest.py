"""
tests/test_ingest.py

Tests for POST /events/ingest

Assertions tested:
  ✓ Valid batch ingested successfully
  ✓ Returns {ingested, duplicates, failed, errors}
  ✓ Duplicate event_id is idempotent (counted in duplicates, not failed)
  ✓ Second POST of same event_id does NOT increment ingested
  ✓ Malformed event raises per-event error, others still ingest
  ✓ Batch > 500 rejected with 422
  ✓ Empty batch rejected
  ✓ Staff events stored with is_staff=True
  ✓ Unknown event_type fails validation
  ✓ Missing required fields fail validation with structured error
"""

from __future__ import annotations
import uuid
from tests.conftest import make_event, STORE_ID


def test_valid_batch_ingested(client):
    batch = {"events": [make_event() for _ in range(5)]}
    r = client.post("/events/ingest", json=batch)
    assert r.status_code == 201
    body = r.json()
    assert body["ingested"] == 5
    assert body["duplicates"] == 0
    assert body["failed"] == 0
    assert body["errors"] == []


def test_response_shape(client):
    batch = {"events": [make_event()]}
    r = client.post("/events/ingest", json=batch)
    body = r.json()
    for key in ("ingested", "duplicates", "failed", "errors"):
        assert key in body, f"Missing key: {key}"


def test_duplicate_event_id_is_idempotent(client):
    ev = make_event()
    batch = {"events": [ev]}

    r1 = client.post("/events/ingest", json=batch)
    assert r1.json()["ingested"] == 1

    r2 = client.post("/events/ingest", json=batch)
    body = r2.json()
    assert body["ingested"] == 0
    assert body["duplicates"] == 1
    assert body["failed"] == 0


def test_duplicate_within_same_batch(client):
    ev = make_event()
    batch = {"events": [ev, ev]}   # same event twice
    r = client.post("/events/ingest", json=batch)
    body = r.json()
    # First copy ingested, second is duplicate
    assert body["ingested"] == 1
    assert body["duplicates"] == 1


def test_partial_success_bad_event_among_good(client):
    good1 = make_event(visitor_id="VIS_good1")
    bad   = {"event_id": str(uuid.uuid4()), "store_id": "S1",
             "camera_id": "", "visitor_id": "",  # empty required fields
             "event_type": "ENTRY", "timestamp": "2026-01-01T10:00:00Z"}
    good2 = make_event(visitor_id="VIS_good2")

    r = client.post("/events/ingest", json={"events": [good1, bad, good2]})
    body = r.json()
    assert body["ingested"] == 2
    assert body["failed"] == 1
    assert len(body["errors"]) == 1
    assert body["errors"][0]["index"] == 1


def test_unknown_event_type_fails(client):
    ev = make_event()
    ev["event_type"] = "TELEPORT"
    r = client.post("/events/ingest", json={"events": [ev]})
    body = r.json()
    assert body["failed"] == 1
    assert body["ingested"] == 0
    assert "TELEPORT" in body["errors"][0]["reason"] or "event_type" in body["errors"][0]["reason"]


def test_batch_over_500_rejected(client):
    batch = {"events": [make_event() for _ in range(501)]}
    r = client.post("/events/ingest", json=batch)
    assert r.status_code == 422


def test_empty_batch_rejected(client):
    r = client.post("/events/ingest", json={"events": []})
    assert r.status_code == 422


def test_staff_events_stored_with_flag(client):
    ev = make_event(is_staff=True)
    r = client.post("/events/ingest", json={"events": [ev]})
    assert r.json()["ingested"] == 1

    # Verify it was stored
    events_r = client.get(f"/events?store_id={STORE_ID}&exclude_staff=false")
    assert any(e["is_staff"] for e in events_r.json()["events"])


def test_zone_event_without_zone_id_fails(client):
    ev = make_event(event_type="ZONE_ENTER")   # zone_id=None
    ev["zone_id"] = None
    r = client.post("/events/ingest", json={"events": [ev]})
    body = r.json()
    assert body["failed"] == 1


def test_zone_event_with_zone_id_succeeds(client):
    ev = make_event(event_type="ZONE_ENTER", zone_id="SKINCARE")
    r = client.post("/events/ingest", json={"events": [ev]})
    assert r.json()["ingested"] == 1


def test_reentry_event_ingested(client):
    ev = make_event(event_type="REENTRY")
    r = client.post("/events/ingest", json={"events": [ev]})
    assert r.json()["ingested"] == 1


def test_confidence_out_of_range_fails(client):
    ev = make_event()
    ev["confidence"] = 1.5   # > 1.0
    r = client.post("/events/ingest", json={"events": [ev]})
    assert r.json()["failed"] == 1
