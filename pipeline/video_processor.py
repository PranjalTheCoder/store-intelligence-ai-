"""
video_processor.py
------------------
Reads a video file frame-by-frame, runs PersonDetector, annotates
each frame with bounding boxes and metadata, and writes an output video.

Responsibilities:
  - Open input video with OpenCV
  - Skip frames according to FRAME_SKIP config
  - Call PersonDetector.detect() on each processed frame
  - Draw annotated bounding boxes on frame
  - Draw entry line for CAM3 (entry/exit camera)
  - Write annotated frames to output video
  - Log per-frame stats and a final summary

Design notes:
  - This class is intentionally NOT responsible for tracking or events.
    That comes in Phase 2. Right now it only does: read → detect → annotate → write.
  - The overlay_detections() method will be extended in Phase 2 to show track IDs.
    For now, it shows a placeholder "P-?" for person ID.
  - Supports processing a subset of frames via max_frames parameter (useful for testing).
"""

from __future__ import annotations
from pipeline.tracker import VisitorTracker
import logging
import time
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np

from pipeline.config import (
    BBOX_COLOR_PERSON,
    BBOX_THICKNESS,
    ENTRY_LINE_COLOR,
    ENTRY_LINE_THICKNESS,
    ENTRY_LINE_Y,
    FONT,
    FONT_SCALE,
    FONT_THICKNESS,
    FRAME_SKIP,
    OUTPUT_FOURCC,
    OUTPUTS_DIR,
)
from pipeline.detector import Detection, PersonDetector

logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Orchestrates the full detection pipeline for one video file.

    Usage
    -----
        processor = VideoProcessor(
            camera_id  = "CAM3",
            input_path = Path("data/clips/CAM3.mp4"),
            output_path= Path("outputs/cam3_detection.mp4"),
        )
        processor.run()

    After run() completes, call processor.summary() to get stats.
    """

    def __init__(
        self,
        camera_id  : str,
        input_path : Path,
        output_path: Optional[Path] = None,
        max_frames : Optional[int]  = None,
        show_preview: bool          = False,
    ) -> None:
        """
        Parameters
        ----------
        camera_id    : Camera identifier string (e.g. "CAM3")
        input_path   : Path to the input .mp4 file
        output_path  : Where to write the annotated video.
                       If None, defaults to outputs/<camera_id>_detection.mp4
        max_frames   : Stop after this many SOURCE frames (useful for quick tests).
                       None = process entire video.
        show_preview : Show live OpenCV window while processing.
                       Set False when running headless (server/Docker).
        """
        self.camera_id    = camera_id
        self.input_path   = Path(input_path)
        self.output_path  = Path(output_path) if output_path else \
                            OUTPUTS_DIR / f"{camera_id.lower()}_detection.mp4"
        self.max_frames   = max_frames
        self.show_preview = show_preview

        # Stats — populated during run()
        self._total_frames_read      = 0
        self._total_frames_processed = 0
        self._total_detections       = 0
        self._processing_time_sec    = 0.0
        self._video_fps              = 0.0
        self._video_width            = 0
        self._video_height           = 0

        # Detector is created in run() so that any import/GPU errors
        # are surfaced at runtime with context, not at import time.
        self._detector: Optional[PersonDetector] = None

        logger.info(
            "VideoProcessor init | camera=%s | input=%s | output=%s",
            self.camera_id, self.input_path, self.output_path,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def run(self) -> dict:
        """
        Execute the full pipeline: open → detect → annotate → write → close.

        Returns
        -------
        dict : Summary stats (same as summary())
        """
        self._validate_input()

        cap    = self._open_capture()
        writer = self._open_writer(cap)

        self._detector = PersonDetector(camera_id=self.camera_id)
        self.tracker = VisitorTracker()
        self._detector.warmup(frame_shape=(self._video_height, self._video_width, 3))

        logger.info(
            "Starting processing | fps=%.2f | resolution=%dx%d | frame_skip=%d",
            self._video_fps, self._video_width, self._video_height, FRAME_SKIP,
        )

        start_time = time.time()

        try:
            self._process_loop(cap, writer)
        except KeyboardInterrupt:
            logger.info("Processing interrupted by user.")
        finally:
            cap.release()
            writer.release()
            if self.show_preview:
                cv2.destroyAllWindows()

        self._processing_time_sec = time.time() - start_time
        logger.info("Processing complete. %s", self._format_summary())

        return self.summary()

    def summary(self) -> dict:
        """Return a dict of processing statistics."""
        fps_achieved = (
            self._total_frames_processed / self._processing_time_sec
            if self._processing_time_sec > 0 else 0.0
        )
        return {
            "camera_id"            : self.camera_id,
            "input_path"           : str(self.input_path),
            "output_path"          : str(self.output_path),
            "total_frames_read"    : self._total_frames_read,
            "total_frames_processed": self._total_frames_processed,
            "total_detections"     : self._total_detections,
            "avg_detections_per_frame": round(
                self._total_detections / max(self._total_frames_processed, 1), 2
            ),
            "processing_time_sec"  : round(self._processing_time_sec, 2),
            "fps_achieved"         : round(fps_achieved, 2),
            "source_fps"           : self._video_fps,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Internal — setup
    # ─────────────────────────────────────────────────────────────────────────

    def _validate_input(self) -> None:
        if not self.input_path.exists():
            raise FileNotFoundError(
                f"Input video not found: {self.input_path}\n"
                f"Place your video files in: data/clips/"
            )

    def _open_capture(self) -> cv2.VideoCapture:
        cap = cv2.VideoCapture(str(self.input_path))
        if not cap.isOpened():
            raise RuntimeError(f"OpenCV could not open video: {self.input_path}")

        self._video_fps    = cap.get(cv2.CAP_PROP_FPS) or 15.0
        self._video_width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self._video_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total              = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        logger.info(
            "Opened video: %s | %dx%d @ %.1f fps | total frames: %d",
            self.input_path.name, self._video_width, self._video_height,
            self._video_fps, total,
        )
        return cap

    def _open_writer(self, cap: cv2.VideoCapture) -> cv2.VideoWriter:
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*OUTPUT_FOURCC)
        # Output FPS = source FPS / FRAME_SKIP so playback speed is correct
        out_fps = max(self._video_fps / FRAME_SKIP, 1.0)
        writer  = cv2.VideoWriter(
            str(self.output_path), fourcc, out_fps,
            (self._video_width, self._video_height),
        )
        if not writer.isOpened():
            raise RuntimeError(f"Could not open VideoWriter for: {self.output_path}")
        logger.info("Output writer ready: %s | out_fps=%.1f", self.output_path, out_fps)
        return writer

    # ─────────────────────────────────────────────────────────────────────────
    # Internal — processing loop
    # ─────────────────────────────────────────────────────────────────────────

    def _process_loop(self, cap: cv2.VideoCapture, writer: cv2.VideoWriter) -> None:
        frame_index   = 0     # total frames read from video
        frames_done   = 0     # frames actually processed through YOLO

        log_interval  = max(int(self._video_fps * 10), 30)  # log every ~10 seconds

        while True:
            ret, frame = cap.read()
            if not ret:
                logger.info("End of video reached at frame %d.", frame_index)
                break

            frame_index += 1
            self._total_frames_read = frame_index

            # Honour max_frames limit (for quick test runs)
            if self.max_frames and frame_index > self.max_frames:
                logger.info("max_frames=%d reached, stopping.", self.max_frames)
                break

            # Frame skip — only process every Nth frame
            if frame_index % FRAME_SKIP != 0:
                continue

            frames_done += 1
            self._total_frames_processed = frames_done

            # ── Detect ────────────────────────────────────────────────────
            detections: List[Detection] = self._detector.detect(frame, frame_num=frame_index)
            tracked_objects = self.tracker.update(detections)
            self._total_detections += len(detections)

            # ── Annotate ──────────────────────────────────────────────────
            annotated = self._annotate_frame(frame.copy(), tracked_objects, frame_index)

            # ── Write ─────────────────────────────────────────────────────
            writer.write(annotated)

            # ── Preview ───────────────────────────────────────────────────
            if self.show_preview:
                cv2.imshow(f"Detection — {self.camera_id}", annotated)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    logger.info("Preview window closed by user.")
                    break

            # ── Progress log ──────────────────────────────────────────────
            if frames_done % log_interval == 0:
                elapsed = time.time()
                logger.info(
                    "Progress | frame=%d | processed=%d | detections=%d | persons_this_frame=%d",
                    frame_index, frames_done, self._total_detections, len(detections),
                )

    # ─────────────────────────────────────────────────────────────────────────
    # Internal — annotation
    # ─────────────────────────────────────────────────────────────────────────

    def _annotate_frame(
        self,
        frame     : np.ndarray,
        detections: List[Detection],
        frame_num : int,
    ) -> np.ndarray:
        """
        Draw all detections and UI overlays onto the frame.

        Draws:
          - Bounding box per detection
          - Label: "ID-{obj.track_id} | conf" (placeholder until ByteTrack assigns IDs in Phase 2)
          - Entry line for CAM3
          - HUD with frame number + detection count
        """
        # Draw entry threshold line for CAM3
        if self.camera_id == "CAM3":
            self._draw_entry_line(frame)

        # Draw each detection
        for det in detections:
            self._draw_detection(frame, det)

        # Draw HUD overlay (top-left info bar)
        self._draw_hud(frame, frame_num, len(detections))

        return frame

    def _draw_detection(self, frame: np.ndarray, det: Detection) -> None:
        x1, y1, x2, y2 = [int(v) for v in det.bbox_xyxy]
        cx, cy          = det.centroid

        # Bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), BBOX_COLOR_PERSON, BBOX_THICKNESS)

        # Centroid dot (useful for entry-line crossing visualisation)
        cv2.circle(frame, (cx, cy), 4, BBOX_COLOR_PERSON, -1)

        # Label: person ID placeholder + confidence
        # track_id will be populated by ByteTrack in Phase 2
        person_label = f"ID-{det.track_id}" if det.track_id is not None else "P-?"
        label        = f"{person_label} | {det.confidence:.2f}"

        # Background rectangle for label readability
        (label_w, label_h), baseline = cv2.getTextSize(
            label, FONT, FONT_SCALE, FONT_THICKNESS
        )
        label_y = max(y1 - 6, label_h + 4)
        cv2.rectangle(
            frame,
            (x1, label_y - label_h - baseline - 2),
            (x1 + label_w + 2, label_y + baseline),
            BBOX_COLOR_PERSON,
            cv2.FILLED,
        )
        cv2.putText(
            frame, label,
            (x1 + 1, label_y - baseline),
            FONT, FONT_SCALE, (0, 0, 0), FONT_THICKNESS, cv2.LINE_AA,
        )

    def _draw_entry_line(self, frame: np.ndarray) -> None:
        """Draw the entry/exit threshold line across the full width (CAM3 only)."""
        h, w = frame.shape[:2]
        cv2.line(
            frame,
            (0, ENTRY_LINE_Y), (w, ENTRY_LINE_Y),
            ENTRY_LINE_COLOR, ENTRY_LINE_THICKNESS,
        )
        # Labels on the line
        cv2.putText(
            frame, "STORE (INSIDE)",
            (10, ENTRY_LINE_Y - 10),
            FONT, 0.6, ENTRY_LINE_COLOR, 1, cv2.LINE_AA,
        )
        cv2.putText(
            frame, "MALL (OUTSIDE)",
            (10, ENTRY_LINE_Y + 20),
            FONT, 0.6, ENTRY_LINE_COLOR, 1, cv2.LINE_AA,
        )

    def _draw_hud(self, frame: np.ndarray, frame_num: int, count: int) -> None:
        """Draw a heads-up display bar at the top of the frame."""
        hud_lines = [
            f"CAM: {self.camera_id}",
            f"Frame: {frame_num}",
            f"Persons: {count}",
            f"Total detected: {self._total_detections}",
        ]
        # Semi-transparent dark bar
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (220, 18 + 18 * len(hud_lines)), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

        for i, line in enumerate(hud_lines):
            cv2.putText(
                frame, line,
                (6, 18 + i * 18),
                FONT, 0.52, (255, 255, 255), 1, cv2.LINE_AA,
            )

    def _format_summary(self) -> str:
        s = self.summary()
        return (
            f"frames_read={s['total_frames_read']} | "
            f"frames_processed={s['total_frames_processed']} | "
            f"detections={s['total_detections']} | "
            f"avg_per_frame={s['avg_detections_per_frame']} | "
            f"time={s['processing_time_sec']}s | "
            f"fps={s['fps_achieved']}"
        )