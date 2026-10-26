"""Sample dataset generator and transactional loader for SLOTWISE."""

from typing import List, Tuple
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.app.models.dataset import DatasetMetadataModel
from backend.app.models.enrolment import EnrolmentModel
from backend.app.models.examination import ExamModel
from backend.app.models.student import StudentModel
from backend.app.schemas.sample_data import (
    SampleDataLoadRequest,
    SampleDataSummaryResponse,
)
from backend.app.services.graph_service import GraphService


# 10 Academic Examinations
SAMPLE_EXAMS = [
    {
        "code": "CS101",
        "name": "Introduction to Computer Science",
        "department": "Computer Science",
        "semester": "Fall 2026",
        "duration": 180,
    },
    {
        "code": "CS201",
        "name": "Data Structures & Algorithms",
        "department": "Computer Science",
        "semester": "Fall 2026",
        "duration": 180,
    },
    {
        "code": "CS301",
        "name": "Operating Systems & Concurrency",
        "department": "Computer Science",
        "semester": "Fall 2026",
        "duration": 180,
    },
    {
        "code": "MATH101",
        "name": "Single Variable Calculus",
        "department": "Mathematics",
        "semester": "Fall 2026",
        "duration": 150,
    },
    {
        "code": "MATH201",
        "name": "Discrete Mathematics & Graph Theory",
        "department": "Mathematics",
        "semester": "Fall 2026",
        "duration": 150,
    },
    {
        "code": "MATH301",
        "name": "Linear Algebra & Differential Equations",
        "department": "Mathematics",
        "semester": "Fall 2026",
        "duration": 150,
    },
    {
        "code": "PHYS101",
        "name": "Classical Mechanics & Thermodynamics",
        "department": "Physics",
        "semester": "Fall 2026",
        "duration": 180,
    },
    {
        "code": "CHEM101",
        "name": "General Chemistry & Lab Principles",
        "department": "Chemistry",
        "semester": "Fall 2026",
        "duration": 120,
    },
    {
        "code": "BIO101",
        "name": "Molecular Cell Biology & Genetics",
        "department": "Biological Sciences",
        "semester": "Fall 2026",
        "duration": 150,
    },
    {
        "code": "ENG101",
        "name": "Academic Writing & Research Ethics",
        "department": "Humanities",
        "semester": "Fall 2026",
        "duration": 120,
    },
]

# 20 Academic Students
SAMPLE_STUDENTS = [
    ("S1001", "Ada Lovelace"),
    ("S1002", "Alan Turing"),
    ("S1003", "Grace Hopper"),
    ("S1004", "Claude Shannon"),
    ("S1005", "John von Neumann"),
    ("S1006", "Margaret Hamilton"),
    ("S1007", "Donald Knuth"),
    ("S1008", "Katherine Johnson"),
    ("S1009", "Edsger Dijkstra"),
    ("S1010", "Barbara Liskov"),
    ("S1011", "Tim Berners-Lee"),
    ("S1012", "Rosalind Franklin"),
    ("S1013", "Marie Curie"),
    ("S1014", "Richard Feynman"),
    ("S1015", "Niels Bohr"),
    ("S1016", "Enrico Fermi"),
    ("S1017", "Dorothy Hodgkin"),
    ("S1018", "Carl Friedrich Gauss"),
    ("S1019", "Emmy Noether"),
    ("S1020", "Leonhard Euler"),
]

# Student Enrolment Pairings (student_id, exam_code)
# Designed to construct rich conflict clusters and leave ENG101 isolated (only single-course students)
SAMPLE_ENROLMENTS: List[Tuple[str, str]] = [
    # Computer Science Cohort (CS101, CS201, MATH201 conflicts)
    ("S1001", "CS101"),
    ("S1001", "MATH101"),
    ("S1001", "MATH201"),
    ("S1002", "CS101"),
    ("S1002", "CS201"),
    ("S1002", "MATH201"),
    ("S1003", "CS101"),
    ("S1003", "CS201"),
    ("S1003", "PHYS101"),
    ("S1004", "CS201"),
    ("S1004", "CS301"),
    ("S1004", "MATH301"),
    ("S1005", "CS301"),
    ("S1005", "MATH201"),
    ("S1005", "MATH301"),
    # Engineering & Physics Cohort (PHYS101, MATH101, MATH301 conflicts)
    ("S1006", "MATH101"),
    ("S1006", "PHYS101"),
    ("S1006", "CS101"),
    ("S1007", "MATH101"),
    ("S1007", "PHYS101"),
    ("S1007", "CS201"),
    ("S1008", "MATH101"),
    ("S1008", "MATH301"),
    ("S1008", "PHYS101"),
    ("S1009", "CS301"),
    ("S1009", "PHYS101"),
    ("S1010", "CS201"),
    ("S1010", "MATH301"),
    # Natural Sciences / Pre-Med Cohort (BIO101, CHEM101, PHYS101 conflicts)
    ("S1012", "CHEM101"),
    ("S1012", "BIO101"),
    ("S1012", "PHYS101"),
    ("S1013", "CHEM101"),
    ("S1013", "PHYS101"),
    ("S1013", "MATH101"),
    ("S1014", "PHYS101"),
    ("S1014", "MATH301"),
    ("S1015", "PHYS101"),
    ("S1015", "CHEM101"),
    ("S1016", "CHEM101"),
    ("S1016", "BIO101"),
    ("S1017", "CHEM101"),
    ("S1017", "BIO101"),
    # Mathematics & Theory Cohort
    ("S1018", "MATH101"),
    ("S1018", "MATH201"),
    ("S1018", "MATH301"),
    ("S1019", "MATH201"),
    ("S1019", "MATH301"),
    ("S1019", "CS201"),
    # Humanities Student (Enrolled only in ENG101 -> ENG101 remains an isolated vertex with degree 0)
    ("S1011", "ENG101"),
    ("S1020", "ENG101"),
]


class SampleDataService:
    """Service to load synthetic university dataset safely in a transaction."""

    @classmethod
    def load_sample_data(
        cls, db: Session, request: SampleDataLoadRequest
    ) -> SampleDataSummaryResponse:
        """Load synthetic university dataset with safe overwrite checks."""
        dataset_name = request.dataset_name or "Standard University Engineering & Science"

        # Check existing data count
        existing_exams_count = db.scalar(select(ExamModel.id).limit(1)) is not None

        if existing_exams_count and not request.reset:
            # Do not silently overwrite user data
            graph = GraphService.get_conflict_graph(db)
            return SampleDataSummaryResponse(
                status="skipped",
                message="Existing database records detected. Set 'reset=True' to overwrite with sample data.",
                dataset_name=dataset_name,
                exams_created=0,
                students_created=0,
                enrolments_created=0,
                conflict_edges_detected=graph.edge_count,
                isolated_examinations=graph.isolated_examinations,
            )

        # Transactional loading
        try:
            if request.reset or existing_exams_count:
                # Clear existing records (cascading deletes on SQLite)
                db.execute(delete(EnrolmentModel))
                db.execute(delete(StudentModel))
                db.execute(delete(ExamModel))
                db.execute(delete(DatasetMetadataModel))
                db.flush()

            # 1. Insert examinations
            exam_models_by_code = {}
            for item in SAMPLE_EXAMS:
                exam = ExamModel(
                    code=item["code"],
                    name=item["name"],
                    department=item["department"],
                    semester=item["semester"],
                    duration=item["duration"],
                )
                db.add(exam)
                exam_models_by_code[item["code"]] = exam
            db.flush()

            # 2. Insert students
            student_models_by_id = {}
            for student_id, display_name in SAMPLE_STUDENTS:
                student = StudentModel(
                    student_id=student_id,
                    display_name=display_name,
                )
                db.add(student)
                student_models_by_id[student_id] = student
            db.flush()

            # 3. Insert enrolments
            enrolment_count = 0
            for student_id, exam_code in SAMPLE_ENROLMENTS:
                student = student_models_by_id.get(student_id)
                exam = exam_models_by_code.get(exam_code)
                if student and exam:
                    enrolment = EnrolmentModel(
                        student_id=student.id,
                        exam_id=exam.id,
                    )
                    db.add(enrolment)
                    enrolment_count += 1
            db.flush()

            # 4. Generate graph metrics from persisted data
            graph = GraphService.get_conflict_graph(db)

            # 5. Persist dataset metadata
            metadata = DatasetMetadataModel(
                name=dataset_name,
                description="Synthetic academic dataset for university timetable conflict resolution.",
                exam_count=len(exam_models_by_code),
                student_count=len(student_models_by_id),
                enrolment_count=enrolment_count,
                conflict_count=graph.edge_count,
            )
            db.add(metadata)

            db.commit()

            return SampleDataSummaryResponse(
                status="success",
                message=f"Sample dataset '{dataset_name}' successfully loaded into database.",
                dataset_name=dataset_name,
                exams_created=len(exam_models_by_code),
                students_created=len(student_models_by_id),
                enrolments_created=enrolment_count,
                conflict_edges_detected=graph.edge_count,
                isolated_examinations=graph.isolated_examinations,
            )
        except Exception:
            db.rollback()
            raise
