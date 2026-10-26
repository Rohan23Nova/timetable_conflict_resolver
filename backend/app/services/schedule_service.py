"""Service layer for timetable schedule persistence, validation enforcement, staleness checking, and CSV export."""

import csv
import io
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.schedule import SavedSchedule, utc_now
from backend.app.schemas.models import ValidationReport
from backend.app.schemas.schedule import (
    ScheduleCreateRequest,
    ScheduleDateConfig,
    ScheduleDetailResponse,
    ScheduleSummaryResponse,
    ScheduleUpdateRequest,
)
from backend.app.schemas.scheduling import SlotAssignmentDetail
from backend.app.services.graph_service import GraphService
from backend.app.validation.validator import validate_schedule



def compute_slot_calendar_info(slot: int, date_config: Optional[Dict[str, Any]]) -> tuple[str, str]:
    """Calculate date and session time for a 1-indexed slot based on calendar configuration."""
    if not date_config or not date_config.get("start_date"):
        return "Not Configured", f"Slot {slot}"

    try:
        start = date.fromisoformat(str(date_config["start_date"]))
    except (ValueError, TypeError):
        return "Invalid Date", f"Slot {slot}"

    slots_per_day = max(1, int(date_config.get("slots_per_day", 2)))
    session_times = date_config.get("session_times") or ["09:00 - 12:00", "14:00 - 17:00"]
    skip_weekends = bool(date_config.get("skip_weekends", True))

    day_offset = (slot - 1) // slots_per_day
    session_idx = (slot - 1) % slots_per_day

    current_date = start
    days_added = 0
    while days_added < day_offset:
        current_date += timedelta(days=1)
        if skip_weekends and current_date.weekday() >= 5:  # 5=Saturday, 6=Sunday
            continue
        days_added += 1

    session_str = (
        session_times[session_idx]
        if session_idx < len(session_times)
        else f"Session {session_idx + 1}"
    )
    return current_date.isoformat(), session_str


class ScheduleService:
    """Manages persistent timetable schedules and independent validation enforcement."""

    @classmethod
    def create_schedule(
        cls, db: Session, request: ScheduleCreateRequest
    ) -> ScheduleDetailResponse:
        """Persist a valid timetable schedule after strict server-side re-validation."""
        if not request.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot save an invalid or incomplete timetable schedule.",
            )

        # Independent server-side re-verification against ground-truth graph model
        graph, exam_by_code = GraphService.build_conflict_graph_model(db)
        if not graph.vertices:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot save a schedule when no examinations exist in the database.",
            )

        verification_result = validate_schedule(
            graph=graph,
            assignment=request.slot_assignments,
        )

        if not verification_result.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Server-side schedule validation failed: {verification_result.errors}. "
                    "Only verified conflict-free schedules may be saved."
                ),
            )

        # Compute SHA-256 graph fingerprint at time of schedule generation
        current_fingerprint = GraphService.compute_graph_fingerprint(db)

        # Convert slot_details to JSON-serializable structures
        slot_details_dicts = [d.model_dump() for d in request.slot_details]

        # Convert date_config if present
        date_config_dict = (
            request.date_config.model_dump() if request.date_config else None
        )

        saved = SavedSchedule(
            name=request.name.strip(),
            description=request.description.strip() if request.description else None,
            algorithm=request.algorithm,
            parameters=request.parameters,
            slot_assignments=request.slot_assignments,
            slot_details=slot_details_dicts,
            slots_used=request.slots_used,
            is_valid=True,
            validation_report=request.validation_report.model_dump(),
            graph_fingerprint=current_fingerprint,
            date_config=date_config_dict,
        )

        db.add(saved)
        db.commit()
        db.refresh(saved)

        return cls._to_detail(
            saved,
            is_stale=False,
            current_vertices=graph.vertex_count,
            current_edges=graph.edge_count,
        )

    @classmethod
    def list_schedules(cls, db: Session) -> List[ScheduleSummaryResponse]:
        """List all saved schedules with staleness detection comparing stored fingerprint against current graph."""
        schedules = (
            db.query(SavedSchedule)
            .order_by(SavedSchedule.created_at.desc())
            .all()
        )

        current_fingerprint = GraphService.compute_graph_fingerprint(db)

        results: List[ScheduleSummaryResponse] = []
        for s in schedules:
            is_stale = s.graph_fingerprint != current_fingerprint
            results.append(
                ScheduleSummaryResponse(
                    id=s.id,
                    name=s.name,
                    description=s.description,
                    algorithm=s.algorithm,
                    slots_used=s.slots_used,
                    exam_count=len(s.slot_assignments or {}),
                    is_valid=s.is_valid,
                    is_stale=is_stale,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
            )
        return results

    @classmethod
    def get_schedule(cls, db: Session, schedule_id: str) -> ScheduleDetailResponse:
        """Retrieve a specific saved schedule with staleness status and graph snapshot metrics."""
        schedule = (
            db.query(SavedSchedule)
            .filter(SavedSchedule.id == schedule_id)
            .first()
        )
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Timetable schedule '{schedule_id}' was not found.",
            )

        current_fingerprint = GraphService.compute_graph_fingerprint(db)
        graph, _ = GraphService.build_conflict_graph_model(db)
        is_stale = schedule.graph_fingerprint != current_fingerprint

        return cls._to_detail(
            schedule,
            is_stale=is_stale,
            current_vertices=graph.vertex_count,
            current_edges=graph.edge_count,
        )

    @classmethod
    def update_schedule(
        cls, db: Session, schedule_id: str, request: ScheduleUpdateRequest
    ) -> ScheduleDetailResponse:
        """Update timetable name, description notes, or calendar date mapping."""
        schedule = (
            db.query(SavedSchedule)
            .filter(SavedSchedule.id == schedule_id)
            .first()
        )
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Timetable schedule '{schedule_id}' was not found.",
            )

        if request.name is not None:
            schedule.name = request.name.strip()
        if request.description is not None:
            schedule.description = request.description.strip() if request.description else None
        if request.date_config is not None:
            schedule.date_config = request.date_config.model_dump()

        schedule.updated_at = utc_now()
        db.commit()
        db.refresh(schedule)

        current_fingerprint = GraphService.compute_graph_fingerprint(db)
        graph, _ = GraphService.build_conflict_graph_model(db)
        is_stale = schedule.graph_fingerprint != current_fingerprint

        return cls._to_detail(
            schedule,
            is_stale=is_stale,
            current_vertices=graph.vertex_count,
            current_edges=graph.edge_count,
        )

    @classmethod
    def delete_schedule(cls, db: Session, schedule_id: str) -> Dict[str, Any]:
        """Delete a saved timetable schedule without modifying underlying examinations or enrolments."""
        schedule = (
            db.query(SavedSchedule)
            .filter(SavedSchedule.id == schedule_id)
            .first()
        )
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Timetable schedule '{schedule_id}' was not found.",
            )

        db.delete(schedule)
        db.commit()
        return {"message": "Timetable schedule deleted successfully", "id": schedule_id}

    @classmethod
    def generate_csv(cls, db: Session, schedule_id: str) -> str:
        """Generate deterministic RFC 4180 CSV export of scheduled courses with slot assignments and dates."""
        schedule = (
            db.query(SavedSchedule)
            .filter(SavedSchedule.id == schedule_id)
            .first()
        )
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Timetable schedule '{schedule_id}' was not found.",
            )

        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # Write standard header row
        writer.writerow([
            "Slot",
            "Date",
            "Session Time",
            "Exam Code",
            "Course Name",
            "Department",
            "Semester",
            "Conflict Degree",
            "Duration (Min)",
        ])

        # Prepare slot details map
        slot_details = schedule.slot_details or []
        details_by_code: Dict[str, Dict[str, Any]] = {
            item.get("exam_code"): item for item in slot_details if isinstance(item, dict)
        }

        # Build rows sorted by slot ascending, then exam code ascending
        rows = []
        for code, slot in (schedule.slot_assignments or {}).items():
            detail = details_by_code.get(code, {})
            cal_date, cal_session = compute_slot_calendar_info(slot, schedule.date_config)
            duration = (
                schedule.date_config.get("slot_duration_minutes", 180)
                if schedule.date_config
                else 180
            )

            rows.append({
                "slot": slot,
                "date": cal_date,
                "session": cal_session,
                "code": code,
                "name": detail.get("exam_name", ""),
                "department": detail.get("department") or "",
                "semester": detail.get("semester") or "",
                "degree": detail.get("degree", 0),
                "duration": duration,
            })

        # Deterministic sort
        rows.sort(key=lambda r: (r["slot"], r["code"]))

        for r in rows:
            writer.writerow([
                f"Slot {r['slot']}",
                r["date"],
                r["session"],
                r["code"],
                r["name"],
                r["department"],
                r["semester"],
                r["degree"],
                r["duration"],
            ])

        return output.getvalue()

    @classmethod
    def _to_detail(
        cls,
        schedule: SavedSchedule,
        is_stale: bool,
        current_vertices: Optional[int] = None,
        current_edges: Optional[int] = None,
    ) -> ScheduleDetailResponse:
        """Helper to construct full ScheduleDetailResponse from database record."""
        # Convert slot_details list to Pydantic objects
        slot_details_pydantic: List[SlotAssignmentDetail] = []
        for d in (schedule.slot_details or []):
            if isinstance(d, dict):
                slot_details_pydantic.append(SlotAssignmentDetail(**d))

        # Build slots_summary mapping: slot -> list of exam codes
        summary: Dict[int, List[str]] = defaultdict(list)
        for code, slot in (schedule.slot_assignments or {}).items():
            summary[slot].append(code)
        for s in summary:
            summary[s].sort()

        date_cfg = (
            ScheduleDateConfig(**schedule.date_config)
            if schedule.date_config
            else None
        )

        val_report = (
            ValidationReport(**schedule.validation_report)
            if schedule.validation_report
            else ValidationReport(
                is_valid=schedule.is_valid,
                total_examinations=len(schedule.slot_assignments or {}),
                assigned_examinations=len(schedule.slot_assignments or {}),
                slots_used=schedule.slots_used,
                conflicts_count=0,
                unassigned_count=0,
                conflicts=[],
                unassigned=[],
                isolated_examinations=[],
            )
        )

        return ScheduleDetailResponse(
            id=schedule.id,
            name=schedule.name,
            description=schedule.description,
            algorithm=schedule.algorithm,
            parameters=schedule.parameters or {},
            slot_assignments=schedule.slot_assignments or {},
            slot_details=slot_details_pydantic,
            slots_summary=dict(sorted(summary.items())),
            slots_used=schedule.slots_used,
            is_valid=schedule.is_valid,
            validation_report=val_report,
            graph_fingerprint=schedule.graph_fingerprint,
            is_stale=is_stale,
            current_graph_vertex_count=current_vertices,
            current_graph_edge_count=current_edges,
            date_config=date_cfg,
            created_at=schedule.created_at,
            updated_at=schedule.updated_at,
        )
