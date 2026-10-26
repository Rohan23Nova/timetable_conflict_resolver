"""SQLAlchemy model for student course enrolments."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base

if TYPE_CHECKING:
    from backend.app.models.examination import ExamModel
    from backend.app.models.student import StudentModel


def generate_uuid() -> str:
    """Generate a clean UUID hex string."""
    return uuid.uuid4().hex


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


class EnrolmentModel(Base):
    """Represents a student's enrollment in a specific examination."""

    __tablename__ = "enrolments"
    __table_args__ = (
        UniqueConstraint("student_id", "exam_id", name="uq_student_exam"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid, index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exam_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    student: Mapped["StudentModel"] = relationship(
        "StudentModel", back_populates="enrolments"
    )
    exam: Mapped["ExamModel"] = relationship(
        "ExamModel", back_populates="enrolments"
    )

    def __repr__(self) -> str:
        return f"<EnrolmentModel student_id={self.student_id!r} exam_id={self.exam_id!r}>"
