"""Data access repository for Students."""

from typing import List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.student import StudentModel
from backend.app.schemas.student import StudentCreate, StudentUpdate


class StudentRepository:
    """Repository handling database operations for students."""

    @staticmethod
    def get_by_id(db: Session, id_or_student_id: str) -> Optional[StudentModel]:
        """Fetch student by internal UUID or unique student_id."""
        query = (
            select(StudentModel)
            .where(
                or_(
                    StudentModel.id == id_or_student_id,
                    StudentModel.student_id == id_or_student_id,
                )
            )
            .options(selectinload(StudentModel.enrolments))
        )
        return db.scalar(query)

    @staticmethod
    def get_by_student_id(db: Session, student_id: str) -> Optional[StudentModel]:
        """Fetch student strictly by unique institutional student_id."""
        query = (
            select(StudentModel)
            .where(StudentModel.student_id == student_id)
            .options(selectinload(StudentModel.enrolments))
        )
        return db.scalar(query)

    @staticmethod
    def list_students(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
    ) -> Tuple[List[StudentModel], int]:
        """List students with optional search filter and pagination."""
        base_query = select(StudentModel)
        count_query = select(func.count(StudentModel.id))

        if search:
            search_pattern = f"%{search.strip()}%"
            condition = or_(
                StudentModel.student_id.ilike(search_pattern),
                StudentModel.display_name.ilike(search_pattern),
            )
            base_query = base_query.where(condition)
            count_query = count_query.where(condition)

        total = db.scalar(count_query) or 0
        records = (
            db.scalars(
                base_query.order_by(StudentModel.student_id.asc())
                .offset(skip)
                .limit(limit)
                .options(selectinload(StudentModel.enrolments))
            ).all()
        )
        return list(records), total

    @staticmethod
    def get_all(db: Session) -> List[StudentModel]:
        """Retrieve all students ordered by student_id."""
        query = (
            select(StudentModel)
            .order_by(StudentModel.student_id.asc())
            .options(selectinload(StudentModel.enrolments))
        )
        return list(db.scalars(query).all())

    @staticmethod
    def create(db: Session, student_in: StudentCreate) -> StudentModel:
        """Create and persist a new student."""
        student = StudentModel(
            student_id=student_in.student_id,
            display_name=student_in.display_name,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def update(db: Session, student: StudentModel, student_in: StudentUpdate) -> StudentModel:
        """Update fields on an existing student."""
        update_data = student_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(student, field, value)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def delete(db: Session, student: StudentModel) -> int:
        """Delete a student and cascade enrolments. Returns removed enrolment count."""
        enrolment_count = len(student.enrolments)
        db.delete(student)
        db.commit()
        return enrolment_count
