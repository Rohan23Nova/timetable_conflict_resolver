"""Sample dataset generator, preview calculator, and transactional loader for SLOTWISE."""

from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.app.models.dataset import DatasetMetadataModel
from backend.app.models.enrolment import EnrolmentModel
from backend.app.models.examination import ExamModel
from backend.app.models.student import StudentModel
from backend.app.schemas.imports import SampleDatasetPreviewResponse
from backend.app.schemas.sample_data import (
    SampleDataLoadRequest,
    SampleDataSummaryResponse,
)
from backend.app.services.graph_service import GraphService


# Phase 4 Legacy Sample Examinations (10 courses)
PHASE4_SAMPLE_EXAMS = [
    {"code": "CS101", "name": "Introduction to Computer Science", "department": "Computer Science", "semester": "Fall 2026", "duration": 180},
    {"code": "CS201", "name": "Data Structures & Algorithms", "department": "Computer Science", "semester": "Fall 2026", "duration": 180},
    {"code": "CS301", "name": "Operating Systems & Concurrency", "department": "Computer Science", "semester": "Fall 2026", "duration": 180},
    {"code": "MATH101", "name": "Single Variable Calculus", "department": "Mathematics", "semester": "Fall 2026", "duration": 150},
    {"code": "MATH201", "name": "Discrete Mathematics & Graph Theory", "department": "Mathematics", "semester": "Fall 2026", "duration": 150},
    {"code": "MATH301", "name": "Linear Algebra & Differential Equations", "department": "Mathematics", "semester": "Fall 2026", "duration": 150},
    {"code": "PHYS101", "name": "Classical Mechanics & Thermodynamics", "department": "Physics", "semester": "Fall 2026", "duration": 180},
    {"code": "CHEM101", "name": "General Chemistry & Lab Principles", "department": "Chemistry", "semester": "Fall 2026", "duration": 120},
    {"code": "BIO101", "name": "Molecular Cell Biology & Genetics", "department": "Biological Sciences", "semester": "Fall 2026", "duration": 150},
    {"code": "ENG101", "name": "Academic Writing & Research Ethics", "department": "Humanities", "semester": "Fall 2026", "duration": 120},
]

# Phase 4 Legacy Students (20 students)
PHASE4_SAMPLE_STUDENTS = [
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

# Phase 4 Legacy Enrolments
PHASE4_SAMPLE_ENROLMENTS = [
    ("S1001", "CS101"), ("S1001", "MATH101"), ("S1001", "MATH201"),
    ("S1002", "CS101"), ("S1002", "CS201"), ("S1002", "MATH201"),
    ("S1003", "CS101"), ("S1003", "CS201"), ("S1003", "PHYS101"),
    ("S1004", "CS201"), ("S1004", "CS301"), ("S1004", "MATH301"),
    ("S1005", "CS301"), ("S1005", "MATH201"), ("S1005", "MATH301"),
    ("S1006", "MATH101"), ("S1006", "PHYS101"), ("S1006", "CS101"),
    ("S1007", "MATH101"), ("S1007", "PHYS101"), ("S1007", "CS201"),
    ("S1008", "MATH101"), ("S1008", "MATH301"), ("S1008", "PHYS101"),
    ("S1009", "CS301"), ("S1009", "PHYS101"),
    ("S1010", "CS201"), ("S1010", "MATH301"),
    ("S1012", "CHEM101"), ("S1012", "BIO101"), ("S1012", "PHYS101"),
    ("S1013", "CHEM101"), ("S1013", "PHYS101"), ("S1013", "MATH101"),
    ("S1014", "PHYS101"), ("S1014", "MATH301"),
    ("S1015", "PHYS101"), ("S1015", "CHEM101"),
    ("S1016", "CHEM101"), ("S1016", "BIO101"),
    ("S1017", "CHEM101"), ("S1017", "BIO101"),
    ("S1018", "MATH101"), ("S1018", "MATH201"), ("S1018", "MATH301"),
    ("S1019", "MATH201"), ("S1019", "MATH301"), ("S1019", "CS201"),
    ("S1011", "ENG101"), ("S1020", "ENG101"),
]

# Phase 9 Rich Studio Sample Examinations (15 courses)
STUDIO_SAMPLE_EXAMS = [
    {"code": "CS101", "name": "Introduction to Computer Science", "department": "Computer Science", "semester": "Fall 2026", "duration": 180},
    {"code": "CS201", "name": "Data Structures & Algorithms", "department": "Computer Science", "semester": "Fall 2026", "duration": 180},
    {"code": "CS301", "name": "Operating Systems & Concurrency", "department": "Computer Science", "semester": "Fall 2026", "duration": 180},
    {"code": "CS401", "name": "Artificial Intelligence & Neural Networks", "department": "Computer Science", "semester": "Fall 2026", "duration": 180},
    {"code": "MATH101", "name": "Single Variable Calculus", "department": "Mathematics", "semester": "Fall 2026", "duration": 150},
    {"code": "MATH201", "name": "Discrete Mathematics & Graph Theory", "department": "Mathematics", "semester": "Fall 2026", "duration": 150},
    {"code": "MATH301", "name": "Linear Algebra & Differential Equations", "department": "Mathematics", "semester": "Fall 2026", "duration": 150},
    {"code": "PHYS101", "name": "Classical Mechanics & Thermodynamics", "department": "Physics", "semester": "Fall 2026", "duration": 180},
    {"code": "PHYS201", "name": "Electromagnetism & Wave Optics", "department": "Physics", "semester": "Fall 2026", "duration": 180},
    {"code": "CHEM101", "name": "General Chemistry & Lab Principles", "department": "Chemistry", "semester": "Fall 2026", "duration": 120},
    {"code": "BIO101", "name": "Molecular Cell Biology & Genetics", "department": "Biological Sciences", "semester": "Fall 2026", "duration": 150},
    {"code": "BIO201", "name": "Biochemistry & Enzyme Kinetics", "department": "Biological Sciences", "semester": "Fall 2026", "duration": 150},
    {"code": "ECON101", "name": "Principles of Microeconomics", "department": "Economics", "semester": "Fall 2026", "duration": 120},
    {"code": "ECON201", "name": "Macroeconomic Theory & Policy", "department": "Economics", "semester": "Fall 2026", "duration": 120},
    {"code": "ENG101", "name": "Academic Writing & Research Ethics", "department": "Humanities", "semester": "Fall 2026", "duration": 120},
]

# 36 Academic Students across Diverse Cohorts
STUDIO_SAMPLE_STUDENTS = [
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
    ("S1021", "Srinivasa Ramanujan"),
    ("S1022", "Bernhard Riemann"),
    ("S1023", "Henri Poincare"),
    ("S1024", "David Hilbert"),
    ("S1025", "Kurt Godel"),
    ("S1026", "John Nash"),
    ("S1027", "Alonzo Church"),
    ("S1028", "Stephen Hawking"),
    ("S1029", "Paul Dirac"),
    ("S1030", "Werner Heisenberg"),
    ("S1031", "Max Planck"),
    ("S1032", "Louis Pasteur"),
    ("S1033", "Gregor Mendel"),
    ("S1034", "Charles Darwin"),
    ("S1035", "Adam Smith"),
    ("S1036", "John Maynard Keynes"),
]

# 85 Student Enrolment Pairings (student_id, exam_code)
# Designed to construct rich conflict clusters and leave ENG101 isolated (only single-course student enrolments)
STUDIO_SAMPLE_ENROLMENTS: List[Tuple[str, str]] = [
    # Computer Science Major Core Cohort
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
    ("S1009", "CS301"),
    ("S1009", "CS401"),
    ("S1009", "PHYS101"),
    ("S1010", "CS201"),
    ("S1010", "CS401"),
    ("S1010", "MATH301"),
    ("S1027", "CS101"),
    ("S1027", "CS301"),

    # Engineering & Physics Cohort
    ("S1006", "MATH101"),
    ("S1006", "PHYS101"),
    ("S1006", "CS101"),
    ("S1007", "MATH101"),
    ("S1007", "PHYS101"),
    ("S1007", "CS201"),
    ("S1008", "MATH101"),
    ("S1008", "MATH301"),
    ("S1008", "PHYS101"),
    ("S1014", "PHYS101"),
    ("S1014", "PHYS201"),
    ("S1014", "MATH301"),
    ("S1015", "PHYS101"),
    ("S1015", "PHYS201"),
    ("S1016", "PHYS201"),
    ("S1016", "CHEM101"),
    ("S1016", "MATH101"),
    ("S1028", "PHYS101"),
    ("S1028", "PHYS201"),
    ("S1028", "MATH301"),
    ("S1029", "PHYS201"),
    ("S1029", "MATH201"),
    ("S1030", "PHYS101"),
    ("S1031", "PHYS201"),

    # Natural Sciences / Pre-Med Cohort
    ("S1012", "CHEM101"),
    ("S1012", "BIO101"),
    ("S1012", "PHYS101"),
    ("S1013", "CHEM101"),
    ("S1013", "BIO101"),
    ("S1013", "MATH101"),
    ("S1017", "CHEM101"),
    ("S1017", "BIO101"),
    ("S1017", "BIO201"),
    ("S1032", "BIO101"),
    ("S1032", "BIO201"),
    ("S1033", "BIO101"),
    ("S1033", "BIO201"),
    ("S1034", "BIO201"),

    # Mathematics & Theory Cohort
    ("S1018", "MATH101"),
    ("S1018", "MATH201"),
    ("S1018", "MATH301"),
    ("S1019", "MATH201"),
    ("S1019", "MATH301"),
    ("S1019", "CS201"),
    ("S1020", "MATH101"),
    ("S1020", "MATH201"),
    ("S1020", "PHYS101"),
    ("S1021", "MATH201"),
    ("S1022", "MATH101"),
    ("S1023", "PHYS201"),
    ("S1024", "MATH201"),
    ("S1024", "CS301"),
    ("S1025", "MATH201"),
    ("S1025", "CS401"),
    ("S1026", "ECON201"),

    # Economics & Quantitative Finance Cohort
    ("S1035", "ECON101"),
    ("S1035", "ECON201"),
    ("S1035", "MATH101"),
    ("S1036", "ECON101"),
    ("S1036", "ECON201"),
    ("S1036", "MATH301"),

    # Humanities Single-Enrolment (ENG101 remains isolated in conflict graph: d(ENG101) = 0)
    ("S1011", "ENG101"),
]

# Legacy Phase 4 Aliases for backwards compatibility
SAMPLE_EXAMS = PHASE4_SAMPLE_EXAMS
SAMPLE_STUDENTS = PHASE4_SAMPLE_STUDENTS
SAMPLE_ENROLMENTS = PHASE4_SAMPLE_ENROLMENTS


class SampleDataService:
    """Service to preview and load realistic synthetic university datasets."""

    @classmethod
    def get_sample_dataset_preview(cls) -> SampleDatasetPreviewResponse:
        """Compute structural metrics and conflict characteristics of the sample dataset without database changes."""
        # Calculate simulated graph metrics from static specifications
        student_exams_map: Dict[str, Set[str]] = {}
        for s_id, code in STUDIO_SAMPLE_ENROLMENTS:
            if s_id not in student_exams_map:
                student_exams_map[s_id] = set()
            student_exams_map[s_id].add(code)

        conflict_edges: Set[Tuple[str, str]] = set()
        for exams_taken in student_exams_map.values():
            exams_list = sorted(exams_taken)
            for i in range(len(exams_list)):
                for j in range(i + 1, len(exams_list)):
                    conflict_edges.add((exams_list[i], exams_list[j]))

        all_exam_codes = {e["code"] for e in STUDIO_SAMPLE_EXAMS}
        conflicted_codes = set()
        for u, v in conflict_edges:
            conflicted_codes.add(u)
            conflicted_codes.add(v)
        isolated_exams = sorted(all_exam_codes - conflicted_codes)

        return SampleDatasetPreviewResponse(
            name="Standard University Science & Engineering",
            description=(
                "A realistic 15-examination dataset modeling undergraduate engineering, science, economics, "
                "and humanities. Contains high-conflict hubs (CS101, MATH101, PHYS101), multi-cohort shared "
                "enrolments, and an isolated paper (ENG101) requiring graph coloring algorithms."
            ),
            exam_count=len(STUDIO_SAMPLE_EXAMS),
            student_count=len(STUDIO_SAMPLE_STUDENTS),
            enrolment_count=len(STUDIO_SAMPLE_ENROLMENTS),
            projected_conflicts=len(conflict_edges),
            projected_isolated_exams=isolated_exams,
            sample_exams=STUDIO_SAMPLE_EXAMS[:6],
            sample_students=[{"id": s[0], "name": s[1]} for s in STUDIO_SAMPLE_STUDENTS[:6]],
        )

    @classmethod
    def load_sample_data(
        cls,
        db: Session,
        request: SampleDataLoadRequest,
        exams: Optional[List[Dict[str, Any]]] = None,
        students: Optional[List[Tuple[str, str]]] = None,
        enrolments: Optional[List[Tuple[str, str]]] = None,
    ) -> SampleDataSummaryResponse:
        """Load synthetic university dataset with safe overwrite checks."""
        dataset_name = request.dataset_name or "Standard University Science & Engineering"
        target_exams = exams if exams is not None else SAMPLE_EXAMS
        target_students = students if students is not None else SAMPLE_STUDENTS
        target_enrolments = enrolments if enrolments is not None else SAMPLE_ENROLMENTS

        # Check existing data count
        existing_exams_count = db.scalar(select(ExamModel.id).limit(1)) is not None

        if existing_exams_count and not request.reset:
            # Do not silently overwrite user data
            graph = GraphService.get_conflict_graph(db)
            return SampleDataSummaryResponse(
                status="skipped",
                message="Existing database records detected. Set 'reset=True' or 'mode=replace' to overwrite with sample data.",
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
                # Clear existing records (cascading deletes on SQLite, timetable schedules preserved!)
                db.execute(delete(EnrolmentModel))
                db.execute(delete(StudentModel))
                db.execute(delete(ExamModel))
                db.execute(delete(DatasetMetadataModel))
                db.flush()

            # 1. Insert examinations
            exam_models_by_code = {}
            for item in target_exams:
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
            for student_id, display_name in target_students:
                student = StudentModel(
                    student_id=student_id,
                    display_name=display_name,
                )
                db.add(student)
                student_models_by_id[student_id] = student
            db.flush()

            # 3. Insert enrolments
            enrolment_count = 0
            for student_id, exam_code in target_enrolments:
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

    @classmethod
    def load_sample_dataset_v2(
        cls, db: Session, mode: str = "append"
    ) -> Dict[str, Any]:
        """Phase 9 sample dataset loader supporting explicit 'append' or 'replace' modes."""
        if mode == "replace":
            req = SampleDataLoadRequest(reset=True, dataset_name="Standard University Science & Engineering")
            res = cls.load_sample_data(
                db,
                req,
                exams=STUDIO_SAMPLE_EXAMS,
                students=STUDIO_SAMPLE_STUDENTS,
                enrolments=STUDIO_SAMPLE_ENROLMENTS,
            )
            graph = GraphService.get_conflict_graph(db)
            fingerprint = GraphService.compute_graph_fingerprint(db)
            return {
                "status": "success",
                "mode": "replace",
                "message": res.message,
                "exams_created": res.exams_created,
                "students_created": res.students_created,
                "enrolments_created": res.enrolments_created,
                "graph_vertices": graph.vertex_count,
                "graph_edges": graph.edge_count,
                "graph_fingerprint": fingerprint,
            }

        # Append mode: insert only non-existing records without deleting current data
        try:
            existing_codes = {c for (c,) in db.query(ExamModel.code).all()}
            existing_sids = {s for (s,) in db.query(StudentModel.student_id).all()}

            exams_added = 0
            for item in STUDIO_SAMPLE_EXAMS:
                if item["code"] not in existing_codes:
                    exam = ExamModel(
                        code=item["code"],
                        name=item["name"],
                        department=item["department"],
                        semester=item["semester"],
                        duration=item["duration"],
                    )
                    db.add(exam)
                    existing_codes.add(item["code"])
                    exams_added += 1
            db.flush()

            students_added = 0
            for s_id, name in STUDIO_SAMPLE_STUDENTS:
                if s_id not in existing_sids:
                    student = StudentModel(student_id=s_id, display_name=name)
                    db.add(student)
                    existing_sids.add(s_id)
                    students_added += 1
            db.flush()

            # Lookup student and exam IDs
            student_id_map = {s.student_id: s.id for s in db.query(StudentModel).all()}
            exam_id_map = {e.code: e.id for e in db.query(ExamModel).all()}

            existing_pairs: Set[Tuple[str, str]] = set()
            for e in db.query(EnrolmentModel).all():
                if e.student and e.exam:
                    existing_pairs.add((e.student.student_id, e.exam.code))

            enrolments_added = 0
            for s_id, code in STUDIO_SAMPLE_ENROLMENTS:
                pair = (s_id, code)
                if pair not in existing_pairs:
                    s_uuid = student_id_map.get(s_id)
                    e_uuid = exam_id_map.get(code)
                    if s_uuid and e_uuid:
                        db.add(EnrolmentModel(student_id=s_uuid, exam_id=e_uuid))
                        existing_pairs.add(pair)
                        enrolments_added += 1

            db.commit()

            graph = GraphService.get_conflict_graph(db)
            fingerprint = GraphService.compute_graph_fingerprint(db)

            return {
                "status": "success",
                "mode": "append",
                "message": (
                    f"Sample data appended: {exams_added} exams, {students_added} students, "
                    f"{enrolments_added} enrolments added."
                ),
                "exams_created": exams_added,
                "students_created": students_added,
                "enrolments_created": enrolments_added,
                "graph_vertices": graph.vertex_count,
                "graph_edges": graph.edge_count,
                "graph_fingerprint": fingerprint,
            }
        except Exception:
            db.rollback()
            raise
