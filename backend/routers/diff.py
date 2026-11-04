"""
CodeSense AI — /api/review-diff route (CodeRabbit-style PR review).
by Nitish Singh
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from core.ratelimit import analyze_rate_limit
from core.scoring import compute_score
from schemas.analyze import IssueCount
from schemas.diff import DiffReviewRequest, DiffReviewResponse
from services.diff_service import review_diff

logger = logging.getLogger("codesense.diff")
router = APIRouter()


@router.post(
    "/review-diff",
    response_model=DiffReviewResponse,
    tags=["review-diff"],
    dependencies=[Depends(analyze_rate_limit)],
)
async def review_diff_route(request: DiffReviewRequest) -> DiffReviewResponse:
    try:
        result = await review_diff(
            request.diff, request.title, request.description, request.profile
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        logger.exception("Unexpected error during diff review")
        raise HTTPException(status_code=500, detail="Internal server error during diff review.")

    count = IssueCount(**result["issue_count"])
    score = compute_score(count.high, count.medium, count.low)
    return DiffReviewResponse(
        **{**result, "issue_count": count, "quality_score": score.score, "grade": score.grade}
    )
