# Apex Retail: Store Intelligence Platform

An end-to-end Computer Vision and analytics pipeline for physical retail stores, built for the UpGrad Tech Challenge 2026.

This system ingests raw CCTV footage, tracks entities using YOLOv8 + ByteTrack, evaluates spatial-temporal heuristics (Zone entry, Staff exclusion, Conversion funnels), and serves real-time metrics via a FastAPI backend to a live React dashboard.

---

## 🎯 North Star Metric

**Offline Store Conversion Rate:** The system strictly measures the physical conversion funnel:

```text
Store Entry -> Zone Explored -> Billing Queue -> Purchase
```

---

## 🚀 Quickstart (Evaluation Setup)

Reviewers can spin up the entire Store Intelligence system and verify its operation using exactly **5 commands**. No manual database initialization is required.

### 1. Clone the Repository

```bash
git clone <your_repository_url>
cd store-intelligence-ai
```

### 2. Start the API and Dashboard Infrastructure

```bash
docker compose up -d
```

Wait approximately **15 seconds** for initialization.

Verify services:

```bash
curl http://localhost:8000/health
```

- Backend API: `http://localhost:8000`
- Dashboard: `http://localhost:5173`

### 3. Run the Detection Pipeline (Sample Mode)

```bash
docker compose exec api python run_detection.py --store ST1076 --sample
```

Processes the sample video using CPU-optimized **YOLOv8n** and evaluates spatial heuristics.

### 4. Ingest Telemetry (Simulates Live HTTP POST Stream)

```bash
docker compose exec api python ingest_in_batches.py
```

Bypasses SQLite locks by pushing events through the highly concurrent `/events/ingest` API endpoint.

### 5. Run the Verification Test Suite

```bash
docker compose exec api pytest tests/
```

Validates:

- Idempotent ingestion
- Graceful database degradation
- Strictly monotonic funnel calculations

---

## 🏗 Architecture & Data Flow

```text
[Raw Video]
      |
      v
[YOLOv8 + ByteTrack]
      |
      v
[Spatial State Engines]
      |
      |  POST /events/ingest
      v
[FastAPI + SQLite WAL]
      |
      |  GET /metrics & /funnel
      v
[React Dashboard]
```

### Components

#### Edge Pipeline (`pipeline/`)

- Ultralytics YOLOv8n
- ByteTrack object tracking
- Pure spatial heuristics
- Zone-based event generation

#### Backend (`app/`)

- FastAPI
- SQLite (WAL Mode)
- Idempotent event ingestion
- Real-time KPI aggregation

#### Frontend (`dashboard/`)

- React
- Vite
- Tailwind CSS
- TanStack Query
- 5-second polling interval

---

## 📚 Core Documentation

To understand the engineering decisions and tradeoffs made during development, review:

### `DESIGN.md`

- System architecture
- Event streaming logic
- State-machine design
- AI-assisted engineering decisions

### `CHOICES.md`

- Model selection rationale
- Schema design decisions
- API constraints
- Performance tradeoffs

---

## 📡 Key API Endpoints

Interactive API documentation:

```text
http://localhost:8000/docs
```

| Endpoint | Description |
|-----------|-------------|
| `POST /events/ingest` | High-frequency, idempotent telemetry ingestion |
| `GET /stores/{store_id}/metrics` | Live snapshot KPIs (unique visitors, queue depth, dwell metrics) |
| `GET /stores/{store_id}/funnel` | Session-deduplicated conversion funnel |
| `GET /stores/{store_id}/heatmap` | Real-time spatial traffic distribution |
| `GET /stores/{store_id}/anomalies` | Active system alerts based on relative-time lookbacks |
| `GET /health` | System status and feed staleness monitoring |

---

## 🧪 Validation & Reliability

The platform is designed to ensure:

- Idempotent event processing
- Graceful handling of database contention
- Monotonic funnel progression
- Session-level deduplication
- Real-time metric consistency
- Fault-tolerant ingestion pipeline

---

## 🛠 Troubleshooting

### Port 5173 or 8000 Already in Use

If:

```bash
docker compose up -d
```

fails with a port binding error, terminate any locally running:

- Node.js servers
- Vite development servers
- FastAPI/Uvicorn processes

Then retry the command.

---

### Database Is Locked

Do **not** run:

```bash
python run_detection.py
```

directly on the host machine while the API container is running.

Windows and macOS file systems may lock the SQLite database file.

Always execute processing commands through Docker:

```bash
docker compose exec api python run_detection.py --store ST1076 --sample
```

---

## 🏆 Tech Stack

### Computer Vision

- YOLOv8n
- ByteTrack
- OpenCV

### Backend

- FastAPI
- SQLite (WAL)
- Pydantic

### Frontend

- React
- Vite
- Tailwind CSS
- TanStack Query

### Infrastructure

- Docker
- Docker Compose

---

## 📈 Business Impact

Apex Retail transforms raw CCTV streams into actionable store intelligence by measuring:

- Footfall
- Zone engagement
- Queue behavior
- Store conversion rates
- Spatial traffic patterns
- Operational anomalies

This enables physical retail operators to make data-driven decisions similar to modern e-commerce analytics platforms.