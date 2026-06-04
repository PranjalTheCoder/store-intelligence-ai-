# DESIGN.md

## Architecture Overview
The Apex Retail Intelligence system is decoupled into two primary domains to isolate heavy compute from transactional API traffic:

1. **Edge Detection Pipeline (Computer Vision):** A Python worker that consumes raw video, runs object detection (YOLO) and tracking (ByteTrack), and evaluates spatial-temporal heuristics. It outputs discrete business events (e.g., `ZONE_ENTER`).
2. **Central Intelligence API (FastAPI):** A lightweight REST API backed by a SQLite database running in Write-Ahead-Log (WAL) mode. It ingests events from the pipeline and serves aggregated metrics to the frontend dashboard.



```mermaid
graph TD
    %% Styling
    classDef edgeLayer fill:#1e1e2e,stroke:#89b4fa,stroke-width:2px,color:#cdd6f4;
    classDef apiLayer fill:#11111b,stroke:#a6e3a1,stroke-width:2px,color:#cdd6f4;
    classDef uiLayer fill:#181825,stroke:#f38ba8,stroke-width:2px,color:#cdd6f4;
    classDef storage fill:#313244,stroke:#f9e2af,stroke-width:1px,color:#cdd6f4;

    %% Edge Detection Layer
    subgraph Edge_Pipeline ["📹 Edge Deployment (pipeline/)"]
        A[Raw CCTV Video Feed] --> B[YOLOv8 Nano Engine]
        B -->|Bounding Boxes| C[ByteTrack Object Tracker]
        C -->|Spatial Polygons| D[Spatial Heuristics Engine]
        D -->|Staff & Re-entry Filters| E[Telemetry Generator]
    end
    class Edge_Pipeline,A,B,C,D,E edgeLayer;

    %% Ingestion Stream
    E -->|HTTP POST / JSON Payload| F[FastAPI Ingestion Endpoint]

    %% Central Intelligence API Layer
    subgraph Cloud_API ["🧠 Central Intelligence (app/)"]
        F -->|ASGI Async Worker| G[Pydantic Validation Layer]
        G -->|Idempotency Check| H[SQLAlchemy Core Engine]
        K[Analytical Aggregator] -->|Read Recharts Data| L[Metrics REST Endpoints]
    end
    class Cloud_API,F,G,H,K,L apiLayer;

    %% Storage Layer
    subgraph DB_Storage ["💾 Database Layer"]
        H -->|Atomic Writes| I[(SQLite WAL Mode)]
        I --->|Concurrent Reads| K
    end
    class DB_Storage,I storage;

    %% Presentation Layer
    subgraph Presentation ["💻 Presentation Layer (dashboard/)"]
        M[React UI Client] -->|5s Polling Hook| N[TanStack Query Engine]
        N -->|GET Request| L
        L -->|JSON Response| M
        M --> O[Interactive Spatial Map]
        M --> P[Monotonic Funnel UI]
    end
    class Presentation,M,N,O,P uiLayer;
```

## AI-Assisted Decisions

During development, I utilized Large Language Models (LLMs) as an architectural sounding board. Here is how AI shaped the design, and where I chose to override it:

1. **Staff Detection Strategy**
   * *What AI Suggested:* Deploy a secondary deep learning classifier (e.g., ResNet) or a VLM on cropped bounding boxes to identify store uniforms.
   * *What I Changed:* I explicitly overrode this and implemented a spatial-temporal heuristic engine instead. 
   * *Why:* Running a secondary inference pass halves the pipeline's FPS on edge CPUs. By mapping employee-only zones (like the cash counter interior) and tracking `dwell_time`, the system flags a `visitor_id` as `is_staff=True` if they spend prolonged periods in restricted areas. This achieves the business requirement with zero additional compute overhead.

2. **Database Connection Management**
   * *What AI Suggested:* Standard SQLAlchemy `SessionLocal` dependency injection per request.
   * *What I Changed:* I agreed with the pattern but manually hardened the SQLite engine configuration. I added `pool_pre_ping=True`, `timeout=15`, and explicitly wrapped the FastAPI dependency in a `try/finally: db.close()` block.
   * *Why:* AI often overlooks SQLite file locking issues in concurrent environments. Because the CV pipeline writes heavily while the dashboard polls concurrently every 5 seconds, strict connection lifecycle management was necessary to prevent `OperationalError: database is locked`.

3. **Event Schema Design**
   * *What AI Suggested:* A highly normalized relational schema (separate tables for Stores, Cameras, Zones, Visitors, and Events, connected via Foreign Keys).
   * *What I Changed:* Overridden. I implemented a single, flattened `events` table.
   * *Why:* High-frequency time-series ingestion breaks down on edge devices if the database must execute multi-table joins and constraint checks per video frame. A flat schema optimizes for raw write speed, deferring the aggregation workload to the dashboard read queries.
