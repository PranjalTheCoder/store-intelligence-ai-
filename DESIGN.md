# Retail Store Intelligence — System Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     VIDEO INGESTION LAYER                        │
│  CCTV MP4 clips → OpenCV frame extraction @ 7.5fps effective    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    DETECTION LAYER                               │
│  YOLOv8n  (person class=0, conf≥0.35)                          │
│  ByteTrack (built into ultralytics — persistent track IDs)      │
└────────────────────────────┬────────────────────────────────────┘
                             │  track_id, bbox, confidence
┌────────────────────────────▼────────────────────────────────────┐
│                    CLASSIFICATION LAYER                          │
│  StaffDetector  — duration + zone-coverage heuristic            │
│  ReentryEngine  — time-gap + visitor_id persistence             │
└────────────────────────────┬────────────────────────────────────┘
                             │  is_staff, reentry_flag
┌────────────────────────────▼────────────────────────────────────┐
│                    EVENT ENGINE                                   │
│  EventEngine    — ENTRY / EXIT from entry camera crossing        │
│  ZoneEngine     — ZONE_ENTER / ZONE_EXIT / ZONE_DWELL (Shapely) │
│  BillingEngine  — BILLING_QUEUE_JOIN / BILLING_QUEUE_ABANDON     │
│                                                                  │
│  Every event: UUID, store_id, camera_id, visitor_id,            │
│               ISO-8601 timestamp, confidence, metadata           │
└────────────────────────────┬────────────────────────────────────┘
                             │  RetailEvent objects
┌────────────────────────────▼────────────────────────────────────┐
│                    SESSION ENGINE                                 │
│  Creates / closes VisitorSession records                         │
│  Tracks zones_visited list per session                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    PERSISTENCE LAYER                             │
│  SQLite via SQLAlchemy ORM                                       │
│  Tables: events, sessions, zone_stats, pos_transactions, alerts  │
│  Indices on (store_id, timestamp), (visitor_id, event_type)      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    POS CORRELATION                               │
│  pos_transactions.csv → POSCorrelator                            │
│  5-minute billing-zone window match per transaction              │
│  Sets session.converted=True, stores basket_value               │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    API LAYER — FastAPI                           │
│  /events  /sessions  /metrics  /funnel  /analytics  /dashboard  │
│  /heatmap  /zones  /store-layout  /live  /alerts  /anomalies    │
│  POST /events/ingest   GET /pos/correlate                        │
└────────────────────────────┬────────────────────────────────────┘
                             │  JSON
┌────────────────────────────▼────────────────────────────────────┐
│                    DASHBOARD — React                             │
│  Store map overlay  /  Zone heatmap  /  Funnel chart            │
│  Live visitor count  /  Queue depth  /  Conversion rate          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

| Table              | Key Columns                                                      |
|--------------------|------------------------------------------------------------------|
| events             | event_id (PK), store_id, visitor_id, event_type, timestamp, zone_id, dwell_ms, is_staff, confidence, metadata_json |
| sessions           | session_id (PK), visitor_id, store_id, entry_time, exit_time, zones_visited (JSON), converted, basket_value |
| zone_stats         | store_id + zone_id (unique), total_visits, avg_dwell_ms, heatmap_score |
| pos_transactions   | transaction_id (PK), store_id, timestamp, basket_value_inr, matched_visitor_id |
| alerts             | alert_id (PK), store_id, alert_type, severity, message           |

## Camera Roles

| Store   | Camera   | Role    |
|---------|----------|---------|
| Store 1 | CAM1     | zone    |
| Store 1 | CAM2     | zone    |
| Store 1 | CAM3     | entry   |
| Store 1 | CAM5     | billing |
| Store 2 | ENTRY1   | entry   |
| Store 2 | ENTRY2   | entry   |
| Store 2 | ZONE     | zone    |
| Store 2 | BILLING  | billing |

## Event Timestamp Derivation

`timestamp = clip_start_datetime + timedelta(seconds = frame_index / fps)`

Clip start time is passed in by the operator (or inferred from filename metadata).
