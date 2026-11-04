"""
CodeSense AI — SQLAlchemy declarative base + shared column helpers.
by Nitish Singh
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, mapped_column


def utcnow() -> datetime:
    """Timezone-aware UTC now (SQLite stores naive, so we normalise on read too)."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Declarative base for every ORM model in the project."""


def timestamp_column(**kwargs: object):
    """A ``DateTime`` column defaulting to :func:`utcnow`, used for ``created_at``."""
    return mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        **kwargs,  # type: ignore[arg-type]
    )
