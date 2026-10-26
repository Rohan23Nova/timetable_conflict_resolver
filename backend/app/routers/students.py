"""API router for Student management."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.student import (
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentUpdate,
)
from backend.app.services.student_service import StudentService

router = APIRouter(prefix="/students", tags=["Students"])


@router.get(
    "",
    response_model=StudentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List students",
    description="Retrieve paginated list of students with optional search filter.",
)
def list_students(
    skip: int = Query(default=0, ge=0, description="Offset items"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum items to return"),
    search: Optional[str] = Query(default=None, description="Search term for student_id or name"),
    db: Session = Depends(get_db),
) -> StudentListResponse:
    """List students."""
    return StudentService.list_students(db, skip=skip, limit=limit, search=search)


@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create student",
    description="Register a new student record. Institutional student_id must be unique.",
)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
) -> StudentResponse:
    """Create a new student."""
    return StudentService.create_student(db, student_in)


@router.get(
    "/{student_id}",
    response_model=StudentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get student details",
    description="Retrieve student by internal UUID or unique institutional student_id.",
)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
) -> StudentResponse:
    """Get single student."""
    return StudentService.get_student(db, student_id)


@router.patch(
    "/{student_id}",
    response_model=StudentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update student",
    description="Partially update student fields with uniqueness validation.",
)
def update_student(
    student_id: str,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
) -> StudentResponse:
    """Update student fields."""
    return StudentService.update_student(db, student_id, student_in)


@router.delete(
    "/{student_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete student",
    description="Delete a student record and cascade-clean all associated course enrolments.",
)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Delete student and cascade enrolments."""
    return StudentService.delete_student(db, student_id)
