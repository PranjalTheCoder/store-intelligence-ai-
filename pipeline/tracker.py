"""
ByteTrack visitor tracking.

Converts YOLO detections into persistent visitor IDs.
"""

import logging
from dataclasses import dataclass
from types import SimpleNamespace
from typing import List

import numpy as np

from ultralytics.trackers.byte_tracker import BYTETracker


logger = logging.getLogger(__name__)


@dataclass
class TrackedObject:
    track_id: int

    bbox_xyxy: tuple
    confidence: float

    @property
    def centroid(self):
        x1, y1, x2, y2 = self.bbox_xyxy
        return (
            int((x1 + x2) / 2),
            int((y1 + y2) / 2)
        )


class ByteTrackInput:
    """
    Adapter object because Ultralytics ByteTrack expects:
    results.conf
    results.xywh
    results.cls
    """

    def __init__(self, detections):

        xywh = []
        conf = []
        cls = []

        for det in detections:

            x1, y1, x2, y2 = det.bbox_xyxy

            w = x2 - x1
            h = y2 - y1

            xywh.append(
                [
                    x1 + w / 2,
                    y1 + h / 2,
                    w,
                    h
                ]
            )

            conf.append(det.confidence)

            # person class
            cls.append(0)


        self.xywh = np.array(
            xywh,
            dtype=np.float32
        )

        self.conf = np.array(
            conf,
            dtype=np.float32
        )

        self.cls = np.array(
            cls,
            dtype=np.float32
        )


class VisitorTracker:


    def __init__(self):

        logger.info(
            "Initializing ByteTrack tracker"
        )


        args = SimpleNamespace(
            track_high_thresh=0.5,
            track_low_thresh=0.1,
            new_track_thresh=0.5,
            track_buffer=30,
            match_thresh=0.8,
            fuse_score=True,
        )


        self.tracker = BYTETracker(
            args=args,
            frame_rate=30
        )


    def update(self, detections) -> List[TrackedObject]:

        if not detections:
            return []


        bt_input = ByteTrackInput(
            detections
        )


        tracks = self.tracker.update(
            bt_input
        )


        results = []


        for track in tracks:

            # Ultralytics v8.3 returns ndarray:
            # [x1, y1, x2, y2, track_id, score, cls]

            x1 = track[0]
            y1 = track[1]
            x2 = track[2]
            y2 = track[3]

            track_id = int(track[4])

            score = float(track[5])


            results.append(
                TrackedObject(
                    track_id=track_id,

                    bbox_xyxy=(
                        int(x1),
                        int(y1),
                        int(x2),
                        int(y2),
                    ),

                    confidence=score,
                )
            )

        return results