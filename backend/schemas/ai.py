"""
CodeSense AI — schemas for the AI assistant endpoints (/api/ai/*).
by Nitish Singh
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from schemas.analyze import Language, MAX_CODE_CHARS


def _check_code(v: str) -> str:
    if not v or not v.strip():
        raise ValueError("Code must not be empty.")
    if len(v) > MAX_CODE_CHARS:
        raise ValueError(f"Code exceeds the maximum allowed length of {MAX_CODE_CHARS:,} characters.")
    return v


class IssueRef(BaseModel):
    """A finding the user already has (sent back so the AI has context)."""

    line: Optional[int] = None
    type: str = ""
    severity: str = ""
    title: str = Field(default="", max_length=200)
    explanation: str = Field(default="", max_length=1500)


class _CodeRequest(BaseModel):
    code: str
    language: Language = "auto"

    @field_validator("code")
    @classmethod
    def _code(cls, v: str) -> str:
        return _check_code(v)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(_CodeRequest):
    message: str = Field(min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list, max_length=12)
    issues: List[IssueRef] = Field(default_factory=list, max_length=40)


class ChatResponse(BaseModel):
    reply: str
    suggested_code: str = ""
    model: Optional[str] = None


class FixRequest(_CodeRequest):
    issues: List[IssueRef] = Field(default_factory=list, max_length=40)


class FixResponse(BaseModel):
    fixed_code: str
    changes: List[str]
    remaining: int = 0  # high/medium findings still detected in the fixed code
    model: Optional[str] = None


class ExplainRequest(_CodeRequest):
    level: Literal["beginner", "intermediate", "expert"] = "beginner"
    lang: Literal["english", "hindi", "hinglish"] = "english"


class ExplainResponse(BaseModel):
    overview: str
    steps: List[str]
    complexity: str = ""
    pitfalls: List[str] = Field(default_factory=list)
    model: Optional[str] = None


class TestsRequest(_CodeRequest):
    framework: str = Field(default="", max_length=40, description="e.g. pytest, jest, junit. Blank = best default.")


class TestsResponse(BaseModel):
    framework: str
    test_code: str
    cases: List[str]
    model: Optional[str] = None


# ── Learner mode ──────────────────────────────────────────────────────────
class SimplifyRequest(_CodeRequest):
    issue_title: str = Field(max_length=200)
    issue_explanation: str = Field(default="", max_length=1500)
    line: Optional[int] = None
    tongue: Literal["english", "hinglish"] = "english"


class SimplifyResponse(BaseModel):
    simple: str
    analogy: str = ""
    fixed_example: str = ""
    model: Optional[str] = None


class QuizRequest(BaseModel):
    language: Literal["python", "javascript", "java", "cpp", "go", "typescript"] = "python"
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    topic: str = Field(default="", max_length=60, description="e.g. loops, strings, SQL safety")
    tongue: Literal["english", "hinglish"] = "english"


class QuizResponse(BaseModel):
    code: str
    question: str
    bug_line: int
    options: List[int] = Field(description="Candidate line numbers shown as choices (includes bug_line).")
    explanation: str
    fix: str
    model: Optional[str] = None
