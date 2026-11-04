"""
Tests for the deterministic rule engine and its merge with the AI path.
by Nitish Singh
"""

from __future__ import annotations

from httpx import AsyncClient

from services.static_analyzer import analyze_rules, merge

VULN_PY = '''import sqlite3
API_KEY = "sk_live_abcdef123456"

def find(conn, name, items=[]):
    q = conn.execute("SELECT * FROM u WHERE n='" + name + "'")
    try:
        eval(name)
    except:
        pass
    return 10 / len(items)
'''

CLEAN_PY = '''def add(a: int, b: int) -> int:
    return a + b
'''


def _titles(code, lang="python"):
    return {f["title"] for f in analyze_rules(code, lang)}


def test_detects_core_vulnerabilities_and_bugs():
    t = _titles(VULN_PY)
    assert "Hardcoded secret in source code" in t
    assert "SQL query built from string concatenation" in t
    assert "Use of eval/exec on dynamic input" in t
    assert "Bare except clause" in t
    assert "Mutable default argument" in t


def test_clean_code_has_no_findings():
    assert analyze_rules(CLEAN_PY, "python") == []


def test_syntax_error_is_reported_with_line():
    f = analyze_rules("def broken(:\n    pass\n", "python")
    assert f and f[0]["title"] == "Syntax error" and f[0]["line"] == 1


def test_javascript_rules_and_language_autodetect():
    js = 'const q = db.query(`SELECT * FROM t WHERE id=${id}`);\nel.innerHTML = x;\nif (a == b) {}\n'
    t = _titles(js, "auto")
    assert "SQL query built from string concatenation" in t
    assert "Possible XSS via innerHTML/document.write" in t
    assert "Loose equality (== / !=)" in t


def test_comments_are_ignored():
    assert analyze_rules('# password = "hunter2hunter2"\n', "python") == []


def test_merge_marks_agreement_as_both():
    ai = [{"line": 2, "type": "security", "severity": "medium", "title": "Secret",
           "explanation": "Hardcoded.", "suggested_fix": "env"}]
    rules = analyze_rules(VULN_PY, "python")
    merged = merge(ai, rules)
    secret = next(m for m in merged if m["line"] == 2 and m["type"] == "security")
    assert secret["source"] == "both" and secret["severity"] == "high"
    assert any(m["source"] == "rules" for m in merged)


async def test_endpoint_falls_back_to_rules_when_ai_is_down(client: AsyncClient, monkeypatch):
    async def boom(code, language):
        raise ValueError("AI engine is busy or unavailable")

    monkeypatch.setattr("routers.analyze.analyze_code", boom)
    r = await client.post("/api/analyze", json={"code": VULN_PY, "language": "python"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["engine"] == "rules-only" and body["issue_count"]["high"] >= 2
    assert all(i["source"] == "rules" for i in body["issues"])


async def test_endpoint_still_errors_when_ai_down_and_no_rule_findings(client: AsyncClient, monkeypatch):
    async def boom(code, language):
        raise ValueError("AI engine is busy or unavailable")

    monkeypatch.setattr("routers.analyze.analyze_code", boom)
    r = await client.post("/api/analyze", json={"code": CLEAN_PY, "language": "python"})
    assert r.status_code == 502
