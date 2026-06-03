"""
SQLAlchemy models — upgraded to full challenge schema.
Extends existing models; does NOT remove any prior fields.
"""

from sqlalchemy import (
    Column, String, Float, Integer, Boolean,
    DateTime, JSON, Text, Index, UniqueConstraint
)
from sqlalchemy.orm import declarative_base
import datetime

Base = declarative_base()


class Event(Base):
    """
    Every pipeline event — ENTRY, EXIT, ZONE_ENTER, ZONE_EXIT,
    ZONE_DWELL, BILLING_QUEUE_JOIN, BILLING_QUEUE_ABANDON, REENTRY.
    """
    __tablename__ = "events"

    # --- primary key ---
    event_id       = Column(String(36), primary_key=True)       # uuid-v4

    # --- identifiers ---
    store_id       = Column(String(64), nullable=False, index=True)
    camera_id      = Column(String(64), nullable=False)
    visitor_id     = Column(String(64), nullable=False, index=True)

    # --- event classification ---
    event_type     = Column(String(32), nullable=False, index=True)
    timestamp      = Column(DateTime, nullable=False, index=True)

    # --- zone data ---
    zone_id        = Column(String(64), nullable=True)
    dwell_ms       = Column(Integer, default=0)

    # --- person attributes ---
    is_staff       = Column(Boolean, default=False, index=True)
    confidence     = Column(Float, default=1.0)

    # --- rich metadata stored as JSON blob ---
    metadata_json  = Column(JSON, default=dict)     # queue_depth, sku_zone, session_seq

    # --- demographics (from sample events) ---
    gender_pred    = Column(String(8),  nullable=True)
    age_pred       = Column(Integer,    nullable=True)
    age_bucket     = Column(String(16), nullable=True)

    # --- group info ---
    group_id       = Column(String(32), nullable=True)
    group_size     = Column(Integer,    nullable=True)

    created_at     = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_events_store_ts", "store_id", "timestamp"),
        Index("ix_events_visitor_type", "visitor_id", "event_type"),
    )

    def to_api_dict(self):
        """Serialise to the challenge event schema."""
        meta = self.metadata_json or {}
        return {
            "event_id":   self.event_id,
            "store_id":   self.store_id,
            "camera_id":  self.camera_id,
            "visitor_id": self.visitor_id,
            "event_type": self.event_type,
            "timestamp":  self.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if self.timestamp else None,
            "zone_id":    self.zone_id,
            "dwell_ms":   self.dwell_ms or 0,
            "is_staff":   self.is_staff,
            "confidence": round(self.confidence or 1.0, 4),
            "metadata": {
                "queue_depth":   meta.get("queue_depth"),
                "sku_zone":      meta.get("sku_zone"),
                "session_seq":   meta.get("session_seq"),
                "gender_pred":   self.gender_pred,
                "age_bucket":    self.age_bucket,
                "group_id":      self.group_id,
                "group_size":    self.group_size,
            },
        }


class Session(Base):
    """One visit session per visitor per store."""
    __tablename__ = "sessions"

    session_id      = Column(String(36), primary_key=True)
    visitor_id      = Column(String(64), nullable=False, index=True)
    store_id        = Column(String(64), nullable=False, index=True)

    entry_time      = Column(DateTime, nullable=True)
    exit_time       = Column(DateTime, nullable=True)
    duration_sec    = Column(Integer,  default=0)

    zones_visited   = Column(JSON,    default=list)   # list of zone_ids
    is_staff        = Column(Boolean, default=False)
    converted       = Column(Boolean, default=False)  # POS correlation result

    # POS fields
    transaction_id  = Column(String(64), nullable=True)
    basket_value    = Column(Float,       default=0.0)

    # re-entry counter
    reentry_count   = Column(Integer, default=0)

    created_at      = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_sessions_store_entry", "store_id", "entry_time"),
    )

    def to_api_dict(self):
        return {
            "session_id":    self.session_id,
            "visitor_id":    self.visitor_id,
            "store_id":      self.store_id,
            "entry_time":    self.entry_time.strftime("%Y-%m-%dT%H:%M:%SZ") if self.entry_time else None,
            "exit_time":     self.exit_time.strftime("%Y-%m-%dT%H:%M:%SZ") if self.exit_time else None,
            "duration_sec":  self.duration_sec,
            "zones_visited": self.zones_visited or [],
            "is_staff":      self.is_staff,
            "converted":     self.converted,
            "transaction_id": self.transaction_id,
            "basket_value":  self.basket_value,
            "reentry_count": self.reentry_count,
        }


class ZoneStat(Base):
    """Per-zone aggregate statistics, updated on each ZONE_EXIT."""
    __tablename__ = "zone_stats"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    store_id        = Column(String(64), nullable=False, index=True)
    zone_id         = Column(String(64), nullable=False, index=True)
    zone_name       = Column(String(128), nullable=True)

    total_visits    = Column(Integer, default=0)
    total_dwell_ms  = Column(Integer, default=0)
    avg_dwell_ms    = Column(Float,   default=0.0)
    unique_visitors = Column(Integer, default=0)
    heatmap_score   = Column(Float,   default=0.0)

    last_updated    = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("store_id", "zone_id", name="uq_zone_stat"),
    )

    def to_api_dict(self):
        return {
            "store_id":       self.store_id,
            "zone_id":        self.zone_id,
            "zone_name":      self.zone_name,
            "total_visits":   self.total_visits,
            "avg_dwell_ms":   round(self.avg_dwell_ms, 1),
            "unique_visitors": self.unique_visitors,
            "heatmap_score":  round(self.heatmap_score, 4),
            "last_updated":   self.last_updated.strftime("%Y-%m-%dT%H:%M:%SZ") if self.last_updated else None,
        }


class POSTransaction(Base):
    """Loaded from pos_transactions.csv; used for POS correlation."""
    __tablename__ = "pos_transactions"

    transaction_id   = Column(String(64), primary_key=True)
    store_id         = Column(String(64), nullable=False, index=True)
    timestamp        = Column(DateTime,   nullable=False, index=True)
    basket_value_inr = Column(Float,      default=0.0)

    # back-filled after correlation
    matched_visitor_id  = Column(String(64), nullable=True)
    matched_session_id  = Column(String(36), nullable=True)

    def to_api_dict(self):
        return {
            "transaction_id":      self.transaction_id,
            "store_id":            self.store_id,
            "timestamp":           self.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if self.timestamp else None,
            "basket_value_inr":    self.basket_value_inr,
            "matched_visitor_id":  self.matched_visitor_id,
            "matched_session_id":  self.matched_session_id,
        }


class Alert(Base):
    """System-generated alerts (queue overflow, anomalies, etc.)."""
    __tablename__ = "alerts"

    alert_id    = Column(String(36), primary_key=True)
    store_id    = Column(String(64), nullable=False, index=True)
    alert_type  = Column(String(64), nullable=False)
    severity    = Column(String(16), default="INFO")  # INFO / WARNING / CRITICAL
    message     = Column(Text,       nullable=True)
    metadata_json = Column(JSON,     default=dict)
    resolved    = Column(Boolean,    default=False)
    created_at  = Column(DateTime,   default=datetime.datetime.utcnow)

    def to_api_dict(self):
        return {
            "alert_id":   self.alert_id,
            "store_id":   self.store_id,
            "alert_type": self.alert_type,
            "severity":   self.severity,
            "message":    self.message,
            "metadata":   self.metadata_json or {},
            "resolved":   self.resolved,
            "created_at": self.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.created_at else None,
        }
