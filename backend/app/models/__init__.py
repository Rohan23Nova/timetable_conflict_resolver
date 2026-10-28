"""SQLAlchemy models package for SLOTWISE."""

from backend.app.models.dataset import DatasetMetadataModel
from backend.app.models.enrolment import EnrolmentModel
from backend.app.models.examination import ExamModel
from backend.app.models.schedule import SavedSchedule
from backend.app.models.student import StudentModel
from backend.app.models.user import UserModel

__all__ = [
    "ExamModel",
    "StudentModel",
    "EnrolmentModel",
    "DatasetMetadataModel",
    "SavedSchedule",
    "UserModel",
]

