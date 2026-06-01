from datetime import datetime
import json
from pathlib import Path

class SessionEngine:

    def __init__(self):

        self.active_sessions = {}

        self.completed_sessions = []

        self.output_file = Path(
            "outputs/sessions.jsonl"
        )
        self.output_file.parent.mkdir(
            parents=True,
            exist_ok=True
        )

    def process_event(self, event):

        visitor_id = event["visitor_id"]

        event_type = event["event_type"]

        timestamp = datetime.now()

        if event_type == "ENTRY":

            self.active_sessions[visitor_id] = timestamp

        elif event_type == "EXIT":

            if visitor_id not in self.active_sessions:
                return

            entry_time = self.active_sessions.pop(
                visitor_id
            )

            duration = (
                timestamp - entry_time
            ).total_seconds()

            session = {
                "visitor_id": visitor_id,
                "entry_time": str(entry_time),
                "exit_time": str(timestamp),
                "duration_seconds": duration
            }

            self.completed_sessions.append(
                session
            )

            with open(
                self.output_file,
                "a",
                encoding="utf-8"
            ) as f:

                f.write(
                    json.dumps(session)
                )

                f.write("\n")

            print(
                f"SESSION COMPLETE: {session}"
            )
    