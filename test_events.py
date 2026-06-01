# test_events.py

from app.repository import get_all_events

events = get_all_events()

print(f"Total events: {len(events)}")

for event in events[-10:]:
    print(
        event.id,
        event.visitor_id,
        event.event_type,
        event.timestamp
    )