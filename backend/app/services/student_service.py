"""Business logic service for Students."""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.student import StudentModel
from backend.app.repositories.student_repository import StudentRepository
from backend.app.schemas.student import (
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentUpdate,
)


class StudentService:
    """Service handling business rules and orchestration for students."""

    @staticmethod
    def _to_response(student: StudentModel) -> StudentResponse:
        """Convert ORM model to Pydantic response schema with enrolment count."""
        return StudentResponse(
            id=student.id,
            student_id=student.student_id,
            display_name=student.display_name,
            created_at=student.created_at,
            updated_at=student.updated_at,
            enrolment_count=len(student.enrolments) if student.enrolments is not None else 0,
        )

    @classmethod
    def get_student(cls, db: Session, student_id: str) -> StudentResponse:
        """Retrieve single student or raise 404."""
        student = StudentRepository.get_by_id(db, student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with identifier '{student_id}' not found.",
            )
        return cls._to_response(student)

    @classmethod
    def list_students(
        cls,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
    ) -> StudentListResponse:
        """List paginated students."""
        students, total = StudentRepository.list_students(
            db, skip=skip, limit=limit, search=search
        )
        return StudentListResponse(
            items=[cls._to_response(student) for student in students],
            total=total,
            skip=skip,
            limit=limit,
        )

    @classmethod
    def create_student(cls, db: Session, student_in: StudentCreate) -> StudentResponse:
        """Create new student, preventing duplicate student IDs."""
        existing = StudentRepository.get_by_student_id(db, student_in.student_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with ID '{student_in.student_id}' already exists.",
            )
        student = StudentRepository.create(db, student_in)
        return cls._to_response(student)

    @classmethod
    def update_student(
        cls, db: Session, student_id: str, student_in: StudentUpdate
    ) -> StudentResponse:
        """Partially update student fields with uniqueness checks."""
        student = StudentRepository.get_by_id(db, student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with identifier '{student_id}' not found.",
            )

        if student_in.student_id and student_in.student_id != student.student_id:
            existing = StudentRepository.get_by_student_id(db, student_in.student_id)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Student identifier '{student_in.student_id}' is already registered.",
                )

        updated_student = StudentRepository.update(db, student, student_in)
        return cls._to_response(updated_student)

    @classmethod
    def delete_student(cls, db: Session, student_id: str) -> dict:
        """Delete a student and cascade enrolments."""
        student = StudentRepository.get_by_id(db, student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with identifier '{student_id}' not found.",
            )
        enrolments_cleaned = StudentRepository.delete(db, student)
        return {
            "message": "Student deleted successfully.",
            "deleted_id": student_id,
            "deleted_student_id": student.student_id,
            "enrolments_removed": enrolments_cleaned,
        }
