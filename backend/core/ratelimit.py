"""
CodeSense AI — lightweight in-process rate limiting.
by Nitish Singh

A fixed-window counter keyed by client IP + route bucket. This is intentionally
simple: it protects a single-process demo deployment and documents where a
distributed limiter (Redis ``INCR`` + TTL, or an API gateway policy) would slot
in for production. The FastAPI dependency shape (``Depends(RateLimiter(...))``)
does not change when the backend is swapped.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict

from fastapi import Request
from fastapi import status as http_status
from fastapi.exceptions import HTTPException

from core.config import settings


class _FixedWindowCounter:
    """``(key) -> (window_start_epoch, count)`` with coarse 60-second windows."""

    def __init__(self) -> None:
        self._buckets: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int, int]:
        """
        Register one request against ``key``.

        Returns ``(allowed, remaining, retry_after_seconds)``.
        """
        now = time.time()
        with self._lock:
            start, count = self._buckets[key]
            if now - start >= window_seconds:
                start, count = now, 0.0
            count += 1
            self._buckets[key] = [start, count]
            allowed = count <= limit
            remaining = max(0, int(limit - count))
            retry_after = 0 if allowed else int(window_seconds - (now - start)) + 1
            return allowed, remaining, retry_after

    def prune(self, window_seconds: int = 60) -> None:
        now = time.time()
        with self._lock:
            stale = [k for k, (start, _) in self._buckets.items() if now - start >= window_seconds * 2]
            for k in stale:
                del self._buckets[k]


_counter = _FixedWindowCounter()


def _client_ip(request: Request) -> str:
    # Honour a single proxy hop; fall back to the socket peer.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """
    FastAPI dependency factory.

    Usage::

        @router.post("/analyze", dependencies=[Depends(RateLimiter("analyze", 30))])
    """

    def __init__(self, bucket: str, per_minute: int) -> None:
        self.bucket = bucket
        self.per_minute = per_minute

    async def __call__(self, request: Request) -> None:
        if not settings.rate_limit_enabled:
            return

        key = f"{self.bucket}:{_client_ip(request)}"
        allowed, remaining, retry_after = _counter.hit(key, self.per_minute)

        # Surface budget on every response for good API citizenship.
        request.state.rate_limit_remaining = remaining

        if not allowed:
            raise HTTPException(
                status_code=http_status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded for '{self.bucket}'. "
                    f"Try again in {retry_after}s."
                ),
                headers={"Retry-After": str(retry_after)},
            )
        # Opportunistic housekeeping so the dict cannot grow unbounded.
        if remaining % 17 == 0:
            _counter.prune()


# Pre-built limiters wired from configuration.
analyze_rate_limit = RateLimiter("analyze", settings.rate_limit_analyze_per_minute)
auth_rate_limit = RateLimiter("auth", settings.rate_limit_auth_per_minute)
