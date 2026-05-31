import json

from app.repository import create_event

with open(
    "outputs/events.jsonl",
    "r",
    encoding="utf-8"
) as f:

    for line in f:

        event = json.loads(line)

        create_event(
            visitor_id=event["visitor_id"],
            event_type=event["event_type"],
            camera_id=event["camera_id"],
            zone_id="ENTRY_GATE",
            timestamp="2026-04-10T20:10:15",
            confidence=1.0
        )

print("Events loaded")