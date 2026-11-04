"""
Tests for audit history + analytics: ownership isolation, stats aggregation,
and deletion. by Nitish Singh
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from core.security import create_access_token
from services import review_service
from schemas.analyze import Issue


def _issues(*specs: tuple[str, str]) -> list[Issue]:
    """specs: (severity, type) tuples."""
    return [
        Issue(
            line=i + 1,
            type=t,
            severity=s,
            title=f"{s} {t}",
            explanation="…",
            suggested_fix="…",
        )
        for i, (s, t) in enumerate(specs)
    ]


async def _seed(db, user_id: int, *issue_batches):
    for batch in issue_batches:
        await review_service.record_review(
            db,
            user_id=user_id,
            code="print('x')",
            language="python",
            summary="seeded",
            issues=list(batch),
            model="test-model",
        )


async def test_history_requires_auth(client: AsyncClient):
    assert (await client.get("/api/reviews")).status_code == 401
    assert (await client.get("/api/reviews/stats")).status_code == 401


async def test_empty_stats_shape(client: AsyncClient, registered: dict):
    resp = await client.get("/api/reviews/stats", headers=registered["headers"])
    assert resp.status_code == 200
    s = resp.json()
    assert s["total_reviews"] == 0
    assert s["average_quality_score"] == 0.0
    assert s["clean_pass_rate"] == 0.0
    assert len(s["score_distribution"]) == 6
    assert len(s["activity"]) == 14


async def test_stats_aggregate_correctly(client: AsyncClient, registered: dict):
    from db import SessionLocal

    uid = registered["user"]["id"]
    async with SessionLocal() as db:
        await _seed(
            db,
            uid,
            _issues(("high", "security"), ("medium", "bug")),  # score 6.7
            _issues(),                                          # clean -> 10.0
            _issues(("low", "style")),                          # 9.8
        )

    resp = await client.get("/api/reviews/stats", headers=registered["headers"])
    s = resp.json()
    assert s["total_reviews"] == 3
    assert s["critical_vulnerabilities_prevented"] == 1
    assert s["clean_pass_rate"] == pytest.approx(1 / 3, rel=1e-3)
    assert s["total_issues_found"] == 3
    assert s["best_score"] == 10.0
    assert s["average_quality_score"] == pytest.approx((6.7 + 10.0 + 9.8) / 3, rel=1e-3)
    assert sum(b["count"] for b in s["score_distribution"]) == 3


async def test_history_is_owner_scoped(client: AsyncClient, registered: dict):
    """A second user must never see the first user's reviews."""
    from db import SessionLocal

    async with SessionLocal() as db:
        await _seed(db, registered["user"]["id"], _issues(("high", "bug")))

    other = await client.post(
        "/api/auth/register",
        json={"email": "mallory@example.com", "full_name": "Mallory", "password": "Passw0rd"},
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    mine = await client.get("/api/reviews", headers=registered["headers"])
    theirs = await client.get("/api/reviews", headers=other_headers)
    assert len(mine.json()) == 1
    assert theirs.json() == []

    # And a direct id probe is a 404, not a leak.
    rid = mine.json()[0]["id"]
    assert (await client.get(f"/api/reviews/{rid}", headers=other_headers)).status_code == 404


async def test_delete_review(client: AsyncClient, registered: dict):
    from db import SessionLocal

    async with SessionLocal() as db:
        await _seed(db, registered["user"]["id"], _issues(("medium", "bug")))
    rid = (await client.get("/api/reviews", headers=registered["headers"])).json()[0]["id"]

    resp = await client.delete(f"/api/reviews/{rid}", headers=registered["headers"])
    assert resp.status_code == 204
    assert (await client.get("/api/reviews", headers=registered["headers"])).json() == []


async def test_stale_token_for_deleted_user_is_401(client: AsyncClient):
    """A validly-signed token whose subject no longer exists must not authenticate."""
    ghost = create_access_token(999_999)
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {ghost}"})
    assert resp.status_code == 401
