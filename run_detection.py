"""
run_detection.py
----------------
Phase 1 entrypoint — YOLO person detection on a single camera video.

Usage
-----
    # Process CAM3 (default — entry/exit camera, most important)
    python run_detection.py

    # Process a specific camera
    python run_detection.py --camera CAM1

    # Quick test: stop after 300 source frames (~20 seconds at 15fps)
    python run_detection.py --camera CAM3 --max-frames 300

    # Show live preview window (requires a display)
    python run_detection.py --camera CAM3 --preview

    # All cameras that are enabled in config
    python run_detection.py --all
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Logging setup — must happen before any pipeline imports
# ─────────────────────────────────────────────────────────────────────────────

from pipeline.config import LOG_FORMAT, LOG_DATE, LOG_LEVEL

logging.basicConfig(
    level   = getattr(logging, LOG_LEVEL, logging.INFO),
    format  = LOG_FORMAT,
    datefmt = LOG_DATE,
    handlers= [logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("run_detection")

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline imports (after logging is configured)
# ─────────────────────────────────────────────────────────────────────────────

from pipeline.config import CAMERAS, OUTPUTS_DIR
from pipeline.video_processor import VideoProcessor


# ─────────────────────────────────────────────────────────────────────────────
# Argument parsing
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Phase 1 — YOLO person detection on store CCTV footage.",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--camera", "-c",
        default="CAM3",
        choices=list(CAMERAS.keys()),
        help="Which camera to process (default: CAM3 — entry/exit camera)",
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Process all enabled cameras sequentially",
    )
    parser.add_argument(
        "--max-frames", "-m",
        type=int,
        default=None,
        help="Stop after N source frames. Useful for quick testing.\n"
             "Example: --max-frames 300 ≈ 20 seconds at 15fps",
    )
    parser.add_argument(
        "--preview", "-p",
        action="store_true",
        help="Show live OpenCV window (requires a display — do not use in Docker)",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Custom output path for the annotated video.\n"
             "Default: outputs/<camera_id>_detection.mp4",
    )
    return parser.parse_args()


# ─────────────────────────────────────────────────────────────────────────────
# Processing logic
# ─────────────────────────────────────────────────────────────────────────────

def process_camera(
    camera_id   : str,
    max_frames  : int | None,
    show_preview: bool,
    output_path : str | None,
) -> dict | None:
    """
    Run detection on a single camera. Returns summary dict or None on error.
    """
    cam_cfg = CAMERAS.get(camera_id)
    if cam_cfg is None:
        logger.error("Unknown camera_id: %s", camera_id)
        return None

    if not cam_cfg["enabled"]:
        logger.warning(
            "Camera %s is disabled in config (role=%s). Skipping.",
            camera_id, cam_cfg["role"],
        )
        return None

    input_path = cam_cfg["file"]
    out_path   = Path(output_path) if output_path else \
                 OUTPUTS_DIR / f"{camera_id.lower()}_detection.mp4"

    logger.info("=" * 60)
    logger.info("Processing camera: %s", camera_id)
    logger.info("Role:              %s", cam_cfg["description"])
    logger.info("Input:             %s", input_path)
    logger.info("Output:            %s", out_path)
    logger.info("=" * 60)

    processor = VideoProcessor(
        camera_id   = camera_id,
        input_path  = input_path,
        output_path = out_path,
        max_frames  = max_frames,
        show_preview= show_preview,
    )

    try:
        summary = processor.run()
    except FileNotFoundError as e:
        logger.error("Video file not found: %s", e)
        logger.error(
            "Place your video files in the data/clips/ directory:\n"
            "  store-intelligence/data/clips/CAM3.mp4"
        )
        return None
    except Exception as e:
        logger.error("Processing failed for %s: %s", camera_id, e, exc_info=True)
        return None

    return summary


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()

    cameras_to_process = (
        [cid for cid, cfg in CAMERAS.items() if cfg["enabled"]]
        if args.all
        else [args.camera]
    )

    all_summaries = []

    for camera_id in cameras_to_process:
        summary = process_camera(
            camera_id   = camera_id,
            max_frames  = args.max_frames,
            show_preview= args.preview,
            output_path = args.output if len(cameras_to_process) == 1 else None,
        )
        if summary:
            all_summaries.append(summary)

    # ── Print final report ────────────────────────────────────────────────────
    if all_summaries:
        print("\n" + "=" * 60)
        print("PHASE 1 DETECTION — FINAL REPORT")
        print("=" * 60)
        for s in all_summaries:
            print(f"\nCamera: {s['camera_id']}")
            print(f"  Output video  : {s['output_path']}")
            print(f"  Frames read   : {s['total_frames_read']}")
            print(f"  Frames inferred: {s['total_frames_processed']}")
            print(f"  Total detections: {s['total_detections']}")
            print(f"  Avg per frame : {s['avg_detections_per_frame']}")
            print(f"  Time elapsed  : {s['processing_time_sec']}s")
            print(f"  FPS achieved  : {s['fps_achieved']}")

        # Save machine-readable summary
        summary_path = OUTPUTS_DIR / "phase1_summary.json"
        with open(summary_path, "w") as f:
            json.dump(all_summaries, f, indent=2)
        print(f"\nSummary saved: {summary_path}")
        print("=" * 60)
    else:
        logger.error("No cameras were processed successfully.")
        sys.exit(1)


if __name__ == "__main__":
    main()