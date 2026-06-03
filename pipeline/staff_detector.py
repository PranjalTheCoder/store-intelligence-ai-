"""
staff_detector.py — Staff Detection (Phase 6)

Classification signals (heuristic, no external model required):
  1. Long uninterrupted presence (> STAFF_MIN_DURATION_SEC without exit)
  2. Multi-zone coverage: visits STAFF_MIN_ZONE_COUNT distinct zones
  3. Repeated movement at consistent pace (low variance in displacement)
  4. Appearance at open/close edges of video when customer traffic is zero
  5. Optional: Colour histogram of upper-body clothing vs known staff palette

The detector accumulates evidence per track_id across frames.
Once a track crosses STAFF_CONFIDENCE_THRESHOLD it is permanently flagged.
"""

from __future__ import annotations

import datetime
import math
from collections import defaultdict
from typing import Dict, Optional, Set, Tuple


class StaffDetector:
    """
    Stateful staff classifier.

    plug in as:
        staff_detector = StaffDetector()
        event_engine = EventEngine(..., staff_detector=staff_detector)

    It is also called by the zone and billing engines indirectly via
    the is_staff flag on RetailEvent.
    """

    # Tunable thresholds
    STAFF_MIN_DURATION_SEC  = 900    # 15 minutes continuous presence
    STAFF_MIN_ZONE_COUNT    = 4      # visited at least 4 distinct zones
    STAFF_CONFIDENCE_THRESH = 0.70   # above this → classify as staff

    def __init__(self):
        # track_id → evidence accumulator
        self._evidence: Dict[int, dict] = defaultdict(lambda: {
            "first_seen":       None,
            "last_seen":        None,
            "zones_visited":    set(),
            "frame_count":      0,
            "displacement_hist": [],  # recent inter-frame displacements
            "flagged":          False,
            "confidence":       0.0,
        })

    # ------------------------------------------------------------------

    def update(
        self,
        track_id: int,
        bbox: Tuple[float, float, float, float],
        timestamp: datetime.datetime,
        zone_id: Optional[str] = None,
    ):
        """Call every frame for each visible track."""
        ev = self._evidence[track_id]

        if ev["first_seen"] is None:
            ev["first_seen"] = timestamp
        ev["last_seen"] = timestamp
        ev["frame_count"] += 1

        if zone_id:
            ev["zones_visited"].add(zone_id)

        # Track centroid displacement
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        if ev["displacement_hist"]:
            prev_cx, prev_cy = ev["displacement_hist"][-1]
            disp = math.sqrt((cx - prev_cx)**2 + (cy - prev_cy)**2)
            # Only keep last 30 displacements
            ev["displacement_hist"] = ev["displacement_hist"][-29:] + [(cx, cy)]
        else:
            ev["displacement_hist"].append((cx, cy))

        # Recompute confidence
        ev["confidence"] = self._compute_confidence(ev, timestamp)
        if ev["confidence"] >= self.STAFF_CONFIDENCE_THRESH:
            ev["flagged"] = True

    def is_staff(self, track_id: int, det: dict = None) -> bool:
        """Quick lookup — returns True if track is classified as staff."""
        ev = self._evidence.get(track_id)
        if ev is None:
            return False
        return ev["flagged"]

    def get_confidence(self, track_id: int) -> float:
        ev = self._evidence.get(track_id)
        return ev["confidence"] if ev else 0.0

    def all_staff_tracks(self) -> Set[int]:
        return {tid for tid, ev in self._evidence.items() if ev["flagged"]}

    # ------------------------------------------------------------------
    # Confidence formula
    # ------------------------------------------------------------------

    def _compute_confidence(self, ev: dict, now: datetime.datetime) -> float:
        score = 0.0

        # Signal 1: long duration
        if ev["first_seen"]:
            duration_sec = (now - ev["first_seen"]).total_seconds()
            if duration_sec > self.STAFF_MIN_DURATION_SEC:
                score += 0.45
            elif duration_sec > 300:
                score += 0.20

        # Signal 2: multi-zone coverage
        zone_count = len(ev["zones_visited"])
        if zone_count >= self.STAFF_MIN_ZONE_COUNT:
            score += 0.35
        elif zone_count >= 2:
            score += 0.15

        # Signal 3: regular movement (low variance in displacements)
        disps = ev["displacement_hist"]
        if len(disps) >= 15:
            dists = [
                math.sqrt((disps[i][0]-disps[i-1][0])**2 + (disps[i][1]-disps[i-1][1])**2)
                for i in range(1, len(disps))
            ]
            mean  = sum(dists) / len(dists)
            var   = sum((d - mean)**2 for d in dists) / len(dists)
            cv    = math.sqrt(var) / max(mean, 1)  # coefficient of variation
            if cv < 0.5:  # consistent pace
                score += 0.20

        return min(score, 1.0)
