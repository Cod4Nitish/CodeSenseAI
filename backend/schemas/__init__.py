"""
CodeSense AI — Pydantic request / response schemas.
by Nitish Singh

Kept deliberately separate from ``models/`` (SQLAlchemy ORM). ORM objects are the
persistence shape; these are the wire shape. Nothing here touches the database.
"""

from schemas.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    Issue,
    IssueCount,
    Language,
)
from schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserOut,
)
from schemas.review import (
    ReviewDetail,
    ReviewListItem,
    ReviewStats,
    ScoreBucket,
)

__all__ = [
    "AnalyzeRequest",
    "AnalyzeResponse",
    "Issue",
    "IssueCount",
    "Language",
    "AuthResponse",
    "LoginRequest",
    "RegisterRequest",
    "UserOut",
    "ReviewDetail",
    "ReviewListItem",
    "ReviewStats",
    "ScoreBucket",
]
