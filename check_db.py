from app.repository import get_all_events

events = get_all_events()

for event in events:
    print(
        event.visitor_id,
        event.event_type,
        event.camera_id
    )