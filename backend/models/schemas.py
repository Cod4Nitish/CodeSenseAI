"""
CodeSense AI — Pydantic request/response models.
by Nitish Singh
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional

MAX_CODE_CHARS = 20_000

Language = Literal[
    "python", "javascript", "typescript", "java", "cpp", "go", "auto"
]
IssueType = Literal["bug", "security", "performance", "style"]
Severity = Literal["high", "medium", "low"]


class AnalyzeRequest(BaseModel):
    code: str = Field(..., description="Source code to review.")
    language: Language = "auto"

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
    line: Optional[int] = None
    type: IssueType
    severity: Severity
    title: str
    explanation: str
    suggested_fix: str

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
    summary: str
    issues: List[Issue]
    issue_count: IssueCount
    model: Optional[str] = Field(
        default=None, description="Gemini model that served the request."
    )


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
