"""
event_engine.py — upgraded to emit the full challenge event schema.

Responsibilities:
  • Convert raw tracker detections into structured Event objects
  • Assign UUIDs, store_id, camera_id
  • Track per-session sequence numbers
  • Delegate to ZoneEngine for zone events
  • Delegate to BillingEngine for queue events
  • Delegate to ReentryEngine for REENTRY detection
  • Delegate to StaffDetector for is_staff classification
"""

from __future__ import annotations

import uuid
import datetime
from typing import Optional, Dict, List
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Data container — matches challenge schema exactly
# ---------------------------------------------------------------------------

@dataclass
class RetailEvent:
    event_id:   str
    store_id:   str
    camera_id:  str
    visitor_id: str
    event_type: str                    # ENTRY | EXIT | ZONE_ENTER | ...
    timestamp:  datetime.datetime
    zone_id:    Optional[str] = None
    dwell_ms:   int = 0
    is_staff:   bool = False
    confidence: float = 1.0
    metadata:   Dict = field(default_factory=dict)

    # demographics
    gender_pred: Optional[str] = None
    age_pred:    Optional[int] = None
    age_bucket:  Optional[str] = None
    group_id:    Optional[str] = None
    group_size:  Optional[int] = None

    def to_dict(self):
        # Force strict compliance with the required challenge schema keys
        meta = {
            "queue_depth": self.metadata.get("queue_depth"),
            "sku_zone": self.metadata.get("sku_zone"),
            "session_seq": self.metadata.get("session_seq")
        }
        
        return {
            "event_id":   self.event_id,
            "store_id":   self.store_id,
            "camera_id":  self.camera_id,
            "visitor_id": self.visitor_id,
            "event_type": self.event_type,
            "timestamp":  self.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "zone_id":    self.zone_id,
            "dwell_ms":   self.dwell_ms,
            "is_staff":   self.is_staff,
            "confidence": round(self.confidence, 4),
            "metadata":   meta,
        }


# ---------------------------------------------------------------------------
# Session sequence tracker
# ---------------------------------------------------------------------------

class SessionSeqTracker:
    """Maintains ordinal position of events within each visitor session."""

    def __init__(self):
        self._seq: Dict[str, int] = {}

    def next(self, visitor_id: str) -> int:
        n = self._seq.get(visitor_id, 0) + 1
        self._seq[visitor_id] = n
        return n

    def reset(self, visitor_id: str):
        self._seq.pop(visitor_id, None)


# ---------------------------------------------------------------------------
# Main Event Engine
# ---------------------------------------------------------------------------

class EventEngine:
    """
    Converts tracker frames into RetailEvent objects.

    Usage
    -----
    engine = EventEngine(store_id="STORE_1", camera_id="CAM_ENTRY_01")
    events = engine.process_frame(frame_detections, frame_timestamp)
    """

    # crossing direction threshold — fraction of frame height
    ENTRY_LINE_Y_FRAC = 0.55   # tune per camera
    EXIT_LINE_Y_FRAC  = 0.45

    def __init__(
        self,
        store_id:  str,
        camera_id: str,
        camera_role: str = "entry",   # "entry" | "zone" | "billing"
        fps: float = 15.0,
        staff_detector=None,
        zone_engine=None,
        billing_engine=None,
        reentry_engine=None,
    ):
        self.store_id       = store_id
        self.camera_id      = camera_id
        self.camera_role    = camera_role
        self.fps            = fps
        self.staff_detector = staff_detector
        self.zone_engine    = zone_engine
        self.billing_engine = billing_engine
        self.reentry_engine = reentry_engine

        self._seq_tracker   = SessionSeqTracker()
        self._active_tracks: Dict[int, dict] = {}   # track_id → last known state
        self._frame_index   = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process_frame(
        self,
        detections: List[dict],
        frame_ts: datetime.datetime,
        clip_start_ts: datetime.datetime | None = None,
    ) -> List[RetailEvent]:
        """
        Process one frame of detections.

        Parameters
        ----------
        detections : list of dicts with keys
            track_id, bbox (x1,y1,x2,y2 in pixels), frame_h, frame_w, confidence
        frame_ts   : UTC datetime for this frame
        clip_start_ts : fallback if frame_ts not computed externally

        Returns
        -------
        List of RetailEvent objects emitted this frame.
        """
        events: List[RetailEvent] = []
        self._frame_index += 1
        seen_ids = set()

        for det in detections:
            track_id   = det["track_id"]
            bbox       = det["bbox"]          # (x1, y1, x2, y2)
            confidence = det.get("confidence", 1.0)
            frame_h    = det.get("frame_h", 1080)

            # print(
            #     track_id,
            #     bbox,
            #     ((bbox[1] + bbox[3]) / 2) / frame_h
            # )

            seen_ids.add(track_id)
            visitor_id = self._get_or_create_visitor_id(track_id)
            is_staff   = self._classify_staff(track_id, det)

            # ---- Entry / Exit (entry camera only) -------------------------
            if self.camera_role == "entry":
                entry_ev = self._check_entry_exit(
                    track_id, visitor_id, bbox, frame_h,
                    frame_ts, is_staff, confidence
                )
                if entry_ev:
                    events.append(entry_ev)

            # ---- Zone events (zone camera) --------------------------------
            if self.camera_role == "zone" and self.zone_engine:
                zone_evs = self.zone_engine.process_detection(
                    visitor_id=visitor_id,
                    bbox=bbox,
                    timestamp=frame_ts,
                    is_staff=is_staff,
                    confidence=confidence,
                    store_id=self.store_id,
                    camera_id=self.camera_id,
                )
                events.extend(zone_evs)

            # ---- Billing events (billing camera) --------------------------
            if self.camera_role == "billing" and self.billing_engine:
                bill_evs = self.billing_engine.process_detection(
                    visitor_id=visitor_id,
                    bbox=bbox,
                    timestamp=frame_ts,
                    is_staff=is_staff,
                    confidence=confidence,
                    store_id=self.store_id,
                    camera_id=self.camera_id,
                )
                events.extend(bill_evs)

            # Update track state
            self._active_tracks[track_id] = {
                "visitor_id": visitor_id,
                "bbox": bbox,
                "last_seen": frame_ts,
                "is_staff": is_staff,
            }

        # Detect disappeared tracks → EXIT
        departed = set(self._active_tracks.keys()) - seen_ids
        for tid in departed:
            state = self._active_tracks.pop(tid)
            if self.camera_role == "entry" and not state.get("is_staff", False):
                exit_ev = self._make_event(
                    visitor_id=state["visitor_id"],
                    event_type="EXIT",
                    timestamp=frame_ts,
                    is_staff=state.get("is_staff", False),
                    confidence=0.75,   # lower confidence for inferred exit
                )
                events.append(exit_ev)

        # Stamp session_seq on all events
        for ev in events:
            seq = self._seq_tracker.next(ev.visitor_id)
            ev.metadata.setdefault("session_seq", seq)

        return events

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_or_create_visitor_id(self, track_id: int) -> str:
        if track_id in self._active_tracks:
            return self._active_tracks[track_id]["visitor_id"]
        # New track → generate stable ID
        short = uuid.uuid4().hex[:6]
        return f"VIS_{short}"

    def _classify_staff(self, track_id: int, det: dict) -> bool:
        if self.staff_detector:
            return self.staff_detector.is_staff(track_id, det)
        return False

    def _check_entry_exit(
        self, track_id, visitor_id, bbox,
        frame_h, ts, is_staff, confidence
    ) -> Optional[RetailEvent]:
        """
        Robust line-crossing with midline threshold and persistent tracking state.
        Safe against frame-skipping and arbitrary walking speeds.
        """
        # Dynamically initialize cross state history on the engine instance if absent
        if not hasattr(self, "_line_crossings"):
            self._line_crossings = {}

        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        cy_frac = cy / max(frame_h, 1)

        prev = self._active_tracks.get(track_id)
        
        def _handle_inbound():
            ev = self._make_event(visitor_id, "ENTRY", ts, is_staff, confidence)
            if self.reentry_engine:
                reentry_ev = self.reentry_engine.check_reentry(
                    visitor_id=visitor_id,
                    timestamp=ts,
                    store_id=self.store_id,
                    camera_id=self.camera_id,
                )
                if reentry_ev:
                    return reentry_ev
            return ev

        # Robust single threshold midline
        MIDLINE = 0.50

        # Heuristic for new tracks appearing deep inside the camera view
        if prev is None:
            if cy_frac > 0.65 and track_id not in self._line_crossings:
                self._line_crossings[track_id] = "ENTRY"
                return _handle_inbound()
            return None

        prev_cy = (prev["bbox"][1] + prev["bbox"][3]) / 2
        prev_cy_frac = prev_cy / max(frame_h, 1)

        # Inbound crossing: crossed from top (<0.5) to bottom (>=0.5)
        if prev_cy_frac < MIDLINE and cy_frac >= MIDLINE:
            if self._line_crossings.get(track_id) != "ENTRY":
                self._line_crossings[track_id] = "ENTRY"
                return _handle_inbound()

        # Outbound crossing: crossed from bottom (>0.5) to top (<=0.5)
        if prev_cy_frac > MIDLINE and cy_frac <= MIDLINE:
            if self._line_crossings.get(track_id) != "EXIT":
                self._line_crossings[track_id] = "EXIT"
                return self._make_event(visitor_id, "EXIT", ts, is_staff, confidence)

        return None

    def _make_event(
        self,
        visitor_id: str,
        event_type: str,
        timestamp: datetime.datetime,
        is_staff: bool = False,
        confidence: float = 1.0,
        zone_id: Optional[str] = None,
        dwell_ms: int = 0,
        metadata: Optional[dict] = None,
    ) -> RetailEvent:
        return RetailEvent(
            event_id   = str(uuid.uuid4()),
            store_id   = self.store_id,
            camera_id  = self.camera_id,
            visitor_id = visitor_id,
            event_type = event_type,
            timestamp  = timestamp,
            zone_id    = zone_id,
            dwell_ms   = dwell_ms,
            is_staff   = is_staff,
            confidence = confidence,
            metadata   = metadata or {},
        )
