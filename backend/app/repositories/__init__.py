"""Repositories package for data persistence."""

from backend.app.repositories.enrolment_repository import EnrolmentRepository
from backend.app.repositories.examination_repository import ExaminationRepository
from backend.app.repositories.student_repository import StudentRepository

__all__ = [
    "ExaminationRepository",
    "StudentRepository",
    "EnrolmentRepository",
]
