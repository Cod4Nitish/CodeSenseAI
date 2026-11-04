"""
CodeSense AI — review-history persistence + analytics service.
by Nitish Singh
"""

from __future__ import annotations

import json
import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.scoring import compute_score
from models.review import ReviewRecord
from schemas.analyze import Issue
from schemas.review import (
    DailyPoint,
    LanguageStat,
    ReviewStats,
    ScoreBucket,
)

logger = logging.getLogger("codesense.reviews")

_PREVIEW_CHARS = 160

# Score-distribution buckets, aligned with the letter-grade bands.
_BUCKETS: list[tuple[str, str, float, float, str]] = [
    ("9.5-10", "A+", 9.5, 10.01, "ok"),
    ("8.5-9.5", "A", 8.5, 9.5, "ok"),
    ("7-8.5", "B", 7.0, 8.5, "warn"),
    ("5.5-7", "C", 5.5, 7.0, "warn"),
    ("3.5-5.5", "D", 3.5, 5.5, "error"),
    ("0-3.5", "F", -0.01, 3.5, "error"),
]


def _preview(code: str) -> str:
    flat = " ".join(code.split())
    return flat[:_PREVIEW_CHARS] + ("…" if len(flat) > _PREVIEW_CHARS else "")


async def record_review(
    db: AsyncSession,
    *,
    user_id: int,
    code: str,
    language: str,
    summary: str,
    issues: list[Issue],
    model: str | None,
) -> ReviewRecord:
    """Persist one analysis as an audit-log row and return it."""
    high = sum(1 for i in issues if i.severity == "high")
    medium = sum(1 for i in issues if i.severity == "medium")
    low = sum(1 for i in issues if i.severity == "low")
    security_high = sum(
        1 for i in issues if i.severity == "high" and i.type == "security"
    )
    score = compute_score(high, medium, low)

    record = ReviewRecord(
        user_id=user_id,
        language=language,
        code_snippet=code,
        quality_score=score.score,
        grade=score.grade,
        high_count=high,
        medium_count=medium,
        low_count=low,
        security_high_count=security_high,
        summary=summary,
        issues_json=json.dumps([i.model_dump() for i in issues]),
        model=model,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    logger.info(
        "Stored review id=%s user=%s score=%.1f grade=%s issues=%d",
        record.id, user_id, score.score, score.grade, high + medium + low,
    )
    return record


async def list_for_user(
    db: AsyncSession, *, user_id: int, limit: int = 50, offset: int = 0
) -> list[ReviewRecord]:
    result = await db.execute(
        select(ReviewRecord)
        .where(ReviewRecord.user_id == user_id)
        .order_by(desc(ReviewRecord.created_at), desc(ReviewRecord.id))
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def get_owned(
    db: AsyncSession, *, review_id: int, user_id: int
) -> ReviewRecord | None:
    result = await db.execute(
        select(ReviewRecord).where(
            ReviewRecord.id == review_id, ReviewRecord.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def delete_owned(db: AsyncSession, *, review_id: int, user_id: int) -> bool:
    record = await get_owned(db, review_id=review_id, user_id=user_id)
    if record is None:
        return False
    await db.delete(record)
    await db.commit()
    return True


def to_list_item(record: ReviewRecord) -> dict:
    """Shape a record for :class:`schemas.review.ReviewListItem`."""
    return {
        "id": record.id,
        "created_at": record.created_at,
        "language": record.language,
        "quality_score": record.quality_score,
        "grade": record.grade,
        "high_count": record.high_count,
        "medium_count": record.medium_count,
        "low_count": record.low_count,
        "security_high_count": record.security_high_count,
        "total_issues": record.total_issues,
        "summary": record.summary,
        "code_preview": _preview(record.code_snippet),
    }


def to_detail(record: ReviewRecord) -> dict:
    """Shape a record for :class:`schemas.review.ReviewDetail` (full rehydration)."""
    try:
        raw_issues = json.loads(record.issues_json)
    except (json.JSONDecodeError, TypeError):
        raw_issues = []
    return {
        "id": record.id,
        "created_at": record.created_at,
        "language": record.language,
        "code_snippet": record.code_snippet,
        "quality_score": record.quality_score,
        "grade": record.grade,
        "summary": record.summary,
        "model": record.model,
        "issue_count": {
            "high": record.high_count,
            "medium": record.medium_count,
            "low": record.low_count,
        },
        "issues": raw_issues,
    }


async def compute_stats(db: AsyncSession, *, user_id: int) -> ReviewStats:
    """Aggregate the caller's history into the dashboard KPI + chart payload."""
    result = await db.execute(
        select(ReviewRecord)
        .where(ReviewRecord.user_id == user_id)
        .order_by(ReviewRecord.created_at)
    )
    records = list(result.scalars().all())

    if not records:
        return ReviewStats(
            total_reviews=0,
            average_quality_score=0.0,
            critical_vulnerabilities_prevented=0,
            clean_pass_rate=0.0,
            total_issues_found=0,
            best_score=0.0,
            score_distribution=[
                ScoreBucket(label=lbl, grade_band=band, count=0, tone=tone)
                for (lbl, band, _lo, _hi, tone) in _BUCKETS
            ],
            by_language=[],
            activity=_empty_activity(),
            last_review_at=None,
        )

    total = len(records)
    avg_score = round(sum(r.quality_score for r in records) / total, 2)
    best = round(max(r.quality_score for r in records), 1)
    crit_prevented = sum(r.security_high_count for r in records)
    total_issues = sum(r.total_issues for r in records)
    clean = sum(1 for r in records if r.total_issues == 0)
    clean_rate = round(clean / total, 4)

    # Score distribution
    dist: list[ScoreBucket] = []
    for label, band, lo, hi, tone in _BUCKETS:
        count = sum(1 for r in records if lo <= r.quality_score < hi)
        dist.append(ScoreBucket(label=label, grade_band=band, count=count, tone=tone))

    # Per-language
    lang_scores: dict[str, list[float]] = defaultdict(list)
    for r in records:
        lang_scores[r.language].append(r.quality_score)
    by_language = sorted(
        (
            LanguageStat(
                language=lang,
                count=len(scores),
                avg_score=round(sum(scores) / len(scores), 2),
            )
            for lang, scores in lang_scores.items()
        ),
        key=lambda s: s.count,
        reverse=True,
    )

    # 14-day activity sparkline
    activity = _activity_from(records)

    return ReviewStats(
        total_reviews=total,
        average_quality_score=avg_score,
        critical_vulnerabilities_prevented=crit_prevented,
        clean_pass_rate=clean_rate,
        total_issues_found=total_issues,
        best_score=best,
        score_distribution=dist,
        by_language=by_language,
        activity=activity,
        last_review_at=records[-1].created_at,
    )


def _day_keys(n: int = 14) -> list[str]:
    today = datetime.now(timezone.utc).date()
    return [(today - timedelta(days=i)).isoformat() for i in range(n - 1, -1, -1)]


def _empty_activity(n: int = 14) -> list[DailyPoint]:
    return [DailyPoint(date=d, count=0, avg_score=0.0) for d in _day_keys(n)]


def _activity_from(records: list[ReviewRecord], n: int = 14) -> list[DailyPoint]:
    keys = _day_keys(n)
    key_set = set(keys)
    counts: Counter[str] = Counter()
    sums: dict[str, float] = defaultdict(float)
    for r in records:
        d = r.created_at
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        day = d.date().isoformat()
        if day in key_set:
            counts[day] += 1
            sums[day] += r.quality_score
    return [
        DailyPoint(
            date=d,
            count=counts.get(d, 0),
            avg_score=round(sums[d] / counts[d], 2) if counts.get(d) else 0.0,
        )
        for d in keys
    ]
