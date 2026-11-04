"""
CodeSense AI — pytest fixtures.
by Nitish Singh

Every test runs against an isolated, file-backed SQLite database that is dropped
and recreated per test, so cases never leak state into one another. The Gemini
call is never made — analyze tests monkeypatch ``routers.analyze.analyze_code``.
"""

from __future__ import annotations

import os
import pathlib

# ── Environment MUST be set before importing the app ───────────────────────────
_TEST_DB = pathlib.Path(__file__).parent / "_codesense_test.db"
os.environ.setdefault("GEMINI_API_KEY", "test-key-unused")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TEST_DB.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-0123456789abcdefghijklmnopqrstuvwxyz"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["ENVIRONMENT"] = "test"

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from db import engine  # noqa: E402
from main import app  # noqa: E402
from models.base import Base  # noqa: E402


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """Fresh schema + an ASGI test client bound to the app."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c


@pytest_asyncio.fixture
async def registered(client: AsyncClient) -> dict:
    """Register a user and return ``{client-usable headers, token, user}``."""
    payload = {
        "email": "alice@example.com",
        "full_name": "Alice Engineer",
        "password": "Sup3rSecret",
    }
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    return {
        "headers": {"Authorization": f"Bearer {body['access_token']}"},
        "token": body["access_token"],
        "user": body["user"],
        "password": payload["password"],
        "email": payload["email"],
    }


@pytest.fixture
def fake_review() -> dict:
    """A canned Gemini-shaped result used to patch the analyzer."""
    return {
        "summary": "Two issues found: one SQL injection, one missing zero-guard.",
        "issues": [
            {
                "line": 7,
                "type": "security",
                "severity": "high",
                "title": "SQL injection via string concatenation",
                "explanation": "User input is concatenated directly into SQL.",
                "suggested_fix": "Use parameterised queries.",
            },
            {
                "line": 11,
                "type": "bug",
                "severity": "medium",
                "title": "Possible division by zero",
                "explanation": "No guard for time == 0.",
                "suggested_fix": "if time == 0: raise ValueError(...)",
            },
        ],
        "issue_count": {"high": 1, "medium": 1, "low": 0},
        "model": "test-model",
    }


def pytest_sessionfinish(session, exitstatus) -> None:  # noqa: ARG001
    for suffix in ("", "-wal", "-shm"):
        p = pathlib.Path(str(_TEST_DB) + suffix)
        if p.exists():
            try:
                p.unlink()
            except OSError:
                pass
