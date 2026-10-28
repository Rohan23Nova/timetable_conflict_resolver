"""Pydantic schemas for authentication and user accounts."""

from datetime import datetime
from typing import Optional
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    """User account representation matching frontend contract."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    email: str
    fullName: str = Field(..., validation_alias=AliasChoices("fullName", "full_name"))
    role: str = "admin"
    institution: Optional[str] = "University Examination Registry"
    createdAt: Optional[str] = Field(
        default=None, validation_alias=AliasChoices("createdAt", "created_at")
    )


class LoginRequest(BaseModel):
    """Credentials payload for authenticating a user."""

    email: str
    password: str


class SignupRequest(BaseModel):
    """Registration payload for creating a new account."""

    model_config = ConfigDict(populate_by_name=True)

    email: str
    password: str
    fullName: str = Field(..., validation_alias=AliasChoices("fullName", "full_name"))
    institution: Optional[str] = "University Examination Registry"
    role: Optional[str] = "admin"


class AuthResponse(BaseModel):
    """Response returned upon successful authentication or registration."""

    user: UserResponse
    token: str = Field(..., description="Session authentication token")
    expiresIn: int = Field(default=86400, description="Token validity in seconds")


class AuthHealthResponse(BaseModel):
    """Response returned by the authentication service health check."""

    isAvailable: bool = True
    message: str = "Backend authentication service is operational."
