"""
CodeSense AI — authentication schemas.
by Nitish Singh

Password policy lives here (one regex, one place) so both ``/register`` and any
future "change password" flow share it.
"""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# ≥ 8 chars, at least one letter and one digit. Deliberately not draconian —
# usability matters for a demo — but enough to reject "password" and "12345678".
_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,128}$")
_PASSWORD_HELP = (
    "Password must be 8–128 characters and include at least one letter and one digit."
)


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def _trim_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name must not be blank.")
        return v

    @field_validator("password")
    @classmethod
    def _strong_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError(_PASSWORD_HELP)
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserOut(BaseModel):
    """Public user projection — never includes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    plan: str
    is_demo: bool
    created_at: datetime


class AuthResponse(BaseModel):
    """Returned by ``/register``, ``/login`` and ``/demo``."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Access-token lifetime in seconds.")
    user: UserOut
