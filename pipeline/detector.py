"""
detector.py
-----------
Wraps YOLOv8 for person-only detection.

Responsibilities:
  - Load the YOLO model once at startup
  - Run inference on a single frame
  - Return only person-class detections
  - Attach per-camera confidence thresholds from config
  - Never crash on a bad frame — degrade gracefully

This module is intentionally stateless: it receives a frame and
returns detections. Tracking state (ByteTrack) lives in tracker.py
(Phase 2). This separation makes both modules independently testable.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Detection:
    """
    A single person detection from one frame.

    Attributes
    ----------
    bbox_xyxy   : [x1, y1, x2, y2] in pixel coordinates
    confidence  : YOLO confidence score — never suppressed, even if low
    class_id    : COCO class ID (always 0 = person here)
    frame_num   : Source frame index (0-based)
    track_id    : Assigned by ByteTrack in Phase 2. None until then.
    centroid    : (cx, cy) computed from bbox
    """
    bbox_xyxy : List[float]
    confidence: float
    class_id  : int
    frame_num : int
    track_id  : Optional[int] = None
    centroid  : tuple          = field(init=False)

    def __post_init__(self) -> None:
        x1, y1, x2, y2 = self.bbox_xyxy
        self.centroid = (int((x1 + x2) / 2), int((y1 + y2) / 2))

    @property
    def width(self) -> float:
        return self.bbox_xyxy[2] - self.bbox_xyxy[0]

    @property
    def height(self) -> float:
        return self.bbox_xyxy[3] - self.bbox_xyxy[1]

    @property
    def area(self) -> float:
        return self.width * self.height

    def to_dict(self) -> dict:
        return {
            "bbox_xyxy" : self.bbox_xyxy,
            "confidence": round(self.confidence, 4),
            "class_id"  : self.class_id,
            "frame_num" : self.frame_num,
            "track_id"  : self.track_id,
            "centroid"  : self.centroid,
        }


class PersonDetector:
    """
    Loads YOLOv8n once and provides frame-level person detection.

    Usage
    -----
        detector = PersonDetector(camera_id="CAM3")
        detections = detector.detect(frame, frame_num=42)

    The camera_id is used to look up the correct per-camera confidence
    threshold from config.py.
    """

    def __init__(self, camera_id: str = "DEFAULT") -> None:
        """
        Parameters
        ----------
        camera_id : str
            One of CAM1–CAM5 or DEFAULT. Controls which confidence
            threshold is applied (CAM3 uses a lower value for top-down view).
        """
        from pipeline.config import (
            YOLO_MODEL_NAME,
            YOLO_CONF,
            YOLO_NMS_IOU,
            YOLO_MAX_DET,
            PERSON_CLASS_ID,
        )

        self.camera_id      = camera_id
        self.person_class   = PERSON_CLASS_ID
        self.conf_threshold = YOLO_CONF.get(camera_id, YOLO_CONF["DEFAULT"])
        self.nms_iou        = YOLO_NMS_IOU
        self.max_det        = YOLO_MAX_DET

        logger.info(
            "Loading YOLO model | camera=%s | conf=%.2f | iou=%.2f",
            camera_id, self.conf_threshold, self.nms_iou,
        )

        try:
            from ultralytics import YOLO
            self._model = YOLO(YOLO_MODEL_NAME)
            logger.info("YOLO model loaded successfully: %s", YOLO_MODEL_NAME)
        except Exception as exc:
            logger.error("Failed to load YOLO model: %s", exc)
            raise

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def detect(self, frame: np.ndarray, frame_num: int = 0) -> List[Detection]:
        """
        Run inference on a single BGR frame.

        Parameters
        ----------
        frame     : np.ndarray — BGR image from cv2.VideoCapture
        frame_num : int        — source frame index for bookkeeping

        Returns
        -------
        List[Detection] — may be empty if no persons found or frame is bad.
        Never raises — bad frames return an empty list with a warning log.
        """
        if frame is None or frame.size == 0:
            logger.warning("detect() received empty frame at frame_num=%d", frame_num)
            return []

        try:
            results = self._model(
                frame,
                classes   = [self.person_class],
                conf      = self.conf_threshold,
                iou       = self.nms_iou,
                max_det   = self.max_det,
                verbose   = False,          # suppress YOLO stdout spam
            )
        except Exception as exc:
            logger.error("YOLO inference failed at frame %d: %s", frame_num, exc)
            return []

        return self._parse_results(results, frame_num)

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _parse_results(self, results, frame_num: int) -> List[Detection]:
        """
        Convert ultralytics Results object → list of Detection dataclasses.
        Handles the case where results[0].boxes is None or empty.
        """
        detections: List[Detection] = []

        try:
            boxes = results[0].boxes
            if boxes is None or len(boxes) == 0:
                return detections

            for box in boxes:
                try:
                    xyxy  = box.xyxy[0].cpu().numpy().tolist()   # [x1,y1,x2,y2]
                    conf  = float(box.conf[0].cpu().numpy())
                    cls   = int(box.cls[0].cpu().numpy())

                    # Double-check: only person class (should always be true
                    # since we pass classes=[0] to model(), but be defensive)
                    if cls != self.person_class:
                        continue

                    det = Detection(
                        bbox_xyxy  = xyxy,
                        confidence = conf,
                        class_id   = cls,
                        frame_num  = frame_num,
                    )
                    detections.append(det)

                except Exception as box_exc:
                    logger.debug("Skipping malformed box at frame %d: %s", frame_num, box_exc)
                    continue

        except Exception as parse_exc:
            logger.error("Result parsing failed at frame %d: %s", frame_num, parse_exc)

        return detections

    # ─────────────────────────────────────────────────────────────────────────
    # Diagnostics
    # ─────────────────────────────────────────────────────────────────────────

    def warmup(self, frame_shape: tuple = (1080, 1920, 3)) -> None:
        """
        Run one dummy inference to warm up the model before processing starts.
        This avoids a slow first-frame spike in real processing.

        Parameters
        ----------
        frame_shape : (H, W, C) tuple matching your video resolution
        """
        logger.info("Warming up YOLO on dummy frame %s ...", frame_shape)
        dummy = np.zeros(frame_shape, dtype=np.uint8)
        self.detect(dummy, frame_num=-1)
        logger.info("Warmup complete.")

    def __repr__(self) -> str:
        return (
            f"PersonDetector(camera={self.camera_id!r}, "
            f"conf={self.conf_threshold}, iou={self.nms_iou})"
        )