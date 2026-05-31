"""
config.py
---------
Single source of truth for the entire Store Intelligence pipeline.
All paths, thresholds, and camera-specific settings live here.
Extend this file — never hardcode values in other modules.
"""

from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Project Paths
# ─────────────────────────────────────────────────────────────────────────────

# Root of the project (one level above /pipeline)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR     = PROJECT_ROOT / "data"
CLIPS_DIR    = DATA_DIR / "clips"
OUTPUTS_DIR  = PROJECT_ROOT / "outputs"

# Make sure output directory always exists
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Store Identity
# ─────────────────────────────────────────────────────────────────────────────

STORE_ID   = "ST1008"
STORE_NAME = "Brigade_Bangalore"
STORE_DATE = "10-04-2026"

# ─────────────────────────────────────────────────────────────────────────────
# Camera Registry
# Each entry describes the camera's physical role in the store.
# ─────────────────────────────────────────────────────────────────────────────

CAMERAS = {
    "CAM1": {
        "file":    CLIPS_DIR / "CAM1.mp4",
        "role":    "skincare_zone",
        "enabled": True,
        "description": "Main floor — skincare back wall (FarmStay, TFShop, GoodVibes, DermaCo)",
    },
    "CAM2": {
        "file":    CLIPS_DIR / "CAM2.mp4",
        "role":    "makeup_zone",
        "enabled": True,
        "description": "Main floor — makeup wall (Alps, Lakme, FacesCanada, Maybelline)",
    },
    "CAM3": {
        "file":    CLIPS_DIR / "CAM3.mp4",
        "role":    "entry_exit",
        "enabled": True,
        "description": "Entry/exit threshold — top-down nadir camera above glass door",
    },
    "CAM4": {
        "file":    CLIPS_DIR / "CAM4.mp4",
        "role":    "stockroom",
        "enabled": False,   # Excluded: backroom only — all persons = staff
        "description": "Stockroom/backroom — no customer analytics needed",
    },
    "CAM5": {
        "file":    CLIPS_DIR / "CAM5.mp4",
        "role":    "billing",
        "enabled": True,
        "description": "Billing/POS counter — staff-side view of checkout terminal",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# YOLO Detection Settings
# ─────────────────────────────────────────────────────────────────────────────

YOLO_MODEL_NAME = "yolov8n.pt"   # nano — fast on CPU, good for 1080p retail footage

# COCO class ID for "person" — do not detect other classes
PERSON_CLASS_ID = 0

# Per-camera confidence thresholds.
# CAM3 uses a lower threshold because it is a top-down nadir view:
# YOLO is trained on upright people, so head-from-above detections are
# inherently lower confidence. We must not suppress them.
YOLO_CONF = {
    "CAM1": 0.25,
    "CAM2": 0.25,
    "CAM3": 0.20,   # lower — top-down head detection
    "CAM4": 0.25,
    "CAM5": 0.25,
    "DEFAULT": 0.25,
}

# NMS (Non-Maximum Suppression) IoU threshold.
# Lower value = more aggressive deduplication of overlapping boxes.
# We use a lower value to avoid merging adjacent heads in group-entry scenarios.
YOLO_NMS_IOU = 0.45

# Maximum detections per frame (set high — store can be crowded)
YOLO_MAX_DET = 50

# ─────────────────────────────────────────────────────────────────────────────
# Entry / Exit Detection — CAM3 Specific
# ─────────────────────────────────────────────────────────────────────────────

# CAM3 is a top-down camera directly above the glass entry door.
# The threshold between mall floor (dark granite) and store floor (wood)
# is a horizontal line at approximately Y=480 in 1080p resolution.
#
# ENTRY:  centroid moves from Y > ENTRY_LINE_Y  →  Y < ENTRY_LINE_Y
#         (person moves upward in frame = moving INTO the store)
# EXIT:   centroid moves from Y < ENTRY_LINE_Y  →  Y > ENTRY_LINE_Y
#         (person moves downward in frame = moving OUT of the store)

ENTRY_LINE_Y = 480          # pixels at 1080p — tune after watching CAM3 video

# ─────────────────────────────────────────────────────────────────────────────
# Video Processing Settings
# ─────────────────────────────────────────────────────────────────────────────

# Frame skip: process every Nth frame for speed.
# 1 = process every frame (accurate, slow on CPU)
# 2 = process every other frame (recommended for CPU-only inference)
# 3 = process every 3rd frame (faster, acceptable for 15fps source footage)
FRAME_SKIP = 2

# Output video codec
OUTPUT_FOURCC = "mp4v"

# Bounding box visualisation settings
BBOX_COLOR_PERSON  = (0, 255, 0)    # green — detected person
BBOX_COLOR_STAFF   = (0, 0, 255)    # red   — flagged as staff (Phase 3)
BBOX_THICKNESS     = 2
FONT_SCALE         = 0.55
FONT_THICKNESS     = 1
FONT               = 0              # cv2.FONT_HERSHEY_SIMPLEX

# Entry line visualisation (CAM3)
ENTRY_LINE_COLOR    = (0, 255, 255)  # yellow
ENTRY_LINE_THICKNESS = 2

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

LOG_LEVEL  = "INFO"
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
LOG_DATE   = "%Y-%m-%d %H:%M:%S"