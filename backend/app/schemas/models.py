"""Data schemas and transfer models for SLOTWISE."""

from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class Exam(BaseModel):
    """Represents an examination course or paper."""

    id: str = Field(..., description="Unique examination identifier, e.g. 'CS101'")
    name: Optional[str] = Field(default="", description="Course or examination title")

    def __hash__(self) -> int:
        return hash(self.id)

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, Exam):
            return self.id == other.id
        return False


class Enrolment(BaseModel):
    """Represents a student enrolment in an examination."""

    student_id: str = Field(..., description="Unique student identifier, e.g. 'S1001'")
    exam_id: str = Field(..., description="Examination identifier the student is taking")

    def __hash__(self) -> int:
        return hash((self.student_id, self.exam_id))

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, Enrolment):
            return (self.student_id, self.exam_id) == (other.student_id, other.exam_id)
        return False


class ColoringStatus(str, Enum):
    """Outcome status for graph coloring algorithms."""

    SUCCESS = "SUCCESS"
    INFEASIBLE = "INFEASIBLE"
    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
    INCOMPLETE = "INCOMPLETE"


class ColoringResult(BaseModel):
    """Result returned by timetable coloring algorithms."""

    assignment: Dict[str, int] = Field(
        default_factory=dict,
        description="Mapping from examination ID to assigned time slot / color (1-indexed)",
    )
    color_count: int = Field(
        default=0,
        description="Total number of distinct colors / slots utilized in the assignment",
    )
    status: ColoringStatus = Field(
        ...,
        description="Overall execution status (SUCCESS, INFEASIBLE, LIMIT_EXCEEDED, INCOMPLETE)",
    )
    is_complete: bool = Field(
        default=False,
        description="True if all examinations were successfully assigned a valid conflict-free color",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Algorithm execution diagnostics, timing, node counts, orderings",
    )


class ValidationReport(BaseModel):
    """Structured report returned by the independent schedule validator."""

    is_valid: bool = Field(
        ...,
        description="True if the assignment passes all integrity, completeness, and non-conflict checks",
    )
    errors: List[str] = Field(
        default_factory=list,
        description="Human-readable descriptions of all validation failures detected",
    )
    checks_performed: List[str] = Field(
        default_factory=list,
        description="List of specific check identifiers executed during validation",
    )
    conflicts: List[Tuple[str, str, int]] = Field(
        default_factory=list,
        description="List of detected conflicts: (exam_u, exam_v, shared_color)",
    )
    missing_examinations: List[str] = Field(
        default_factory=list,
        description="Examinations present in graph but missing from assignment",
    )
    unknown_examinations: List[str] = Field(
        default_factory=list,
        description="Examinations present in assignment but not recognized in graph",
    )
    invalid_color_values: List[Tuple[str, Any]] = Field(
        default_factory=list,
        description="Examinations assigned non-integer or non-positive color values",
    )
    out_of_range_colors: List[Tuple[str, int]] = Field(
        default_factory=list,
        description="Examinations assigned colors exceeding configured maximum slots",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional validator context and summary counts",
    )
