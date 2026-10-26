"""Tests for Sample Data loading API endpoints."""

import pytest


class TestSampleDataEndpoints:
    """Tests for POST /api/sample-data and POST /api/sample-data/load."""

    def test_load_sample_data_fresh_database(self, client):
        """Loading sample data into an empty database creates exams, students, and conflict graph."""
        res = client.post("/api/sample-data")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["exams_created"] == 10
        assert data["students_created"] == 20
        assert data["enrolments_created"] > 0
        assert data["conflict_edges_detected"] > 0
        assert "ENG101" in data["isolated_examinations"]

        # Verify exams can now be listed via the examination API
        exams_res = client.get("/api/exams")
        assert exams_res.json()["total"] == 10

        # Verify students can be listed
        students_res = client.get("/api/students")
        assert students_res.json()["total"] == 20

    def test_repeated_load_without_reset_does_not_overwrite(self, client):
        """POST /api/sample-data with reset=False does not overwrite existing records."""
        # Initial load
        res1 = client.post("/api/sample-data")
        assert res1.status_code == 200
        assert res1.json()["status"] == "success"

        # Second load without reset
        res2 = client.post("/api/sample-data", json={"reset": False})
        assert res2.status_code == 200
        data = res2.json()
        assert data["status"] == "skipped"
        assert "Existing database records detected" in data["message"]
        assert data["exams_created"] == 0

        # Total counts remain unaffected
        assert client.get("/api/exams").json()["total"] == 10

    def test_repeated_load_with_reset_overwrites_deterministically(self, client):
        """POST /api/sample-data with reset=True cleanly resets and re-imports."""
        # Initial load
        client.post("/api/sample-data")

        # Mutate by adding a custom exam
        client.post("/api/exams", json={"code": "TEMP999", "name": "Temporary Course"})
        assert client.get("/api/exams").json()["total"] == 11

        # Re-import with reset=True
        res_reset = client.post("/api/sample-data", json={"reset": True})
        assert res_reset.status_code == 200
        assert res_reset.json()["status"] == "success"
        assert res_reset.json()["exams_created"] == 10

        # Total count is back to clean 10, TEMP999 is gone
        assert client.get("/api/exams").json()["total"] == 10
        assert client.get("/api/exams/TEMP999").status_code == 404

    def test_sample_data_load_alias_endpoint(self, client):
        """POST /api/sample-data/load functions as an alias."""
        res = client.post("/api/sample-data/load")
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert res.json()["exams_created"] == 10
