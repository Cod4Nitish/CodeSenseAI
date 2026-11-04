"""
CodeSense AI — audit-history + analytics schemas.
by Nitish Singh
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from schemas.analyze import Issue, IssueCount


class ReviewListItem(BaseModel):
    """Row shape for the dashboard audit table."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    language: str
    quality_score: float
    grade: str
    high_count: int
    medium_count: int
    low_count: int
    security_high_count: int
    total_issues: int
    summary: str
    code_preview: str = Field(..., description="First ~160 chars of the submission.")


class ReviewDetail(BaseModel):
    """Full record for "View Report" rehydration."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    language: str
    code_snippet: str
    quality_score: float
    grade: str
    summary: str
    model: str | None
    issue_count: IssueCount
    issues: list[Issue]


class ScoreBucket(BaseModel):
    """One bar in the score-distribution chart."""

    label: str          # e.g. "8–10"
    grade_band: str     # e.g. "A"
    count: int
    tone: str           # "ok" | "warn" | "error"


class LanguageStat(BaseModel):
    language: str
    count: int
    avg_score: float


class DailyPoint(BaseModel):
    date: str            # YYYY-MM-DD
    count: int
    avg_score: float


class ReviewStats(BaseModel):
    """Everything the dashboard KPI cards + charts need, in one call."""

    total_reviews: int
    average_quality_score: float
    critical_vulnerabilities_prevented: int
    clean_pass_rate: float = Field(..., description="Share of reviews with zero issues, 0–1.")
    total_issues_found: int
    best_score: float
    score_distribution: list[ScoreBucket]
    by_language: list[LanguageStat]
    activity: list[DailyPoint] = Field(..., description="Last 14 days, oldest first.")
    last_review_at: datetime | None
