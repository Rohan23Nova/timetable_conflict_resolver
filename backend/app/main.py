import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.config import settings
from backend.app.database import SessionLocal, init_db
from backend.app.routers import api_router
from backend.app.routers.auth import router as auth_router
from backend.app.routers.health import router as health_router
from backend.app.services.auth_service import AuthService


logger = logging.getLogger("slotwise")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager to initialize database tables on startup."""
    init_db()
    db = SessionLocal()
    try:
        AuthService.ensure_default_users(db)
    finally:
        db.close()
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

# Root health probes for container orchestrators and ingress controllers
app.include_router(health_router)

# Register API routers under /api and compatibility prefix /api/v1/auth
app.include_router(api_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix="/api/v1/auth")


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Pass through standard HTTP exceptions with structured response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unhandled server exceptions to prevent stack trace leaks."""
    logger.exception("Unhandled server exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact the administrator."},
    )



dist_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "frontend",
    "dist",
)

serve_spa_env = os.getenv("SERVE_STATIC_SPA", "false").lower() in ("true", "1")

if serve_spa_env and os.path.isdir(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve built frontend Single-Page Application with client-side fallback."""
        for prefix in ["api", "docs", "redoc", "openapi.json", "health", "ready"]:
            if full_path == prefix or full_path.startswith(f"{prefix}/"):
                raise StarletteHTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join(dist_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_file = os.path.join(dist_dir, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise StarletteHTTPException(status_code=404, detail="Not Found")
else:
    @app.get("/", include_in_schema=False)
    def root_redirect() -> RedirectResponse:
        """Redirect root browser requests to interactive Swagger documentation."""
        return RedirectResponse(url="/docs")





if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
