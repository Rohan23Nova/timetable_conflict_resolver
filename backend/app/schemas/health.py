"""Pydantic schema for API health status."""

from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """System and database connectivity status."""

    status: str = Field(..., description="Overall service status (e.g. 'healthy')")
    database: str = Field(..., description="Database connectivity status ('connected' or 'unreachable')")
    app_name: str
    version: str
    environment: str
    timestamp: datetime
