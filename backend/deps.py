"""
CodeSense AI — shared FastAPI dependencies (authentication).
by Nitish Singh

``get_current_user``         — hard requirement; 401 if the bearer token is
                               missing, malformed, expired, or points at a user
                               that no longer exists.
``get_current_user_optional`` — same resolution, but returns ``None`` instead of
                               raising. Used by ``/api/analyze`` so the tool
                               works anonymously and simply skips history.
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import decode_access_token
from db import get_db
from models.user import User

# ``auto_error=False`` lets the same scheme back both the required and optional
# dependencies. The ``tokenUrl`` powers the Swagger "Authorize" dialog.
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]
_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated.",
    headers={"WWW-Authenticate": "Bearer"},
)


async def _resolve_user(token: Optional[str], db: AsyncSession) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        return None
    return await db.get(User, user_id)


async def get_current_user(
    db: DbSession,
    token: Annotated[Optional[str], Depends(_oauth2_scheme)] = None,
) -> User:
    """Return the authenticated user or raise 401."""
    user = await _resolve_user(token, db)
    if user is None:
        raise _CREDENTIALS_EXC
    return user


async def get_current_user_optional(
    db: DbSession,
    token: Annotated[Optional[str], Depends(_oauth2_scheme)] = None,
) -> Optional[User]:
    """Return the authenticated user, or ``None`` if the request is anonymous."""
    return await _resolve_user(token, db)


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[Optional[User], Depends(get_current_user_optional)]
