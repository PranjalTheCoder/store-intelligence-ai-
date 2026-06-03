"""
reentry_engine.py — Re-entry Detection (Phase 5)

When a visitor_id that previously had an EXIT event reappears at the
entry camera, emit a REENTRY event instead of a second ENTRY event.

Re-ID is based on:
  1. Exact visitor_id match (ByteTrack cross-clip persistence)
  2. Appearance embedding similarity (if a re-id model is plugged in)
  3. Time-gap heuristic: same person is likely if gap < REENTRY_WINDOW_SEC

The visitor_id is REUSED — no new ID is assigned.
The session reentry_count on the Session record is incremented.
"""

from __future__ import annotations

import uuid
import datetime
from typing import Dict, Optional, List

from pipeline.event_engine import RetailEvent


class ReentryEngine:
    """
    Tracks exit timestamps per visitor.
    On re-detection at entry, decides: new visitor or re-entry?
    """

    REENTRY_WINDOW_SEC = 3600   # 1 hour — configurable

    def __init__(self, reentry_window_sec: int = 3600):
        self.reentry_window_sec = reentry_window_sec

        # visitor_id → last EXIT timestamp
        self._exit_log: Dict[str, datetime.datetime] = {}

        # visitor_id → store_id (to scope re-entry to same store)
        self._exit_store: Dict[str, str] = {}

    def record_exit(self, visitor_id: str, store_id: str, timestamp: datetime.datetime):
        """Call whenever an EXIT event is emitted."""
        self._exit_log[visitor_id]   = timestamp
        self._exit_store[visitor_id] = store_id

    def check_reentry(
        self,
        visitor_id: str,
        timestamp:  datetime.datetime,
        store_id:   str,
        camera_id:  str,
    ) -> Optional[RetailEvent]:
        """
        Call at ENTRY detection time.
        Returns a REENTRY event if this visitor previously exited within
        the reentry window; otherwise returns None.
        """
        last_exit = self._exit_log.get(visitor_id)
        if not last_exit:
            return None

        last_store = self._exit_store.get(visitor_id)
        if last_store != store_id:
            return None   # different store — probably a new session

        gap_sec = (timestamp - last_exit).total_seconds()
        if gap_sec > self.reentry_window_sec:
            return None   # too long ago — treat as new visit

        # Re-entry confirmed
        # Remove exit record so we don't double-emit
        self._exit_log.pop(visitor_id, None)

        return RetailEvent(
            event_id   = str(uuid.uuid4()),
            store_id   = store_id,
            camera_id  = camera_id,
            visitor_id = visitor_id,         # SAME visitor_id reused
            event_type = "REENTRY",
            timestamp  = timestamp,
            zone_id    = None,
            dwell_ms   = 0,
            is_staff   = False,
            confidence = 0.85,
            metadata   = {
                "gap_since_exit_sec": round(gap_sec, 1),
                "prev_exit_ts": last_exit.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "queue_depth":  None,
                "sku_zone":     None,
                "session_seq":  None,
            },
        )

    def all_exits(self) -> List[dict]:
        """Snapshot of known exits (for debugging / dashboard)."""
        return [
            {"visitor_id": vid, "exit_ts": ts.isoformat(), "store_id": self._exit_store.get(vid)}
            for vid, ts in self._exit_log.items()
        ]
