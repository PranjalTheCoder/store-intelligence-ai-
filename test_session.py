# test_sessions.py

from app.database import SessionLocal
from app.models import Session

db = SessionLocal()

sessions = db.query(Session).all()

print(f"Total sessions: {len(sessions)}")

for s in sessions:
    print(
        s.visitor_id,
        s.entry_time,
        s.exit_time,
        s.duration_seconds
    )

db.close()