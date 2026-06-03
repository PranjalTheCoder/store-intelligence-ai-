"""
event_schema.py — Pydantic v2 schemas for event ingestion and validation.
"""
from __future__ import annotations

import re
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

VALID_EVENT_TYPES = {
    "ENTRY", "EXIT", "ZONE_ENTER", "ZONE_EXIT",
    "ZONE_DWELL", "BILLING_QUEUE_JOIN", "BILLING_QUEUE_ABANDON", "REENTRY",
}


class EventMetadataSchema(BaseModel):
    queue_depth:  Optional[int]   = None
    sku_zone:     Optional[str]   = None
    session_seq:  Optional[int]   = None

    model_config = {"extra": "allow"}   # allow additional fields from pipeline


class IngestEventSchema(BaseModel):
    event_id:   str
    store_id:   str
    camera_id:  str
    visitor_id: str
    event_type: str
    timestamp:  str
    zone_id:    Optional[str]          = None
    dwell_ms:   int                    = 0
    is_staff:   bool                   = False
    confidence: float                  = Field(default=1.0, ge=0.0, le=1.0)
    metadata:   EventMetadataSchema    = Field(default_factory=EventMetadataSchema)

    @field_validator("event_id")
    @classmethod
    def validate_event_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("event_id cannot be empty")
        return v

    @field_validator("store_id", "camera_id", "visitor_id")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("field cannot be empty")
        return v.strip()

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        v = v.upper().strip()
        if v not in VALID_EVENT_TYPES:
            raise ValueError(f"unknown event_type '{v}'. Must be one of {VALID_EVENT_TYPES}")
        return v

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        import datetime
        s = v.strip()
        # Direct matching against allowed challenge formats
        for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%fZ",
                    "%Y-%m-%dT%H:%M:%S+00:00", "%Y-%m-%dT%H:%M:%S", 
                    "%Y-%m-%d %H:%M:%S"):
            try:
                datetime.datetime.strptime(s, fmt)
                return v
            except ValueError:
                pass
        
        # Catch-all robust ISO parsing fallback
        try:
            datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
            return v
        except ValueError:
            pass
            
        raise ValueError(f"timestamp '{v}' not in ISO-8601 format")

    @model_validator(mode="after")
    def zone_required_for_zone_events(self) -> "IngestEventSchema":
        zone_event_types = {"ZONE_ENTER", "ZONE_EXIT", "ZONE_DWELL"}
        if self.event_type in zone_event_types and not self.zone_id:
            raise ValueError(f"zone_id is required for event_type={self.event_type}")
        return self


class IngestBatchSchema(BaseModel):
    events: List[IngestEventSchema] = Field(..., max_length=500)

    @field_validator("events")
    @classmethod
    def not_empty(cls, v):
        if not v:
            raise ValueError("events list cannot be empty")
        return v


class IngestErrorDetail(BaseModel):
    event_id: Optional[str] = None
    index:    int
    reason:   str


class IngestResponse(BaseModel):
    ingested:   int
    duplicates: int
    failed:     int
    errors:     List[IngestErrorDetail] = []
