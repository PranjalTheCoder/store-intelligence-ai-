# Design Choices & Rationale

## Detection Model — YOLOv8n

**Why YOLOv8n over larger variants?**

- 1080p retail CCTV at 15fps → real-time constraint at ~7.5fps effective (every-other-frame)
- YOLOv8n achieves this on a CPU; YOLOv8m/l require GPU
- Person detection (single class) does not need the full COCO accuracy of a larger model
- The challenge supplies pre-recorded clips → processing time matters less than memory footprint

## Tracking — ByteTrack (ultralytics built-in)

**Why ByteTrack?**

- Handles low-confidence detections (partial occlusion) by keeping secondary tracklets alive
- Built into `ultralytics` — no additional dependency
- Association uses IoU + Kalman filter, robust to temporary disappearances (partial occlusion behind shelf)
- Assigns stable integer track IDs across frames within a clip

**Cross-clip Re-ID limitation**: ByteTrack IDs reset per clip. Re-entry detection uses a time-window heuristic + visitor_id persistence in memory between clip segments.

## Zone Detection — Shapely Polygon Point-in-Polygon

**Why Shapely over a CNN-based zone classifier?**

- Store layouts are provided as images with known dimensions → we can digitise polygons manually (or with a simple annotation tool)
- Polygon PiP is O(n) and microseconds per frame; a VLM zone query would be 100-1000ms
- Shapely handles overlapping polygons gracefully (first match wins, ordered by zone priority)

## Staff Detection — Heuristic (no external model)

Three signals combined into a confidence score:

1. **Duration** (≥15 min continuous) — weight 0.45
2. **Zone coverage** (≥4 distinct zones) — weight 0.35
3. **Consistent movement pace** (low CV of displacement) — weight 0.20

This avoids the need for a uniform colour classifier (which would break on different store uniforms) while being reliable for 20-minute clips.

## POS Correlation — Time-Window Match

No customer ID in POS data. Correlation rule:

- A visitor in the billing zone within 5 min **before** a transaction timestamp → `converted = True`
- Multiple visitors in window: earliest active session wins (least greedy match)

This mirrors how real retail analytics vendors handle anonymous POS correlation.

## Re-entry Detection

- EXIT timestamp recorded in `ReentryEngine._exit_log`
- On re-detection: if gap < 1 hour AND same store → REENTRY event, same `visitor_id` reused
- 1-hour window is configurable via `REENTRY_WINDOW_SEC`

## Database — SQLite

- Appropriate for a single-server hackathon deployment
- Zero infrastructure cost
- Swap to PostgreSQL by changing `DATABASE_URL` — SQLAlchemy abstraction is already in place

## API Framework — FastAPI

- Pydantic validation ensures schema compliance at the API boundary
- Async-capable for future WebSocket `/live` streaming
- Auto-generated OpenAPI docs at `/docs`
