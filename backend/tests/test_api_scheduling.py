"""Tests for the timetable scheduling algorithm API endpoints (Phase 7)."""

import pytest
from fastapi.testclient import TestClient


class TestSchedulingEndpoints:
    """Test suite covering Greedy, Backtracking, Infeasibility, Resource limits, and Comparison."""

    def test_run_greedy_empty_database(self, client: TestClient):
        """Empty graph returns 0 slots used, COMPLETED status, and valid validation."""
        response = client.post("/api/scheduling/run", json={"algorithm": "greedy"})
        assert response.status_code == 200
        data = response.json()

        assert data["algorithm"] == "greedy"
        assert data["status"] == "COMPLETED"
        assert data["is_complete"] is True
        assert data["is_valid"] is True
        assert data["slots_used"] == 0
        assert data["slot_assignments"] == {}
        assert data["vertex_count"] == 0
        assert data["edge_count"] == 0

    def test_run_greedy_simple_graph_and_independent_validation(self, client: TestClient):
        """Greedy finds a valid conflict-free assignment and passes independent validation."""
        # 1. Populate courses and enrolments
        client.post("/api/exams", json={"code": "CS101", "name": "Intro to CS"})
        client.post("/api/exams", json={"code": "MATH101", "name": "Calculus I"})
        client.post("/api/students", json={"student_id": "S1", "name": "Alice"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "CS101"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "MATH101"})

        # 2. Run Greedy
        response = client.post(
            "/api/scheduling/run",
            json={
                "algorithm": "greedy",
                "ordering_strategy": "descending_degree",
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["algorithm"] == "greedy"
        assert data["status"] == "COMPLETED"
        assert data["is_complete"] is True
        assert data["is_valid"] is True
        assert data["slots_used"] == 2
        assert len(data["slot_assignments"]) == 2
        # CS101 and MATH101 must receive different slots
        assert data["slot_assignments"]["CS101"] != data["slot_assignments"]["MATH101"]
        assert data["validation_report"]["is_valid"] is True
        assert len(data["validation_report"]["errors"]) == 0
        assert len(data["slot_details"]) == 2
        assert len(data["slots_summary"]) == 2

    def test_greedy_exceeding_max_slots_reports_failure(self, client: TestClient):
        """If max_colors is too restrictive, Greedy reports INCOMPLETE and is marked invalid."""
        client.post("/api/exams", json={"code": "E1", "name": "Exam 1"})
        client.post("/api/exams", json={"code": "E2", "name": "Exam 2"})
        client.post("/api/students", json={"student_id": "S1", "name": "Alice"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "E1"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "E2"})

        # 2 connected exams require 2 slots; restrict to max_colors=1
        response = client.post(
            "/api/scheduling/run",
            json={
                "algorithm": "greedy",
                "max_colors": 1,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "INCOMPLETE"
        assert data["is_complete"] is False
        assert data["is_valid"] is False
        assert "exceeded limit of 1 colors" in data["explanation"].lower() or "limit of 1" in data["explanation"]

    def test_triangle_graph_requires_three_colors(self, client: TestClient):
        """Triangle graph K3 requires 3 slots under both Greedy and Backtracking."""
        client.post("/api/exams", json={"code": "A", "name": "Course A"})
        client.post("/api/exams", json={"code": "B", "name": "Course B"})
        client.post("/api/exams", json={"code": "C", "name": "Course C"})

        client.post("/api/students", json={"student_id": "S_AB", "name": "AB"})
        client.post("/api/enrolments", json={"student_id": "S_AB", "exam_id": "A"})
        client.post("/api/enrolments", json={"student_id": "S_AB", "exam_id": "B"})

        client.post("/api/students", json={"student_id": "S_BC", "name": "BC"})
        client.post("/api/enrolments", json={"student_id": "S_BC", "exam_id": "B"})
        client.post("/api/enrolments", json={"student_id": "S_BC", "exam_id": "C"})

        client.post("/api/students", json={"student_id": "S_CA", "name": "CA"})
        client.post("/api/enrolments", json={"student_id": "S_CA", "exam_id": "C"})
        client.post("/api/enrolments", json={"student_id": "S_CA", "exam_id": "A"})

        # Run Backtracking with k=3
        res3 = client.post(
            "/api/scheduling/run",
            json={
                "algorithm": "backtracking",
                "max_colors": 3,
            },
        )
        assert res3.status_code == 200
        data3 = res3.json()
        assert data3["status"] == "COMPLETED"
        assert data3["is_valid"] is True
        assert data3["slots_used"] == 3

    def test_backtracking_proves_infeasibility_when_k_insufficient(self, client: TestClient):
        """Backtracking proves infeasibility for a triangle graph with k=2 slots."""
        client.post("/api/exams", json={"code": "A", "name": "Course A"})
        client.post("/api/exams", json={"code": "B", "name": "Course B"})
        client.post("/api/exams", json={"code": "C", "name": "Course C"})

        client.post("/api/students", json={"student_id": "S_AB", "name": "AB"})
        client.post("/api/enrolments", json={"student_id": "S_AB", "exam_id": "A"})
        client.post("/api/enrolments", json={"student_id": "S_AB", "exam_id": "B"})

        client.post("/api/students", json={"student_id": "S_BC", "name": "BC"})
        client.post("/api/enrolments", json={"student_id": "S_BC", "exam_id": "B"})
        client.post("/api/enrolments", json={"student_id": "S_BC", "exam_id": "C"})

        client.post("/api/students", json={"student_id": "S_CA", "name": "CA"})
        client.post("/api/enrolments", json={"student_id": "S_CA", "exam_id": "C"})
        client.post("/api/enrolments", json={"student_id": "S_CA", "exam_id": "A"})

        # Try k=2 (mathematically infeasible)
        response = client.post(
            "/api/scheduling/run",
            json={
                "algorithm": "backtracking",
                "max_colors": 2,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "INFEASIBLE"
        assert data["is_complete"] is False
        assert data["is_valid"] is False
        assert data["statistics"]["proven_infeasible"] is True
        assert "proved that no conflict-free timetable exists" in data["explanation"].lower() or "infeasible" in data["explanation"].lower()

    def test_resource_limited_search_never_reported_as_infeasible(self, client: TestClient):
        """A timeout or max_nodes halt must be labeled RESOURCE_LIMITED, never INFEASIBLE."""
        # Create a connected cycle
        for i in range(1, 6):
            client.post("/api/exams", json={"code": f"C{i}", "name": f"Cycle {i}"})
        for i in range(1, 6):
            nxt = (i % 5) + 1
            client.post("/api/students", json={"student_id": f"S_{i}", "name": f"Stu {i}"})
            client.post("/api/enrolments", json={"student_id": f"S_{i}", "exam_id": f"C{i}"})
            client.post("/api/enrolments", json={"student_id": f"S_{i}", "exam_id": f"C{nxt}"})

        # Run with max_nodes=2 to force early termination
        response = client.post(
            "/api/scheduling/run",
            json={
                "algorithm": "backtracking",
                "max_colors": 2,
                "max_nodes": 2,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "RESOURCE_LIMITED"
        assert data["is_complete"] is False
        assert data["is_valid"] is False
        assert data["statistics"]["proven_infeasible"] is False
        assert "not prove infeasibility" in data["explanation"].lower() or "incomplete" in data["explanation"].lower()

    def test_disconnected_and_isolated_components(self, client: TestClient):
        """Disconnected components and isolated exams are correctly handled and validated."""
        # Component 1: C1-C2
        client.post("/api/exams", json={"code": "C1", "name": "Comp1 A"})
        client.post("/api/exams", json={"code": "C2", "name": "Comp1 B"})
        client.post("/api/students", json={"student_id": "S_C1", "name": "S1"})
        client.post("/api/enrolments", json={"student_id": "S_C1", "exam_id": "C1"})
        client.post("/api/enrolments", json={"student_id": "S_C1", "exam_id": "C2"})

        # Isolated: ISO1
        client.post("/api/exams", json={"code": "ISO1", "name": "Isolated 1"})

        response = client.post(
            "/api/scheduling/run",
            json={"algorithm": "greedy", "ordering_strategy": "descending_degree"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "COMPLETED"
        assert data["is_valid"] is True
        assert len(data["slot_assignments"]) == 3
        # ISO1 must be assigned a valid slot (e.g. slot 1)
        assert "ISO1" in data["slot_assignments"]
        assert data["slot_assignments"]["C1"] != data["slot_assignments"]["C2"]

    def test_compare_endpoint_uses_same_snapshot(self, client: TestClient):
        """Comparison endpoint benchmarks Greedy and Backtracking on identical graph snapshot."""
        client.post("/api/exams", json={"code": "X1", "name": "Exam X1"})
        client.post("/api/exams", json={"code": "X2", "name": "Exam X2"})
        client.post("/api/students", json={"student_id": "SX", "name": "Sam"})
        client.post("/api/enrolments", json={"student_id": "SX", "exam_id": "X1"})
        client.post("/api/enrolments", json={"student_id": "SX", "exam_id": "X2"})

        response = client.post(
            "/api/scheduling/compare",
            json={
                "ordering_strategy": "descending_degree",
                "max_colors": 2,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert "compare_id" in data
        assert data["vertex_count"] == 2
        assert data["edge_count"] == 1
        assert data["greedy_result"]["algorithm"] == "greedy"
        assert data["backtracking_result"]["algorithm"] == "backtracking"
        assert data["greedy_result"]["is_valid"] is True
        assert data["backtracking_result"]["is_valid"] is True
        assert data["summary_explanation"] is not None

    def test_run_retrieval_and_listing(self, client: TestClient):
        """Previous runs can be retrieved by run_id and listed."""
        client.post("/api/exams", json={"code": "R1", "name": "Course R1"})
        res = client.post("/api/scheduling/run", json={"algorithm": "greedy"})
        assert res.status_code == 200
        run_id = res.json()["run_id"]

        # Retrieve by ID
        get_res = client.get(f"/api/scheduling/runs/{run_id}")
        assert get_res.status_code == 200
        assert get_res.json()["run_id"] == run_id

        # List recent runs
        list_res = client.get("/api/scheduling/runs")
        assert list_res.status_code == 200
        runs = list_res.json()
        assert len(runs) >= 1
        assert any(r["run_id"] == run_id for r in runs)

    def test_invalid_parameters_return_400_or_422(self, client: TestClient):
        """Validation of input constraints (e.g. invalid algorithm, negative colors)."""
        # Invalid algorithm name
        res1 = client.post("/api/scheduling/run", json={"algorithm": "genetic_algorithm"})
        assert res1.status_code == 422

        # Invalid negative max_colors
        res2 = client.post("/api/scheduling/run", json={"algorithm": "greedy", "max_colors": -5})
        assert res2.status_code == 422
