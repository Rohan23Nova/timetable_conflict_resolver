"""Pydantic schemas for Timetable Schedule persistence, updates, and export."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.schemas.models import ValidationReport
from backend.app.schemas.scheduling import SlotAssignmentDetail


class ScheduleDateConfig(BaseModel):
    """Optional configuration for mapping abstract chromatic slots to calendar dates and times."""

    start_date: Optional[str] = Field(
        default=None,
        description="Exam period start date in YYYY-MM-DD format, e.g. '2026-12-01'",
    )
    slots_per_day: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Number of discrete exam session slots scheduled per calendar day",
    )
    session_times: List[str] = Field(
        default_factory=lambda: ["09:00 - 12:00", "14:00 - 17:00"],
        description="Human-readable start and end time string for each slot index within a day",
    )
    slot_duration_minutes: int = Field(
        default=180,
        ge=15,
        description="Standard examination duration in minutes",
    )
    slot_break_minutes: int = Field(
        default=120,
        ge=0,
        description="Inter-session break duration between consecutive exams on the same day",
    )
    skip_weekends: bool = Field(
        default=True,
        description="Skip Saturday and Sunday when assigning consecutive days to slots",
    )


class ScheduleCreateRequest(BaseModel):
    """Request payload to persist a validated timetable schedule."""

    name: str = Field(..., min_length=1, max_length=255, description="Schedule name")
    description: Optional[str] = Field(default=None, description="Optional notes or semester description")
    algorithm: str = Field(..., description="Algorithm used to generate the timetable ('greedy' or 'backtracking')")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Algorithm run parameters snapshot")
    slot_assignments: Dict[str, int] = Field(..., description="Mapping of course code to 1-indexed slot")
    slot_details: List[SlotAssignmentDetail] = Field(default_factory=list, description="Course details snapshot")
    slots_used: int = Field(..., ge=1, description="Total number of distinct slots used")
    is_valid: bool = Field(..., description="Validation status reported by engine")
    validation_report: ValidationReport = Field(..., description="Snapshot of independent validation report")
    date_config: Optional[ScheduleDateConfig] = Field(default=None, description="Optional calendar date configuration")


class ScheduleUpdateRequest(BaseModel):
    """Request payload to update schedule metadata or calendar date configuration."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255, description="Updated schedule name")
    description: Optional[str] = Field(default=None, description="Updated description")
    date_config: Optional[ScheduleDateConfig] = Field(default=None, description="Updated calendar date configuration")


class ScheduleSummaryResponse(BaseModel):
    """Compact summary of a saved timetable schedule for listing and selection."""

    id: str = Field(..., description="Unique schedule identifier")
    name: str = Field(..., description="Schedule title")
    description: Optional[str] = Field(default=None, description="Description notes")
    algorithm: str = Field(..., description="Algorithm used ('greedy' or 'backtracking')")
    slots_used: int = Field(..., description="Number of distinct time slots required")
    exam_count: int = Field(..., description="Number of examinations scheduled")
    is_valid: bool = Field(..., description="Whether the schedule was independently verified valid")
    is_stale: bool = Field(..., description="True if source examinations or enrolments changed since generation")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ScheduleDetailResponse(BaseModel):
    """Complete detail view of a persisted timetable schedule including verification snapshot."""

    id: str = Field(..., description="Unique schedule identifier")
    name: str = Field(..., description="Schedule title")
    description: Optional[str] = Field(default=None, description="Description notes")
    algorithm: str = Field(..., description="Algorithm used ('greedy' or 'backtracking')")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Algorithm run parameters snapshot")
    slot_assignments: Dict[str, int] = Field(default_factory=dict, description="Course code to slot map")
    slot_details: List[SlotAssignmentDetail] = Field(default_factory=list, description="Course details snapshot")
    slots_summary: Dict[int, List[str]] = Field(default_factory=dict, description="Slot to course codes map")
    slots_used: int = Field(..., description="Total slots used")
    is_valid: bool = Field(..., description="Independent validation result")
    validation_report: ValidationReport = Field(..., description="Detailed verification snapshot")
    graph_fingerprint: str = Field(..., description="SHA-256 fingerprint of conflict graph at generation")
    is_stale: bool = Field(..., description="True if conflict graph has changed since this timetable was generated")
    current_graph_vertex_count: Optional[int] = Field(default=None, description="Current number of exams in graph")
    current_graph_edge_count: Optional[int] = Field(default=None, description="Current number of conflicts in graph")
    date_config: Optional[ScheduleDateConfig] = Field(default=None, description="Calendar date-time configuration")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
