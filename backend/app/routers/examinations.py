"""API router for Examination management."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.examination import (
    ExamCreate,
    ExamListResponse,
    ExamResponse,
    ExamUpdate,
)
from backend.app.services.examination_service import ExaminationService

router = APIRouter(prefix="/exams", tags=["Examinations"])


@router.get(
    "",
    response_model=ExamListResponse,
    status_code=status.HTTP_200_OK,
    summary="List examinations",
    description="Retrieve paginated list of examinations with optional search filter.",
)
def list_examinations(
    skip: int = Query(default=0, ge=0, description="Offset items"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum items to return"),
    search: Optional[str] = Query(default=None, description="Search term for code, name, or department"),
    db: Session = Depends(get_db),
) -> ExamListResponse:
    """List examinations."""
    return ExaminationService.list_exams(db, skip=skip, limit=limit, search=search)


@router.post(
    "",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create examination",
    description="Register a new course examination. Course code must be unique.",
)
def create_examination(
    exam_in: ExamCreate,
    db: Session = Depends(get_db),
) -> ExamResponse:
    """Create a new examination."""
    return ExaminationService.create_exam(db, exam_in)


@router.get(
    "/{exam_id}",
    response_model=ExamResponse,
    status_code=status.HTTP_200_OK,
    summary="Get examination details",
    description="Retrieve examination by internal UUID or unique course code.",
)
def get_examination(
    exam_id: str,
    db: Session = Depends(get_db),
) -> ExamResponse:
    """Get single examination."""
    return ExaminationService.get_exam(db, exam_id)


@router.patch(
    "/{exam_id}",
    response_model=ExamResponse,
    status_code=status.HTTP_200_OK,
    summary="Update examination",
    description="Partially update examination fields with uniqueness validation.",
)
def update_examination(
    exam_id: str,
    exam_in: ExamUpdate,
    db: Session = Depends(get_db),
) -> ExamResponse:
    """Update examination fields."""
    return ExaminationService.update_exam(db, exam_id, exam_in)


@router.delete(
    "/{exam_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete examination",
    description="Delete an examination and cascade-clean all associated student enrolments.",
)
def delete_examination(
    exam_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Delete examination and cascade enrolments."""
    return ExaminationService.delete_exam(db, exam_id)
