"""
CodeSense AI — schemas for ``/api/review-diff`` (pull-request style review).
by Nitish Singh
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from schemas.analyze import IssueCount, IssueType, Severity

MAX_DIFF_CHARS = 120_000
Profile = Literal["chill", "assertive"]
Risk = Literal["low", "medium", "high"]


class DiffReviewRequest(BaseModel):
    diff: str = Field(..., description="Unified diff (output of `git diff`).")
    title: str = Field(default="", max_length=200, description="PR title (optional).")
    description: str = Field(default="", max_length=4000, description="PR description (optional).")
    profile: Profile = "chill"

    @field_validator("diff")
    @classmethod
    def diff_ok(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Diff must not be empty.")
        if len(v) > MAX_DIFF_CHARS:
            raise ValueError(f"Diff exceeds {MAX_DIFF_CHARS:,} characters.")
        if "@@" not in v:
            raise ValueError("This does not look like a unified diff (no @@ hunks found).")
        return v


class FileSummary(BaseModel):
    path: str
    additions: int
    deletions: int
    status: Literal["added", "modified", "deleted"]
    change: str = ""


class DiffComment(BaseModel):
    path: str
    line: int
    type: IssueType
    severity: Severity
    title: str
    explanation: str
    suggestion: str = Field(default="", description="Committable replacement code for the line.")


class DiffReviewResponse(BaseModel):
    summary: str
    walkthrough: str
    risk: Risk
    files: List[FileSummary]
    comments: List[DiffComment]
    issue_count: IssueCount
    quality_score: float
    grade: str
    sequence: List[str] = Field(default_factory=list, description="Suggested review order (paths).")
    model: Optional[str] = None
