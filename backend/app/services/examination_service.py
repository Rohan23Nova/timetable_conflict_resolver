"""Business logic service for Examinations."""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.examination import ExamModel
from backend.app.repositories.examination_repository import ExaminationRepository
from backend.app.schemas.examination import (
    ExamCreate,
    ExamListResponse,
    ExamResponse,
    ExamUpdate,
)


class ExaminationService:
    """Service handling business rules and orchestration for examinations."""

    @staticmethod
    def _to_response(exam: ExamModel) -> ExamResponse:
        """Convert ORM model to Pydantic response schema with enrolment count."""
        return ExamResponse(
            id=exam.id,
            code=exam.code,
            name=exam.name,
            department=exam.department,
            semester=exam.semester,
            duration=exam.duration,
            created_at=exam.created_at,
            updated_at=exam.updated_at,
            enrolment_count=len(exam.enrolments) if exam.enrolments is not None else 0,
        )

    @classmethod
    def get_exam(cls, db: Session, exam_id: str) -> ExamResponse:
        """Retrieve single examination or raise 404."""
        exam = ExaminationRepository.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Examination with identifier '{exam_id}' not found.",
            )
        return cls._to_response(exam)

    @classmethod
    def list_exams(
        cls,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
    ) -> ExamListResponse:
        """List paginated examinations."""
        exams, total = ExaminationRepository.list_exams(
            db, skip=skip, limit=limit, search=search
        )
        return ExamListResponse(
            items=[cls._to_response(exam) for exam in exams],
            total=total,
            skip=skip,
            limit=limit,
        )

    @classmethod
    def create_exam(cls, db: Session, exam_in: ExamCreate) -> ExamResponse:
        """Create new examination, preventing duplicate examination codes."""
        existing = ExaminationRepository.get_by_code(db, exam_in.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An examination with course code '{exam_in.code}' already exists.",
            )
        exam = ExaminationRepository.create(db, exam_in)
        return cls._to_response(exam)

    @classmethod
    def update_exam(
        cls, db: Session, exam_id: str, exam_in: ExamUpdate
    ) -> ExamResponse:
        """Partially update examination fields with uniqueness checks."""
        exam = ExaminationRepository.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Examination with identifier '{exam_id}' not found.",
            )

        if exam_in.code and exam_in.code != exam.code:
            existing = ExaminationRepository.get_by_code(db, exam_in.code)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Course code '{exam_in.code}' is already assigned to another examination.",
                )

        updated_exam = ExaminationRepository.update(db, exam, exam_in)
        return cls._to_response(updated_exam)

    @classmethod
    def delete_exam(cls, db: Session, exam_id: str) -> dict:
        """Delete an examination and its cascade enrolments."""
        exam = ExaminationRepository.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Examination with identifier '{exam_id}' not found.",
            )
        enrolments_cleaned = ExaminationRepository.delete(db, exam)
        return {
            "message": "Examination deleted successfully.",
            "deleted_id": exam_id,
            "deleted_code": exam.code,
            "enrolments_removed": enrolments_cleaned,
        }
