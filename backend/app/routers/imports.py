"""FastAPI router for CSV data import preview, transactional commit, template downloads, and sample dataset studio."""

from typing import Any, Dict
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.imports import (
    ImportCommitRequest,
    ImportCommitResponse,
    ImportPreviewResponse,
    ImportType,
    SampleDatasetLoadRequest,
    SampleDatasetPreviewResponse,
)
from backend.app.services.import_service import ImportService
from backend.app.services.sample_data_service import SampleDataService

router = APIRouter(prefix="/imports", tags=["Data Import"])


@router.post(
    "/{import_type}/preview",
    response_model=ImportPreviewResponse,
    summary="Upload and validate CSV file",
    description="Parses an uploaded CSV file, enforces limits, performs row-level validation, and caches a preview token.",
)
async def preview_csv_import(
    import_type: ImportType,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ImportPreviewResponse:
    """Validate uploaded CSV file and generate preview report."""
    if import_type not in ("exams", "students", "enrolments"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported import type '{import_type}'. Must be 'exams', 'students', or 'enrolments'.",
        )

    file_bytes = await file.read()
    filename = file.filename or f"{import_type}_import.csv"

    return ImportService.parse_and_validate_csv(
        db=db,
        import_type=import_type,
        file_bytes=file_bytes,
        filename=filename,
    )


@router.post(
    "/{import_type}/commit",
    response_model=ImportCommitResponse,
    summary="Commit validated CSV batch",
    description="Transactionally inserts validated rows into database using atomic or valid-only strategy.",
)
def commit_csv_import(
    import_type: ImportType,
    request: ImportCommitRequest,
    db: Session = Depends(get_db),
) -> ImportCommitResponse:
    """Commit validated batch into database."""
    if import_type != request.import_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"URL import type '{import_type}' does not match payload import type '{request.import_type}'.",
        )

    return ImportService.commit_import(db, request)


@router.get(
    "/templates/{import_type}",
    summary="Download CSV template",
    description="Download a properly formatted RFC 4180 CSV template with example row for examinations, students, or enrolments.",
)
def download_csv_template(import_type: str) -> Response:
    """Generate and return CSV template download."""
    csv_content = ImportService.generate_csv_template(import_type)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{import_type}_template.csv"',
            "Cache-Control": "no-cache",
        },
    )


@router.get(
    "/reports/{preview_id}",
    summary="Download validation report CSV",
    description="Download a detailed CSV validation audit report identifying all parsed rows, errors, and warnings.",
)
def download_validation_report(preview_id: str) -> Response:
    """Generate and return CSV validation report download."""
    csv_content = ImportService.generate_validation_report_csv(preview_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="validation_report_{preview_id}.csv"',
            "Cache-Control": "no-cache",
        },
    )


@router.get(
    "/sample-dataset/preview",
    response_model=SampleDatasetPreviewResponse,
    summary="Preview synthetic sample dataset",
    description="Computes and returns structural metrics, conflict projections, and isolated courses for the sample dataset.",
)
def preview_sample_dataset() -> SampleDatasetPreviewResponse:
    """Return synthetic sample dataset specifications."""
    return SampleDataService.get_sample_dataset_preview()


@router.post(
    "/sample-dataset/load",
    summary="Load synthetic sample dataset",
    description="Loads the realistic university sample dataset in either append or replace mode.",
)
def load_sample_dataset_v2(
    request: SampleDatasetLoadRequest = SampleDatasetLoadRequest(),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Load sample dataset into database."""
    return SampleDataService.load_sample_dataset_v2(db, mode=request.mode)
