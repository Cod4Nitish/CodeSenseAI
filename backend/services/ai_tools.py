"""
CodeSense AI — AI assistant tools (chat, auto-fix, explain, generate tests).
by Nitish Singh

All four tools share the single Gemini client / key in ``gemini_service`` and its
model-fallback + retry + tolerant-JSON pipeline (``generate_json``).
"""

from __future__ import annotations

from typing import Any

import random

from schemas.ai import IssueRef
from services.static_analyzer import analyze_rules
from services.gemini_service import generate_json


def _numbered(code: str) -> str:
    return "\n".join(f"{i:>4}  {ln}" for i, ln in enumerate(code.splitlines(), 1))


def _issues_block(issues: list[IssueRef]) -> str:
    if not issues:
        return "(none supplied)"
    return "\n".join(
        f"- line {i.line if i.line else '?'} [{i.severity}/{i.type}] {i.title}: {i.explanation}"
        for i in issues
    )


def _s(value: Any, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _strs(value: Any, n: int, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    return [_s(v, limit) for v in value if _s(v, limit)][:n]


_CHAT = """You are CodeSense Assistant, a friendly senior engineer inside a code-review tool.
Answer the user's question about THEIR code. Be concise, concrete, and correct; use short
markdown (bullets, `inline code`). If you suggest a change, put the complete replacement
snippet in "suggested_code" (code only). Never invent lines that are not in the code.
Respond with ONE JSON object only: {"reply": "<markdown answer>", "suggested_code": "<code or empty string>"}"""

_FIX = """You are a meticulous senior engineer. Fix EVERY listed issue completely in the supplied file,
plus any other clear bug or vulnerability you notice. Do not leave an issue half-fixed or add TODOs.
Typical fixes: read secrets from environment variables (never hardcode them); use parameterised
queries instead of string-built SQL; guard division by zero and None/null; close resources; remove
eval/exec and shell injection. Keep the language, style, structure, names and public behaviour.
Return the COMPLETE corrected file.
Respond with ONE JSON object only:
{"fixed_code": "<the entire fixed file>", "changes": ["<one short sentence per change, mention the line>"]}"""

_EXPLAIN = """You explain code clearly to the requested audience level. Respond with ONE JSON object only:
{"overview": "<2-3 sentence plain-language summary of what the code does>",
 "steps": ["<step-by-step walkthrough, each step one sentence, refer to line numbers>"],
 "complexity": "<time/space complexity or main cost, one sentence, or empty>",
 "pitfalls": ["<edge cases or gotchas worth knowing>"]}"""

_TESTS = """You write high-quality unit tests. Cover normal cases, edge cases and error cases of the
supplied code. Tests must be runnable as-is with the chosen framework and import the code
under test sensibly (assume it lives in a module named `solution` unless obvious).
Respond with ONE JSON object only:
{"framework": "<framework used>", "test_code": "<complete test file>", "cases": ["<one-line description of each test>"]}"""


async def chat(code: str, language: str, message: str, history: list, issues: list[IssueRef]) -> dict[str, Any]:
    convo = "\n".join(f"{m.role.upper()}: {m.content}" for m in history[-10:])
    prompt = (
        f"Language: {language}\n\nCODE (line numbers for reference):\n{_numbered(code)}\n\n"
        f"KNOWN FINDINGS:\n{_issues_block(issues)}\n\nCONVERSATION SO FAR:\n{convo or '(new)'}\n\n"
        f"USER QUESTION: {message}"
    )
    data, model = await generate_json(prompt, _CHAT)
    return {
        "reply": _s(data.get("reply"), 6000) or "Sorry, I could not produce an answer. Try rephrasing.",
        "suggested_code": _s(data.get("suggested_code"), 12000),
        "model": model,
    }


def _rules_block(found: list[dict]) -> str:
    return "\n".join(
        f"- line {f['line'] or '?'} [{f['severity']}/{f['type']}] {f['title']}: {f['explanation']}" for f in found
    ) or "(none)"


def _syntax_error(code: str, language: str) -> str:
    """Python only: compile() (never executes) to catch a fix that broke the file."""
    if language not in ("python", "auto"):
        return ""
    try:
        compile(code, "<fixed>", "exec")
    except SyntaxError as e:
        if language == "auto" and not code.lstrip().startswith(("def ", "import ", "from ", "class ", "#")):
            return ""
        return f"SyntaxError on line {e.lineno}: {e.msg}"
    except Exception:
        return ""
    return ""


def _verify(code: str, language: str) -> tuple[list[dict], str]:
    """Deterministic check of a fix: high/medium rule findings still present + syntax."""
    left = [f for f in analyze_rules(code, language) if f["severity"] in ("high", "medium")]
    return left, _syntax_error(code, language)


async def fix_file(code: str, language: str, issues: list[IssueRef]) -> dict[str, Any]:
    # Seed with the deterministic findings too, so a fix works even before the first review.
    seed = _issues_block(issues) if issues else _rules_block(analyze_rules(code, language))
    prompt = f"Language: {language}\n\nISSUES TO FIX:\n{seed}\n\nFILE:\n{code}"
    data, model = await generate_json(prompt, _FIX)
    fixed = data.get("fixed_code")
    if not isinstance(fixed, str) or not fixed.strip():
        raise ValueError("The AI did not return a fixed file. Please retry.")
    fixed = fixed.strip("\n") + "\n"
    changes = _strs(data.get("changes"), 30, 300)

    # Verify, and give the model ONE chance to repair what is still wrong (keeps it fast).
    left, syn = _verify(fixed, language)
    if left or syn:
        problems = _rules_block(left) + (f"\n- {syn}" if syn else "")
        retry = (
            f"Language: {language}\n\nYOUR PREVIOUS FIX STILL HAS THESE PROBLEMS - fix them all:\n{problems}"
            f"\n\nCURRENT FILE:\n{fixed}"
        )
        try:
            data2, _ = await generate_json(retry, _FIX)
            fixed2 = data2.get("fixed_code")
            if isinstance(fixed2, str) and fixed2.strip():
                fixed2 = fixed2.strip("\n") + "\n"
                left2, syn2 = _verify(fixed2, language)
                if (len(left2) + (1 if syn2 else 0)) <= (len(left) + (1 if syn else 0)):  # never regress
                    fixed, left, syn = fixed2, left2, syn2
                    changes += _strs(data2.get("changes"), 10, 300)
        except Exception:  # retry is best-effort; the first fix is still returned
            pass
    return {
        "fixed_code": fixed,
        "changes": changes[:30],
        "remaining": len(left) + (1 if syn else 0),
        "model": model,
    }


_LANG_NOTE = {
    "english": "",
    "hindi": "\nWrite every explanation in simple Hindi (Devanagari script). Keep code, identifiers and technical keywords in English.",
    "hinglish": "\nWrite every explanation in Hinglish: Hindi in Roman (English) letters mixed with common English tech words, like a friendly senior explaining to a student. Keep code and identifiers in English.",
}


async def explain(code: str, language: str, level: str, lang: str = "english") -> dict[str, Any]:
    prompt = f"Audience level: {level}\nLanguage: {language}{_LANG_NOTE.get(lang, '')}\n\nCODE:\n{_numbered(code)}"
    data, model = await generate_json(prompt, _EXPLAIN)
    return {
        "overview": _s(data.get("overview"), 1200) or "No explanation was produced.",
        "steps": _strs(data.get("steps"), 30, 400),
        "complexity": _s(data.get("complexity"), 300),
        "pitfalls": _strs(data.get("pitfalls"), 12, 300),
        "model": model,
    }


async def generate_tests(code: str, language: str, framework: str) -> dict[str, Any]:
    prompt = (
        f"Language: {language}\nPreferred framework: {framework or 'best default for the language'}\n\n"
        f"CODE UNDER TEST:\n{code}"
    )
    data, model = await generate_json(prompt, _TESTS)
    test_code = data.get("test_code")
    if not isinstance(test_code, str) or not test_code.strip():
        raise ValueError("The AI did not return any tests. Please retry.")
    return {
        "framework": _s(data.get("framework"), 40) or framework or "default",
        "test_code": test_code.strip("\n") + "\n",
        "cases": _strs(data.get("cases"), 40, 200),
        "model": model,
    }


_SIMPLIFY = """You are a kind coding tutor for a COMPLETE BEGINNER. Explain the problem in very simple words,
short sentences, no jargon (or explain the jargon). If tongue is 'hinglish', write in simple Hinglish
(Hindi in Roman script mixed with common English tech words). Respond with ONE JSON object only:
{"simple": "<2-4 short sentences: what is wrong and why it matters>",
 "analogy": "<one real-life analogy, one sentence>",
 "fixed_example": "<the smallest corrected code snippet, code only>"}"""

_QUIZ = """You create a beginner-friendly 'find the bug' quiz. Write a SHORT program (6-12 lines) in the
requested language with EXACTLY ONE clear bug appropriate to the difficulty and topic. No comments that reveal
the bug. If tongue is 'hinglish', write question/explanation in simple Hinglish (Roman script).
Respond with ONE JSON object only:
{"code": "<the program, lines separated by newline characters>", "question": "<what to ask, e.g. which line has the bug?>",
 "bug_line": <1-based line number of the bug>, "explanation": "<why that line is wrong, 1-3 simple sentences>",
 "fix": "<the corrected line, code only>"}"""


async def simplify(
    code: str, language: str, title: str, explanation: str, line: int | None, tongue: str
) -> dict[str, Any]:
    prompt = (
        f"tongue: {tongue}\nLanguage: {language}\nProblem: {title}\n"
        f"Technical explanation: {explanation}\nLine: {line or 'n/a'}\n\n"
        f"CODE:\n{_numbered(code)}"
    )
    data, model = await generate_json(prompt, _SIMPLIFY)
    return {
        "simple": _s(data.get("simple"), 800) or "Sorry, I could not simplify this one. Try again.",
        "analogy": _s(data.get("analogy"), 300),
        "fixed_example": _s(data.get("fixed_example"), 3000),
        "model": model,
    }


async def make_quiz(language: str, difficulty: str, topic: str, tongue: str) -> dict[str, Any]:
    prompt = (
        f"tongue: {tongue}\nLanguage: {language}\nDifficulty: {difficulty}\n"
        f"Topic: {topic or 'any basic topic'}"
    )
    data, model = await generate_json(prompt, _QUIZ)
    code = data.get("code")
    if not isinstance(code, str) or not code.strip():
        raise ValueError("The AI did not return a quiz. Please retry.")
    code = code.strip("\n")
    n = len(code.splitlines())
    try:
        bug = int(data.get("bug_line"))
    except (TypeError, ValueError):
        bug = 0
    if not 1 <= bug <= n:
        raise ValueError("The AI returned an invalid quiz (bug line out of range). Please retry.")
    pool = [i for i in range(1, n + 1) if i != bug]
    options = sorted(random.sample(pool, min(3, len(pool))) + [bug])
    return {
        "code": code + "\n",
        "question": _s(data.get("question"), 300) or "Which line has the bug?",
        "bug_line": bug,
        "options": options,
        "explanation": _s(data.get("explanation"), 800),
        "fix": _s(data.get("fix"), 1000),
        "model": model,
    }
