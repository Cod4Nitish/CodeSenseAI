"""
CodeSense AI — in-process latency metrics.
by Nitish Singh

A bounded ring buffer of recent request durations, summarised into p50/p95/p99
for the ``/api/health`` payload. The frontend renders this as the live
"AI Engine: Active · p99 < …s" status pill, so the number shown to reviewers is
measured, not decorative.

In a multi-replica deployment this would be exported to Prometheus instead; the
interface is deliberately tiny so that swap is mechanical.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class LatencySnapshot:
    sample_count: int
    p50_ms: float
    p95_ms: float
    p99_ms: float
    max_ms: float
    avg_ms: float


class LatencyTracker:
    """Thread-safe fixed-window latency recorder."""

    def __init__(self, window: int = 500) -> None:
        self._samples: deque[float] = deque(maxlen=window)
        self._lock = threading.Lock()

    def record(self, duration_ms: float) -> None:
        with self._lock:
            self._samples.append(duration_ms)

    def snapshot(self) -> LatencySnapshot:
        with self._lock:
            data = sorted(self._samples)

        if not data:
            return LatencySnapshot(0, 0.0, 0.0, 0.0, 0.0, 0.0)

        def pct(p: float) -> float:
            # Nearest-rank percentile.
            idx = min(len(data) - 1, int(round(p / 100.0 * (len(data) - 1))))
            return round(data[idx], 1)

        return LatencySnapshot(
            sample_count=len(data),
            p50_ms=pct(50),
            p95_ms=pct(95),
            p99_ms=pct(99),
            max_ms=round(data[-1], 1),
            avg_ms=round(sum(data) / len(data), 1),
        )


class _Timer:
    """Context manager: ``with tracker.time(): ...`` records the block duration."""

    __slots__ = ("_tracker", "_start")

    def __init__(self, tracker: LatencyTracker) -> None:
        self._tracker = tracker
        self._start = 0.0

    def __enter__(self) -> "_Timer":
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_exc: object) -> None:
        self._tracker.record((time.perf_counter() - self._start) * 1000.0)


def timer(tracker: LatencyTracker) -> _Timer:
    return _Timer(tracker)


# Process-wide singletons: one for all API traffic, one for AI calls specifically.
api_latency = LatencyTracker(window=500)
ai_latency = LatencyTracker(window=200)
