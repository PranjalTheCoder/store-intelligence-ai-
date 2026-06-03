"""
video_processor.py — Orchestrates detection pipeline against video files.

Wires together:
  YOLOv8 → ByteTrack → StaffDetector → EventEngine → ZoneEngine → BillingEngine → ReentryEngine
  → Session Engine → SQLite

Usage:
    python -m pipeline.video_processor \
        --store STORE_1 \
        --videos resources/Store1/CAM3-entry.mp4 resources/Store1/CAM1-zone.mp4 ...
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
import uuid
from pathlib import Path
from typing import List, Optional

# ---- optional heavy imports (graceful degradation) -----
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[video_processor] WARNING: opencv-python not installed.")

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[video_processor] WARNING: ultralytics not installed — using mock detector.")

# --------------------------------------------------------

from pipeline.event_engine import EventEngine, RetailEvent
from pipeline.zone_engine import ZoneEngine
from pipeline.billing_engine import BillingEngine
from pipeline.reentry_engine import ReentryEngine
from pipeline.staff_detector import StaffDetector
# from pipeline.session_engine import SessionEngine


CAMERA_ROLE_MAP = {
    "entry":   "entry",
    "cam3":    "entry",
    "entry1":  "entry",
    "entry2":  "entry",
    "zone":    "zone",
    "cam1":    "zone",
    "cam2":    "zone",
    "billing": "billing",
    "cam5":    "billing",
    "billing_area": "billing",
}

ZONE_JSON_MAP = {
    "STORE_1": "pipeline/store1_zones.json",
    "STORE_2": "pipeline/store2_zones.json",
}


class VideoProcessor:

    MODEL_PATH  = os.environ.get("YOLO_MODEL", "yolov8n.pt")
    CONF_THRESH = 0.35
    PERSON_CLASS = 0
    OUTPUT_JSONL  = "outputs/events.jsonl"

    def __init__(self, store_id: str, db_session=None):
        self.store_id   = store_id
        self.db_session = db_session

        # Shared components (per store)
        self.staff_detector  = StaffDetector()
        self.reentry_engine  = ReentryEngine()
        self.session_engine  = SessionEngine(db_session=db_session) if db_session else None

        zones_json = ZONE_JSON_MAP.get(store_id)
        self.zone_engine    = ZoneEngine(zones_json) if zones_json and Path(zones_json).exists() else None
        self.billing_engine = BillingEngine(store_id=store_id, camera_id="CAM5")

        if YOLO_AVAILABLE:
            self.model = YOLO(self.MODEL_PATH)
        else:
            self.model = None

        os.makedirs("outputs", exist_ok=True)

    # ------------------------------------------------------------------

    def process_video(
        self,
        video_path:  str,
        camera_id:   str,
        clip_start:  Optional[datetime.datetime] = None,
    ) -> List[RetailEvent]:
        # print(self._infer_role("CAM3"))
        """Process a single video file. Returns all emitted events."""
        role = self._infer_role(camera_id, video_path)
        print(f"[processor] {camera_id} ({role}) — {video_path}")

        engine = EventEngine(
            store_id        = self.store_id,
            camera_id       = camera_id,
            camera_role     = role,
            staff_detector  = self.staff_detector,
            zone_engine     = self.zone_engine if role == "zone" else None,
            billing_engine  = self.billing_engine if role == "billing" else None,
            reentry_engine  = self.reentry_engine,
        )

        all_events: List[RetailEvent] = []

        if not CV2_AVAILABLE or not self.model:
            print(f"[processor] Skipping real video processing — dependencies not available.")
            return all_events

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
        output_video = f"outputs/{camera_id}_detections.mp4"

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        writer = cv2.VideoWriter(
            output_video,
            fourcc,
            fps,
            (width, height)
        )
        engine.fps = fps

        frame_idx = 0
        if clip_start is None:
            clip_start = datetime.datetime.utcnow()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Skip every other frame for speed (process at ~7.5fps)
            frame_idx += 1
            if frame_idx % 2 != 0:
                continue

            frame_ts = clip_start + datetime.timedelta(seconds=frame_idx / fps)
            frame_h, frame_w = frame.shape[:2]

            # YOLO detection
            results = self.model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                classes=[self.PERSON_CLASS],
                conf=self.CONF_THRESH,
                verbose=False
            )

            # ByteTrack is built into ultralytics — use track() instead of predict()
            # Results include .boxes.id for track IDs
            detections = []
            # print(
            #     "boxes=",
            #     0 if results[0].boxes is None else len(results[0].boxes),
            #     "ids=",
            #     None if results[0].boxes is None else results[0].boxes.id
            # )
            if results[0].boxes is None:
                writer.write(frame)
                continue
            for box in results[0].boxes:
                if box.id is None:
                    continue
                track_id = int(box.id.item())
                
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf.item())

                cv2.rectangle(
                    frame,
                    (int(x1), int(y1)),
                    (int(x2), int(y2)),
                    (0, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    f"ID:{track_id}",
                    (int(x1), int(y1) - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    2
                )


                # Update staff detector
                self.staff_detector.update(track_id, (x1, y1, x2, y2), frame_ts)

                detections.append({
                    "track_id":   track_id,
                    "bbox":       (x1, y1, x2, y2),
                    "confidence": conf,
                    "frame_h":    frame_h,
                    "frame_w":    frame_w,
                })

            frame_events = engine.process_frame(detections, frame_ts)
            all_events.extend(frame_events)
            writer.write(frame)

            # Feed events to session engine
            if self.session_engine:
                for ev in frame_events:
                    self.session_engine.handle_event(ev)
            

        cap.release()
        writer.release()
        # Write JSONL
        self._append_jsonl(all_events)

        # Persist to DB
        if self.db_session:
            from app.repository import EventRepository
            repo = EventRepository(self.db_session)
            repo.save_events_bulk(all_events)
        print(
            f"[processor] Detection video saved: "
            f"{output_video}"
        )

        print(f"[processor] {camera_id}: emitted {len(all_events)} events")
        return all_events

    def process_store(self, video_map: dict, clip_start: Optional[datetime.datetime] = None):
        """
        Process all cameras for a store.
        video_map: { camera_id: video_file_path }
        Entry cameras first (to initialise sessions), then zone, then billing.
        """
        role_order = ["entry", "zone", "billing"]

        ordered = sorted(
            video_map.items(),
            key=lambda kv: role_order.index(
                self._infer_role(kv[0], kv[1])
            )
        )

        all_events = []
        for cam_id, path in ordered:
            evs = self.process_video(path, cam_id, clip_start)
            all_events.extend(evs)

        return all_events

    # ------------------------------------------------------------------

    def _infer_role(self, camera_id: str, video_path: str = "") -> str:

        filename = os.path.basename(video_path).lower()

        if "billing" in filename:
            return "billing"

        if "entry" in filename:
            return "entry"

        if "zone" in filename:
            return "zone"

        key = camera_id.lower().replace("-", "").replace("_", "").replace(" ", "")

        for pattern, role in CAMERA_ROLE_MAP.items():
            if pattern in key:
                return role

        return "zone"

    def _append_jsonl(self, events: List[RetailEvent]):
        with open(self.OUTPUT_JSONL, "a") as f:
            for ev in events:
                f.write(json.dumps(ev.to_dict()) + "\n")


# ---------------------------------------------------------------------------
# Session Engine (inline — if not already in separate file)
# ---------------------------------------------------------------------------

class SessionEngine:
    """Maintains visitor sessions from event stream."""

    def __init__(self, db_session=None):
        self.db = db_session
        self._open_sessions = {}   # visitor_id → session_id

    def handle_event(self, ev: RetailEvent):
        if self.db is None:
            return

        from app.repository import SessionRepository
        repo = SessionRepository(self.db)

        if ev.event_type == "ENTRY":
            sess = repo.create_session(ev.visitor_id, ev.store_id, ev.timestamp, ev.is_staff)
            self._open_sessions[ev.visitor_id] = sess.session_id

        elif ev.event_type == "EXIT":
            repo.close_session(ev.visitor_id, ev.store_id, ev.timestamp)
            self._open_sessions.pop(ev.visitor_id, None)

        elif ev.event_type in ("ZONE_ENTER", "ZONE_EXIT", "ZONE_DWELL") and ev.zone_id:
            repo.add_zone_to_session(ev.visitor_id, ev.store_id, ev.zone_id)

        elif ev.event_type == "REENTRY":
            repo.increment_reentry(ev.visitor_id, ev.store_id)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--store",   required=True, help="e.g. STORE_1")
    parser.add_argument("--videos",  nargs="+",     help="camera_id:path pairs, e.g. CAM3:file.mp4")
    parser.add_argument("--clip-start", default=None, help="ISO8601 clip start time")
    args = parser.parse_args()

    from app.database import SessionLocal, init_db
    init_db()
    db = SessionLocal()

    clip_start = None
    if args.clip_start:
        clip_start = datetime.datetime.fromisoformat(args.clip_start)

    video_map = {}
    for item in (args.videos or []):
        cam_id, path = item.split(":", 1)
        video_map[cam_id] = path

    proc = VideoProcessor(store_id=args.store, db_session=db)
    proc.process_store(video_map, clip_start=clip_start)

    db.close()
    print("Done.")
