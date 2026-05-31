from pipeline.config import ENTRY_LINE_Y
import json
from pathlib import Path

class EventEngine:

    def __init__(self):

        # track_id -> previous y coordinate
        self.previous_y = {}

        # generated events
        self.generated_events = []

        # prevents duplicate ENTRY/EXIT
        self.track_state = {}
        self.output_file = Path("outputs/events.jsonl")

        self.output_file.parent.mkdir(
            parents=True,
            exist_ok=True
        )

    def process_track(
        self,
        track_id,
        centroid
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

            event = {
                "visitor_id": f"Customer-{track_id}",
                "event_type": "ENTRY",
                "camera_id": "CAM3"
            }

            self.generated_events.append(event)

            self.save_event(event)

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

            event = {
                "visitor_id": f"Customer-{track_id}",
                "event_type": "EXIT",
                "camera_id": "CAM3"
            }

            self.generated_events.append(event)

            self.save_event(event)

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