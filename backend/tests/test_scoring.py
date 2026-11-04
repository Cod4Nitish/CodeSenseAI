"""Unit tests for the deterministic quality-score engine. by Nitish Singh"""

from __future__ import annotations

import pytest

from core.scoring import compute_score


def test_clean_code_is_perfect():
    s = compute_score(0, 0, 0)
    assert s.score == 10.0
    assert s.grade == "A+"
    assert s.tone == "ok"


@pytest.mark.parametrize(
    ("high", "medium", "low", "expected"),
    [
        (1, 0, 0, 7.5),
        (0, 1, 0, 9.2),
        (0, 0, 1, 9.8),
        (2, 1, 3, 10 - 5 - 0.8 - 0.6),
    ],
)
def test_formula_matches_frontend(high, medium, low, expected):
    assert compute_score(high, medium, low).score == round(expected, 1)


def test_score_is_clamped_to_zero():
    s = compute_score(10, 10, 10)
    assert s.score == 0.0
    assert s.grade == "F"


def test_negative_counts_are_floored():
    assert compute_score(-3, -1, -1).score == 10.0


def test_grade_bands():
    assert compute_score(0, 1, 0).grade == "A"   # 9.2
    assert compute_score(1, 0, 0).grade == "B"   # 7.5
    assert compute_score(0, 2, 0).grade == "B"   # 8.4  (just below the 8.5 A cut)
    assert compute_score(2, 0, 0).grade == "D"   # 5.0


def test_as_dict_shape():
    d = compute_score(1, 2, 3).as_dict()
    assert set(d) == {"score", "grade", "tone", "label", "counts", "total"}
    assert d["counts"] == {"high": 1, "medium": 2, "low": 3}
    assert d["total"] == 6
