# test_db.py

from app.repository import get_all_events

events = get_all_events()

print("Total Events:", len(events))

for event in events[:5]:
    print(
        event.visitor_id,
        event.event_type
    )