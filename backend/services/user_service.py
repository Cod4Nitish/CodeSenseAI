"""
CodeSense AI — user persistence + authentication service.
by Nitish Singh

Thin, testable functions over an ``AsyncSession``. Routers stay declarative;
all "how do we actually talk to the DB" logic lives here.
"""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import hash_password, verify_password
from models.user import User

logger = logging.getLogger("codesense.users")


class EmailAlreadyRegistered(Exception):
    """Raised by :func:`create_user` when the email is taken."""


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    full_name: str,
    password: str,
    is_demo: bool = False,
    plan: str = "Developer Pro",
) -> User:
    """Insert a new user. Raises :class:`EmailAlreadyRegistered` on a dup email."""
    user = User(
        email=email.lower().strip(),
        full_name=full_name.strip(),
        hashed_password=hash_password(password),
        is_demo=is_demo,
        plan=plan,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:  # unique constraint on email
        await db.rollback()
        raise EmailAlreadyRegistered(email) from exc
    await db.refresh(user)
    logger.info("Registered user id=%s email=%s demo=%s", user.id, user.email, is_demo)
    return user


async def authenticate(db: AsyncSession, *, email: str, password: str) -> User | None:
    """Return the user iff the email exists and the password verifies."""
    user = await get_by_email(db, email)
    if user is None:
        # Still run a hash to keep the timing profile flat (user-enumeration guard).
        verify_password(password, "$2b$12$" + "." * 53)
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def ensure_demo_user(db: AsyncSession) -> User:
    """
    Idempotently provision the shared guest account used by the one-click
    "Try as Guest" button. Safe to call on every ``/demo`` hit.
    """
    existing = await get_by_email(db, settings.demo_email)
    if existing is not None:
        return existing
    try:
        return await create_user(
            db,
            email=settings.demo_email,
            full_name=settings.demo_full_name,
            password=settings.demo_password,
            is_demo=True,
            plan="Developer Pro (Demo)",
        )
    except EmailAlreadyRegistered:
        # Lost a race with a concurrent request — just read it back.
        user = await get_by_email(db, settings.demo_email)
        assert user is not None
        return user


async def count_users(db: AsyncSession) -> int:
    return int((await db.execute(select(func.count(User.id)))).scalar_one())
