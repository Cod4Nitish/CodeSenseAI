"""
Tests for the diff parser and /api/review-diff. Gemini is patched out.
by Nitish Singh
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from core.diff import parse_diff

DIFF = """diff --git a/app/db.py b/app/db.py
index 111..222 100644
--- a/app/db.py
+++ b/app/db.py
@@ -1,3 +1,5 @@
 import sqlite3
+def find(name):
+    return conn.execute("SELECT * FROM u WHERE n='" + name + "'")
 x = 1
-y = 2
diff --git a/new.py b/new.py
new file mode 100644
--- /dev/null
+++ b/new.py
@@ -0,0 +1,2 @@
+a = 1
+b = 2
"""


def test_parse_diff_tracks_files_and_added_lines():
    files = parse_diff(DIFF)
    assert [f.path for f in files] == ["app/db.py", "new.py"]
    db, new = files
    assert (db.additions, db.deletions) == (2, 1)
    assert db.added_lines == {2, 3}
    assert new.is_new and new.added_lines == {1, 2}


@pytest.fixture(autouse=True)
def _patch(monkeypatch):
    async def fake(prompt, system=None):
        return (
            {
                "summary": "Adds a lookup.",
                "walkthrough": "Adds find().",
                "risk": "high",
                "files": [{"path": "app/db.py", "change": "adds find()"}],
                "comments": [
                    {"path": "app/db.py", "line": 3, "type": "injection",
                     "severity": "critical", "title": "SQL injection",
                     "explanation": "concat", "suggestion": "use params"},
                    {"path": "app/db.py", "line": 1, "type": "bug",
                     "severity": "low", "title": "on unchanged line",
                     "explanation": "x", "suggestion": ""},
                    {"path": "ghost.py", "line": 1, "type": "bug",
                     "severity": "low", "title": "unknown file",
                     "explanation": "x", "suggestion": ""},
                ],
            },
            "fake-model",
        )

    monkeypatch.setattr("services.diff_service.generate_json", fake)


async def test_review_diff_drops_comments_on_unchanged_lines(client: AsyncClient):
    resp = await client.post("/api/review-diff", json={"diff": DIFF, "profile": "assertive"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["comments"]) == 1
    c = body["comments"][0]
    assert (c["path"], c["line"], c["type"], c["severity"]) == ("app/db.py", 3, "security", "high")
    assert body["issue_count"] == {"high": 1, "medium": 0, "low": 0}
    assert body["risk"] == "high"
    assert [f["path"] for f in body["files"]] == ["app/db.py", "new.py"]
    assert body["files"][1]["status"] == "added"
    assert body["sequence"] == ["app/db.py", "new.py"]


async def test_review_diff_rejects_non_diff(client: AsyncClient):
    resp = await client.post("/api/review-diff", json={"diff": "just some text"})
    assert resp.status_code == 422
