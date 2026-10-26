from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from backend.app.schemas.models import ValidationReport


class SlotAssignmentDetail(BaseModel):
    """Detailed slot assignment entry for an individual examination."""

    exam_code: str = Field(..., description="Unique course examination code, e.g. 'CS101'")
    exam_name: str = Field(default="", description="Course title")
    slot: int = Field(..., description="1-indexed assigned time slot / color")
    department: Optional[str] = Field(default=None, description="Academic department")
    semester: Optional[str] = Field(default=None, description="Course semester")
    degree: int = Field(default=0, description="Conflict degree d(v) in the conflict graph")


class ScheduleRunRequest(BaseModel):
    """Request payload to execute a timetable graph coloring algorithm."""

    algorithm: Literal["greedy", "backtracking"] = Field(
        default="greedy",
        description="Scheduling algorithm to execute ('greedy' or 'backtracking')",
    )
    ordering_strategy: Literal["descending_degree", "natural"] = Field(
        default="descending_degree",
        description="Vertex ordering strategy ('descending_degree' or 'natural')",
    )
    max_colors: Optional[int] = Field(
        default=None,
        ge=1,
        description="Maximum available time slots (k). If omitted for greedy, unconstrained lowest slots are used.",
    )
    max_nodes: Optional[int] = Field(
        default=100000,
        ge=1,
        description="Maximum decision states explored before backtracking halts safely.",
    )
    timeout_seconds: Optional[float] = Field(
        default=5.0,
        gt=0,
        le=30.0,
        description="Maximum execution timeout in seconds for backtracking search.",
    )


class ScheduleCompareRequest(BaseModel):
    """Request payload to execute and compare both algorithms side-by-side."""

    ordering_strategy: Literal["descending_degree", "natural"] = Field(
        default="descending_degree",
        description="Vertex ordering strategy used for both algorithms",
    )
    max_colors: Optional[int] = Field(
        default=None,
        ge=1,
        description="Maximum available time slots applied to both algorithms",
    )
    max_nodes: Optional[int] = Field(
        default=100000,
        ge=1,
        description="Maximum search nodes allowed for backtracking",
    )
    timeout_seconds: Optional[float] = Field(
        default=5.0,
        gt=0,
        le=30.0,
        description="Search timeout in seconds for backtracking",
    )


class ScheduleRunResponse(BaseModel):
    """Execution output, diagnostics, and independent validation report for a scheduling run."""

    run_id: str = Field(..., description="Unique run identifier")
    algorithm: str = Field(..., description="Algorithm used ('greedy' or 'backtracking')")
    ordering_strategy: str = Field(..., description="Ordering heuristic used")
    max_colors: Optional[int] = Field(default=None, description="Configured slot limit constraint")
    status: str = Field(
        ...,
        description="Run status: 'COMPLETED', 'INFEASIBLE', 'RESOURCE_LIMITED', or 'INCOMPLETE'",
    )
    is_complete: bool = Field(
        ...,
        description="True if all examinations were successfully assigned conflict-free slots",
    )
    is_valid: bool = Field(
        ...,
        description="True if independent validator confirmed zero conflicts, completeness, and integrity",
    )
    slots_used: int = Field(default=0, description="Total distinct time slots required")
    slot_assignments: Dict[str, int] = Field(
        default_factory=dict,
        description="Mapping from exam code to assigned time slot (1-indexed)",
    )
    slot_details: List[SlotAssignmentDetail] = Field(
        default_factory=list,
        description="Detailed list of assigned courses with metadata",
    )
    slots_summary: Dict[int, List[str]] = Field(
        default_factory=dict,
        description="Mapping from time slot index to list of scheduled course codes",
    )
    execution_time_ms: float = Field(
        ...,
        description="Algorithm execution duration in milliseconds (measured via high-resolution timer)",
    )
    vertex_count: int = Field(..., description="Number of examinations in conflict graph")
    edge_count: int = Field(..., description="Number of student conflict edges in graph")
    validation_report: ValidationReport = Field(
        ...,
        description="Independent schedule validation report",
    )
    statistics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Instrumented search statistics (e.g. nodes explored, backtracks, bottlenecks)",
    )
    explanation: str = Field(
        ...,
        description="Plain-language explanation of algorithm behavior, optimality, and validation result",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the run was performed",
    )


class ScheduleCompareResponse(BaseModel):
    """Side-by-side comparative benchmark between Greedy Coloring and Exact Backtracking."""

    compare_id: str = Field(..., description="Unique benchmark execution identifier")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Benchmark execution timestamp",
    )
    vertex_count: int = Field(..., description="Examinations present during benchmark")
    edge_count: int = Field(..., description="Student conflict edges during benchmark")
    max_colors_constraint: Optional[int] = Field(
        default=None,
        description="Common slot constraint tested",
    )
    greedy_result: ScheduleRunResponse = Field(
        ...,
        description="Results from Greedy Coloring execution",
    )
    backtracking_result: ScheduleRunResponse = Field(
        ...,
        description="Results from Backtracking search execution",
    )
    summary_explanation: str = Field(
        ...,
        description="Comparative synthesis evaluating slot efficiency, computation time, and search trade-offs",
    )
