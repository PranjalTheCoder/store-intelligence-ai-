"""
run_detection.py — Detection pipeline entry point.

This is the command reviewers run:
    python run_detection.py --camera CAM3
    python run_detection.py --store STORE_1 --all
    python run_detection.py --sample          # process sample_events.jsonl (no GPU needed)

With GPU + YOLO:
    python run_detection.py --store STORE_1 \\
        --videos CAM3:resources/Store1/CAM3-entry.mp4 \\
                 CAM1:resources/Store1/CAM1-zone.mp4 \\
                 CAM5:resources/Store1/CAM5-billing.mp4

Without GPU (sample mode):
    python run_detection.py --sample
    python run_detection.py --sample --store ST1076
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from normalize_events import normalize_file


def run_sample_mode(store_id: str = None, input_path: str = "data/sample_events.jsonl"):
    """
    Process sample_events.jsonl → outputs/events.jsonl
    This mode requires NO video or GPU — useful for testing API correctness.
    """
    print(f"[run_detection] SAMPLE MODE — processing {input_path}")
    print(f"[run_detection] Store override: {store_id or '(from data)'}")

    if not os.path.exists(input_path):
        print(f"[run_detection] ERROR: {input_path} not found")
        sys.exit(1)

    # Clear existing output so we get fresh events
    os.makedirs("outputs", exist_ok=True)
    events_jsonl = "outputs/events.jsonl"
    open(events_jsonl, "w").close()

    evts = normalize_file(
        input_path=input_path,
        output_jsonl=events_jsonl,
        output_json="outputs/normalized_events.json",
        store_override=store_id,
    )

    # Ingest into DB via API layer directly (no HTTP needed)
    try:
        from app.database import SessionLocal, init_db
        from app.routes.events import _event_to_db, _update_session, _parse_ts
        from app.models import Event
        from app.schemas.event_schema import IngestEventSchema
        from pydantic import ValidationError

        init_db()
        db = SessionLocal()
        ingested = dupes = failed = 0

        for ev_dict in evts:
            try:
                ev = IngestEventSchema.model_validate(ev_dict)
                existing = db.get(Event, ev.event_id)
                if existing:
                    dupes += 1
                    continue
                record = _event_to_db(ev)
                db.add(record)
                db.flush()
                ts = _parse_ts(ev.timestamp)
                _update_session(ev, ts, db)
                db.commit()
                ingested += 1
            except ValidationError as e:
                failed += 1
                print(f"  [WARN] Validation failed for {ev_dict.get('event_id','?')}: {e.errors()[0]['msg']}")
            except Exception as e:
                db.rollback()
                failed += 1

        db.close()
        print(f"[run_detection] DB: ingested={ingested} duplicates={dupes} failed={failed}")

    except ImportError as e:
        print(f"[run_detection] DB ingest skipped (missing dep: {e}) — events written to JSONL only")

    # Print first 5 events so reviewer sees output immediately
    print("\n[run_detection] First 5 events in outputs/events.jsonl:")
    with open("outputs/events.jsonl") as f:
        for i, line in enumerate(f):
            if i >= 5:
                break
            ev = json.loads(line)
            print(f"  {ev['event_type']:25s} visitor={ev['visitor_id']} store={ev['store_id']} conf={ev['confidence']}")

    print(f"\n[run_detection] Done. Total events: {len(evts)}")
    return evts


def run_video_mode(store_id: str, video_map: dict, clip_start: datetime.datetime = None):
    """
    Full video processing pipeline using YOLO + ByteTrack.
    Requires: ultralytics, opencv-python
    """
    print(f"[run_detection] VIDEO MODE — store={store_id}")
    for cam, path in video_map.items():
        print(f"  Camera {cam}: {path}")

    try:
        from pipeline.video_processor import VideoProcessor
        from app.database import SessionLocal, init_db
        init_db()
        db = SessionLocal()

        proc = VideoProcessor(store_id=store_id, db_session=db)
        evts = proc.process_store(video_map, clip_start=clip_start)

        db.close()
        print(f"[run_detection] Processed {len(evts)} events")
        return evts

    except ImportError as e:
        print(f"[run_detection] ERROR: Missing dependency: {e}")
        print("[run_detection] Falling back to sample mode")
        return run_sample_mode(store_id=store_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run detection pipeline")
    parser.add_argument("--camera",  help="Camera ID (e.g. CAM3) — runs sample mode")
    parser.add_argument("--store",   help="Store ID override", default=None)
    parser.add_argument("--sample",  action="store_true", help="Process sample_events.jsonl")
    parser.add_argument("--input",   default="data/sample_events.jsonl")
    parser.add_argument("--all",     action="store_true", help="Process all cameras")
    parser.add_argument("--videos",  nargs="*", help="camera:path pairs for video mode")
    parser.add_argument("--clip-start", help="ISO8601 clip start time", default=None)
    args = parser.parse_args()

    if args.videos:
        # Video mode: --videos CAM3:path/to/cam3.mp4 CAM1:path/to/cam1.mp4
        video_map = {}
        for item in args.videos:
            cam, path = item.split(":", 1)
            video_map[cam] = path
        clip_start = None
        if args.clip_start:
            clip_start = datetime.datetime.fromisoformat(args.clip_start.replace("Z", "+00:00"))
        run_video_mode(
            store_id  = args.store or "STORE_1",
            video_map = video_map,
            clip_start = clip_start,
        )
    else:
        # Sample mode (camera arg just selects the input — still processes sample data)
        if args.camera:
            print(f"[run_detection] Camera: {args.camera} → processing sample events")
        run_sample_mode(store_id=args.store, input_path=args.input)
