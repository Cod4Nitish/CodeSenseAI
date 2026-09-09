"""
CodeSense AI — /api/analyze route.
by Nitish Singh
"""

import logging
from fastapi import APIRouter, HTTPException

from models.schemas import AnalyzeRequest, AnalyzeResponse, Issue, IssueCount
from services.gemini_service import analyze_code

logger = logging.getLogger(__name__)
router = APIRouter()

_SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
_TYPE_ORDER = {"security": 0, "bug": 1, "performance": 2, "style": 3}


@router.post("/analyze", response_model=AnalyzeResponse, tags=["analyze"])
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Accept source code + language, run it through Gemini, and return a
    structured review. Issues are ordered by severity, then by type.
    """
    try:
        result = await analyze_code(request.code, request.language)
    except ValueError as e:
        logger.error("Analysis failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        logger.exception("Unexpected error during analysis")
        raise HTTPException(
            status_code=500, detail="Internal server error during analysis."
        )

    try:
        issues = [Issue(**i) for i in result.get("issues", [])]
        issues.sort(
            key=lambda i: (
                _SEVERITY_ORDER.get(i.severity, 9),
                _TYPE_ORDER.get(i.type, 9),
                i.line if i.line is not None else 10**9,
            )
        )

        counts = result.get("issue_count", {})
        issue_count = IssueCount(
            high=int(counts.get("high", 0)),
            medium=int(counts.get("medium", 0)),
            low=int(counts.get("low", 0)),
        )

        return AnalyzeResponse(
            summary=result.get("summary", "") or "Analysis complete.",
            issues=issues,
            issue_count=issue_count,
            model=result.get("model"),
        )
    except Exception as e:
        logger.error("Response assembly failed: %s | raw=%s", e, result)
        raise HTTPException(
            status_code=502,
            detail=f"Gemini response did not match the expected schema: {e}",
        )
