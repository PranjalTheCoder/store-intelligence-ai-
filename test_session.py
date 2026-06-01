from app.repository import create_session

create_session(
    visitor_id="Customer-1",
    entry_time="2026-04-10T20:00:00",
    exit_time="2026-04-10T20:15:00",
    duration_seconds=900
)

print("Session inserted")