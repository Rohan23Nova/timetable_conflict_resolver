"""Authentication and user session management router."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.auth import (
    AuthHealthResponse,
    AuthResponse,
    LoginRequest,
    SignupRequest,
    UserResponse,
)
from backend.app.services.auth_service import AuthService

router = APIRouter(tags=["Authentication"])


@router.get(
    "/health",
    response_model=AuthHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Authentication service health check",
    description="Returns whether the user authentication and session service is online.",
)
def check_auth_health() -> AuthHealthResponse:
    """Verify authentication subsystem availability."""
    return AuthHealthResponse(
        isAvailable=True,
        message="Backend authentication service is operational.",
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user",
    description="Validates academic administrator credentials and returns an active session token.",
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Authenticate with email and password."""
    return AuthService.authenticate(db, credentials)


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new administrator account",
    description="Creates a new university scheduler account and returns an active session token.",
)
def signup(
    data: SignupRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Register a new user account."""
    return AuthService.register(db, data)


@router.get(
    "/me",
    response_model=Optional[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Resolves active session token to the authenticated administrator profile.",
)
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[UserResponse]:
    """Retrieve currently authenticated user profile."""
    return AuthService.get_current_user(db, authorization)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Terminate active session",
    description="Invalidates current session token.",
)
def logout(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Log out active user session."""
    AuthService.logout(authorization)
    return {"success": True, "message": "Successfully logged out."}
