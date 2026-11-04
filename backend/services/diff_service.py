"""
CodeSense AI — pull-request / diff reviewer.
by Nitish Singh
"""

from __future__ import annotations

from typing import Any

from core.diff import FileDiff, parse_diff, render_for_prompt
from services.gemini_service import (
    _SEVERITY_ALIASES,
    _TYPE_ALIASES,
    _VALID_SEVERITIES,
    _VALID_TYPES,
    _canon,
    _coerce_line,
    generate_json,
)

_PROFILES = {
    "chill": "Be selective: report only real bugs, security problems and significant "
             "performance issues. Skip style nits. Prefer fewer, high-confidence comments.",
    "assertive": "Be thorough and strict: also report maintainability, naming, missing "
                 "error handling, missing tests and style problems.",
}

_SYSTEM = """You are CodeSense, an expert pull-request reviewer.
You get a PR's changed code. Each line is shown as `<new line no> <+|space> <code>`;
`+` marks lines ADDED by the PR. Review ONLY the PR's changes, with the surrounding
context in mind. Respond with ONE JSON object only:

{
  "summary": "<2-3 sentence high-level summary of the PR and its quality>",
  "walkthrough": "<short paragraph explaining what the PR does end to end>",
  "risk": "low" | "medium" | "high",
  "files": [{"path": "<exact path>", "change": "<one sentence on what changed in this file>"}],
  "sequence": ["<paths in the order a human should review them>"],
  "comments": [{
    "path": "<exact path>",
    "line": <new-file line number of an ADDED (+) line>,
    "type": "bug" | "security" | "performance" | "style",
    "severity": "high" | "medium" | "low",
    "title": "<= 10 words",
    "explanation": "<why this matters, 1-3 sentences>",
    "suggestion": "<committable replacement for that line, code only, or empty string>"
  }]
}

Rules: never invent paths or line numbers; comment only on `+` lines; no duplicates;
for security issues start explanation with a tag like "[CWE-89 · OWASP A03:2021]".
"""


def _status(f: FileDiff) -> str:
    return "added" if f.is_new else "deleted" if f.is_deleted else "modified"


async def review_diff(diff: str, title: str, description: str, profile: str) -> dict[str, Any]:
    files = parse_diff(diff)
    if not files:
        raise ValueError("No files could be parsed from the diff.")

    ctx = f"Review profile: {_PROFILES.get(profile, _PROFILES['chill'])}\n"
    if title:
        ctx += f"PR title: {title}\n"
    if description:
        ctx += f"PR description: {description}\n"
    prompt = f"{ctx}\n{render_for_prompt(files)}"

    data, model = await generate_json(prompt, _SYSTEM)
    return assemble(files, data, model)


def assemble(files: list[FileDiff], data: dict[str, Any], model: str | None) -> dict[str, Any]:
    """Validate AI output against the real diff: drop comments on unchanged lines."""
    by_path = {f.path: f for f in files}
    notes = {
        str(i.get("path")): str(i.get("change") or "")[:300]
        for i in (data.get("files") or [])
        if isinstance(i, dict)
    }

    comments: list[dict[str, Any]] = []
    seen: set[tuple[str, int, str]] = set()
    for c in data.get("comments") or []:
        if not isinstance(c, dict):
            continue
        path, line = str(c.get("path") or ""), _coerce_line(c.get("line"))
        f = by_path.get(path)
        if f is None or line is None or line not in f.added_lines:
            continue
        title = str(c.get("title") or "Issue detected").strip()[:140]
        key = (path, line, title.lower())
        if key in seen:
            continue
        seen.add(key)
        comments.append(
            {
                "path": path,
                "line": line,
                "type": _canon(c.get("type"), _TYPE_ALIASES, _VALID_TYPES, "bug"),
                "severity": _canon(
                    c.get("severity"), _SEVERITY_ALIASES, _VALID_SEVERITIES, "medium"
                ),
                "title": title,
                "explanation": str(c.get("explanation") or "No explanation provided.").strip()[:1200],
                "suggestion": str(c.get("suggestion") or "").strip()[:4000],
            }
        )

    order = {"high": 0, "medium": 1, "low": 2}
    comments.sort(key=lambda x: (order[x["severity"]], x["path"], x["line"]))

    risk = str(data.get("risk") or "").lower()
    if risk not in ("low", "medium", "high"):
        risk = (
            "high" if any(c["severity"] == "high" for c in comments)
            else "medium" if comments else "low"
        )

    seq = [p for p in (data.get("sequence") or []) if isinstance(p, str) and p in by_path]
    seq += [f.path for f in files if f.path not in seq]

    counts = {s: sum(1 for c in comments if c["severity"] == s) for s in order}
    summary = str(data.get("summary") or "").strip()[:800] or (
        "No issues found in this change."
        if not comments
        else f"{len(comments)} comment(s) on this change."
    )
    return {
        "summary": summary,
        "walkthrough": str(data.get("walkthrough") or "").strip()[:2000],
        "risk": risk,
        "files": [
            {
                "path": f.path,
                "additions": f.additions,
                "deletions": f.deletions,
                "status": _status(f),
                "change": notes.get(f.path, ""),
            }
            for f in files
        ],
        "comments": comments,
        "issue_count": counts,
        "sequence": seq,
        "model": model,
    }
