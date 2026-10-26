"""Data access repository for Examinations."""

from typing import List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.examination import ExamModel
from backend.app.schemas.examination import ExamCreate, ExamUpdate


class ExaminationRepository:
    """Repository handling database operations for examinations."""

    @staticmethod
    def get_by_id(db: Session, id_or_code: str) -> Optional[ExamModel]:
        """Fetch examination by internal UUID or unique course code."""
        query = (
            select(ExamModel)
            .where(or_(ExamModel.id == id_or_code, ExamModel.code == id_or_code))
            .options(selectinload(ExamModel.enrolments))
        )
        return db.scalar(query)

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[ExamModel]:
        """Fetch examination strictly by unique course code."""
        query = (
            select(ExamModel)
            .where(ExamModel.code == code)
            .options(selectinload(ExamModel.enrolments))
        )
        return db.scalar(query)

    @staticmethod
    def list_exams(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
    ) -> Tuple[List[ExamModel], int]:
        """List examinations with optional search filter and pagination."""
        base_query = select(ExamModel)
        count_query = select(func.count(ExamModel.id))

        if search:
            search_pattern = f"%{search.strip()}%"
            condition = or_(
                ExamModel.code.ilike(search_pattern),
                ExamModel.name.ilike(search_pattern),
                ExamModel.department.ilike(search_pattern),
            )
            base_query = base_query.where(condition)
            count_query = count_query.where(condition)

        total = db.scalar(count_query) or 0
        records = (
            db.scalars(
                base_query.order_by(ExamModel.code.asc())
                .offset(skip)
                .limit(limit)
                .options(selectinload(ExamModel.enrolments))
            ).all()
        )
        return list(records), total

    @staticmethod
    def get_all(db: Session) -> List[ExamModel]:
        """Retrieve all examinations ordered by code."""
        query = (
            select(ExamModel)
            .order_by(ExamModel.code.asc())
            .options(selectinload(ExamModel.enrolments))
        )
        return list(db.scalars(query).all())

    @staticmethod
    def create(db: Session, exam_in: ExamCreate) -> ExamModel:
        """Create and persist a new examination."""
        exam = ExamModel(
            code=exam_in.code,
            name=exam_in.name,
            department=exam_in.department,
            semester=exam_in.semester,
            duration=exam_in.duration,
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def update(db: Session, exam: ExamModel, exam_in: ExamUpdate) -> ExamModel:
        """Update fields on an existing examination."""
        update_data = exam_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(exam, field, value)
        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def delete(db: Session, exam: ExamModel) -> int:
        """Delete an examination and its cascade enrolments. Returns removed enrolment count."""
        enrolment_count = len(exam.enrolments)
        db.delete(exam)
        db.commit()
        return enrolment_count
