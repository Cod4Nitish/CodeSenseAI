"""
CodeSense AI — /api/ai/* routes (chat, auto-fix, explain, generate tests).
by Nitish Singh

Every route uses the same Gemini key via ``services.ai_tools`` and shares the
analyze rate-limit bucket so one visitor cannot drain the free quota.
"""

from __future__ import annotations

import logging
from typing import Awaitable

from fastapi import APIRouter, Depends, HTTPException

from core.ratelimit import analyze_rate_limit
from schemas.ai import (
    ChatRequest,
    ChatResponse,
    ExplainRequest,
    ExplainResponse,
    FixRequest,
    FixResponse,
    QuizRequest,
    QuizResponse,
    SimplifyRequest,
    SimplifyResponse,
    TestsRequest,
    TestsResponse,
)
from services import ai_tools

logger = logging.getLogger("codesense.ai")
router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(analyze_rate_limit)])


async def _run(coro: Awaitable[dict], what: str) -> dict:
    try:
        return await coro
    except ValueError as e:
        logger.error("%s failed: %s", what, e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        logger.exception("Unexpected error in %s", what)
        raise HTTPException(status_code=500, detail=f"Internal server error during {what}.")


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    return ChatResponse(
        **await _run(ai_tools.chat(req.code, req.language, req.message, req.history, req.issues), "chat")
    )


@router.post("/fix", response_model=FixResponse)
async def fix(req: FixRequest) -> FixResponse:
    return FixResponse(**await _run(ai_tools.fix_file(req.code, req.language, req.issues), "auto-fix"))


@router.post("/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest) -> ExplainResponse:
    return ExplainResponse(**await _run(ai_tools.explain(req.code, req.language, req.level, req.lang), "explain"))


@router.post("/tests", response_model=TestsResponse)
async def tests(req: TestsRequest) -> TestsResponse:
    return TestsResponse(**await _run(ai_tools.generate_tests(req.code, req.language, req.framework), "test generation"))


@router.post("/simplify", response_model=SimplifyResponse)
async def simplify(req: SimplifyRequest) -> SimplifyResponse:
    return SimplifyResponse(
        **await _run(
            ai_tools.simplify(req.code, req.language, req.issue_title, req.issue_explanation, req.line, req.tongue),
            "simplify",
        )
    )


@router.post("/quiz", response_model=QuizResponse)
async def quiz(req: QuizRequest) -> QuizResponse:
    return QuizResponse(**await _run(ai_tools.make_quiz(req.language, req.difficulty, req.topic, req.tongue), "quiz"))
