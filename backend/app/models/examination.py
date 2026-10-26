"""SQLAlchemy model for Examinations."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base

if TYPE_CHECKING:
    from backend.app.models.enrolment import EnrolmentModel


def generate_uuid() -> str:
    """Generate a clean UUID hex string."""
    return uuid.uuid4().hex


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


class ExamModel(Base):
    """Represents a scheduled academic course or examination."""

    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid, index=True
    )
    code: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    semester: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    duration: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, comment="Duration in minutes"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    enrolments: Mapped[List["EnrolmentModel"]] = relationship(
        "EnrolmentModel",
        back_populates="exam",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<ExamModel code={self.code!r} name={self.name!r}>"
