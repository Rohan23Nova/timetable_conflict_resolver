"""Tests for Examination API endpoints."""

import pytest


class TestExaminationEndpoints:
    """Tests for /api/exams CRUD routes."""

    def test_list_exams_empty(self, client):
        """GET /api/exams on an empty database returns empty items list."""
        response = client.get("/api/exams")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["skip"] == 0
        assert data["limit"] == 100

    def test_create_examination_success(self, client):
        """POST /api/exams creates a valid examination and returns 201."""
        payload = {
            "code": "CS101",
            "name": "Introduction to Computer Science",
            "department": "Computer Science",
            "semester": "Fall 2026",
            "duration": 180,
        }
        response = client.post("/api/exams", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "CS101"
        assert data["name"] == "Introduction to Computer Science"
        assert data["department"] == "Computer Science"
        assert data["semester"] == "Fall 2026"
        assert data["duration"] == 180
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert data["enrolment_count"] == 0

    def test_create_examination_rejects_duplicate_code(self, client):
        """POST /api/exams rejects duplicate examination codes with 409 Conflict."""
        payload = {"code": "MATH101", "name": "Calculus I"}
        res1 = client.post("/api/exams", json=payload)
        assert res1.status_code == 201

        # Duplicate attempt
        res2 = client.post("/api/exams", json=payload)
        assert res2.status_code == 409
        assert "already exists" in res2.json()["detail"]

    def test_create_examination_validates_required_fields(self, client):
        """POST /api/exams returns 422 on empty or missing code/name."""
        # Missing name
        res = client.post("/api/exams", json={"code": "CS102"})
        assert res.status_code == 422

        # Empty whitespace code
        res2 = client.post("/api/exams", json={"code": "   ", "name": "Invalid"})
        assert res2.status_code == 422

        # Invalid duration (< 1 minute)
        res3 = client.post(
            "/api/exams", json={"code": "CS103", "name": "Test", "duration": 0}
        )
        assert res3.status_code == 422

    def test_get_examination_by_id_and_by_code(self, client):
        """GET /api/exams/{id} resolves examination by both UUID and unique code."""
        create_res = client.post(
            "/api/exams", json={"code": "PHYS101", "name": "Physics I"}
        )
        assert create_res.status_code == 201
        exam_id = create_res.json()["id"]

        # Lookup by UUID
        res_by_uuid = client.get(f"/api/exams/{exam_id}")
        assert res_by_uuid.status_code == 200
        assert res_by_uuid.json()["code"] == "PHYS101"

        # Lookup by Code
        res_by_code = client.get("/api/exams/PHYS101")
        assert res_by_code.status_code == 200
        assert res_by_code.json()["id"] == exam_id

    def test_get_examination_not_found(self, client):
        """GET /api/exams/{id} returns 404 for non-existent examination."""
        res = client.get("/api/exams/NON_EXISTENT")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    def test_patch_examination(self, client):
        """PATCH /api/exams/{id} updates specified fields."""
        create_res = client.post(
            "/api/exams", json={"code": "CHEM101", "name": "Chemistry"}
        )
        exam_id = create_res.json()["id"]

        patch_res = client.patch(
            f"/api/exams/{exam_id}",
            json={"name": "General Chemistry & Lab", "duration": 120},
        )
        assert patch_res.status_code == 200
        data = patch_res.json()
        assert data["name"] == "General Chemistry & Lab"
        assert data["duration"] == 120
        assert data["code"] == "CHEM101"

    def test_patch_examination_rejects_duplicate_code(self, client):
        """PATCH /api/exams/{id} prevents renaming code to an existing code."""
        client.post("/api/exams", json={"code": "EXAM_A", "name": "Course A"})
        res_b = client.post(
            "/api/exams", json={"code": "EXAM_B", "name": "Course B"}
        )
        b_id = res_b.json()["id"]

        patch_res = client.patch(f"/api/exams/{b_id}", json={"code": "EXAM_A"})
        assert patch_res.status_code == 409
        assert "already assigned" in patch_res.json()["detail"]

    def test_delete_examination(self, client):
        """DELETE /api/exams/{id} removes the examination and cascades."""
        create_res = client.post(
            "/api/exams", json={"code": "BIO101", "name": "Biology"}
        )
        exam_id = create_res.json()["id"]

        del_res = client.delete(f"/api/exams/{exam_id}")
        assert del_res.status_code == 200
        assert del_res.json()["deleted_code"] == "BIO101"

        # Verify 404 subsequently
        get_res = client.get(f"/api/exams/{exam_id}")
        assert get_res.status_code == 404

    def test_delete_examination_not_found(self, client):
        """DELETE /api/exams/{id} returns 404 for missing examination."""
        del_res = client.delete("/api/exams/DOES_NOT_EXIST")
        assert del_res.status_code == 404

    def test_list_exams_search_and_pagination(self, client):
        """GET /api/exams supports search filtering and pagination."""
        client.post(
            "/api/exams",
            json={"code": "CS101", "name": "Computer Science 1", "department": "CS"},
        )
        client.post(
            "/api/exams",
            json={"code": "CS201", "name": "Data Structures", "department": "CS"},
        )
        client.post(
            "/api/exams",
            json={"code": "HIST101", "name": "World History", "department": "History"},
        )

        # Search for CS
        res = client.get("/api/exams?search=Computer")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["code"] == "CS101"

        # Pagination
        res_page = client.get("/api/exams?skip=1&limit=1")
        assert res_page.status_code == 200
        page_data = res_page.json()
        assert page_data["total"] == 3
        assert len(page_data["items"]) == 1
