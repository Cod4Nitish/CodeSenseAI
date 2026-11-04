"""
CodeSense AI — deterministic quality-score engine (backend authority).
by Nitish Singh

This mirrors ``frontend/src/lib/score.js`` exactly. The backend computes and
persists the score so that dashboard analytics are derived from one trusted
formula rather than whatever the client happened to render.

    score = 10 − (high × 2.5) − (medium × 0.8) − (low × 0.2)   clamped to [0, 10]
    grade = A+ / A / B / C / D / F   by fixed thresholds
"""

from __future__ import annotations

from dataclasses import dataclass

# (min_score, grade, tone, label) — first row whose threshold is met wins.
_GRADE_TABLE: list[tuple[float, str, str, str]] = [
    (9.5, "A+", "ok", "Production ready"),
    (8.5, "A", "ok", "Ship with minor cleanup"),
    (7.0, "B", "warn", "Solid — needs polish"),
    (5.5, "C", "warn", "Needs attention"),
    (3.5, "D", "error", "High risk"),
    (float("-inf"), "F", "error", "Critical — do not ship"),
]

_WEIGHTS = {"high": 2.5, "medium": 0.8, "low": 0.2}


@dataclass(frozen=True, slots=True)
class QualityScore:
    """Result of :func:`compute_score`."""

    score: float          # 0.0 – 10.0, one decimal
    grade: str            # "A+" … "F"
    tone: str             # "ok" | "warn" | "error"
    label: str            # human-readable verdict
    high: int
    medium: int
    low: int

    @property
    def total(self) -> int:
        return self.high + self.medium + self.low

    def as_dict(self) -> dict[str, object]:
        return {
            "score": self.score,
            "grade": self.grade,
            "tone": self.tone,
            "label": self.label,
            "counts": {"high": self.high, "medium": self.medium, "low": self.low},
            "total": self.total,
        }


def compute_score(high: int = 0, medium: int = 0, low: int = 0) -> QualityScore:
    """Compute the deterministic quality score from severity counts."""
    high, medium, low = max(0, high), max(0, medium), max(0, low)
    raw = 10.0 - high * _WEIGHTS["high"] - medium * _WEIGHTS["medium"] - low * _WEIGHTS["low"]
    clamped = min(10.0, max(0.0, raw))
    score = round(clamped, 1)

    for threshold, grade, tone, label in _GRADE_TABLE:
        if score >= threshold:
            return QualityScore(score, grade, tone, label, high, medium, low)

    # Unreachable (last row is -inf) but keeps the type-checker happy.
    return QualityScore(score, "F", "error", "Critical — do not ship", high, medium, low)
