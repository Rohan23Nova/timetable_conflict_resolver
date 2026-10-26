"""Pydantic schemas for Enrolment requests and responses."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class EnrolmentCreate(BaseModel):
    """Payload to enroll a student in an examination."""

    student_id: str = Field(
        ...,
        min_length=1,
        description="Target student UUID or institutional student_id (e.g. 'S1001')",
    )
    exam_id: str = Field(
        ...,
        min_length=1,
        description="Target examination UUID or examination code (e.g. 'CS101')",
    )

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Student reference cannot be empty.")
        return trimmed

    @field_validator("exam_id")
    @classmethod
    def validate_exam_id(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Examination reference cannot be empty.")
        return trimmed


class EnrolmentResponse(BaseModel):
    """Structured response representation of a student enrolment."""

    id: str = Field(..., description="Internal enrolment UUID identifier")
    student_id: str = Field(..., description="Internal student UUID")
    student_identifier: str = Field(..., description="Institutional student ID, e.g. 'S1001'")
    student_name: Optional[str] = Field(default=None, description="Student display name")
    exam_id: str = Field(..., description="Internal examination UUID")
    exam_code: str = Field(..., description="Examination course code, e.g. 'CS101'")
    exam_name: str = Field(..., description="Course title")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EnrolmentListResponse(BaseModel):
    """Paginated list of student enrolments."""

    items: List[EnrolmentResponse]
    total: int
    skip: int
    limit: int
