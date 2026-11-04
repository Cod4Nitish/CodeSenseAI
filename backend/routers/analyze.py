"""
CodeSense AI — /api/analyze route.
by Nitish Singh

Accepts source code, runs it through Gemini, returns a structured review with a
deterministic quality score. Authentication is *optional*: an anonymous caller
gets the full analysis; an authenticated caller additionally gets the result
written to their audit history (unless they opt out with ``persist: false``).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from core.metrics import ai_latency, timer
from core.ratelimit import analyze_rate_limit
from core.scoring import compute_score
from deps import DbSession, OptionalUser
from schemas.analyze import AnalyzeRequest, AnalyzeResponse, Issue, IssueCount
from services import review_service
from services.gemini_service import analyze_code
from services.static_analyzer import analyze_rules, merge

logger = logging.getLogger("codesense.analyze")
router = APIRouter()

_SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
_TYPE_ORDER = {"security": 0, "bug": 1, "performance": 2, "style": 3}


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    tags=["analyze"],
    dependencies=[Depends(analyze_rate_limit)],
)
async def analyze(
    request: AnalyzeRequest,
    db: DbSession,
    current_user: OptionalUser,
) -> AnalyzeResponse:
    """Review ``request.code`` and (for signed-in users) persist the outcome."""
    rule_findings = analyze_rules(request.code, request.language)
    engine = "ai+rules"
    try:
        with timer(ai_latency):
            result = await analyze_code(request.code, request.language)
    except Exception as e:  # noqa: BLE001
        if not rule_findings:
            if isinstance(e, ValueError):
                logger.error("Analysis failed: %s", e)
                raise HTTPException(status_code=502, detail=str(e))
            logger.exception("Unexpected error during analysis")
            raise HTTPException(
                status_code=500, detail="Internal server error during analysis."
            )
        # Graceful degradation: the AI is down but the rule engine found real problems.
        logger.warning("AI unavailable (%s) — returning rule-based findings only", e)
        engine = "rules-only"
        result = {
            "issues": [],
            "summary": "AI engine unavailable — showing deterministic rule-based findings only.",
            "model": None,
        }

    try:
        merged = merge(result.get("issues", []), rule_findings)
        issues = [Issue(**i) for i in merged]
        issues.sort(
            key=lambda i: (
                _SEVERITY_ORDER.get(i.severity, 9),
                _TYPE_ORDER.get(i.type, 9),
                i.line if i.line is not None else 10**9,
            )
        )

        issue_count = IssueCount(
            high=sum(1 for i in issues if i.severity == "high"),
            medium=sum(1 for i in issues if i.severity == "medium"),
            low=sum(1 for i in issues if i.severity == "low"),
        )
        score = compute_score(issue_count.high, issue_count.medium, issue_count.low)
        summary = result.get("summary", "") or "Analysis complete."
        model = result.get("model")
    except Exception as e:
        logger.error("Response assembly failed: %s | raw=%s", e, result)
        raise HTTPException(
            status_code=502,
            detail=f"Gemini response did not match the expected schema: {e}",
        )

    review_id: int | None = None
    if current_user is not None and request.persist:
        try:
            record = await review_service.record_review(
                db,
                user_id=current_user.id,
                code=request.code,
                language=request.language,
                summary=summary,
                issues=issues,
                model=model,
            )
            review_id = record.id
        except Exception:
            # History is a convenience, never a hard dependency of the review.
            logger.exception("Failed to persist review for user id=%s", current_user.id)

    return AnalyzeResponse(
        summary=summary,
        issues=issues,
        issue_count=issue_count,
        quality_score=score.score,
        grade=score.grade,
        model=model,
        review_id=review_id,
        engine=engine,
    )
