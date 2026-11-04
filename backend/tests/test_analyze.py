"""
Integration tests for /api/analyze — anonymous vs authenticated, and the
persistence side-effect. The Gemini call is patched out. by Nitish Singh
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

_CODE = "def f(a, b):\n    return a / b\n"


@pytest.fixture(autouse=True)
def _patch_gemini(monkeypatch, fake_review):
    async def _fake_analyze_code(code: str, language: str):
        return fake_review

    monkeypatch.setattr("routers.analyze.analyze_code", _fake_analyze_code)
    # Isolate these tests to the AI path; the rule engine has its own tests.
    monkeypatch.setattr("routers.analyze.analyze_rules", lambda code, language="auto": [])


async def test_anonymous_analyze_works_but_does_not_persist(client: AsyncClient):
    resp = await client.post("/api/analyze", json={"code": _CODE, "language": "python"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["issue_count"] == {"high": 1, "medium": 1, "low": 0}
    assert body["quality_score"] == 6.7  # 10 - 2.5 - 0.8
    assert body["grade"] == "C"
    assert body["review_id"] is None


async def test_authenticated_analyze_persists_and_returns_review_id(
    client: AsyncClient, registered: dict
):
    resp = await client.post(
        "/api/analyze",
        json={"code": _CODE, "language": "python"},
        headers=registered["headers"],
    )
    assert resp.status_code == 200
    review_id = resp.json()["review_id"]
    assert isinstance(review_id, int)

    # It now shows up in history …
    hist = await client.get("/api/reviews", headers=registered["headers"])
    assert hist.status_code == 200
    assert any(r["id"] == review_id for r in hist.json())

    # … and is fully rehydratable.
    detail = await client.get(f"/api/reviews/{review_id}", headers=registered["headers"])
    assert detail.status_code == 200
    d = detail.json()
    assert d["code_snippet"] == _CODE
    assert len(d["issues"]) == 2
    assert d["issues"][0]["type"] == "security"


async def test_persist_false_opts_out_of_history(client: AsyncClient, registered: dict):
    resp = await client.post(
        "/api/analyze",
        json={"code": _CODE, "language": "python", "persist": False},
        headers=registered["headers"],
    )
    assert resp.status_code == 200
    assert resp.json()["review_id"] is None
    hist = await client.get("/api/reviews", headers=registered["headers"])
    assert hist.json() == []


async def test_empty_code_is_422(client: AsyncClient):
    resp = await client.post("/api/analyze", json={"code": "   ", "language": "python"})
    assert resp.status_code == 422
