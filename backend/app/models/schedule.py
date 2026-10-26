"""SQLAlchemy model for Saved Timetable Schedules."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


def generate_uuid() -> str:
    """Generate a clean UUID hex string."""
    return uuid.uuid4().hex


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


class SavedSchedule(Base):
    """Represents a persisted, verified university examination schedule."""

    __tablename__ = "schedules"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    algorithm: Mapped[str] = mapped_column(String(50), nullable=False)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    
    # Slot assignments: {"CS101": 1, "MATH201": 2, ...}
    slot_assignments: Mapped[Dict[str, int]] = mapped_column(JSON, nullable=False, default=dict)
    
    # Detailed course assignments with metadata snapshots
    slot_details: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    
    # Chromatic summary metrics
    slots_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    validation_report: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    
    # Fingerprint of graph state (SHA-256 of vertices & weighted edges) at time of generation
    graph_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    
    # Optional calendar date-time configuration:
    # e.g. {"start_date": "2026-12-01", "slots_per_day": 2, "session_times": ["09:00 - 12:00", "14:00 - 17:00"], ...}
    date_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    def __repr__(self) -> str:
        return f"<SavedSchedule id={self.id!r} name={self.name!r} slots={self.slots_used}>"
