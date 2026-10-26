"""Pydantic schemas for Examination requests and responses."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExamBase(BaseModel):
    """Base schema for examination attributes."""

    code: str = Field(..., min_length=1, max_length=64, description="Unique course/exam code, e.g. 'CS101'")
    name: str = Field(..., min_length=1, max_length=255, description="Full subject or examination title")
    department: Optional[str] = Field(default=None, max_length=128, description="Academic department or faculty")
    semester: Optional[str] = Field(default=None, max_length=64, description="Academic term, e.g. 'Fall 2026'")
    duration: Optional[int] = Field(default=None, ge=1, le=600, description="Exam duration in minutes (1 - 600)")

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Examination code cannot be empty or whitespace only.")
        return trimmed

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Examination name cannot be empty or whitespace only.")
        return trimmed


class ExamCreate(ExamBase):
    """Payload to create a new examination."""
    pass


class ExamUpdate(BaseModel):
    """Payload to partially update an examination."""

    code: Optional[str] = Field(default=None, min_length=1, max_length=64)
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    department: Optional[str] = Field(default=None, max_length=128)
    semester: Optional[str] = Field(default=None, max_length=64)
    duration: Optional[int] = Field(default=None, ge=1, le=600)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Examination code cannot be empty.")
            return trimmed
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Examination name cannot be empty.")
            return trimmed
        return value


class ExamResponse(ExamBase):
    """Structured response representation of an examination."""

    id: str = Field(..., description="Internal UUID identifier")
    created_at: datetime
    updated_at: datetime
    enrolment_count: int = Field(default=0, description="Total students enrolled in this examination")

    model_config = ConfigDict(from_attributes=True)


class ExamListResponse(BaseModel):
    """Paginated list of examinations."""

    items: List[ExamResponse]
    total: int
    skip: int
    limit: int
