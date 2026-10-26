"""FastAPI router for timetable schedule persistence, retrieval, updating, deletion, and CSV export."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.schedule import (
    ScheduleCreateRequest,
    ScheduleDetailResponse,
    ScheduleSummaryResponse,
    ScheduleUpdateRequest,
)
from backend.app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/schedules", tags=["Schedules"])


@router.post(
    "",
    response_model=ScheduleDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a verified timetable schedule",
    description="Saves a conflict-free validated examination schedule with metadata and graph fingerprint snapshot.",
)
def create_schedule(
    request: ScheduleCreateRequest,
    db: Session = Depends(get_db),
) -> ScheduleDetailResponse:
    """Persist a verified schedule and return detailed metadata."""
    return ScheduleService.create_schedule(db, request)


@router.get(
    "",
    response_model=List[ScheduleSummaryResponse],
    summary="List saved timetable schedules",
    description="Returns all persisted timetable schedules with staleness indicators.",
)
def list_schedules(
    db: Session = Depends(get_db),
) -> List[ScheduleSummaryResponse]:
    """Retrieve all saved schedules ordered by creation date."""
    return ScheduleService.list_schedules(db)


@router.get(
    "/{schedule_id}",
    response_model=ScheduleDetailResponse,
    summary="Get saved timetable schedule details",
    description="Returns complete details, course slot assignments, and verification snapshot for a schedule.",
)
def get_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
) -> ScheduleDetailResponse:
    """Retrieve full schedule details with stale snapshot detection."""
    return ScheduleService.get_schedule(db, schedule_id)


@router.patch(
    "/{schedule_id}",
    response_model=ScheduleDetailResponse,
    summary="Update schedule metadata or date configuration",
    description="Update schedule name, description notes, or calendar date mapping.",
)
def update_schedule(
    schedule_id: str,
    request: ScheduleUpdateRequest,
    db: Session = Depends(get_db),
) -> ScheduleDetailResponse:
    """Update timetable schedule metadata."""
    return ScheduleService.update_schedule(db, schedule_id, request)


@router.delete(
    "/{schedule_id}",
    response_model=Dict[str, Any],
    summary="Delete a saved timetable schedule",
    description="Removes a saved schedule from database without altering examinations or student enrolments.",
)
def delete_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Delete a timetable schedule."""
    return ScheduleService.delete_schedule(db, schedule_id)


@router.get(
    "/{schedule_id}/export/csv",
    summary="Export schedule as CSV",
    description="Download a deterministically sorted RFC 4180 CSV export of the timetable schedule.",
)
def export_schedule_csv(
    schedule_id: str,
    db: Session = Depends(get_db),
) -> Response:
    """Generate and return CSV file response."""
    csv_content = ScheduleService.generate_csv(db, schedule_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="timetable_{schedule_id}.csv"',
            "Cache-Control": "no-cache",
        },
    )
