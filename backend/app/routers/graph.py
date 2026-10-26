"""API router for Conflict Graph generation."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.graph import ConflictGraphResponse
from backend.app.services.graph_service import GraphService

router = APIRouter(prefix="/graph", tags=["Conflict Graph"])


@router.get(
    "/conflicts",
    response_model=ConflictGraphResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute conflict graph",
    description="Builds the conflict graph from persistent student enrolments using the Phase 1 graph builder.",
)
def get_conflict_graph(db: Session = Depends(get_db)) -> ConflictGraphResponse:
    """Compute and serialize the examination conflict graph."""
    return GraphService.get_conflict_graph(db)
