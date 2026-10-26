"""FastAPI router for timetable generation and algorithm laboratory."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.scheduling import (
    ScheduleCompareRequest,
    ScheduleCompareResponse,
    ScheduleRunRequest,
    ScheduleRunResponse,
)
from backend.app.services.scheduling_service import SchedulingService

router = APIRouter(prefix="/scheduling", tags=["Timetable Scheduling & Algorithm Lab"])


@router.post(
    "/run",
    response_model=ScheduleRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute a timetable scheduling algorithm",
    description=(
        "Executes either Greedy Coloring (heuristic) or Exact Backtracking (exhaustive DFS) "
        "against the real institutional examination conflict graph, independently validates the "
        "output, and returns certified slot assignments and diagnostics."
    ),
)
def run_scheduling_algorithm(
    request: ScheduleRunRequest,
    db: Session = Depends(get_db),
) -> ScheduleRunResponse:
    """Run timetable generation algorithm against the current conflict graph."""
    try:
        return SchedulingService.run_algorithm(request, db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/compare",
    response_model=ScheduleCompareResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute and compare Greedy vs. Backtracking side-by-side",
    description=(
        "Executes both Welsh-Powell Greedy and Exact Backtracking on the exact same snapshot "
        "of the conflict graph, comparing slot efficiency, computation time, and search complexity."
    ),
)
def compare_scheduling_algorithms(
    request: ScheduleCompareRequest,
    db: Session = Depends(get_db),
) -> ScheduleCompareResponse:
    """Benchmark both algorithms side-by-side on the exact same conflict graph."""
    try:
        return SchedulingService.compare_algorithms(request, db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/runs",
    response_model=List[ScheduleRunResponse],
    status_code=status.HTTP_200_OK,
    summary="List recent scheduling runs",
    description="Returns a list of recent timetable scheduling runs performed during the current session.",
)
def list_scheduling_runs() -> List[ScheduleRunResponse]:
    """List recent scheduling execution runs."""
    return SchedulingService.list_runs()


@router.get(
    "/runs/{run_id}",
    response_model=ScheduleRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve a specific scheduling run",
    description="Retrieves a previously executed scheduling run by its unique identifier.",
)
def get_scheduling_run(run_id: str) -> ScheduleRunResponse:
    """Get previous scheduling run by ID."""
    run = SchedulingService.get_run(run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduling run '{run_id}' not found.",
        )
    return run
