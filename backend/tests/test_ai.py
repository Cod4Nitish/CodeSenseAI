"""
Tests for /api/ai/* (chat, fix, explain, tests). Gemini is patched out.
by Nitish Singh
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

CODE = "def f(a, b):\n    return a / b\n"


@pytest.fixture
def fake(monkeypatch):
    calls: dict = {}

    def install(payload):
        async def _gen(prompt, system=None):
            calls["prompt"], calls["system"] = prompt, system
            return payload, "fake-model"

        monkeypatch.setattr("services.ai_tools.generate_json", _gen)
        return calls

    return install


async def test_chat_returns_reply_and_includes_context(client: AsyncClient, fake):
    calls = fake({"reply": "It divides.", "suggested_code": "def f(a, b):\n    return a / b if b else 0\n"})
    r = await client.post(
        "/api/ai/chat",
        json={
            "code": CODE,
            "language": "python",
            "message": "why can this crash?",
            "history": [{"role": "user", "content": "hi"}],
            "issues": [{"line": 2, "type": "bug", "severity": "medium", "title": "Div by zero"}],
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["reply"] == "It divides."
    assert "Div by zero" in calls["prompt"] and "why can this crash?" in calls["prompt"]


async def test_fix_returns_complete_file(client: AsyncClient, fake):
    fake({"fixed_code": "def f(a, b):\n    return a / b if b else 0", "changes": ["Guard zero at line 2"]})
    r = await client.post("/api/ai/fix", json={"code": CODE, "language": "python"})
    assert r.status_code == 200
    body = r.json()
    assert body["fixed_code"].endswith("\n") and body["changes"] == ["Guard zero at line 2"]


async def test_fix_empty_ai_output_is_502(client: AsyncClient, fake):
    fake({"fixed_code": "  ", "changes": []})
    r = await client.post("/api/ai/fix", json={"code": CODE})
    assert r.status_code == 502


async def test_explain_and_tests(client: AsyncClient, fake):
    fake({"overview": "Divides two numbers.", "steps": ["Line 2 divides."], "complexity": "O(1)", "pitfalls": ["b == 0"]})
    r = await client.post("/api/ai/explain", json={"code": CODE, "level": "beginner"})
    assert r.status_code == 200 and r.json()["pitfalls"] == ["b == 0"]

    fake({"framework": "pytest", "test_code": "def test_f():\n    assert True", "cases": ["basic"]})
    r = await client.post("/api/ai/tests", json={"code": CODE, "framework": "pytest"})
    assert r.status_code == 200 and r.json()["framework"] == "pytest"


async def test_validation_rejects_empty_code_and_bad_level(client: AsyncClient):
    assert (await client.post("/api/ai/explain", json={"code": "  "})).status_code == 422
    assert (await client.post("/api/ai/explain", json={"code": CODE, "level": "god"})).status_code == 422
    assert (await client.post("/api/ai/chat", json={"code": CODE, "message": ""})).status_code == 422


async def test_simplify_and_quiz(client: AsyncClient, fake):
    fake({"simple": "Dividing by zero crashes.", "analogy": "Like sharing 5 sweets among 0 kids.", "fixed_example": "if b: ..."})
    r = await client.post("/api/ai/simplify", json={"code": CODE, "issue_title": "Div by zero", "tongue": "hinglish"})
    assert r.status_code == 200 and "crashes" in r.json()["simple"]

    fake({"code": "x = 1\ny = 2\nprint(x + z)\nprint(y)", "question": "Which line has the bug?",
          "bug_line": 3, "explanation": "z is undefined", "fix": "print(x + y)"})
    r = await client.post("/api/ai/quiz", json={"language": "python", "difficulty": "easy"})
    assert r.status_code == 200
    body = r.json()
    assert body["bug_line"] in body["options"] and len(body["options"]) == 4


async def test_quiz_rejects_out_of_range_bug_line(client: AsyncClient, fake):
    fake({"code": "a = 1\nb = 2", "bug_line": 9, "explanation": "x", "fix": "y"})
    assert (await client.post("/api/ai/quiz", json={})).status_code == 502
