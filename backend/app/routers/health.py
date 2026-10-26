"""Health check and connection verification router."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.schemas.health import HealthResponse

router = APIRouter(prefix="", tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check and database verification",
    description="Returns service status and validates active SQLite connection.",
)
def check_health(db: Session = Depends(get_db)) -> HealthResponse:
    """Verify backend responsiveness and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unreachable"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        app_name=settings.app_name,
        version=settings.version,
        environment=settings.environment,
        timestamp=datetime.now(timezone.utc),
    )
