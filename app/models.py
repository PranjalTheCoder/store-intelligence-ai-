from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Float

from app.database import Base


class Event(Base):

    __tablename__ = "events"

    id = Column(Integer, primary_key=True)

    visitor_id = Column(String)

    event_type = Column(String)

    camera_id = Column(String)

    zone_id = Column(String)

    timestamp = Column(String)

    confidence = Column(Float)

class Session(Base):

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)

    visitor_id = Column(String)

    entry_time = Column(String)

    exit_time = Column(String)

    duration_seconds = Column(Float)