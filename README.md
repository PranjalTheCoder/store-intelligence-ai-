# Retail Store Intelligence

Purplle Hackathon submission — retail analytics from CCTV + POS data.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Initialise the database
python -c "from app.database import init_db; init_db()"

# 3. Start the API server
uvicorn app.main:app --reload --port 8000

# 4. Open the dashboard
cd frontend && npm install && npm start
```

## Processing Videos

```bash
# Store 1
python -m pipeline.video_processor \
  --store STORE_1 \
  --clip-start 2026-03-03T10:00:00 \
  --videos \
    CAM3:resources/Store1/CAM3-entry.mp4 \
    CAM1:resources/Store1/CAM1-zone.mp4 \
    CAM2:resources/Store1/CAM2-zone.mp4 \
    CAM5:resources/Store1/CAM5-billing.mp4

# Store 2
python -m pipeline.video_processor \
  --store STORE_2 \
  --clip-start 2026-03-03T10:00:00 \
  --videos \
    ENTRY1:resources/Store2/entry1.mp4 \
    ENTRY2:resources/Store2/entry2.mp4 \
    ZONE:resources/Store2/zone.mp4 \
    BILLING:resources/Store2/billing_area.mp4
```

## Running POS Correlation

```bash
# Copy your POS CSV to data/
cp POS_sample_transactions.csv data/pos_transactions.csv

# Trigger via API
curl http://localhost:8000/pos/correlate
```

## API Reference

| Method | Endpoint          | Description                           |
| ------ | ----------------- | ------------------------------------- |
| GET    | /                 | Health check                          |
| GET    | /health           | Detailed health                       |
| GET    | /events           | Event stream (filterable)             |
| GET    | /metrics          | Entry/exit counts + conversion        |
| GET    | /funnel           | Conversion funnel                     |
| GET    | /visitors         | All visitor sessions                  |
| GET    | /visitors/{id}    | Single visitor detail                 |
| GET    | /sessions         | Session list                          |
| GET    | /analytics        | Full analytics including zone ranking |
| GET    | /dashboard        | Dashboard summary                     |
| POST   | /events/ingest    | Bulk ingest events                    |
| GET    | /heatmap          | Zone heatmap data                     |
| GET    | /zones            | Zone statistics                       |
| GET    | /store-layout     | Zone polygon definitions              |
| GET    | /live             | Active visitors snapshot              |
| GET    | /alerts           | System alerts                         |
| GET    | /anomalies        | Auto-detected anomalies               |
| GET    | /pos/correlate    | Run POS correlation                   |
| GET    | /pos/metrics      | POS conversion metrics                |
| GET    | /pos/transactions | Transaction list                      |

Interactive docs: http://localhost:8000/docs

## Project Structure

```
store-intelligence/
├── pipeline/
│   ├── event_engine.py       # Core event emission (Phase 1)
│   ├── zone_engine.py        # Zone intelligence (Phase 2)
│   ├── billing_engine.py     # Queue tracking (Phase 3)
│   ├── correlate_pos.py      # POS correlation (Phase 4)
│   ├── reentry_engine.py     # Re-entry detection (Phase 5)
│   ├── staff_detector.py     # Staff classification (Phase 6)
│   ├── video_processor.py    # Orchestration
│   ├── store1_zones.json     # Store 1 zone polygons
│   └── store2_zones.json     # Store 2 zone polygons
├── app/
│   ├── main.py               # FastAPI routes (Phase 7)
│   ├── models.py             # SQLAlchemy models (Phase 1)
│   ├── repository.py         # DB operations
│   └── database.py           # Engine + session factory
├── data/
│   └── store_intelligence.db
├── outputs/
│   └── events.jsonl
├── DESIGN.md
├── CHOICES.md
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Docker

```bash
docker-compose up --build
```

API: http://localhost:8000
Dashboard: http://localhost:3000

## Running with Docker and resetting the DB

```bash
docker-compose down -v
docker-compose up --build
```
