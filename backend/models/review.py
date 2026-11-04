"""
CodeSense AI — ``ReviewRecord`` ORM model (the audit-log row).
by Nitish Singh

One row per persisted analysis. ``issues_json`` holds the full serialised issue
list so the dashboard's "View Report" action can rehydrate the Monaco editor and
diagnostics panel byte-for-byte, not just show a summary.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, timestamp_column

if TYPE_CHECKING:
    from models.user import User


class ReviewRecord(Base):
    """A single code-review run, owned by a :class:`User`."""

    __tablename__ = "review_records"
    __table_args__ = (
        Index("ix_review_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    created_at: Mapped[datetime] = timestamp_column()
    language: Mapped[str] = mapped_column(String(32), default="auto", nullable=False)

    # Full submitted source, capped upstream at MAX_CODE_CHARS.
    code_snippet: Mapped[str] = mapped_column(Text, nullable=False)

    quality_score: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(2), nullable=False)

    high_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    medium_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Number of high-severity *security* findings — surfaced on the dashboard as
    # "Critical vulnerabilities prevented".
    security_high_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    issues_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)

    user: Mapped["User"] = relationship(back_populates="reviews")

    @property
    def total_issues(self) -> int:
        return self.high_count + self.medium_count + self.low_count

    def __repr__(self) -> str:  # pragma: no cover - debug aid
        return (
            f"<ReviewRecord id={self.id} user_id={self.user_id} "
            f"score={self.quality_score} grade={self.grade!r}>"
        )
