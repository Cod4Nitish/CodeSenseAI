"""
CodeSense AI — Gemini integration layer.
by Nitish Singh

Design goals:
  * Non-blocking: uses the async Gemini client so FastAPI's event loop stays free.
  * Forced JSON: asks Gemini for application/json to minimise parse failures.
  * Defensive: every layer (network, decode, schema) degrades gracefully — a
    malformed LLM response is normalised, never crashed on.
"""

import os
import re
import json
import asyncio
import logging
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client initialisation — key loaded from environment (never hardcoded)
# ---------------------------------------------------------------------------
_api_key = os.getenv("GEMINI_API_KEY")
if not _api_key:
    raise RuntimeError(
        "GEMINI_API_KEY environment variable is not set. "
        "Create a backend/.env file and add your key."
    )

_client = genai.Client(api_key=_api_key)

# Primary model is overridable via env; a stable fallback covers the case where
# the primary name is not available for a given key / region.
_PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite").strip()
_FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite").strip()
_REQUEST_TIMEOUT_S = float(os.getenv("GEMINI_TIMEOUT_S", "45"))

# Remembered once a model has served a successful request.
_resolved_model: str | None = None

_VALID_TYPES = {"bug", "security", "performance", "style"}
_VALID_SEVERITIES = {"high", "medium", "low"}

# Loose synonyms Gemini sometimes emits -> our canonical vocabulary.
_SEVERITY_ALIASES = {
    "critical": "high", "blocker": "high", "severe": "high", "major": "high",
    "error": "high", "high": "high",
    "moderate": "medium", "warning": "medium", "warn": "medium", "medium": "medium",
    "minor": "low", "info": "low", "informational": "low", "trivial": "low",
    "nit": "low", "note": "low", "low": "low",
}
_TYPE_ALIASES = {
    "bug": "bug", "defect": "bug", "logic": "bug", "correctness": "bug",
    "crash": "bug", "runtime": "bug",
    "security": "security", "vulnerability": "security", "vuln": "security",
    "injection": "security", "xss": "security", "cwe": "security",
    "performance": "performance", "perf": "performance", "efficiency": "performance",
    "memory": "performance", "speed": "performance",
    "style": "style", "readability": "style", "maintainability": "style",
    "convention": "style", "lint": "style", "formatting": "style", "naming": "style",
}

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """You are a principal software engineer performing a rigorous, senior-level code review.
Analyse the supplied source code for bugs, security vulnerabilities, performance
problems, and style / maintainability issues.

Respond with a SINGLE JSON object ONLY — no prose, no markdown fences — matching:

{
  "summary": "<2-3 sentence overall assessment of code quality and risk>",
  "issues": [
    {
      "line": <1-based line number of the issue, or null if not line-specific>,
      "type": "bug" | "security" | "performance" | "style",
      "severity": "high" | "medium" | "low",
      "title": "<concise problem title, <= 10 words>",
      "explanation": "<why it is a problem and its impact, 1-3 sentences>",
      "suggested_fix": "<concrete corrected snippet or precise remediation steps>"
    }
  ]
}

Rules:
- Report the MOST IMPORTANT issues first. Do not invent problems.
- If the code is genuinely clean, return "issues": [].
- "line" must be an integer that exists in the submitted code, or null.
- Keep "suggested_fix" copy-paste useful. Use the same language as the input.
- Output the JSON object and nothing else.
"""


def _strip_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers if the model adds them anyway."""
    text = text.strip()
    text = re.sub(r"^```(?:json|javascript|js)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def _extract_json_object(text: str) -> str:
    """Best-effort: slice from the first '{' to its matching '}'."""
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def _loads_tolerant(raw: str) -> dict[str, Any]:
    """Parse JSON, retrying with fence-stripping and brace-slicing."""
    for candidate in (raw, _strip_fences(raw), _extract_json_object(_strip_fences(raw))):
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    raise ValueError(
        f"Gemini response was not valid JSON. First 300 chars: {raw[:300]!r}"
    )


def _coerce_line(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 1 else None
    if isinstance(value, float):
        return int(value) if value >= 1 else None
    if isinstance(value, str):
        m = re.search(r"\d+", value)
        if m:
            n = int(m.group())
            return n if n >= 1 else None
    return None


def _canon(value: Any, aliases: dict[str, str], valid: set[str], default: str) -> str:
    if isinstance(value, str):
        key = value.strip().lower()
        if key in valid:
            return key
        if key in aliases:
            return aliases[key]
        for token, canon in aliases.items():
            if token in key:
                return canon
    return default


def _normalise(data: dict[str, Any]) -> dict[str, Any]:
    """Turn whatever Gemini returned into a strict, schema-ready dict."""
    raw_issues = data.get("issues")
    if not isinstance(raw_issues, list):
        raw_issues = []

    issues: list[dict[str, Any]] = []
    for item in raw_issues:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip() or "Issue detected"
        explanation = str(item.get("explanation") or "").strip() or "No explanation provided."
        suggested_fix = str(item.get("suggested_fix") or item.get("fix") or "").strip() \
            or "No specific fix suggested."
        issues.append(
            {
                "line": _coerce_line(item.get("line")),
                "type": _canon(item.get("type"), _TYPE_ALIASES, _VALID_TYPES, "bug"),
                "severity": _canon(
                    item.get("severity"), _SEVERITY_ALIASES, _VALID_SEVERITIES, "medium"
                ),
                "title": title[:140],
                "explanation": explanation[:1200],
                "suggested_fix": suggested_fix[:4000],
            }
        )

    summary = str(data.get("summary") or "").strip()
    if not summary:
        summary = (
            "No issues detected — the code looks clean."
            if not issues
            else f"Review complete: {len(issues)} issue(s) identified."
        )

    issue_count = {
        "high": sum(1 for i in issues if i["severity"] == "high"),
        "medium": sum(1 for i in issues if i["severity"] == "medium"),
        "low": sum(1 for i in issues if i["severity"] == "low"),
    }
    return {"summary": summary[:800], "issues": issues, "issue_count": issue_count}


def _build_user_prompt(code: str, language: str) -> str:
    lang_label = "auto-detect the language" if language == "auto" else language
    numbered = "\n".join(f"{i:>4}  {ln}" for i, ln in enumerate(code.splitlines(), 1))
    return (
        f"Language: {lang_label}\n\n"
        f"Source code to review (line numbers shown on the left for reference only):\n\n"
        f"{numbered}"
    )


async def _call_model(model: str, user_prompt: str) -> str:
    """One async Gemini call. Returns raw text or raises."""
    response = await asyncio.wait_for(
        _client.aio.models.generate_content(
            model=model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                temperature=0.2,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        ),
        timeout=_REQUEST_TIMEOUT_S,
    )
    text = getattr(response, "text", None)
    if not text or not text.strip():
        # Surface a safety / recitation block clearly instead of a blank crash.
        reason = ""
        try:
            reason = str(response.candidates[0].finish_reason)  # type: ignore[index]
        except Exception:
            pass
        raise ValueError(
            f"Gemini returned an empty response{f' (finish_reason={reason})' if reason else ''}."
        )
    return text


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
async def analyze_code(code: str, language: str) -> dict[str, Any]:
    """
    Send code to Gemini for review.
    Returns a dict shaped like AnalyzeResponse. Raises ValueError with a
    user-friendly message on unrecoverable failure.
    """
    global _resolved_model

    user_prompt = _build_user_prompt(code, language)

    # Try the remembered model first, then primary, then fallback — de-duplicated.
    candidates: list[str] = []
    for m in (_resolved_model, _PRIMARY_MODEL, _FALLBACK_MODEL):
        if m and m not in candidates:
            candidates.append(m)

    last_error: Exception | None = None
    raw_text: str | None = None
    served_by: str | None = None

    for model in candidates:
        try:
            raw_text = await _call_model(model, user_prompt)
            served_by = model
            break
        except asyncio.TimeoutError:
            last_error = ValueError(
                f"Gemini did not respond within {_REQUEST_TIMEOUT_S:.0f}s. Try again."
            )
            logger.warning("Gemini timeout on model=%s", model)
            break  # a timeout is not a model-availability problem
        except Exception as e:  # noqa: BLE001 — we want to try the next model
            last_error = e
            msg = str(e).lower()
            transient_model_issue = any(
                t in msg for t in ("not found", "404", "not supported", "permission",
                                   "unavailable", "unsupported", "does not exist")
            )
            logger.warning("Gemini call failed on model=%s: %s", model, e)
            if not transient_model_issue:
                break  # real error (bad key, quota, network) — stop trying models

    if raw_text is None:
        raise ValueError(f"Gemini API error: {last_error}")

    if served_by and served_by != _resolved_model:
        _resolved_model = served_by
        logger.info("Gemini model resolved to '%s'", served_by)

    data = _loads_tolerant(raw_text)
    result = _normalise(data)
    result["model"] = served_by
    return result
