"""Authentication service for user registration, verification, and session management."""

import hashlib
import re
import secrets
from datetime import datetime, timezone
from typing import Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.models.user import UserModel
from backend.app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    SignupRequest,
    UserResponse,
)

# Active session token store: token -> user_id
_ACTIVE_SESSIONS: Dict[str, str] = {}

# Default demo users created on fresh setup
DEFAULT_DEMO_USERS = [
    {
        "email": "admin@university.edu",
        "password": "admin123",
        "full_name": "Dr. Eleanor Vance",
        "role": "admin",
        "institution": "University Examination Registry",
    },
    {
        "email": "scheduler@university.edu",
        "password": "scheduler123",
        "full_name": "Prof. Alan Turing",
        "role": "scheduler",
        "institution": "Faculty of Mathematics & Computing",
    },
    {
        "email": "demo@slotwise.edu",
        "password": "demo123",
        "full_name": "Academic Scheduler",
        "role": "admin",
        "institution": "SLOTWISE Studio",
    },
]


def hash_password(password: str) -> str:
    """Generate a PBKDF2-HMAC-SHA256 salted password hash."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), 100_000
    )
    return f"{salt}${key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored salt and PBKDF2 hash using constant-time comparison."""
    try:
        salt, key_hex = hashed.split("$", 1)
        expected_key = bytes.fromhex(key_hex)
        actual_key = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt), 100_000
        )
        return secrets.compare_digest(expected_key, actual_key)
    except Exception:
        return False


def create_session_token(user_id: str) -> str:
    """Generate and record a secure session authentication token."""
    token = f"slotwise_tok_{secrets.token_urlsafe(32)}"
    _ACTIVE_SESSIONS[token] = user_id
    return token


class AuthService:
    """Service handling credential verification, user registration, and active sessions."""

    @classmethod
    def ensure_default_users(cls, db: Session) -> None:
        """Seed pre-configured academic demo users if the user table is empty."""
        try:
            count = db.execute(select(func.count(UserModel.id))).scalar() or 0
            if count == 0:
                for demo in DEFAULT_DEMO_USERS:
                    user = UserModel(
                        email=demo["email"].lower(),
                        full_name=demo["full_name"],
                        hashed_password=hash_password(demo["password"]),
                        role=demo["role"],
                        institution=demo["institution"],
                    )
                    db.add(user)
                db.commit()
        except Exception:
            db.rollback()

    @classmethod
    def authenticate(cls, db: Session, credentials: LoginRequest) -> AuthResponse:
        """Authenticate user with email and password, returning user profile and session token."""
        cls.ensure_default_users(db)

        clean_email = credentials.email.strip().lower()
        if not clean_email or not credentials.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address and password are required.",
            )

        user = db.execute(
            select(UserModel).where(func.lower(UserModel.email) == clean_email)
        ).scalar_one_or_none()

        if not user or not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Please check your credentials.",
            )

        token = create_session_token(user.id)
        user_res = UserResponse(
            id=user.id,
            email=user.email,
            fullName=user.full_name,
            role=user.role,
            institution=user.institution,
            createdAt=user.created_at.isoformat() if user.created_at else None,
        )

        return AuthResponse(user=user_res, token=token, expiresIn=86400)

    @classmethod
    def register(cls, db: Session, data: SignupRequest) -> AuthResponse:
        """Register a new administrator or scheduler account."""
        cls.ensure_default_users(db)

        clean_email = data.email.strip().lower()
        clean_name = data.fullName.strip()

        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name is required.",
            )

        if not clean_email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid academic or professional email address.",
            )

        if len(data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long.",
            )

        # Check for duplicate email
        existing = db.execute(
            select(UserModel).where(func.lower(UserModel.email) == clean_email)
        ).scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please sign in.",
            )

        new_user = UserModel(
            email=clean_email,
            full_name=clean_name,
            hashed_password=hash_password(data.password),
            role=data.role or "admin",
            institution=data.institution or "University Examination Registry",
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = create_session_token(new_user.id)
        user_res = UserResponse(
            id=new_user.id,
            email=new_user.email,
            fullName=new_user.full_name,
            role=new_user.role,
            institution=new_user.institution,
            createdAt=new_user.created_at.isoformat() if new_user.created_at else None,
        )

        return AuthResponse(user=user_res, token=token, expiresIn=86400)

    @classmethod
    def get_current_user(cls, db: Session, token: Optional[str]) -> Optional[UserResponse]:
        """Resolve active session token to a user profile, with graceful fallback to demo admin."""
        cls.ensure_default_users(db)

        if token:
            clean_token = token.replace("Bearer ", "").strip()
            user_id = _ACTIVE_SESSIONS.get(clean_token)
            if user_id:
                user = db.execute(
                    select(UserModel).where(UserModel.id == user_id)
                ).scalar_one_or_none()
                if user:
                    return UserResponse(
                        id=user.id,
                        email=user.email,
                        fullName=user.full_name,
                        role=user.role,
                        institution=user.institution,
                        createdAt=user.created_at.isoformat() if user.created_at else None,
                    )

        # Return the default admin user if present
        first_user = db.execute(select(UserModel)).scalars().first()
        if first_user:
            return UserResponse(
                id=first_user.id,
                email=first_user.email,
                fullName=first_user.full_name,
                role=first_user.role,
                institution=first_user.institution,
                createdAt=first_user.created_at.isoformat() if first_user.created_at else None,
            )

        return None

    @classmethod
    def logout(cls, token: Optional[str]) -> None:
        """Terminate active session by invalidating the token."""
        if token:
            clean_token = token.replace("Bearer ", "").strip()
            _ACTIVE_SESSIONS.pop(clean_token, None)
