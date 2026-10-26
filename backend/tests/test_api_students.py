"""Tests for Student API endpoints."""

import pytest


class TestStudentEndpoints:
    """Tests for /api/students CRUD routes."""

    def test_list_students_empty(self, client):
        """GET /api/students on an empty database returns empty items list."""
        response = client.get("/api/students")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_create_student_success(self, client):
        """POST /api/students registers a new student."""
        payload = {"student_id": "S1001", "display_name": "Ada Lovelace"}
        response = client.post("/api/students", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["student_id"] == "S1001"
        assert data["display_name"] == "Ada Lovelace"
        assert "id" in data
        assert data["enrolment_count"] == 0

    def test_create_student_rejects_duplicate_student_id(self, client):
        """POST /api/students rejects duplicate student_id with 409 Conflict."""
        payload = {"student_id": "S1001", "display_name": "Alan Turing"}
        res1 = client.post("/api/students", json=payload)
        assert res1.status_code == 201

        res2 = client.post("/api/students", json=payload)
        assert res2.status_code == 409
        assert "already exists" in res2.json()["detail"]

    def test_create_student_validates_required_fields(self, client):
        """POST /api/students rejects empty student_id."""
        res = client.post("/api/students", json={"student_id": "  "})
        assert res.status_code == 422

    def test_get_student_by_id_and_by_student_id(self, client):
        """GET /api/students/{id} resolves by both UUID and student_id."""
        create_res = client.post(
            "/api/students", json={"student_id": "S2002", "display_name": "Grace Hopper"}
        )
        assert create_res.status_code == 201
        student_uuid = create_res.json()["id"]

        # Lookup by UUID
        res_by_uuid = client.get(f"/api/students/{student_uuid}")
        assert res_by_uuid.status_code == 200
        assert res_by_uuid.json()["student_id"] == "S2002"

        # Lookup by student_id
        res_by_sid = client.get("/api/students/S2002")
        assert res_by_sid.status_code == 200
        assert res_by_sid.json()["id"] == student_uuid

    def test_get_student_not_found(self, client):
        """GET /api/students/{id} returns 404 for missing student."""
        res = client.get("/api/students/MISSING_ID")
        assert res.status_code == 404

    def test_patch_student(self, client):
        """PATCH /api/students/{id} updates fields."""
        create_res = client.post(
            "/api/students", json={"student_id": "S3003", "display_name": "Claude Shannon"}
        )
        student_id = create_res.json()["id"]

        patch_res = client.patch(
            f"/api/students/{student_id}", json={"display_name": "Dr. Claude Shannon"}
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["display_name"] == "Dr. Claude Shannon"

    def test_patch_student_duplicate_check(self, client):
        """PATCH /api/students/{id} rejects renaming student_id to an existing one."""
        client.post("/api/students", json={"student_id": "S1111"})
        res_b = client.post("/api/students", json={"student_id": "S2222"})
        b_id = res_b.json()["id"]

        patch_res = client.patch(f"/api/students/{b_id}", json={"student_id": "S1111"})
        assert patch_res.status_code == 409

    def test_delete_student(self, client):
        """DELETE /api/students/{id} deletes the student."""
        create_res = client.post("/api/students", json={"student_id": "S4004"})
        student_id = create_res.json()["id"]

        del_res = client.delete(f"/api/students/{student_id}")
        assert del_res.status_code == 200
        assert del_res.json()["deleted_student_id"] == "S4004"

        # Verify 404
        assert client.get(f"/api/students/{student_id}").status_code == 404

    def test_list_students_search(self, client):
        """GET /api/students search queries work properly."""
        client.post("/api/students", json={"student_id": "S5001", "display_name": "Donald Knuth"})
        client.post("/api/students", json={"student_id": "S5002", "display_name": "Edsger Dijkstra"})

        res = client.get("/api/students?search=Knuth")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["display_name"] == "Donald Knuth"
