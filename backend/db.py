"""
CodeSense AI — database engine, session factory, and schema bootstrap.
by Nitish Singh

Async SQLAlchemy 2.0 over SQLite (``aiosqlite`` driver). The whole request path
is non-blocking: FastAPI endpoints ``await`` an :class:`AsyncSession` yielded by
:func:`get_db`, so a slow query never stalls the event loop that is also serving
the Gemini call.

For a single-file SQLite database this is arguably more machinery than strictly
needed — but it is the exact shape a Postgres deployment uses, so the migration
path is "change ``DATABASE_URL``, add Alembic".
"""

from __future__ import annotations

import logging
import re
from collections.abc import AsyncIterator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import settings
from models.base import Base

logger = logging.getLogger("codesense.db")

def _prepare_url(raw: str) -> tuple[str, dict]:
    """Normalise any DATABASE_URL into (async SQLAlchemy URL, driver connect_args).

    * ``postgres://`` / ``postgresql://``  ->  ``postgresql+asyncpg://``
    * ``sslmode=...`` / ``channel_binding=...`` query params (libpq-only) are
      removed and translated to asyncpg's ``ssl`` connect arg.
    * SQLite keeps ``check_same_thread=False``.
    """
    if raw.startswith("sqlite"):
        return raw, {"check_same_thread": False}
    if raw.startswith(("postgres://", "postgresql://")):
        raw = raw.replace("postgres://", "postgresql://", 1).replace(
            "postgresql://", "postgresql+asyncpg://", 1
        )
    parts = urlsplit(raw)
    query = dict(parse_qsl(parts.query))
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    args: dict = {}
    if sslmode and sslmode != "disable":
        args["ssl"] = True
    return urlunsplit(parts._replace(query=urlencode(query))), args


def _safe_url(url: str) -> str:
    """URL with the password masked, safe to log."""
    return re.sub(r"://([^:/@]+):[^@]*@", r"://:***@", url)


_db_url, _connect_args = _prepare_url(settings.database_url)

engine: AsyncEngine = create_async_engine(
    _db_url,
    echo=settings.db_echo,
    future=True,
    connect_args=_connect_args,
    pool_pre_ping=True,
)

SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@event.listens_for(Engine, "connect")
def _enable_sqlite_fks(dbapi_connection, _connection_record) -> None:  # noqa: ANN001
    """SQLite ignores FK constraints unless explicitly asked to enforce them."""
    if "sqlite" not in type(dbapi_connection).__module__:
        return
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()
    except Exception:  # pragma: no cover - non-SQLite backends
        pass


async def init_db() -> None:
    """Create tables that do not yet exist. Called once from the app lifespan."""
    # Import for side effect: registers every mapper on ``Base.metadata``.
    import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database ready at %s", _safe_url(_db_url))


async def dispose_db() -> None:
    """Release the connection pool on shutdown."""
    await engine.dispose()


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: yields a session and guarantees rollback-on-error."""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
