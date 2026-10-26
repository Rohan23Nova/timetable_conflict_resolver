"""Tests for Enrolment API endpoints."""

import pytest


class TestEnrolmentEndpoints:
    """Tests for /api/enrolments listing, creation, and deletion."""

    def test_list_enrolments_empty(self, client):
        """GET /api/enrolments returns empty items list initially."""
        res = client.get("/api/enrolments")
        assert res.status_code == 200
        assert res.json()["items"] == []
        assert res.json()["total"] == 0

    def test_create_enrolment_using_codes(self, client):
        """POST /api/enrolments accepts human codes ('CS101', 'S1001') and persists."""
        client.post("/api/exams", json={"code": "CS101", "name": "Intro to CS"})
        client.post("/api/students", json={"student_id": "S1001", "display_name": "Ada"})

        res = client.post(
            "/api/enrolments", json={"student_id": "S1001", "exam_id": "CS101"}
        )
        assert res.status_code == 201
        data = res.json()
        assert data["student_identifier"] == "S1001"
        assert data["exam_code"] == "CS101"
        assert data["exam_name"] == "Intro to CS"
        assert "id" in data

        # Check enrolment count on exam and student endpoints
        exam_res = client.get("/api/exams/CS101")
        assert exam_res.json()["enrolment_count"] == 1

        student_res = client.get("/api/students/S1001")
        assert student_res.json()["enrolment_count"] == 1

    def test_create_enrolment_rejects_missing_student(self, client):
        """POST /api/enrolments returns 404 if student does not exist."""
        client.post("/api/exams", json={"code": "MATH101", "name": "Math"})
        res = client.post(
            "/api/enrolments",
            json={"student_id": "NON_EXISTENT_STUDENT", "exam_id": "MATH101"},
        )
        assert res.status_code == 404
        assert "student" in res.json()["detail"].lower()

    def test_create_enrolment_rejects_missing_exam(self, client):
        """POST /api/enrolments returns 404 if examination does not exist."""
        client.post("/api/students", json={"student_id": "S2002"})
        res = client.post(
            "/api/enrolments",
            json={"student_id": "S2002", "exam_id": "NON_EXISTENT_EXAM"},
        )
        assert res.status_code == 404
        assert "examination" in res.json()["detail"].lower()

    def test_create_enrolment_rejects_duplicates(self, client):
        """POST /api/enrolments returns 409 Conflict if already enrolled."""
        client.post("/api/exams", json={"code": "PHYS101", "name": "Physics"})
        client.post("/api/students", json={"student_id": "S3003"})

        res1 = client.post(
            "/api/enrolments", json={"student_id": "S3003", "exam_id": "PHYS101"}
        )
        assert res1.status_code == 201

        # Second enrolment attempt
        res2 = client.post(
            "/api/enrolments", json={"student_id": "S3003", "exam_id": "PHYS101"}
        )
        assert res2.status_code == 409
        assert "already enrolled" in res2.json()["detail"]

    def test_delete_enrolment(self, client):
        """DELETE /api/enrolments/{id} removes the enrolment record."""
        client.post("/api/exams", json={"code": "CHEM101", "name": "Chemistry"})
        client.post("/api/students", json={"student_id": "S4004"})
        enrol_res = client.post(
            "/api/enrolments", json={"student_id": "S4004", "exam_id": "CHEM101"}
        )
        enrolment_id = enrol_res.json()["id"]

        del_res = client.delete(f"/api/enrolments/{enrolment_id}")
        assert del_res.status_code == 200

        # Verify listing is now empty
        res = client.get("/api/enrolments")
        assert res.json()["total"] == 0

    def test_delete_enrolment_not_found(self, client):
        """DELETE /api/enrolments/{id} returns 404 for missing enrolment."""
        res = client.delete("/api/enrolments/DOES_NOT_EXIST")
        assert res.status_code == 404

    def test_filter_enrolments_by_exam_and_student(self, client):
        """GET /api/enrolments filters correctly by exam or student."""
        client.post("/api/exams", json={"code": "E1", "name": "Exam 1"})
        client.post("/api/exams", json={"code": "E2", "name": "Exam 2"})
        client.post("/api/students", json={"student_id": "S1"})
        client.post("/api/students", json={"student_id": "S2"})

        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "E1"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "E2"})
        client.post("/api/enrolments", json={"student_id": "S2", "exam_id": "E1"})

        # Filter by exam E2
        res_e2 = client.get("/api/enrolments?exam_id=E2")
        assert res_e2.status_code == 200
        assert res_e2.json()["total"] == 1
        assert res_e2.json()["items"][0]["student_identifier"] == "S1"

        # Filter by student S1
        res_s1 = client.get("/api/enrolments?student_id=S1")
        assert res_s1.status_code == 200
        assert res_s1.json()["total"] == 2
