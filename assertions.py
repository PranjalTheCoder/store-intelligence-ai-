"""
assertions.py — 10 acceptance test assertions for the Intelligence API.

Run: python assertions.py [--base-url http://localhost:8000] [--store ST1076]

These mirror the official challenge assertions:
  1.  POST /events/ingest — valid batch → ingested=N
  2.  POST /events/ingest — same batch again → duplicates=N, ingested=0
  3.  POST /events/ingest — mixed batch (1 malformed) → partial success, no 500
  4.  GET  /stores/{id}/metrics — zero visitors → all zeros, no crash
  5.  GET  /stores/{id}/metrics — staff excluded from unique_visitors
  6.  GET  /stores/{id}/funnel  — funnel is monotonically decreasing
  7.  GET  /stores/{id}/funnel  — re-entry does not inflate entry count
  8.  GET  /stores/{id}/heatmap — data_confidence=LOW when <20 sessions
  9.  GET  /stores/{id}/anomalies — each anomaly has suggested_action
  10. GET  /health — STALE_FEED when last event >10 min ago
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
import datetime
import time

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

BASE_URL  = "http://localhost:8000"
STORE_ID  = "ST1076"
PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"

passed = 0
failed = 0
results = []


def check(name: str, ok: bool, detail: str = ""):
    global passed, failed
    status = PASS if ok else FAIL
    msg = f"  {status}  {name}"
    if detail and not ok:
        msg += f"\n         → {detail}"
    print(msg)
    results.append((name, ok, detail))
    if ok:
        passed += 1
    else:
        failed += 1


def make_event(visitor_id: str = None, event_type: str = "ENTRY",
               store_id: str = STORE_ID, zone_id: str = None,
               is_staff: bool = False) -> dict:
    return {
        "event_id":   str(uuid.uuid4()),
        "store_id":   store_id,
        "camera_id":  "CAM3",
        "visitor_id": visitor_id or f"VIS_{uuid.uuid4().hex[:6]}",
        "event_type": event_type,
        "timestamp":  datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "zone_id":    zone_id,
        "dwell_ms":   0,
        "is_staff":   is_staff,
        "confidence": 0.92,
        "metadata":   {"queue_depth": None, "sku_zone": None, "session_seq": 1},
    }


def post_ingest(events: list) -> dict:
    r = requests.post(f"{BASE_URL}/events/ingest",
                      json={"events": events}, timeout=10)
    return r.status_code, r.json() if r.status_code < 500 else {}


def get(path: str) -> tuple:
    r = requests.get(f"{BASE_URL}{path}", timeout=10)
    return r.status_code, r.json() if r.status_code < 500 else {}


# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"  Store Intelligence — Acceptance Assertions")
print(f"  Base URL: {BASE_URL}   Store: {STORE_ID}")
print(f"{'='*60}\n")

# ── 1. Valid batch ingested ───────────────────────────────────────────────────
batch_1 = [make_event(f"VIS_A{i}") for i in range(5)]
sc, body = post_ingest(batch_1)
check(
    "1. Valid batch: ingested=5, duplicates=0, failed=0",
    sc == 201 and body.get("ingested") == 5
    and body.get("duplicates") == 0 and body.get("failed") == 0,
    f"status={sc} body={body}",
)

# ── 2. Idempotent re-ingest ───────────────────────────────────────────────────
sc2, body2 = post_ingest(batch_1)
check(
    "2. Duplicate ingest: ingested=0, duplicates=5, failed=0",
    sc2 == 201 and body2.get("ingested") == 0
    and body2.get("duplicates") == 5 and body2.get("failed") == 0,
    f"status={sc2} body={body2}",
)

# ── 3. Partial success — one malformed event ──────────────────────────────────
good = make_event("VIS_partial_ok")
bad  = {"event_id": str(uuid.uuid4()), "store_id": STORE_ID,
        "camera_id": "", "visitor_id": "",  # empty required fields
        "event_type": "ENTRY",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
sc3, body3 = post_ingest([good, bad])
check(
    "3. Partial success: 1 good + 1 bad → ingested=1, failed=1, no 500",
    sc3 == 201
    and body3.get("ingested") == 1
    and body3.get("failed") == 1
    and len(body3.get("errors", [])) == 1,
    f"status={sc3} body={body3}",
)

# ── 4. Zero visitors → all zeros ──────────────────────────────────────────────
sc4, body4 = get(f"/stores/EMPTY_STORE_99999/metrics")
check(
    "4. Zero-traffic store: metrics return zeros, no crash",
    sc4 == 200
    and body4.get("unique_visitors") == 0
    and body4.get("conversion_rate") == 0.0
    and body4.get("current_queue_depth") == 0
    and body4.get("abandonment_rate") == 0.0,
    f"status={sc4} body={body4}",
)

# ── 5. Staff excluded ─────────────────────────────────────────────────────────
# Ingest 2 customers + 1 staff
staff_store = f"STORE_STAFF_{uuid.uuid4().hex[:6]}"
customers = [make_event(f"VIS_cust{i}", store_id=staff_store) for i in range(2)]
staff_ev  = make_event("VIS_staff", store_id=staff_store, is_staff=True)
post_ingest(customers + [staff_ev])
sc5, body5 = get(f"/stores/{staff_store}/metrics")
check(
    "5. Staff excluded: unique_visitors=2 (not 3)",
    sc5 == 200 and body5.get("unique_visitors") == 2,
    f"unique_visitors={body5.get('unique_visitors')} (expected 2) body={body5}",
)

# ── 6. Funnel monotonically decreasing ────────────────────────────────────────
sc6, body6 = get(f"/stores/{STORE_ID}/funnel")
funnel = body6
check(
    "6. Funnel monotonically decreasing (entry≥zone≥billing≥purchase)",
    sc6 == 200
    and funnel.get("entry", 0) >= funnel.get("zone_visit", 0)
    and funnel.get("zone_visit", 0) >= funnel.get("billing_queue", 0)
    and funnel.get("billing_queue", 0) >= funnel.get("purchase", 0),
    f"funnel={funnel}",
)

# ── 7. Re-entry does not inflate entry count ──────────────────────────────────
reentry_store = f"STORE_REENTRY_{uuid.uuid4().hex[:6]}"
vid = f"VIS_reentry_{uuid.uuid4().hex[:4]}"
entry_ev   = make_event(vid, "ENTRY",   store_id=reentry_store)
exit_ev    = make_event(vid, "EXIT",    store_id=reentry_store)
reentry_ev = make_event(vid, "REENTRY", store_id=reentry_store)
post_ingest([entry_ev, exit_ev, reentry_ev])
sc7, body7 = get(f"/stores/{reentry_store}/funnel")
check(
    "7. Re-entry: unique entry count=1, not 2",
    sc7 == 200 and body7.get("entry") == 1,
    f"entry={body7.get('entry')} (expected 1) body={body7}",
)

# ── 8. data_confidence=LOW when <20 sessions ──────────────────────────────────
sc8, body8 = get(f"/stores/{STORE_ID}/heatmap")
check(
    "8. Heatmap data_confidence=LOW when session count <20",
    sc8 == 200 and body8.get("data_confidence") in ("LOW", "HIGH"),
    f"data_confidence={body8.get('data_confidence')} body={body8}",
)
# If store has <20 sessions it must be LOW
session_count = body8.get("session_count", 0)
if session_count < 20:
    check(
        "8b. data_confidence=LOW confirmed (session_count<20)",
        body8.get("data_confidence") == "LOW",
        f"got {body8.get('data_confidence')} with {session_count} sessions",
    )

# ── 9. Each anomaly has suggested_action ──────────────────────────────────────
sc9, body9 = get(f"/stores/{STORE_ID}/anomalies")
anomalies = body9.get("anomalies", [])
all_have_action = all("suggested_action" in a and len(a["suggested_action"]) > 0
                      for a in anomalies)
valid_severities = all(a.get("severity") in ("INFO", "WARN", "CRITICAL")
                       for a in anomalies)
check(
    "9. All anomalies have suggested_action and valid severity",
    sc9 == 200 and all_have_action and valid_severities,
    f"anomalies={anomalies}",
)

# ── 10. STALE_FEED detection ──────────────────────────────────────────────────
# Ingest an event with a timestamp >10 min in the past for a fresh store
stale_store = f"STORE_STALE_{uuid.uuid4().hex[:6]}"
old_ts = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ")
stale_ev = {
    "event_id":   str(uuid.uuid4()),
    "store_id":   stale_store,
    "camera_id":  "CAM3",
    "visitor_id": "VIS_stale",
    "event_type": "ENTRY",
    "timestamp":  old_ts,
    "zone_id":    None,
    "dwell_ms":   0,
    "is_staff":   False,
    "confidence": 0.9,
    "metadata":   {"queue_depth": None, "sku_zone": None, "session_seq": 1},
}
post_ingest([stale_ev])
sc10, body10 = get("/health")
stores = {s["store_id"]: s for s in body10.get("stores", [])}
store_health = stores.get(stale_store, {})
check(
    "10. STALE_FEED: store with event >10 min ago → feed_status=STALE_FEED",
    sc10 == 200 and store_health.get("feed_status") == "STALE_FEED",
    f"store_health={store_health}",
)

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"  Results: {passed} passed / {failed} failed / {passed + failed} total")
if failed == 0:
    print(f"  \033[92m✓ ALL ASSERTIONS PASSED\033[0m")
else:
    print(f"  \033[91m{failed} ASSERTION(S) FAILED\033[0m")
print(f"{'='*60}\n")
sys.exit(0 if failed == 0 else 1)
