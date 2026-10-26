"""Pydantic schemas for Sample Data loading."""

from typing import List, Optional
from pydantic import BaseModel, Field


class SampleDataLoadRequest(BaseModel):
    """Configuration options for sample dataset loading."""

    reset: bool = Field(
        default=False,
        description="If True, removes existing records before importing sample data.",
    )
    dataset_name: Optional[str] = Field(
        default="Standard University Engineering & Science",
        description="Identifier name for the synthetic dataset",
    )


class SampleDataSummaryResponse(BaseModel):
    """Execution summary returned after sample dataset loading."""

    status: str = Field(..., description="'success' or 'skipped'")
    message: str = Field(..., description="Human-readable outcome description")
    dataset_name: str
    exams_created: int = Field(default=0)
    students_created: int = Field(default=0)
    enrolments_created: int = Field(default=0)
    conflict_edges_detected: int = Field(default=0)
    isolated_examinations: List[str] = Field(default_factory=list)
