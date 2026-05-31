from dataclasses import dataclass
from datetime import datetime


@dataclass
class Event:

    visitor_id: str

    event_type: str

    camera_id: str

    zone_id: str

    timestamp: str

    confidence: float