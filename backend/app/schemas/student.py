"""Pydantic schemas for Student requests and responses."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class StudentBase(BaseModel):
    """Base schema for student attributes."""

    student_id: str = Field(..., min_length=1, max_length=64, description="Unique institutional student ID, e.g. 'S1001'")
    display_name: Optional[str] = Field(default=None, max_length=255, description="Full student name")

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Student ID cannot be empty or whitespace only.")
        return trimmed

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            trimmed = value.strip()
            return trimmed if trimmed else None
        return None


class StudentCreate(StudentBase):
    """Payload to create a new student record."""
    pass


class StudentUpdate(BaseModel):
    """Payload to partially update a student record."""

    student_id: Optional[str] = Field(default=None, min_length=1, max_length=64)
    display_name: Optional[str] = Field(default=None, max_length=255)

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Student ID cannot be empty.")
            return trimmed
        return value

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            trimmed = value.strip()
            return trimmed if trimmed else None
        return None


class StudentResponse(StudentBase):
    """Structured response representation of a student."""

    id: str = Field(..., description="Internal UUID identifier")
    created_at: datetime
    updated_at: datetime
    enrolment_count: int = Field(default=0, description="Total examinations the student is enrolled in")

    model_config = ConfigDict(from_attributes=True)


class StudentListResponse(BaseModel):
    """Paginated list of students."""

    items: List[StudentResponse]
    total: int
    skip: int
    limit: int
