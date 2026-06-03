"""
billing_engine.py — Billing Intelligence (Phase 3)

Tracks people in the billing zone.
Emits:
  • BILLING_QUEUE_JOIN   — when visitor enters billing zone and queue_depth > 0
  • BILLING_QUEUE_ABANDON — when visitor leaves without a POS transaction following

POS correlation (marking converted) is done separately in correlate_pos.py.
"""

from __future__ import annotations

import uuid
import datetime
from typing import Dict, List, Optional, Tuple

from pipeline.event_engine import RetailEvent


class BillingEngine:
    """
    Maintains a live queue of visitors at the billing counter.

    Caller must pass detections whose bounding-box centroid falls inside
    the billing zone polygon (or the full billing camera frame if no polygon
    is defined — reasonable since the billing camera is dedicated).
    """

    # If visitor leaves billing zone and no POS transaction matches
    # within this window, emit BILLING_QUEUE_ABANDON
    ABANDON_TIMEOUT_SEC = 300   # 5 minutes

    # Minimum frames (at 15fps) a visitor must be in billing zone
    # to count as "joined the queue" (avoid false positives)
    MIN_FRAMES_FOR_JOIN = 8

    def __init__(
        self,
        store_id:  str,
        camera_id: str,
        billing_zone_id: str = "Z_CASH_COUNTER",
    ):
        self.store_id        = store_id
        self.camera_id       = camera_id
        self.billing_zone_id = billing_zone_id

        # visitor_id → {joined_ts, frame_count, served}
        self._in_queue:     Dict[str, dict] = {}
        self._queue_joined: Dict[str, datetime.datetime] = {}   # for abandon check
        self._served:       set = set()   # visitor_ids confirmed as converted

        # queue position tracker (ordinal)
        self._join_order: List[str] = []

    # ------------------------------------------------------------------

    def process_detection(
        self,
        visitor_id: str,
        bbox: Tuple[float, float, float, float],
        timestamp: datetime.datetime,
        is_staff: bool,
        confidence: float,
        store_id: str,
        camera_id: str,
    ) -> List[RetailEvent]:
        """Call once per frame per visible visitor."""
        events: List[RetailEvent] = []

        if is_staff:
            return events

        if visitor_id not in self._in_queue:
            # New visitor entering billing zone
            self._in_queue[visitor_id] = {
                "joined_ts":   timestamp,
                "frame_count": 1,
                "announced":   False,
            }
        else:
            self._in_queue[visitor_id]["frame_count"] += 1
            state = self._in_queue[visitor_id]

            # Emit BILLING_QUEUE_JOIN once, after MIN_FRAMES_FOR_JOIN frames
            if (not state["announced"]
                    and state["frame_count"] >= self.MIN_FRAMES_FOR_JOIN):
                state["announced"] = True
                self._queue_joined[visitor_id] = timestamp
                if visitor_id not in self._join_order:
                    self._join_order.append(visitor_id)

                queue_depth = self._current_queue_depth()

                events.append(RetailEvent(
                    event_id   = str(uuid.uuid4()),
                    store_id   = store_id,
                    camera_id  = camera_id,
                    visitor_id = visitor_id,
                    event_type = "BILLING_QUEUE_JOIN",
                    timestamp  = timestamp,
                    zone_id    = self.billing_zone_id,
                    dwell_ms   = 0,
                    is_staff   = False,
                    confidence = confidence,
                    metadata   = {
                        "queue_depth":    queue_depth,
                        "queue_position": len(self._join_order),
                        "sku_zone":       "BILLING",
                        "session_seq":    None,
                    },
                ))

        return events

    def visitor_left_billing(
        self,
        visitor_id: str,
        timestamp: datetime.datetime,
        confidence: float = 0.85,
    ) -> Optional[RetailEvent]:
        """
        Call when a visitor is no longer detected in the billing zone.
        Returns BILLING_QUEUE_ABANDON if they were in queue but not served.
        """
        if visitor_id not in self._in_queue:
            return None

        state = self._in_queue.pop(visitor_id, {})

        # Remove from join order
        if visitor_id in self._join_order:
            self._join_order.remove(visitor_id)

        # If they joined the queue but weren't served → ABANDON
        if state.get("announced") and visitor_id not in self._served:
            joined_ts = self._queue_joined.pop(visitor_id, state.get("joined_ts"))
            dwell_ms  = int((timestamp - joined_ts).total_seconds() * 1000) if joined_ts else 0

            return RetailEvent(
                event_id   = str(uuid.uuid4()),
                store_id   = self.store_id,
                camera_id  = self.camera_id,
                visitor_id = visitor_id,
                event_type = "BILLING_QUEUE_ABANDON",
                timestamp  = timestamp,
                zone_id    = self.billing_zone_id,
                dwell_ms   = dwell_ms,
                is_staff   = False,
                confidence = confidence,
                metadata   = {
                    "queue_depth":  self._current_queue_depth(),
                    "sku_zone":     "BILLING",
                    "session_seq":  None,
                },
            )
        return None

    def mark_served(self, visitor_id: str):
        """Call after POS correlation confirms this visitor transacted."""
        self._served.add(visitor_id)

    def get_queue_depth(self) -> int:
        return self._current_queue_depth()

    def get_queue_state(self) -> List[dict]:
        """Snapshot for /live endpoint."""
        return [
            {
                "visitor_id":  vid,
                "joined_ts":   self._queue_joined.get(vid, ""),
                "wait_sec":    (
                    datetime.datetime.utcnow() - self._queue_joined[vid]
                ).total_seconds() if vid in self._queue_joined else 0,
                "position":    i + 1,
            }
            for i, vid in enumerate(self._join_order)
        ]

    # ------------------------------------------------------------------

    def _current_queue_depth(self) -> int:
        return sum(
            1 for v, s in self._in_queue.items()
            if s.get("announced", False) and v not in self._served
        )
