"""Tests for Conflict Graph API endpoint."""

import pytest


class TestConflictGraphEndpoint:
    """Tests for GET /api/graph/conflicts dynamic construction and serialization."""

    def test_conflict_graph_empty_database(self, client):
        """GET /api/graph/conflicts returns zero vertices and edges when DB is empty."""
        res = client.get("/api/graph/conflicts")
        assert res.status_code == 200
        data = res.json()
        assert data["vertex_count"] == 0
        assert data["edge_count"] == 0
        assert data["vertices"] == []
        assert data["edges"] == []
        assert data["degrees"] == {}
        assert data["isolated_examinations"] == []
        assert data["adjacency"] == {}

    def test_conflict_graph_isolated_examinations(self, client):
        """Examinations with no shared enrolments remain isolated vertices (degree 0)."""
        client.post("/api/exams", json={"code": "CS101", "name": "Computer Science"})
        client.post("/api/exams", json={"code": "ART101", "name": "Fine Arts"})

        res = client.get("/api/graph/conflicts")
        assert res.status_code == 200
        data = res.json()
        assert data["vertex_count"] == 2
        assert data["edge_count"] == 0
        assert set(data["isolated_examinations"]) == {"CS101", "ART101"}
        assert data["degrees"]["CS101"] == 0
        assert data["degrees"]["ART101"] == 0
        assert data["adjacency"]["CS101"] == []
        assert data["adjacency"]["ART101"] == []

    def test_conflict_graph_single_student_no_conflict(self, client):
        """A student taking only 1 exam produces no edges."""
        client.post("/api/exams", json={"code": "MATH101", "name": "Calculus"})
        client.post("/api/students", json={"student_id": "S1"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "MATH101"})

        res = client.get("/api/graph/conflicts")
        assert res.status_code == 200
        data = res.json()
        assert data["vertex_count"] == 1
        assert data["edge_count"] == 0
        assert data["degrees"]["MATH101"] == 0
        assert data["isolated_examinations"] == ["MATH101"]

    def test_conflict_graph_pairwise_conflicts_and_weights(self, client):
        """Students enrolled in multiple courses create conflict edges with correct weights."""
        client.post("/api/exams", json={"code": "CS101", "name": "CS 1"})
        client.post("/api/exams", json={"code": "MATH201", "name": "Discrete Math"})
        client.post("/api/students", json={"student_id": "S1"})
        client.post("/api/students", json={"student_id": "S2"})

        # Both S1 and S2 take CS101 and MATH201
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "CS101"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "MATH201"})
        client.post("/api/enrolments", json={"student_id": "S2", "exam_id": "CS101"})
        client.post("/api/enrolments", json={"student_id": "S2", "exam_id": "MATH201"})

        res = client.get("/api/graph/conflicts")
        assert res.status_code == 200
        data = res.json()
        assert data["vertex_count"] == 2
        assert data["edge_count"] == 1
        assert data["degrees"]["CS101"] == 1
        assert data["degrees"]["MATH201"] == 1
        assert len(data["edges"]) == 1

        edge = data["edges"][0]
        assert edge["source"] == "CS101"
        assert edge["target"] == "MATH201"
        assert edge["weight"] == 2
        assert edge["shared_students"] == ["S1", "S2"]
        assert data["isolated_examinations"] == []
        assert data["adjacency"]["CS101"] == ["MATH201"]
        assert data["adjacency"]["MATH201"] == ["CS101"]

    def test_conflict_graph_triangle_cluster(self, client):
        """Three exams sharing students form a K3 complete triangle graph."""
        for code in ["E1", "E2", "E3"]:
            client.post("/api/exams", json={"code": code, "name": f"Course {code}"})

        client.post("/api/students", json={"student_id": "S_ALL"})
        for code in ["E1", "E2", "E3"]:
            client.post("/api/enrolments", json={"student_id": "S_ALL", "exam_id": code})

        res = client.get("/api/graph/conflicts")
        assert res.status_code == 200
        data = res.json()
        assert data["vertex_count"] == 3
        assert data["edge_count"] == 3
        for code in ["E1", "E2", "E3"]:
            assert data["degrees"][code] == 2
        assert len(data["isolated_examinations"]) == 0

    def test_conflict_graph_updates_dynamically_after_enrolment_deletion(self, client):
        """Deleting an enrolment immediately removes the conflict edge without stale caching."""
        client.post("/api/exams", json={"code": "X1", "name": "Exam X1"})
        client.post("/api/exams", json={"code": "X2", "name": "Exam X2"})
        client.post("/api/students", json={"student_id": "S_SOLO"})

        client.post("/api/enrolments", json={"student_id": "S_SOLO", "exam_id": "X1"})
        e2_res = client.post(
            "/api/enrolments", json={"student_id": "S_SOLO", "exam_id": "X2"}
        )
        e2_id = e2_res.json()["id"]

        # Conflict edge exists
        res1 = client.get("/api/graph/conflicts")
        assert res1.json()["edge_count"] == 1

        # Delete enrolment
        client.delete(f"/api/enrolments/{e2_id}")

        # Edge must vanish
        res2 = client.get("/api/graph/conflicts")
        assert res2.json()["edge_count"] == 0
        assert set(res2.json()["isolated_examinations"]) == {"X1", "X2"}
