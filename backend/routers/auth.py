"""
CodeSense AI — authentication routes.
by Nitish Singh

    POST /api/auth/register  → create account, return access token + profile
    POST /api/auth/login     → verify credentials, return access token + profile
    POST /api/auth/demo      → one-click guest login (no body)
    GET  /api/auth/me        → current profile (validates an active session)

All token-issuing routes return the same :class:`AuthResponse` so the frontend
has one code path for "you are now signed in".
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from core.config import settings
from core.ratelimit import auth_rate_limit
from core.security import create_access_token
from deps import CurrentUser, DbSession
from schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserOut
from services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])

_ACCESS_TTL_SECONDS = settings.access_token_expire_minutes * 60


def _issue(user) -> AuthResponse:  # noqa: ANN001 - user is models.user.User
    token = create_access_token(user.id, extra_claims={"email": user.email})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        expires_in=_ACCESS_TTL_SECONDS,
        user=UserOut.model_validate(user),
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_rate_limit)],
    summary="Create a new account",
)
async def register(payload: RegisterRequest, db: DbSession) -> AuthResponse:
    """Validate the payload, hash the password, persist the user, return a token."""
    try:
        user = await user_service.create_user(
            db,
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
        )
    except user_service.EmailAlreadyRegistered:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )
    return _issue(user)


@router.post(
    "/login",
    response_model=AuthResponse,
    dependencies=[Depends(auth_rate_limit)],
    summary="Exchange credentials for an access token",
)
async def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    user = await user_service.authenticate(
        db, email=payload.email, password=payload.password
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _issue(user)


@router.post(
    "/demo",
    response_model=AuthResponse,
    dependencies=[Depends(auth_rate_limit)],
    summary="One-click guest login (provisions a shared demo account)",
)
async def demo_login(db: DbSession) -> AuthResponse:
    """
    Lets an interviewer explore the full authenticated experience — dashboard,
    audit history, analytics — without typing anything.
    """
    user = await user_service.ensure_demo_user(db)
    return _issue(user)


@router.get(
    "/me",
    response_model=UserOut,
    summary="Return the profile for the current access token",
)
async def me(current_user: CurrentUser) -> UserOut:
    return UserOut.model_validate(current_user)
