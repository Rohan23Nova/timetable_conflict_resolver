"""Routers package aggregating all API endpoints."""

from fastapi import APIRouter

from backend.app.routers.enrolments import router as enrolments_router
from backend.app.routers.examinations import router as exams_router
from backend.app.routers.graph import router as graph_router
from backend.app.routers.health import router as health_router
from backend.app.routers.imports import router as imports_router
from backend.app.routers.sample_data import router as sample_data_router
from backend.app.routers.schedules import router as schedules_router
from backend.app.routers.scheduling import router as scheduling_router
from backend.app.routers.students import router as students_router

api_router = APIRouter()

# Include feature routers under standard paths
api_router.include_router(health_router)
api_router.include_router(exams_router)
api_router.include_router(students_router)
api_router.include_router(enrolments_router)
api_router.include_router(graph_router)
api_router.include_router(scheduling_router)
api_router.include_router(schedules_router)
api_router.include_router(sample_data_router)
api_router.include_router(imports_router)

__all__ = ["api_router"]

