"""
CodeSense AI — audit history + analytics routes (all require authentication).
by Nitish Singh

    GET    /api/reviews          → paginated audit history for the current user
    GET    /api/reviews/stats    → KPI + chart aggregates for the dashboard
    GET    /api/reviews/{id}     → full record (rehydrates editor + diagnostics)
    DELETE /api/reviews/{id}     → remove one record
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response, status

from deps import CurrentUser, DbSession
from schemas.review import ReviewDetail, ReviewListItem, ReviewStats
from services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewListItem], summary="List my review history")
async def list_reviews(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[ReviewListItem]:
    records = await review_service.list_for_user(
        db, user_id=current_user.id, limit=limit, offset=offset
    )
    return [ReviewListItem(**review_service.to_list_item(r)) for r in records]


@router.get("/stats", response_model=ReviewStats, summary="Dashboard KPIs + charts")
async def review_stats(current_user: CurrentUser, db: DbSession) -> ReviewStats:
    return await review_service.compute_stats(db, user_id=current_user.id)


@router.get("/{review_id}", response_model=ReviewDetail, summary="Full record by id")
async def get_review(review_id: int, current_user: CurrentUser, db: DbSession) -> ReviewDetail:
    record = await review_service.get_owned(
        db, review_id=review_id, user_id=current_user.id
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
    return ReviewDetail(**review_service.to_detail(record))


@router.delete(
    "/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete one record from my history",
)
async def delete_review(review_id: int, current_user: CurrentUser, db: DbSession) -> Response:
    deleted = await review_service.delete_owned(
        db, review_id=review_id, user_id=current_user.id
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
