"""Pydantic schemas for CSV Data Import, Validation, and Sample Dataset Studio."""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

ImportType = Literal["exams", "students", "enrolments"]
ImportStrategy = Literal["atomic", "valid_only"]
RowValidationStatus = Literal["valid", "error", "warning"]


class ImportRowValidation(BaseModel):
    """Validation report for an individual row parsed from an uploaded CSV file."""

    row_number: int = Field(..., description="1-indexed row number from the CSV file (row 1 is header)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Raw column key-value pairs for the row")
    status: RowValidationStatus = Field(..., description="'valid', 'error', or 'warning'")
    errors: List[str] = Field(default_factory=list, description="Fatal validation errors preventing row import")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings (e.g. duplicate skipped)")


class ImportPreviewResponse(BaseModel):
    """Response returned upon parsing and validating an uploaded CSV file."""

    preview_id: str = Field(..., description="Unique temporary preview token identifying validated batch")
    import_type: ImportType = Field(..., description="Type of data imported ('exams', 'students', 'enrolments')")
    filename: str = Field(..., description="Original uploaded filename")
    total_rows: int = Field(..., description="Total data rows parsed (excluding header)")
    valid_rows: int = Field(..., description="Count of rows passing all validations")
    invalid_rows: int = Field(..., description="Count of rows with fatal validation errors")
    warning_rows: int = Field(..., description="Count of rows with non-fatal warnings")
    can_commit_atomic: bool = Field(..., description="True if batch has 0 errors and can be committed atomically")
    can_commit_valid_only: bool = Field(..., description="True if at least one row is valid")
    column_headers: List[str] = Field(default_factory=list, description="Detected CSV column headers")
    missing_required_headers: List[str] = Field(default_factory=list, description="Required headers not found in CSV")
    rows: List[ImportRowValidation] = Field(default_factory=list, description="Preview of validated rows")
    summary: str = Field(..., description="Human-readable validation summary")


class ImportCommitRequest(BaseModel):
    """Request payload to commit a previously validated preview batch."""

    preview_id: str = Field(..., description="Unique preview token returned by preview endpoint")
    import_type: ImportType = Field(..., description="Target dataset type ('exams', 'students', 'enrolments')")
    strategy: ImportStrategy = Field(
        default="atomic",
        description="'atomic' (reject entire batch if any error) or 'valid_only' (import valid rows, skip invalid)",
    )


class ImportCommitResponse(BaseModel):
    """Response returned upon completing a transactional import commit."""

    import_type: ImportType = Field(..., description="Target dataset type")
    strategy: ImportStrategy = Field(..., description="Applied import strategy")
    total_processed: int = Field(..., description="Total rows considered")
    inserted_count: int = Field(..., description="Successfully inserted records count")
    skipped_count: int = Field(..., description="Records skipped (duplicates or invalid in valid_only mode)")
    rejected_count: int = Field(..., description="Records rejected due to validation errors")
    message: str = Field(..., description="Operational result message")
    resulting_graph_vertices: int = Field(..., description="Total vertices in conflict graph after import")
    resulting_graph_edges: int = Field(..., description="Total conflict edges in conflict graph after import")
    graph_fingerprint: str = Field(..., description="Current graph SHA-256 fingerprint")
    is_schedule_stale: bool = Field(..., description="Whether existing schedules are now stale due to graph changes")


class SampleDatasetPreviewResponse(BaseModel):
    """Specifications and characteristics of the synthetic sample dataset."""

    name: str = Field(..., description="Dataset name")
    description: str = Field(..., description="Detailed pedagogical overview")
    exam_count: int = Field(..., description="Total synthetic examinations")
    student_count: int = Field(..., description="Total synthetic students")
    enrolment_count: int = Field(..., description="Total course enrolments")
    projected_conflicts: int = Field(..., description="Projected conflict edges in graph")
    projected_isolated_exams: List[str] = Field(default_factory=list, description="Examinations with 0 conflicts")
    sample_exams: List[Dict[str, Any]] = Field(default_factory=list, description="Sample course listings preview")
    sample_students: List[Dict[str, Any]] = Field(default_factory=list, description="Sample student listings preview")


class SampleDatasetLoadRequest(BaseModel):
    """Payload to trigger loading of the synthetic dataset."""

    mode: Literal["append", "replace"] = Field(
        default="append",
        description="'append' safely adds new sample records without deleting existing; 'replace' clears courses/students first",
    )
