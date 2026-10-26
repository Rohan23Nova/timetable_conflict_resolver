"""Business logic service for Enrolments."""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.enrolment import EnrolmentModel
from backend.app.repositories.enrolment_repository import EnrolmentRepository
from backend.app.repositories.examination_repository import ExaminationRepository
from backend.app.repositories.student_repository import StudentRepository
from backend.app.schemas.enrolment import (
    EnrolmentCreate,
    EnrolmentListResponse,
    EnrolmentResponse,
)


class EnrolmentService:
    """Service handling business rules and orchestration for student course enrolments."""

    @staticmethod
    def _to_response(enrolment: EnrolmentModel) -> EnrolmentResponse:
        """Convert ORM model to Pydantic response schema with joined relation info."""
        return EnrolmentResponse(
            id=enrolment.id,
            student_id=enrolment.student_id,
            student_identifier=enrolment.student.student_id if enrolment.student else "",
            student_name=enrolment.student.display_name if enrolment.student else None,
            exam_id=enrolment.exam_id,
            exam_code=enrolment.exam.code if enrolment.exam else "",
            exam_name=enrolment.exam.name if enrolment.exam else "",
            created_at=enrolment.created_at,
        )

    @classmethod
    def get_enrolment(cls, db: Session, enrolment_id: str) -> EnrolmentResponse:
        """Retrieve single enrolment by UUID or raise 404."""
        enrolment = EnrolmentRepository.get_by_id(db, enrolment_id)
        if not enrolment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrolment with identifier '{enrolment_id}' not found.",
            )
        return cls._to_response(enrolment)

    @classmethod
    def list_enrolments(
        cls,
        db: Session,
        exam_id: Optional[str] = None,
        student_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> EnrolmentListResponse:
        """List paginated enrolments with optional exam or student filter."""
        resolved_exam_uuid = None
        if exam_id:
            exam = ExaminationRepository.get_by_id(db, exam_id)
            if exam:
                resolved_exam_uuid = exam.id
            else:
                return EnrolmentListResponse(items=[], total=0, skip=skip, limit=limit)

        resolved_student_uuid = None
        if student_id:
            student = StudentRepository.get_by_id(db, student_id)
            if student:
                resolved_student_uuid = student.id
            else:
                return EnrolmentListResponse(items=[], total=0, skip=skip, limit=limit)

        enrolments, total = EnrolmentRepository.list_enrolments(
            db,
            exam_id=resolved_exam_uuid,
            student_id=resolved_student_uuid,
            skip=skip,
            limit=limit,
        )
        return EnrolmentListResponse(
            items=[cls._to_response(e) for e in enrolments],
            total=total,
            skip=skip,
            limit=limit,
        )

    @classmethod
    def create_enrolment(
        cls, db: Session, enrolment_in: EnrolmentCreate
    ) -> EnrolmentResponse:
        """Create new student enrolment with referential integrity validation."""
        # 1. Resolve student (accepts UUID or student_id string)
        student = StudentRepository.get_by_id(db, enrolment_in.student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Referenced student '{enrolment_in.student_id}' does not exist.",
            )

        # 2. Resolve exam (accepts UUID or course code string)
        exam = ExaminationRepository.get_by_id(db, enrolment_in.exam_id)
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Referenced examination '{enrolment_in.exam_id}' does not exist.",
            )

        # 3. Check for existing enrolment (prevent duplicate records)
        existing = EnrolmentRepository.get_by_student_and_exam(
            db, student_uuid=student.id, exam_uuid=exam.id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Student '{student.student_id}' is already enrolled in examination '{exam.code}'.",
            )

        # 4. Create and persist enrolment
        enrolment = EnrolmentRepository.create(
            db, student_uuid=student.id, exam_uuid=exam.id
        )
        return cls._to_response(enrolment)

    @classmethod
    def delete_enrolment(cls, db: Session, enrolment_id: str) -> dict:
        """Delete an enrolment record."""
        enrolment = EnrolmentRepository.get_by_id(db, enrolment_id)
        if not enrolment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrolment with identifier '{enrolment_id}' not found.",
            )
        exam_code = enrolment.exam.code if enrolment.exam else ""
        student_id = enrolment.student.student_id if enrolment.student else ""
        EnrolmentRepository.delete(db, enrolment)
        return {
            "message": "Enrolment deleted successfully.",
            "deleted_id": enrolment_id,
            "student_id": student_id,
            "exam_code": exam_code,
        }
