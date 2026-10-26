"""API router for Student Enrolments."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.enrolment import (
    EnrolmentCreate,
    EnrolmentListResponse,
    EnrolmentResponse,
)
from backend.app.services.enrolment_service import EnrolmentService

router = APIRouter(prefix="/enrolments", tags=["Enrolments"])


@router.get(
    "",
    response_model=EnrolmentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List enrolments",
    description="Retrieve student enrolments, optionally filtered by examination or student.",
)
def list_enrolments(
    exam_id: Optional[str] = Query(default=None, description="Filter by examination UUID or code"),
    student_id: Optional[str] = Query(default=None, description="Filter by student UUID or student_id"),
    skip: int = Query(default=0, ge=0, description="Offset items"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum items to return"),
    db: Session = Depends(get_db),
) -> EnrolmentListResponse:
    """List enrolments."""
    return EnrolmentService.list_enrolments(
        db, exam_id=exam_id, student_id=student_id, skip=skip, limit=limit
    )


@router.post(
    "",
    response_model=EnrolmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create enrolment",
    description="Enroll a student in an examination. Validates existence and prevents duplicates.",
)
def create_enrolment(
    enrolment_in: EnrolmentCreate,
    db: Session = Depends(get_db),
) -> EnrolmentResponse:
    """Create a new enrolment."""
    return EnrolmentService.create_enrolment(db, enrolment_in)


@router.delete(
    "/{enrolment_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete enrolment",
    description="Remove a student's enrolment from an examination.",
)
def delete_enrolment(
    enrolment_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Delete an enrolment record."""
    return EnrolmentService.delete_enrolment(db, enrolment_id)
