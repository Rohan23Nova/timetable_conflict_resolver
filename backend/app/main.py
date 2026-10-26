"""FastAPI entry point and application factory for SLOTWISE."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routers import api_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager to initialize database tables on startup."""
    init_db()
    yield


app = FastAPI(
    title=f"{settings.app_name} — {settings.descriptor}",
    description=(
        "Persistent REST API for university examination timetable conflict resolution. "
        "Provides relational data persistence, referential validation, dynamic conflict graph "
        "construction, and algorithm benchmarking."
    ),
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Restrict CORS to configured frontend development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

# Register API routers under /api
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
def root_redirect() -> RedirectResponse:
    """Redirect root browser requests to interactive Swagger documentation."""
    return RedirectResponse(url="/docs")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
