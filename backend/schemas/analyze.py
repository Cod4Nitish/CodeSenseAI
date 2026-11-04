"""
CodeSense AI — schemas for the ``/api/analyze`` endpoint.
by Nitish Singh
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

MAX_CODE_CHARS = 20_000

Language = Literal[
    "python", "javascript", "typescript", "java", "cpp", "go", "auto"
]
IssueType = Literal["bug", "security", "performance", "style"]
Severity = Literal["high", "medium", "low"]


class AnalyzeRequest(BaseModel):
    """Inbound payload: source code + (optional) language hint."""

    code: str = Field(..., description="Source code to review.")
    language: Language = "auto"
    # When true and the caller is authenticated, the result is written to their
    # audit history. Ignored for anonymous callers. Defaults on so a logged-in
    # reviewer's dashboard fills up naturally.
    persist: bool = True

    @field_validator("code")
    @classmethod
    def code_must_be_reasonable(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Code must not be empty.")
        if len(v) > MAX_CODE_CHARS:
            raise ValueError(
                f"Code exceeds the maximum allowed length of {MAX_CODE_CHARS:,} characters."
            )
        return v


class Issue(BaseModel):
    """One finding from the review."""

    line: Optional[int] = None
    type: IssueType
    severity: Severity
    title: str
    explanation: str
    suggested_fix: str
    # Who found it: the AI model, the deterministic rule engine, or both agreeing.
    source: Literal["ai", "rules", "both"] = "ai"
    rule_id: Optional[str] = None

    @field_validator("line")
    @classmethod
    def line_must_be_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        return v if v >= 1 else None


class IssueCount(BaseModel):
    high: int = 0
    medium: int = 0
    low: int = 0

    @property
    def total(self) -> int:
        return self.high + self.medium + self.low


class AnalyzeResponse(BaseModel):
    """Structured review returned to the client."""

    summary: str
    issues: List[Issue]
    issue_count: IssueCount
    quality_score: float = Field(..., description="Deterministic 0–10 score.")
    grade: str = Field(..., description="Letter grade A+ … F.")
    model: Optional[str] = Field(
        default=None, description="Gemini model that served the request."
    )
    review_id: Optional[int] = Field(
        default=None,
        description="Set when the result was persisted to the caller's history.",
    )
    engine: Literal["ai+rules", "rules-only"] = Field(
        default="ai+rules",
        description="'rules-only' when the AI engine was unavailable and only deterministic rules ran.",
    )


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
