"""Backend integration tests for Phase 9 Data Import, CSV Validation, and Sample Dataset Studio."""

import io
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.examination import ExamModel
from backend.app.models.student import StudentModel
from backend.app.models.enrolment import EnrolmentModel
from backend.app.models.schedule import SavedSchedule


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def clean_db():
    db = SessionLocal()
    try:
        db.query(EnrolmentModel).delete()
        db.query(StudentModel).delete()
        db.query(ExamModel).delete()
        db.query(SavedSchedule).delete()
        db.commit()
        yield db
    finally:
        db.query(EnrolmentModel).delete()
        db.query(StudentModel).delete()
        db.query(ExamModel).delete()
        db.query(SavedSchedule).delete()
        db.commit()
        db.close()


def test_download_csv_templates(client):
    """Test template downloads for all 3 supported dataset types."""
    # 1. Exams template
    res = client.get("/api/imports/templates/exams")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "exams_template.csv" in res.headers["content-disposition"]
    text = res.text
    assert "exam_code,subject_name,department,semester,duration" in text
    assert "CS101" in text

    # 2. Students template
    res = client.get("/api/imports/templates/students")
    assert res.status_code == 200
    assert "students_template.csv" in res.headers["content-disposition"]
    assert "student_id,student_name" in res.text

    # 3. Enrolments template
    res = client.get("/api/imports/templates/enrolments")
    assert res.status_code == 200
    assert "enrolments_template.csv" in res.headers["content-disposition"]
    assert "student_id,exam_code" in res.text

    # 4. Unknown type
    res = client.get("/api/imports/templates/unknown")
    assert res.status_code == 400


def test_preview_csv_validation_errors(client, clean_db):
    """Test validation errors: empty file, missing headers, bad durations, duplicates."""
    # 1. Empty file
    res = client.post(
        "/api/imports/exams/preview",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()

    # 2. Missing required header
    bad_header_csv = "course_code,course_name\nCS101,Computer Science\n"
    res = client.post(
        "/api/imports/exams/preview",
        files={"file": ("bad_headers.csv", bad_header_csv.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 200
    assert "exam_code" in res.json()["missing_required_headers"]
    assert "subject_name" in res.json()["missing_required_headers"]
    assert res.json()["can_commit_atomic"] is False

    # 3. Row-level errors in exams CSV
    csv_data = (
        "exam_code,subject_name,duration\n"
        "CS101,Intro CS,180\n"
        ",Missing Code,120\n"  # missing code
        "CS102,,120\n"  # missing name
        "CS103,Bad Duration,-30\n"  # negative duration
        "CS101,Duplicate Code in CSV,180\n"  # duplicate in CSV
    )
    res = client.post(
        "/api/imports/exams/preview",
        files={"file": ("exams_mixed.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 5
    assert data["valid_rows"] == 1
    assert data["invalid_rows"] == 4
    assert data["can_commit_atomic"] is False
    assert data["can_commit_valid_only"] is True
    assert len(data["rows"]) == 5


def test_commit_exams_atomic_vs_valid_only(client, clean_db):
    """Test committing exams with atomic (must fail if invalid) vs valid_only strategy."""
    csv_data = (
        "exam_code,subject_name,department,semester,duration\n"
        "CS101,Intro to CS,CS,Fall 2026,180\n"
        "CS102,Data Structures,CS,Fall 2026,180\n"
        ",Missing Code,CS,Fall 2026,180\n"
    )
    res = client.post(
        "/api/imports/exams/preview",
        files={"file": ("exams.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 200
    preview_id = res.json()["preview_id"]

    # 1. Atomic commit should be rejected because row 3 has an error
    res = client.post(
        "/api/imports/exams/commit",
        json={"preview_id": preview_id, "import_type": "exams", "strategy": "atomic"},
    )
    assert res.status_code == 400
    assert "atomic" in res.json()["detail"].lower()

    # 2. Valid-only commit should succeed, inserting 2 and rejecting 1
    res = client.post(
        "/api/imports/exams/commit",
        json={"preview_id": preview_id, "import_type": "exams", "strategy": "valid_only"},
    )
    assert res.status_code == 200
    commit_data = res.json()
    assert commit_data["inserted_count"] == 2
    assert commit_data["rejected_count"] == 1
    assert commit_data["resulting_graph_vertices"] == 2

    # Verify DB has 2 exams
    exams = client.get("/api/exams").json()
    assert exams["total"] == 2


def test_preview_and_commit_students_and_enrolments(client, clean_db):
    """Test end-to-end import: create exams, then students, then enrolments."""
    # 1. Upload valid exams
    exams_csv = "exam_code,subject_name\nCS101,CS I\nMATH101,Calculus I\n"
    res = client.post(
        "/api/imports/exams/preview",
        files={"file": ("exams.csv", exams_csv.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 200
    preview_id = res.json()["preview_id"]
    client.post(
        "/api/imports/exams/commit",
        json={"preview_id": preview_id, "import_type": "exams", "strategy": "atomic"},
    )

    # 2. Upload students
    students_csv = "student_id,student_name\nS1001,Ada Lovelace\nS1002,Alan Turing\n"
    res = client.post(
        "/api/imports/students/preview",
        files={"file": ("students.csv", students_csv.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 200
    assert res.json()["valid_rows"] == 2
    student_preview_id = res.json()["preview_id"]
    client.post(
        "/api/imports/students/commit",
        json={"preview_id": student_preview_id, "import_type": "students", "strategy": "atomic"},
    )

    # 3. Upload enrolments with 1 valid pair and 1 foreign reference error
    enrolments_csv = (
        "student_id,exam_code\n"
        "S1001,CS101\n"
        "S1001,UNKNOWN_EXAM\n"
    )
    res = client.post(
        "/api/imports/enrolments/preview",
        files={"file": ("enrolments.csv", enrolments_csv.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid_rows"] == 1
    assert data["invalid_rows"] == 1
    enrolment_preview_id = data["preview_id"]

    # 4. Download validation report
    res = client.get(f"/api/imports/reports/{enrolment_preview_id}")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "UNKNOWN_EXAM" in res.text

    # 5. Commit valid-only
    res = client.post(
        "/api/imports/enrolments/commit",
        json={"preview_id": enrolment_preview_id, "import_type": "enrolments", "strategy": "valid_only"},
    )
    assert res.status_code == 200
    assert res.json()["inserted_count"] == 1
    assert res.json()["rejected_count"] == 1


def test_sample_dataset_studio(client, clean_db):
    """Test Phase 9 Sample Dataset Studio preview and loading."""
    # 1. Preview sample dataset
    res = client.get("/api/imports/sample-dataset/preview")
    assert res.status_code == 200
    data = res.json()
    assert data["exam_count"] == 15
    assert data["student_count"] == 36
    assert data["enrolment_count"] == 85
    assert "ENG101" in data["projected_isolated_exams"]
    assert data["projected_conflicts"] > 0

    # 2. Load sample dataset in replace mode
    res = client.post(
        "/api/imports/sample-dataset/load",
        json={"mode": "replace"},
    )
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "success"
    assert res_data["mode"] == "replace"
    assert res_data["exams_created"] == 15
    assert res_data["students_created"] == 36
    assert res_data["enrolments_created"] == 85
    assert res_data["graph_vertices"] == 15
    assert res_data["graph_edges"] > 0
    assert res_data["graph_fingerprint"] is not None

    # Verify conflict graph via conflict endpoint
    graph_res = client.get("/api/graph/conflicts")
    assert graph_res.status_code == 200
    assert graph_res.json()["vertex_count"] == 15
    assert "ENG101" in graph_res.json()["isolated_examinations"]

    # 3. Load sample dataset in append mode (should safely skip already existing records)
    res_append = client.post(
        "/api/imports/sample-dataset/load",
        json={"mode": "append"},
    )
    assert res_append.status_code == 200
    assert res_append.json()["mode"] == "append"
    assert res_append.json()["exams_created"] == 0
    assert res_append.json()["students_created"] == 0
