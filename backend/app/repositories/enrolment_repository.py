"""Data access repository for Enrolments."""

from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from backend.app.models.enrolment import EnrolmentModel


class EnrolmentRepository:
    """Repository handling database operations for student enrolments."""

    @staticmethod
    def get_by_id(db: Session, enrolment_id: str) -> Optional[EnrolmentModel]:
        """Fetch enrolment by UUID."""
        query = (
            select(EnrolmentModel)
            .where(EnrolmentModel.id == enrolment_id)
            .options(
                joinedload(EnrolmentModel.student),
                joinedload(EnrolmentModel.exam),
            )
        )
        return db.scalar(query)

    @staticmethod
    def get_by_student_and_exam(
        db: Session, student_uuid: str, exam_uuid: str
    ) -> Optional[EnrolmentModel]:
        """Check for existing enrolment by student and exam UUIDs."""
        query = (
            select(EnrolmentModel)
            .where(
                EnrolmentModel.student_id == student_uuid,
                EnrolmentModel.exam_id == exam_uuid,
            )
            .options(
                joinedload(EnrolmentModel.student),
                joinedload(EnrolmentModel.exam),
            )
        )
        return db.scalar(query)

    @staticmethod
    def list_enrolments(
        db: Session,
        exam_id: Optional[str] = None,
        student_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[EnrolmentModel], int]:
        """List enrolments with optional foreign key filtering and pagination."""
        base_query = select(EnrolmentModel).options(
            joinedload(EnrolmentModel.student),
            joinedload(EnrolmentModel.exam),
        )
        count_query = select(func.count(EnrolmentModel.id))

        if exam_id:
            base_query = base_query.where(EnrolmentModel.exam_id == exam_id)
            count_query = count_query.where(EnrolmentModel.exam_id == exam_id)

        if student_id:
            base_query = base_query.where(EnrolmentModel.student_id == student_id)
            count_query = count_query.where(EnrolmentModel.student_id == student_id)

        total = db.scalar(count_query) or 0
        records = (
            db.scalars(
                base_query.order_by(EnrolmentModel.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )
        return list(records), total

    @staticmethod
    def get_all(db: Session) -> List[EnrolmentModel]:
        """Retrieve all enrolments with eager loaded relations."""
        query = (
            select(EnrolmentModel)
            .options(
                joinedload(EnrolmentModel.student),
                joinedload(EnrolmentModel.exam),
            )
            .order_by(EnrolmentModel.created_at.asc())
        )
        return list(db.scalars(query).all())

    @staticmethod
    def create(db: Session, student_uuid: str, exam_uuid: str) -> EnrolmentModel:
        """Create and persist a new student enrolment."""
        enrolment = EnrolmentModel(
            student_id=student_uuid,
            exam_id=exam_uuid,
        )
        db.add(enrolment)
        db.commit()
        db.refresh(enrolment)
        # Ensure relations are populated
        return EnrolmentRepository.get_by_id(db, enrolment.id) or enrolment

    @staticmethod
    def delete(db: Session, enrolment: EnrolmentModel) -> None:
        """Delete an enrolment record."""
        db.delete(enrolment)
        db.commit()
