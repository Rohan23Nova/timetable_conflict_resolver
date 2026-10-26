"""End-to-End 15-Step Workflow Verification Test Suite for SLOTWISE (Phase 10).

Executes and verifies the full lifecycle:
1. Health and readiness probes
2. Authentication / developer access handling
3. Initial workspace inspection
4. Benchmark sample dataset import
5. Course and enrolment management
6. Dynamic conflict graph explorer inspection
7. Greedy coloring with Welsh-Powell ordering (descending degree)
8. Backtracking exact search and pruning diagnostics
9. Side-by-side algorithm comparison on identical snapshot
10. Independent schedule validation
11. Persistent schedule saving
12. Schedule history tracking
13. Timetable CSV and JSON export
14. Graph mutation and stale-schedule detection
15. Multi-session database persistence
"""

import csv
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.models.examination import ExamModel
from backend.app.models.student import StudentModel
from backend.app.models.enrolment import EnrolmentModel
from backend.app.models.schedule import SavedSchedule


class TestEndToEndWorkflow:
    """15-step end-to-end user workflow test suite."""

    def test_complete_e2e_15_step_workflow(self, client: TestClient, test_db_session: Session):
        # ---------------------------------------------------------------------
        # Step 1: Health & Readiness Probes
        # ---------------------------------------------------------------------
        for path in ["/health", "/ready", "/api/health", "/api/ready"]:
            res = client.get(path)
            assert res.status_code == 200, f"Health check failed on {path}"
            data = res.json()
            assert data["status"] == "healthy"
            assert data["database"] == "connected"
            assert "timestamp" in data

        # ---------------------------------------------------------------------
        # Step 2: Authentication & Developer Access
        # ---------------------------------------------------------------------
        # Unauthenticated calls to public endpoints succeed
        docs_res = client.get("/docs")
        assert docs_res.status_code == 200

        # Root route serves SPA index (200) or redirects to docs (302/307)
        root_res = client.get("/", follow_redirects=False)
        assert root_res.status_code in (200, 302, 307)


        # ---------------------------------------------------------------------
        # Step 3: Workspace State (Initially Empty)
        # ---------------------------------------------------------------------
        assert client.get("/api/exams").json()["items"] == []
        assert client.get("/api/students").json()["items"] == []
        assert client.get("/api/schedules").json() == []

        # ---------------------------------------------------------------------
        # Step 4: Load Benchmark Dataset (15 exams, 36 students, 85 enrolments)
        # ---------------------------------------------------------------------
        preview_res = client.get("/api/imports/sample-dataset/preview")
        assert preview_res.status_code == 200
        preview_data = preview_res.json()
        assert preview_data["exam_count"] == 15
        assert preview_data["student_count"] == 36
        assert preview_data["enrolment_count"] == 85
        assert "ENG101" in preview_data["projected_isolated_exams"]

        load_res = client.post("/api/imports/sample-dataset/load", json={"mode": "replace"})
        assert load_res.status_code == 200
        load_data = load_res.json()
        assert load_data["status"] == "success"
        assert load_data["exams_created"] == 15
        assert load_data["students_created"] == 36
        assert load_data["enrolments_created"] == 85
        assert load_data["graph_vertices"] == 15
        assert load_data["graph_edges"] > 0

        # ---------------------------------------------------------------------
        # Step 5: Dynamic Course & Enrolment Management
        # ---------------------------------------------------------------------
        # Add examination DATA401
        exam_res = client.post(
            "/api/exams",
            json={
                "code": "DATA401",
                "name": "Big Data Systems",
                "department": "Computer Science",
                "semester": "6",
                "duration_minutes": 180,
            },
        )
        assert exam_res.status_code == 201

        # Add student S9999
        student_res = client.post(
            "/api/students",
            json={
                "student_id": "S9999",
                "name": "Rohan Kumar",
                "email": "rohan@university.edu",
                "semester": "6",
            },
        )
        assert student_res.status_code == 201

        # Enrol S9999 in DATA401 and CS101
        enrol1 = client.post("/api/enrolments", json={"student_id": "S9999", "exam_id": "DATA401"})
        assert enrol1.status_code == 201
        enrol2 = client.post("/api/enrolments", json={"student_id": "S9999", "exam_id": "CS101"})
        assert enrol2.status_code == 201

        # ---------------------------------------------------------------------
        # Step 6: Conflict Graph Explorer Verification
        # ---------------------------------------------------------------------
        graph_res = client.get("/api/graph/conflicts")
        assert graph_res.status_code == 200
        graph_data = graph_res.json()

        assert graph_data["vertex_count"] == 16  # 15 benchmark + 1 new
        vertex_codes = [v["code"] for v in graph_data["vertices"]]
        assert "DATA401" in vertex_codes
        assert "CS101" in vertex_codes

        # Conflict edge exists between DATA401 and CS101
        assert "CS101" in graph_data["adjacency"]["DATA401"]
        data_edges = [
            e for e in graph_data["edges"]
            if ("DATA401" in (e["source"], e["target"]) and "CS101" in (e["source"], e["target"]))
        ]
        assert len(data_edges) == 1
        assert "S9999" in data_edges[0]["shared_students"]


        # Isolated examination ENG101 remains isolated
        assert "ENG101" in graph_data["isolated_examinations"]

        # Metrics are calculated
        assert graph_data["edge_count"] > 0
        assert len(graph_data["degrees"]) == 16
        max_deg = max(graph_data["degrees"].values())
        assert max_deg >= 1


        # ---------------------------------------------------------------------
        # Step 7: Greedy Coloring with Welsh-Powell Ordering
        # ---------------------------------------------------------------------
        greedy_res = client.post(
            "/api/scheduling/run",
            json={"algorithm": "greedy", "ordering_strategy": "descending_degree"},
        )
        assert greedy_res.status_code == 200
        greedy_data = greedy_res.json()

        assert greedy_data["algorithm"] == "greedy"
        assert greedy_data["ordering_strategy"] == "descending_degree"
        assert greedy_data["is_valid"] is True
        assert len(greedy_data["slot_assignments"]) == 16
        # Welsh-Powell theoretical upper bound: slots <= Delta(G) + 1
        assert greedy_data["slots_used"] <= max_deg + 1
        assert greedy_data["execution_time_ms"] >= 0.0

        greedy_slots = greedy_data["slots_used"]

        # ---------------------------------------------------------------------
        # Step 8: Backtracking Exact Chromatic Search & Pruning Diagnostics
        # ---------------------------------------------------------------------
        # Run backtracking with k = greedy_slots
        bt_res = client.post(
            "/api/scheduling/run",
            json={
                "algorithm": "backtracking",
                "max_colors": greedy_slots,
                "timeout_seconds": 10.0,
            },
        )
        assert bt_res.status_code == 200
        bt_data = bt_res.json()

        assert bt_data["algorithm"] == "backtracking"
        assert bt_data["is_valid"] is True
        assert bt_data["slots_used"] <= greedy_slots
        assert bt_data["statistics"].get("nodes_explored", 0) > 0

        # Backtracking with k=1 on a graph with edges must return INFEASIBLE
        bt_infeasible = client.post(
            "/api/scheduling/run",
            json={"algorithm": "backtracking", "max_colors": 1, "timeout_seconds": 5.0},
        )
        assert bt_infeasible.status_code == 200
        infeasible_data = bt_infeasible.json()
        assert infeasible_data["status"] == "INFEASIBLE"
        assert infeasible_data["is_valid"] is False

        # ---------------------------------------------------------------------
        # Step 9: Side-by-Side Algorithm Comparison on Same Graph Snapshot
        # ---------------------------------------------------------------------
        compare_res = client.post(
            "/api/scheduling/compare",
            json={"max_colors": greedy_slots, "ordering_strategy": "descending_degree"},
        )
        assert compare_res.status_code == 200
        compare_data = compare_res.json()

        assert "greedy_result" in compare_data
        assert "backtracking_result" in compare_data
        assert compare_data["vertex_count"] == 16
        assert compare_data["greedy_result"]["is_valid"] is True
        assert compare_data["backtracking_result"]["is_valid"] is True

        # ---------------------------------------------------------------------
        # Step 10: Independent Schedule Validation
        # ---------------------------------------------------------------------
        val_report = greedy_data["validation_report"]
        assert val_report["is_valid"] is True
        assert len(val_report["errors"]) == 0
        assert len(val_report["conflicts"]) == 0
        assert len(val_report["missing_examinations"]) == 0
        assert len(val_report["unknown_examinations"]) == 0
        assert len(val_report["invalid_color_values"]) == 0
        assert len(val_report["out_of_range_colors"]) == 0
        assert "check_missing_examinations" in val_report["checks_performed"]
        assert "check_conflicts" in val_report["checks_performed"]
        assert len(val_report["checks_performed"]) == 5



        # ---------------------------------------------------------------------
        # Step 11: Save Valid Schedule to Persistent Storage
        # ---------------------------------------------------------------------
        save_payload = {
            "name": "E2E Verified Examination Timetable",
            "description": "Production timetable generated via Welsh-Powell and validated",
            "algorithm": greedy_data["algorithm"],
            "parameters": {"ordering_strategy": greedy_data["ordering_strategy"]},
            "slot_assignments": greedy_data["slot_assignments"],
            "slot_details": greedy_data["slot_details"],
            "slots_used": greedy_data["slots_used"],
            "is_valid": True,
            "validation_report": greedy_data["validation_report"],
            "date_config": {
                "start_date": "2026-12-01",
                "slots_per_day": 2,
                "session_times": ["09:00 - 12:00", "14:00 - 17:00"],
                "slot_duration_minutes": 180,
                "slot_break_minutes": 120,
                "skip_weekends": True,
            },
        }
        save_res = client.post("/api/schedules", json=save_payload)
        assert save_res.status_code == 201
        saved_schedule = save_res.json()
        schedule_id = saved_schedule["id"]

        assert saved_schedule["name"] == "E2E Verified Examination Timetable"
        assert saved_schedule["slots_used"] == greedy_slots
        assert saved_schedule["is_stale"] is False

        # Attempting to save invalid schedule is rejected with 400
        bad_save = client.post(
            "/api/schedules",
            json={
                "name": "Invalid Schedule",
                "algorithm": "greedy",
                "parameters": {},
                "slot_assignments": {"DATA401": 1},
                "slots_used": 1,
                "is_valid": False,
            },
        )
        assert bad_save.status_code in (400, 422)

        # ---------------------------------------------------------------------
        # Step 12: Schedule Detail & History Tracking
        # ---------------------------------------------------------------------
        detail_res = client.get(f"/api/schedules/{schedule_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["id"] == schedule_id
        assert len(detail_res.json()["slot_assignments"]) == 16

        history_res = client.get("/api/schedules")
        assert history_res.status_code == 200
        history_list = history_res.json()
        assert len(history_list) >= 1
        assert any(s["id"] == schedule_id for s in history_list)

        # ---------------------------------------------------------------------
        # Step 13: Timetable Export (CSV and JSON)
        # ---------------------------------------------------------------------
        # CSV export
        csv_res = client.get(f"/api/schedules/{schedule_id}/export/csv")
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers["content-type"]
        assert "attachment" in csv_res.headers.get("content-disposition", "")

        csv_reader = csv.reader(io.StringIO(csv_res.text))
        rows = list(csv_reader)
        assert len(rows) == 17  # Header + 16 exam rows
        header = rows[0]
        assert "Slot" in header
        assert "Exam Code" in header

        # JSON export
        json_export_res = client.get(f"/api/schedules/{schedule_id}/export/json")
        assert json_export_res.status_code == 200
        json_data = json_export_res.json()
        assert json_data["id"] == schedule_id
        assert "slot_assignments" in json_data

        # ---------------------------------------------------------------------
        # Step 14: Modify Source Data & Verify Stale-Schedule Invalidation
        # ---------------------------------------------------------------------
        # Prior to mutation, schedule is fresh
        assert client.get(f"/api/schedules/{schedule_id}").json()["is_stale"] is False

        # Add enrolment for S9999 in MATH101 (creates a new conflict DATA401 <-> MATH101)
        mutate_res = client.post("/api/enrolments", json={"student_id": "S9999", "exam_id": "MATH101"})
        assert mutate_res.status_code == 201

        # Now query the schedule again — staleness detection must flag is_stale=True
        stale_res = client.get(f"/api/schedules/{schedule_id}")
        assert stale_res.status_code == 200
        assert stale_res.json()["is_stale"] is True

        # ---------------------------------------------------------------------
        # Step 15: Session Reload and Database Persistence Across Sessions
        # ---------------------------------------------------------------------
        # Verify directly in database session that all records exist
        db_exams = test_db_session.query(ExamModel).all()
        db_students = test_db_session.query(StudentModel).all()
        db_enrolments = test_db_session.query(EnrolmentModel).all()
        db_schedules = test_db_session.query(SavedSchedule).all()

        assert len(db_exams) == 16
        assert len(db_students) == 37  # 36 benchmark + S9999
        assert len(db_enrolments) == 88  # 85 benchmark + DATA401 + CS101 + MATH101
        assert len(db_schedules) == 1
        assert db_schedules[0].id == schedule_id
