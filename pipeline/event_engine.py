from pipeline.config import ENTRY_LINE_Y
import json
from pathlib import Path
from datetime import datetime
from pipeline.session_engine import SessionEngine
from app.repository import (
    create_event,
    create_session
)

class EventEngine:

    def __init__(self):

        # track_id -> previous y coordinate
        self.previous_y = {}

        # generated events
        self.generated_events = []

        # prevents duplicate ENTRY/EXIT
        self.track_state = {}
        self.output_file = Path("outputs/events.jsonl")

        self.active_sessions = {}

        self.session_engine = SessionEngine()

        self.output_file.parent.mkdir(
            parents=True,
            exist_ok=True
        )

    def process_track(
        self,
        track_id,
        centroid,
        event_timestamp
    ):

        cx, cy = centroid

        # first observation
        if track_id not in self.previous_y:

            self.previous_y[track_id] = cy

            if cy < ENTRY_LINE_Y:
                self.track_state[track_id] = "INSIDE"
            else:
                self.track_state[track_id] = "OUTSIDE"

            return

        previous_y = self.previous_y[track_id]

        # print(
        #     f"Track={track_id} PrevY={previous_y} CurrY={cy}"
        # )

        current_state = self.track_state.get(
            track_id,
            "UNKNOWN"
        )

        # ----------------------------------
        # ENTRY
        # ----------------------------------
        if (
            previous_y > ENTRY_LINE_Y
            and cy < ENTRY_LINE_Y
            and current_state != "INSIDE"
        ):
            entry_time = datetime.utcnow()

            self.active_sessions[track_id] = entry_time

            event = {
                "visitor_id": f"Customer-{track_id}",
                "event_type": "ENTRY",
                "camera_id": "CAM3",
                "timestamp": event_timestamp.isoformat()
            }

            self.generated_events.append(event)

            self.save_event(event)
            self.session_engine.process_event(
                event
            )
            create_event(
                visitor_id=f"Customer-{track_id}",
                event_type="ENTRY",
                camera_id="CAM3",
                zone_id="ENTRY_GATE",
                timestamp=entry_time.isoformat(),
                confidence=1.0
            )

            # print(
            #     f"ENTRY | Customer-{track_id}"
            # )

            self.track_state[track_id] = "INSIDE"

        # ----------------------------------
        # EXIT
        # ----------------------------------
        elif (
            previous_y < ENTRY_LINE_Y
            and cy > ENTRY_LINE_Y
            and current_state != "OUTSIDE"
        ):
            exit_time = datetime.utcnow()

            event = {
                "visitor_id": f"Customer-{track_id}",
                "event_type": "EXIT",
                "camera_id": "CAM3",
                "timestamp": event_timestamp.isoformat()
            }

            self.generated_events.append(event)

            self.save_event(event)

            self.session_engine.process_event(
                event
            )

            create_event(
                visitor_id=f"Customer-{track_id}",
                event_type="EXIT",
                camera_id="CAM3",
                zone_id="ENTRY_GATE",
                timestamp=exit_time.isoformat(),
                confidence=1.0
            )

            if track_id in self.active_sessions:

                entry_time = self.active_sessions[track_id]

                duration_seconds = (
                    exit_time - entry_time
                ).total_seconds()

                create_session(
                    visitor_id=f"Customer-{track_id}",
                    entry_time=entry_time.isoformat(),
                    exit_time=exit_time.isoformat(),
                    duration_seconds=duration_seconds
                )

                del self.active_sessions[track_id]

                print(
                    f"SESSION CREATED | "
                    f"Customer-{track_id} | "
                    f"{duration_seconds:.2f}s"
                )

            # print(
            #     f"EXIT | Customer-{track_id}"
            # )

            self.track_state[track_id] = "OUTSIDE"

        self.previous_y[track_id] = cy

    def save_event(self, event):

        with open(
            self.output_file,
            "a",
            encoding="utf-8"
        ) as f:

            f.write(
                json.dumps(event)
            )

            f.write("\n")

    def finalize_sessions(self):

        end_time = datetime.utcnow()

        for track_id, entry_time in self.active_sessions.items():

            duration_seconds = (
                end_time - entry_time
            ).total_seconds()

            create_session(
                visitor_id=f"Customer-{track_id}",
                entry_time=entry_time.isoformat(),
                exit_time=end_time.isoformat(),
                duration_seconds=duration_seconds
            )

            print(
                f"AUTO SESSION CLOSED | "
                f"Customer-{track_id} | "
                f"{duration_seconds:.2f}s"
            )

        self.active_sessions.clear()