"""Schemas package exports for SLOTWISE."""

# Phase 1 Algorithm Schemas
from backend.app.schemas.models import (
    ColoringResult,
    ColoringStatus,
    Enrolment,
    Exam,
    ValidationReport,
)

# Phase 4 Persistent Domain Schemas
from backend.app.schemas.enrolment import (
    EnrolmentCreate,
    EnrolmentListResponse,
    EnrolmentResponse,
)
from backend.app.schemas.examination import (
    ExamCreate,
    ExamListResponse,
    ExamResponse,
    ExamUpdate,
)
from backend.app.schemas.graph import (
    ConflictGraphResponse,
    GraphEdge,
    GraphVertex,
)
from backend.app.schemas.health import HealthResponse
from backend.app.schemas.sample_data import (
    SampleDataLoadRequest,
    SampleDataSummaryResponse,
)
from backend.app.schemas.student import (
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentUpdate,
)

__all__ = [
    # Phase 1
    "Exam",
    "Enrolment",
    "ColoringStatus",
    "ColoringResult",
    "ValidationReport",
    # Phase 4
    "ExamCreate",
    "ExamUpdate",
    "ExamResponse",
    "ExamListResponse",
    "StudentCreate",
    "StudentUpdate",
    "StudentResponse",
    "StudentListResponse",
    "EnrolmentCreate",
    "EnrolmentResponse",
    "EnrolmentListResponse",
    "ConflictGraphResponse",
    "GraphVertex",
    "GraphEdge",
    "SampleDataLoadRequest",
    "SampleDataSummaryResponse",
    "HealthResponse",
]
