class EventEngine:

    def __init__(self):

        self.previous_positions = {}

        self.generated_events = []


    def process_track(
        self,
        track_id,
        centroid
    ):
        ...