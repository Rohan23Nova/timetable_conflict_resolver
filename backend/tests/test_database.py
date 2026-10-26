"""Tests for database initialization, constraints, transactions, and persistence."""

import os
import tempfile
import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models.enrolment import EnrolmentModel
from backend.app.models.examination import ExamModel
from backend.app.models.student import StudentModel


class TestDatabaseIntegrity:
    """Tests verifying relational constraints, cascading, and transactional rollback."""

    def test_database_initialization_creates_tables(self, test_db_session):
        """Verify tables exist and can be queried."""
        exams = test_db_session.scalars(select(ExamModel)).all()
        students = test_db_session.scalars(select(StudentModel)).all()
        enrolments = test_db_session.scalars(select(EnrolmentModel)).all()
        assert len(exams) == 0
        assert len(students) == 0
        assert len(enrolments) == 0

    def test_unique_examination_code_constraint(self, test_db_session):
        """Duplicate examination code must raise IntegrityError."""
        exam1 = ExamModel(code="CS101", name="Computer Science 1")
        test_db_session.add(exam1)
        test_db_session.commit()

        exam2 = ExamModel(code="CS101", name="Duplicate CS Course")
        test_db_session.add(exam2)
        with pytest.raises(IntegrityError):
            test_db_session.commit()
        test_db_session.rollback()

    def test_unique_student_id_constraint(self, test_db_session):
        """Duplicate student_id must raise IntegrityError."""
        student1 = StudentModel(student_id="S1001", display_name="Student 1")
        test_db_session.add(student1)
        test_db_session.commit()

        student2 = StudentModel(student_id="S1001", display_name="Student 2")
        test_db_session.add(student2)
        with pytest.raises(IntegrityError):
            test_db_session.commit()
        test_db_session.rollback()

    def test_foreign_key_enforcement_rejects_orphans(self, test_db_session):
        """Enrolments referencing non-existent students or exams must fail under foreign keys."""
        orphan_enrolment = EnrolmentModel(
            student_id="non-existent-student-id",
            exam_id="non-existent-exam-id",
        )
        test_db_session.add(orphan_enrolment)
        with pytest.raises(IntegrityError):
            test_db_session.commit()
        test_db_session.rollback()

    def test_unique_student_exam_enrolment_pair(self, test_db_session):
        """A student cannot be enrolled twice in the exact same examination."""
        exam = ExamModel(code="MATH101", name="Calculus I")
        student = StudentModel(student_id="S2001", display_name="Euler")
        test_db_session.add_all([exam, student])
        test_db_session.commit()

        e1 = EnrolmentModel(student_id=student.id, exam_id=exam.id)
        test_db_session.add(e1)
        test_db_session.commit()

        e2 = EnrolmentModel(student_id=student.id, exam_id=exam.id)
        test_db_session.add(e2)
        with pytest.raises(IntegrityError):
            test_db_session.commit()
        test_db_session.rollback()

    def test_cascading_delete_on_exam_deletion(self, test_db_session):
        """Deleting an examination must cascade-delete all its associated enrolments."""
        exam = ExamModel(code="PHYS101", name="Physics")
        student = StudentModel(student_id="S3001", display_name="Newton")
        test_db_session.add_all([exam, student])
        test_db_session.commit()

        enrolment = EnrolmentModel(student_id=student.id, exam_id=exam.id)
        test_db_session.add(enrolment)
        test_db_session.commit()

        # Delete the examination
        test_db_session.delete(exam)
        test_db_session.commit()

        # Verify enrolment was automatically deleted
        enrolments = test_db_session.scalars(select(EnrolmentModel)).all()
        assert len(enrolments) == 0

        # Verify student is still intact
        persisted_student = test_db_session.scalar(
            select(StudentModel).where(StudentModel.id == student.id)
        )
        assert persisted_student is not None

    def test_cascading_delete_on_student_deletion(self, test_db_session):
        """Deleting a student must cascade-delete all their enrolments."""
        exam = ExamModel(code="CHEM101", name="Chemistry")
        student = StudentModel(student_id="S4001", display_name="Curie")
        test_db_session.add_all([exam, student])
        test_db_session.commit()

        enrolment = EnrolmentModel(student_id=student.id, exam_id=exam.id)
        test_db_session.add(enrolment)
        test_db_session.commit()

        # Delete student
        test_db_session.delete(student)
        test_db_session.commit()

        # Enrolment cleaned up, exam still intact
        enrolments = test_db_session.scalars(select(EnrolmentModel)).all()
        assert len(enrolments) == 0
        persisted_exam = test_db_session.scalar(
            select(ExamModel).where(ExamModel.id == exam.id)
        )
        assert persisted_exam is not None

    def test_transaction_rollback_leaves_no_partial_records(self, test_db_session):
        """A failed multi-step operation must roll back completely."""
        exam = ExamModel(code="BIO101", name="Biology")
        test_db_session.add(exam)
        test_db_session.commit()

        try:
            # Step 1: create student
            student = StudentModel(student_id="S5001", display_name="Darwin")
            test_db_session.add(student)
            test_db_session.flush()

            # Step 2: intentionally violate constraint
            bad_exam = ExamModel(code="BIO101", name="Duplicate Bio")
            test_db_session.add(bad_exam)
            test_db_session.commit()
        except IntegrityError:
            test_db_session.rollback()

        # Verify student was rolled back and not persisted
        persisted_student = test_db_session.scalar(
            select(StudentModel).where(StudentModel.student_id == "S5001")
        )
        assert persisted_student is None

    def test_persistence_across_sessions_and_reconnection(self):
        """Records must persist across separate engine connections and session lifecycles."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name

        try:
            engine = create_engine(f"sqlite:///{db_path}")
            Base.metadata.create_all(bind=engine)
            SessionLocal = sessionmaker(bind=engine)

            # Session 1: Insert record
            with SessionLocal() as s1:
                exam = ExamModel(code="CS999", name="Advanced Topics in Graph Theory")
                s1.add(exam)
                s1.commit()

            engine.dispose()

            # Reconnection with new engine
            new_engine = create_engine(f"sqlite:///{db_path}")
            NewSession = sessionmaker(bind=new_engine)

            # Session 2: Read record back
            with NewSession() as s2:
                saved = s2.scalar(select(ExamModel).where(ExamModel.code == "CS999"))
                assert saved is not None
                assert saved.name == "Advanced Topics in Graph Theory"

            new_engine.dispose()
        finally:
            if os.path.exists(db_path):
                os.remove(db_path)
