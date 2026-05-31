# Store Intelligence System — Purplle Tech Challenge 2026

AI-powered retail analytics from raw CCTV footage.  
Store: Brigade_Bangalore (ST1008) | Date: 10 April 2026

---

## Project Structure

```
store-intelligence/
├── pipeline/
│   ├── __init__.py          # Package init
│   ├── config.py            # All settings — single source of truth
│   ├── detector.py          # YOLOv8 person detection
│   └── video_processor.py  # Frame loop, annotation, output
├── app/                     # FastAPI backend (Phase 3)
├── tests/                   # Pytest suite (Phase 4)
├── data/
│   └── clips/               # Place your .mp4 files here (gitignored)
├── outputs/                 # Generated output videos and reports
├── run_detection.py         # Phase 1 entrypoint
├── requirements.txt
└── README.md
```

---

## Phase 1: YOLO Detection

### 1. Setup

```bash
# Clone and enter project
git clone <your-repo-url>
cd store-intelligence

# Create virtual environment (Python 3.12)
python3.12 -m venv .venv
source .venv/bin/activate          # Linux / macOS
# .venv\Scripts\activate           # Windows

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Add video files

```bash
# Create the clips directory if it doesn't exist
mkdir -p data/clips

# Copy your video files in
cp /path/to/your/CAM3.mp4 data/clips/CAM3.mp4
cp /path/to/your/CAM1.mp4 data/clips/CAM1.mp4
# ... repeat for CAM2, CAM4, CAM5
```

### 3. Run detection

```bash
# Process CAM3 (entry/exit camera — start here)
python run_detection.py --camera CAM3

# Quick test run — only first 300 source frames (~20 seconds)
python run_detection.py --camera CAM3 --max-frames 300

# Process a different camera
python run_detection.py --camera CAM1

# Process all enabled cameras sequentially
python run_detection.py --all

# See help
python run_detection.py --help
```

### 4. Verify output

```bash
# Check output video was created
ls -lh outputs/

# Check summary JSON
cat outputs/phase1_summary.json

# Play output video (requires a display)
# macOS: open outputs/cam3_detection.mp4
# Linux: vlc outputs/cam3_detection.mp4
```

**Expected output for CAM3:**
- `outputs/cam3_detection.mp4` — annotated video with green bounding boxes
- Each detected person labelled "P-? | 0.xx" (placeholder ID + confidence)
- Yellow horizontal entry line drawn at Y=480
- HUD overlay showing frame count and detection count
- `outputs/phase1_summary.json` — machine-readable stats

---

## Camera Reference

| Camera | Role | Status |
|--------|------|--------|
| CAM1 | Skincare zone — back wall | Enabled |
| CAM2 | Makeup zone — right wall | Enabled |
| CAM3 | Entry/exit threshold | **Primary — start here** |
| CAM4 | Stockroom/backroom | **Disabled** (staff only) |
| CAM5 | Billing/POS counter | Enabled |

---

## Coming in Phase 2

- ByteTrack multi-object tracking (stable track IDs replacing P-?)
- Re-ID using colour histogram matching (reentry detection)
- Entry/exit event generation from CAM3

---

## Development

```bash
# Run tests (Phase 4)
pytest tests/ -v --cov=pipeline

# Lint
ruff check pipeline/
```