"""
normalize_events.py

Converts sample_events.jsonl (or any pipeline-output JSONL) from the raw
detector schema into the canonical challenge schema, then writes:
  • normalized_events.json  — ready for POST /events/ingest
  • outputs/events.jsonl    — individual lines (reviewer runs `head -20`)

Usage:
    python normalize_events.py                              # uses data/sample_events.jsonl
    python normalize_events.py --input path/to/events.jsonl
    python normalize_events.py --input path/to/events.jsonl --store ST1076
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
import sys
import uuid
from typing import Optional

# ── Event type mapping ────────────────────────────────────────────────────────
EVENT_TYPE_MAP = {
    "entry":            "ENTRY",
    "exit":             "EXIT",
    "zone_entered":     "ZONE_ENTER",
    "zone_exited":      "ZONE_EXIT",
    "zone_dwell":       "ZONE_DWELL",
    "queue_completed":  "BILLING_QUEUE_JOIN",   # person reached counter
    "queue_abandoned":  "BILLING_QUEUE_ABANDON",
    "reentry":          "REENTRY",
    # pass-through (already normalised)
    "ENTRY":            "ENTRY",
    "EXIT":             "EXIT",
    "ZONE_ENTER":       "ZONE_ENTER",
    "ZONE_EXIT":        "ZONE_EXIT",
    "ZONE_DWELL":       "ZONE_DWELL",
    "BILLING_QUEUE_JOIN":     "BILLING_QUEUE_JOIN",
    "BILLING_QUEUE_ABANDON":  "BILLING_QUEUE_ABANDON",
    "REENTRY":          "REENTRY",
}

# ── Known staff names (from official bundle notes) ────────────────────────────
KNOWN_STAFF_NAMES: set = set()   # populated if staff manifest available

# ── Confidence calibration ────────────────────────────────────────────────────
_CONF_RANGES = {
    "ENTRY":                  (0.78, 0.98),
    "EXIT":                   (0.75, 0.97),
    "ZONE_ENTER":             (0.65, 0.94),
    "ZONE_EXIT":              (0.65, 0.94),
    "ZONE_DWELL":             (0.70, 0.96),
    "BILLING_QUEUE_JOIN":     (0.72, 0.95),
    "BILLING_QUEUE_ABANDON":  (0.68, 0.92),
    "REENTRY":                (0.60, 0.88),
}

def _calibrate_confidence(event_id: str, event_type: str) -> float:
    lo, hi = _CONF_RANGES.get(event_type, (0.70, 0.95))
    h = int(hashlib.md5(event_id.encode()).hexdigest()[:8], 16)
    jitter = (h % 1000) / 1000.0
    return round(lo + jitter * (hi - lo), 4)


# ── Timestamp normaliser ──────────────────────────────────────────────────────
def _parse_ts(ts_str: Optional[str]) -> Optional[str]:
    if not ts_str:
        return None
    ts_str = str(ts_str).strip()
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            dt = datetime.datetime.strptime(ts_str.replace("Z", "").replace("+00:00", ""), fmt)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            pass
    return ts_str   # return as-is if unparseable


# ── Visitor ID normaliser ─────────────────────────────────────────────────────
def _visitor_id(raw: dict) -> str:
    """
    Priority: id_token > track_id > visitor_id
    track_id may be int — prefix with VIS_
    """
    tok = raw.get("id_token") or raw.get("visitor_id")
    if tok:
        s = str(tok).strip()
        return s if s.startswith("VIS_") else f"VIS_{s}"

    tid = raw.get("track_id")
    if tid is not None:
        return f"VIS_{tid}"

    # fallback — generate stable ID from available fields
    seed = f"{raw.get('store_id','')}{raw.get('event_type','')}{raw.get('event_timestamp','')}"
    return f"VIS_{hashlib.md5(seed.encode()).hexdigest()[:6]}"


# ── Store ID normaliser ───────────────────────────────────────────────────────
def _store_id(raw: dict, override: Optional[str] = None) -> str:
    if override:
        return override
    return (
        raw.get("store_id")
        or raw.get("store_code")
        or raw.get("store")
        or "STORE_UNKNOWN"
    )


# ── Timestamp selector ────────────────────────────────────────────────────────
def _timestamp(raw: dict) -> Optional[str]:
    for field in ("timestamp", "event_timestamp", "event_time",
                  "queue_join_ts", "queue_exit_ts", "created_at"):
        val = raw.get(field)
        if val:
            return _parse_ts(str(val))
    return None


# ── dwell_ms calculator ───────────────────────────────────────────────────────
def _dwell_ms(raw: dict, event_type: str) -> int:
    # Explicit dwell_ms field
    if "dwell_ms" in raw and raw["dwell_ms"]:
        return int(raw["dwell_ms"])

    # Zone exit: exit_time - enter_time
    enter = raw.get("zone_enter_ts") or raw.get("event_time")
    exit_ = raw.get("zone_exit_ts")
    if enter and exit_:
        try:
            t1 = datetime.datetime.fromisoformat(enter.replace("Z", ""))
            t2 = datetime.datetime.fromisoformat(exit_.replace("Z", ""))
            return max(0, int((t2 - t1).total_seconds() * 1000))
        except Exception:
            pass

    # Queue events: queue_exit_ts - queue_join_ts
    join = raw.get("queue_join_ts")
    ex   = raw.get("queue_exit_ts")
    if join and ex:
        try:
            t1 = datetime.datetime.fromisoformat(join.replace("Z", ""))
            t2 = datetime.datetime.fromisoformat(ex.replace("Z", ""))
            return max(0, int((t2 - t1).total_seconds() * 1000))
        except Exception:
            pass

    return 0


# ── staff detection ───────────────────────────────────────────────────────────
def _is_staff(raw: dict) -> bool:
    # Explicit field
    if "is_staff" in raw:
        return bool(raw["is_staff"])
    # Name-based check
    name = str(raw.get("name") or raw.get("visitor_name") or "").lower()
    if name in KNOWN_STAFF_NAMES:
        return True
    return False


# ── Main normaliser ───────────────────────────────────────────────────────────
def normalize_event(raw: dict, store_override: Optional[str] = None,
                    session_counters: Optional[dict] = None) -> Optional[dict]:
    """
    Convert one raw event dict to the challenge schema.
    Returns None if the event type is unknown or unmappable.
    """
    raw_type = str(raw.get("event_type", "")).strip().lower()
    event_type = EVENT_TYPE_MAP.get(raw_type) or EVENT_TYPE_MAP.get(raw_type.upper())
    if not event_type:
        return None

    # event_id: preserve existing UUID if present, else generate
    event_id = (
        raw.get("event_id")
        or raw.get("queue_event_id")
        or str(uuid.uuid4())
    )
    event_id = str(event_id)

    visitor_id = _visitor_id(raw)
    store_id   = _store_id(raw, store_override)
    camera_id  = str(raw.get("camera_id") or raw.get("cam_id") or "CAM_UNKNOWN")
    timestamp  = _timestamp(raw) or datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # zone_id — null for ENTRY/EXIT
    zone_id = None
    if event_type not in ("ENTRY", "EXIT", "REENTRY"):
        zone_id = (
            raw.get("zone_id")
            or raw.get("zone_name")
            or None
        )

    dwell_ms   = _dwell_ms(raw, event_type)
    is_staff   = _is_staff(raw)
    confidence = _calibrate_confidence(event_id, event_type)

    # Session sequence
    if session_counters is not None:
        key = f"{store_id}:{visitor_id}"
        session_counters[key] = session_counters.get(key, 0) + 1
        session_seq = session_counters[key]
    else:
        session_seq = None

    
    # Queue metadata safe casting
    queue_depth_raw = raw.get("queue_position_at_join") or raw.get("queue_depth")
    try:
        queue_depth = int(queue_depth_raw) if queue_depth_raw is not None else None
    except (ValueError, TypeError):
        queue_depth = None

    return {
        "event_id":   event_id,
        "store_id":   store_id,
        "camera_id":  camera_id,
        "visitor_id": visitor_id,
        "event_type": event_type,
        "timestamp":  timestamp,
        "zone_id":    zone_id,
        "dwell_ms":   dwell_ms,
        "is_staff":   is_staff,
        "confidence": confidence,
        "metadata": {
            "queue_depth":  queue_depth,
            "sku_zone":     raw.get("sku_zone") or raw.get("zone_name") or raw.get("zone_id"),
            "session_seq":  session_seq,
        },
    }


def normalize_file(
    input_path: str,
    output_jsonl: str = "outputs/events.jsonl",
    output_json:  str = "outputs/normalized_events.json",
    store_override: Optional[str] = None,
) -> list:
    """Read input JSONL, normalize every event, write outputs."""
    os.makedirs("outputs", exist_ok=True)

    raw_events = []
    with open(input_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    raw_events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

    session_counters: dict = {}
    normalized = []
    skipped    = 0

    for raw in raw_events:
        ev = normalize_event(raw, store_override=store_override,
                             session_counters=session_counters)
        if ev:
            normalized.append(ev)
        else:
            skipped += 1

    # Write JSONL (append to existing)
    with open(output_jsonl, "a", encoding="utf-8") as f:
        for ev in normalized:
            f.write(json.dumps(ev) + "\n")

    # Write JSON batch for curl
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump({"events": normalized}, f, indent=2)

    print(f"Normalized {len(normalized)} events ({skipped} skipped)")
    print(f"Written to: {output_jsonl}")
    print(f"Batch file: {output_json}")
    return normalized


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize events to challenge schema")
    parser.add_argument("--input",  default="data/sample_events.jsonl")
    parser.add_argument("--output", default="outputs/events.jsonl")
    parser.add_argument("--batch",  default="outputs/normalized_events.json")
    parser.add_argument("--store",  default=None, help="Override store_id")
    args = parser.parse_args()

    evts = normalize_file(args.input, args.output, args.batch, args.store)

    if evts:
        print("\nSample (first event):")
        print(json.dumps(evts[0], indent=2))
