"""Integration tests for persistent schedule endpoints, staleness detection, and CSV export (Phase 8)."""

import csv
import io
import pytest
from fastapi.testclient import TestClient


class TestScheduleEndpoints:
    """Test suite covering saving, listing, detail view, updating, deleting, staleness, and CSV export."""

    def _setup_triangle_courses(self, client: TestClient):
        """Helper to create a 3-course conflict graph (triangle) CS101, MATH101, PHYS101."""
        client.post("/api/exams", json={"code": "CS101", "name": "Intro to CS", "department": "Computer Science"})
        client.post("/api/exams", json={"code": "MATH101", "name": "Calculus I", "department": "Mathematics"})
        client.post("/api/exams", json={"code": "PHYS101", "name": "Physics I, Mechanics", "department": "Physics"})

        client.post("/api/students", json={"student_id": "S1", "name": "Alice"})
        client.post("/api/students", json={"student_id": "S2", "name": "Bob"})
        client.post("/api/students", json={"student_id": "S3", "name": "Charlie"})

        # CS101 <-> MATH101
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "CS101"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "MATH101"})

        # MATH101 <-> PHYS101
        client.post("/api/enrolments", json={"student_id": "S2", "exam_id": "MATH101"})
        client.post("/api/enrolments", json={"student_id": "S2", "exam_id": "PHYS101"})

        # PHYS101 <-> CS101
        client.post("/api/enrolments", json={"student_id": "S3", "exam_id": "PHYS101"})
        client.post("/api/enrolments", json={"student_id": "S3", "exam_id": "CS101"})

    def test_save_valid_schedule_success(self, client: TestClient):
        """Saving a verified valid schedule persists all metadata and assigns unique ID."""
        self._setup_triangle_courses(client)

        # Run greedy first to get a valid schedule
        run_res = client.post("/api/scheduling/run", json={"algorithm": "greedy"})
        assert run_res.status_code == 200
        run_data = run_res.json()
        assert run_data["is_valid"] is True

        # Save schedule
        payload = {
            "name": "Fall 2026 Finals - Official",
            "description": "Final timetable for undergraduate engineering",
            "algorithm": run_data["algorithm"],
            "parameters": {"ordering_strategy": run_data["ordering_strategy"]},
            "slot_assignments": run_data["slot_assignments"],
            "slot_details": run_data["slot_details"],
            "slots_used": run_data["slots_used"],
            "is_valid": True,
            "validation_report": run_data["validation_report"],
            "date_config": {
                "start_date": "2026-12-01",
                "slots_per_day": 2,
                "session_times": ["09:00 - 12:00", "14:00 - 17:00"],
                "slot_duration_minutes": 180,
                "slot_break_minutes": 120,
                "skip_weekends": True,
            },
        }

        save_res = client.post("/api/schedules", json=payload)
        assert save_res.status_code == 201
        saved = save_res.json()

        assert saved["id"] is not None
        assert saved["name"] == "Fall 2026 Finals - Official"
        assert saved["description"] == "Final timetable for undergraduate engineering"
        assert saved["slots_used"] == 3
        assert saved["is_valid"] is True
        assert saved["is_stale"] is False
        assert len(saved["slot_assignments"]) == 3
        assert saved["date_config"]["start_date"] == "2026-12-01"

    def test_save_schedule_rejects_invalid_flag(self, client: TestClient):
        """Saving fails with 400 when is_valid is False."""
        payload = {
            "name": "Bad Schedule",
            "algorithm": "greedy",
            "parameters": {},
            "slot_assignments": {"CS101": 1},
            "slots_used": 1,
            "is_valid": False,
            "validation_report": {
                "is_valid": False,
                "errors": ["Detected adjacent conflict"],
                "checks_performed": ["check_conflicts"],
                "conflicts": [["CS101", "MATH101", 1]],
                "missing_examinations": [],
                "unknown_examinations": [],
                "invalid_color_values": [],
                "out_of_range_colors": [],
            },
        }
        res = client.post("/api/schedules", json=payload)
        assert res.status_code == 400
        assert "Cannot save an invalid" in res.json()["detail"]

    def test_save_schedule_rejects_conflicting_assignment(self, client: TestClient):
        """Server-side verification catches conflicting assignments even if request claims is_valid=True."""
        self._setup_triangle_courses(client)

        # Illegally assign same slot to adjacent courses CS101 and MATH101
        payload = {
            "name": "Fraudulent Schedule",
            "algorithm": "greedy",
            "parameters": {},
            "slot_assignments": {
                "CS101": 1,
                "MATH101": 1,  # Conflict! Both share student S1
                "PHYS101": 2,
            },
            "slots_used": 2,
            "is_valid": True,  # Falsely claims to be valid
            "validation_report": {
                "is_valid": True,
                "total_examinations": 3,
                "assigned_examinations": 3,
                "slots_used": 2,
                "conflicts_count": 0,
                "unassigned_count": 0,
                "conflicts": [],
                "unassigned": [],
                "isolated_examinations": [],
                "errors": [],
                "checks_performed": [],
            },
        }

        res = client.post("/api/schedules", json=payload)
        assert res.status_code == 400
        assert "Server-side schedule validation failed" in res.json()["detail"]

    def test_list_and_get_schedules(self, client: TestClient):
        """Listing returns all saved schedules and individual retrieval includes full details."""
        self._setup_triangle_courses(client)
        run_res = client.post("/api/scheduling/run", json={"algorithm": "greedy"})
        run_data = run_res.json()

        payload = {
            "name": "Schedule A",
            "description": "Test Schedule A",
            "algorithm": "greedy",
            "slot_assignments": run_data["slot_assignments"],
            "slot_details": run_data["slot_details"],
            "slots_used": run_data["slots_used"],
            "is_valid": True,
            "validation_report": run_data["validation_report"],
        }
        create_res = client.post("/api/schedules", json=payload)
        sched_id = create_res.json()["id"]

        # List
        list_res = client.get("/api/schedules")
        assert list_res.status_code == 200
        summaries = list_res.json()
        assert len(summaries) >= 1
        assert any(s["id"] == sched_id for s in summaries)

        # Get by ID
        get_res = client.get(f"/api/schedules/{sched_id}")
        assert get_res.status_code == 200
        detail = get_res.json()
        assert detail["id"] == sched_id
        assert detail["name"] == "Schedule A"
        assert detail["slots_used"] == 3
        assert "1" in detail["slots_summary"] or 1 in detail["slots_summary"]

    def test_get_schedule_not_found(self, client: TestClient):
        """Retrieving a non-existent schedule returns 404."""
        res = client.get("/api/schedules/non-existent-uuid")
        assert res.status_code == 404

    def test_patch_schedule(self, client: TestClient):
        """Updating schedule name and date configuration works via PATCH."""
        self._setup_triangle_courses(client)
        run_res = client.post("/api/scheduling/run", json={"algorithm": "greedy"})
        run_data = run_res.json()

        create_res = client.post(
            "/api/schedules",
            json={
                "name": "Draft Schedule",
                "algorithm": "greedy",
                "slot_assignments": run_data["slot_assignments"],
                "slot_details": run_data["slot_details"],
                "slots_used": run_data["slots_used"],
                "is_valid": True,
                "validation_report": run_data["validation_report"],
            },
        )
        sched_id = create_res.json()["id"]

        patch_res = client.patch(
            f"/api/schedules/{sched_id}",
            json={
                "name": "Published Schedule v2",
                "date_config": {
                    "start_date": "2027-01-15",
                    "slots_per_day": 3,
                    "session_times": ["08:30 - 11:30", "12:30 - 15:30", "16:30 - 19:30"],
                    "slot_duration_minutes": 180,
                    "slot_break_minutes": 60,
                    "skip_weekends": True,
                },
            },
        )
        assert patch_res.status_code == 200
        updated = patch_res.json()
        assert updated["name"] == "Published Schedule v2"
        assert updated["date_config"]["start_date"] == "2027-01-15"
        assert updated["date_config"]["slots_per_day"] == 3

    def test_delete_schedule_preserves_courses_and_students(self, client: TestClient):
        """Deleting a schedule removes the timetable without altering courses or enrolments."""
        self._setup_triangle_courses(client)
        run_res = client.post("/api/scheduling/run", json={"algorithm": "greedy"})
        run_data = run_res.json()

        create_res = client.post(
            "/api/schedules",
            json={
                "name": "Disposable Schedule",
                "algorithm": "greedy",
                "slot_assignments": run_data["slot_assignments"],
                "slot_details": run_data["slot_details"],
                "slots_used": run_data["slots_used"],
                "is_valid": True,
                "validation_report": run_data["validation_report"],
            },
        )
        sched_id = create_res.json()["id"]

        del_res = client.delete(f"/api/schedules/{sched_id}")
        assert del_res.status_code == 200

        # Schedule is gone
        get_res = client.get(f"/api/schedules/{sched_id}")
        assert get_res.status_code == 404

        # Underlying examinations are still intact
        exams_res = client.get("/api/exams")
        assert exams_res.status_code == 200
        assert len(exams_res.json()) >= 3

    def test_stale_schedule_detection(self, client: TestClient):
        """Modifying underlying student enrolments changes graph fingerprint and triggers is_stale."""
        self._setup_triangle_courses(client)
        run_res = client.post("/api/scheduling/run", json={"algorithm": "greedy"})
        run_data = run_res.json()

        create_res = client.post(
            "/api/schedules",
            json={
                "name": "Staleness Test Schedule",
                "algorithm": "greedy",
                "slot_assignments": run_data["slot_assignments"],
                "slot_details": run_data["slot_details"],
                "slots_used": run_data["slots_used"],
                "is_valid": True,
                "validation_report": run_data["validation_report"],
            },
        )
        sched_id = create_res.json()["id"]

        # Before modifying DB: is_stale is False
        check_before = client.get(f"/api/schedules/{sched_id}")
        assert check_before.json()["is_stale"] is False

        # Add a new course or student enrolment to alter the conflict graph
        client.post("/api/exams", json={"code": "BIO101", "name": "General Biology"})
        client.post("/api/enrolments", json={"student_id": "S1", "exam_id": "BIO101"})

        # After modifying DB: is_stale is True
        check_after = client.get(f"/api/schedules/{sched_id}")
        assert check_after.json()["is_stale"] is True

        # Listing endpoint also flags it as stale
        list_after = client.get("/api/schedules")
        matching = [s for s in list_after.json() if s["id"] == sched_id]
        assert len(matching) == 1
        assert matching[0]["is_stale"] is True

    def test_csv_export_headers_and_escaping(self, client: TestClient):
        """CSV export returns proper Content-Type, Content-Disposition, RFC 4180 escaping, and sorted rows."""
        self._setup_triangle_courses(client)
        run_res = client.post("/api/scheduling/run", json={"algorithm": "greedy"})
        run_data = run_res.json()

        create_res = client.post(
            "/api/schedules",
            json={
                "name": "Export Test",
                "algorithm": "greedy",
                "slot_assignments": run_data["slot_assignments"],
                "slot_details": run_data["slot_details"],
                "slots_used": run_data["slots_used"],
                "is_valid": True,
                "validation_report": run_data["validation_report"],
                "date_config": {
                    "start_date": "2026-12-07",  # A Monday
                    "slots_per_day": 2,
                    "session_times": ["09:00 - 12:00", "14:00 - 17:00"],
                    "slot_duration_minutes": 180,
                    "slot_break_minutes": 120,
                    "skip_weekends": True,
                },
            },
        )
        sched_id = create_res.json()["id"]

        csv_res = client.get(f"/api/schedules/{sched_id}/export/csv")
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers.get("content-type", "")
        assert f'attachment; filename="timetable_{sched_id}.csv"' in csv_res.headers.get("content-disposition", "")

        # Parse CSV content
        csv_reader = csv.reader(io.StringIO(csv_res.text))
        rows = list(csv_reader)

        # Header check
        assert rows[0] == [
            "Slot",
            "Date",
            "Session Time",
            "Exam Code",
            "Course Name",
            "Department",
            "Semester",
            "Conflict Degree",
            "Duration (Min)",
        ]

        # Data rows check (3 courses)
        assert len(rows) == 4
        # Check course with comma in name: "Physics I, Mechanics"
        physics_row = next(r for r in rows[1:] if r[3] == "PHYS101")
        assert physics_row[4] == "Physics I, Mechanics"
        assert physics_row[8] == "180"

        # Check ordering: slot indices non-decreasing
        slot_nums = [int(r[0].replace("Slot ", "")) for r in rows[1:]]
        assert slot_nums == sorted(slot_nums)
