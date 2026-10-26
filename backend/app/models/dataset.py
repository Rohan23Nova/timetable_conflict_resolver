"""SQLAlchemy model for imported dataset metadata."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


def generate_uuid() -> str:
    """Generate a clean UUID hex string."""
    return uuid.uuid4().hex


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


class DatasetMetadataModel(Base):
    """Tracks metadata and metrics of imported or synthetic sample datasets."""

    __tablename__ = "dataset_metadata"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid, index=True
    )
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    exam_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    student_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    enrolment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    conflict_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    def __repr__(self) -> str:
        return f"<DatasetMetadataModel name={self.name!r} exams={self.exam_count}>"
