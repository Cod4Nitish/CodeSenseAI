"""
CodeSense AI - evaluation harness for the deterministic rule engine.
by Nitish Kumar Singh

Usage (from backend/):
    .venv/Scripts/python.exe eval/run_eval.py              # rules only, offline
    .venv/Scripts/python.exe eval/run_eval.py --ai         # + small sample through /api/analyze
    .venv/Scripts/python.exe eval/run_eval.py --json out.json

Method
------
Each snippet in dataset.json carries a label (vulnerable / clean) and the list of
expected finding categories. Every rule finding is mapped to a category
(CATEGORY_OF). Per category:
  TP = a vulnerable snippet expecting C where the engine reported C
  FN = a vulnerable snippet expecting C where the engine did not report C
  FP = the engine reported C on a snippet that does not expect C (clean snippet
       or a snippet of another category) - counted once per (snippet, category)
Overall numbers are micro-averaged over categories. The "clean-set false
positives" line counts clean snippets that received at least one finding.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent))
os.environ.setdefault("GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))

from services.static_analyzer import analyze_rules  # noqa: E402

CATEGORY_OF = {
    "secret-assign": "hardcoded-secret", "aws-key": "hardcoded-secret", "private-key": "hardcoded-secret",
    "sqli-py": "sql-injection", "sqli-js": "sql-injection", "sqli-java": "sql-injection", "sqli-go": "sql-injection",
    "eval": "eval",
    "os-system": "command-injection", "cmd-js": "command-injection", "cmd-java": "command-injection",
    "pickle": "insecure-deserialization", "yaml-load": "insecure-deserialization",
    "java-deserial": "insecure-deserialization",
    "weak-hash": "weak-hash", "tls-off": "tls-verify-off", "debug-on": "debug-mode",
    "innerhtml": "xss", "react-html": "xss",
    "bare-except": "bare-except", "except-pass": "swallowed-exception", "empty-catch": "swallowed-exception",
    "loose-eq": "loose-equality", "none-eq": "none-compare",
    "syntax-error": "syntax-error", "mutable-default": "mutable-default", "div-zero": "div-zero",
    "weak-random": "weak-random", "c-gets": "buffer-overflow", "c-unsafe-copy": "buffer-overflow",
    "go-ignored-error": "ignored-error",
}


def predicted_categories(code: str, language: str) -> set[str]:
    return {CATEGORY_OF.get(f["rule_id"], f["rule_id"]) for f in analyze_rules(code, language)}


def prf(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    f = 2 * p * r / (p + r) if p + r else 0.0
    return p, r, f


def evaluate(dataset: list[dict]) -> dict:
    tp: dict = defaultdict(int)
    fp: dict = defaultdict(int)
    fn: dict = defaultdict(int)
    missed, spurious = [], []
    clean_total = clean_flagged = 0
    for s in dataset:
        pred = predicted_categories(s["code"], s["language"])
        exp = set(s["expected"])
        if s["label"] == "clean":
            clean_total += 1
            if pred:
                clean_flagged += 1
        for c in exp:
            if c in pred:
                tp[c] += 1
            else:
                fn[c] += 1
                missed.append((s["id"], c))
        for c in pred - exp:
            fp[c] += 1
            spurious.append((s["id"], c))
    cats = sorted(set(tp) | set(fp) | set(fn))
    rows = []
    for c in cats:
        p, r, f = prf(tp[c], fp[c], fn[c])
        rows.append({"category": c, "tp": tp[c], "fp": fp[c], "fn": fn[c], "precision": p, "recall": r, "f1": f})
    T, F, N = sum(tp.values()), sum(fp.values()), sum(fn.values())
    p, r, f = prf(T, F, N)
    return {
        "rows": rows, "overall": {"tp": T, "fp": F, "fn": N, "precision": p, "recall": r, "f1": f},
        "clean_total": clean_total, "clean_flagged": clean_flagged,
        "vulnerable_total": sum(1 for s in dataset if s["label"] == "vulnerable"),
        "missed": missed, "spurious": spurious,
    }


def print_table(res: dict) -> None:
    print("| Category | TP | FP | FN | Precision | Recall | F1 |")
    print("|---|---:|---:|---:|---:|---:|---:|")
    for r in res["rows"]:
        print(f"| {r['category']} | {r['tp']} | {r['fp']} | {r['fn']} | {r['precision']:.2f} | {r['recall']:.2f} | {r['f1']:.2f} |")
    o = res["overall"]
    print(f"| **overall (micro)** | {o['tp']} | {o['fp']} | {o['fn']} | {o['precision']:.2f} | {o['recall']:.2f} | {o['f1']:.2f} |")
    print()
    print(f"Clean-set false positives: {res['clean_flagged']} of {res['clean_total']} clean snippets received a finding.")
    if res["missed"]:
        print("Missed (false negatives): " + ", ".join(f"{i}:{c}" for i, c in res["missed"]))
    if res["spurious"]:
        print("Spurious (false positives): " + ", ".join(f"{i}:{c}" for i, c in res["spurious"]))


# --------------------------------------------------------------------------
# Optional: small sample through the real /api/analyze path (calls Gemini)
# --------------------------------------------------------------------------
def pick_sample(dataset: list[dict], n: int) -> list[dict]:
    """Deterministic, balanced sample: alternate vulnerable / clean, spread over languages."""
    vul = [s for s in dataset if s["label"] == "vulnerable"]
    cln = [s for s in dataset if s["label"] == "clean"]
    step_v, step_c = max(1, len(vul) // (n // 2)), max(1, len(cln) // (n - n // 2))
    return vul[::step_v][: n // 2] + cln[::step_c][: n - n // 2]


async def run_ai(sample: list[dict]) -> list[dict]:
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./_eval_tmp.db")
    os.environ["RATE_LIMIT_ENABLED"] = "false"
    from dotenv import load_dotenv
    load_dotenv(HERE.parent / ".env")
    from httpx import ASGITransport, AsyncClient
    from main import app

    out = []
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://eval") as c:
        for s in sample:
            r = await c.post("/api/analyze", json={"code": s["code"], "language": s["language"], "persist": False})
            if r.status_code != 200:
                out.append({"id": s["id"], "label": s["label"], "error": r.status_code})
            else:
                b = r.json()
                sig = [i for i in b["issues"] if i["severity"] in ("high", "medium")]
                out.append({"id": s["id"], "label": s["label"], "engine": b["engine"],
                            "flagged": bool(sig), "n_issues": len(b["issues"]), "score": b["quality_score"],
                            "rules_flagged": bool(predicted_categories(s["code"], s["language"]))})
            await asyncio.sleep(2.0)
    return out


def print_ai(rows: list[dict]) -> None:
    print("\n### AI+rules sample (real /api/analyze path) - SMALL SAMPLE, NOT STATISTICALLY MEANINGFUL\n")
    print("| Snippet | Label | Engine | AI+rules flagged (high/medium) | Rules-only flagged | Issues | Score |")
    print("|---|---|---|---|---|---:|---:|")
    ok = [r for r in rows if "error" not in r]
    for r in rows:
        if "error" in r:
            print(f"| {r['id']} | {r['label']} | HTTP {r['error']} | - | - | - | - |")
        else:
            print(f"| {r['id']} | {r['label']} | {r['engine']} | {r['flagged']} | {r['rules_flagged']} | {r['n_issues']} | {r['score']} |")
    v = [r for r in ok if r["label"] == "vulnerable"]
    c = [r for r in ok if r["label"] == "clean"]
    print(f"\nVulnerable flagged: AI+rules {sum(r['flagged'] for r in v)}/{len(v)}, rules-only {sum(r['rules_flagged'] for r in v)}/{len(v)}")
    print(f"Clean flagged (false alarms): AI+rules {sum(r['flagged'] for r in c)}/{len(c)}, rules-only {sum(r['rules_flagged'] for r in c)}/{len(c)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ai", action="store_true", help="also run a small sample through the real AI path (uses Gemini quota)")
    ap.add_argument("--ai-n", type=int, default=8, help="sample size for --ai (max 10)")
    ap.add_argument("--json", help="write raw results to this file")
    a = ap.parse_args()

    dataset = json.loads((HERE / "dataset.json").read_text(encoding="utf-8"))
    langs = defaultdict(int)
    for s in dataset:
        langs[s["language"]] += 1
    print(f"Dataset: {len(dataset)} snippets ({sum(s['label']=='vulnerable' for s in dataset)} vulnerable, "
          f"{sum(s['label']=='clean' for s in dataset)} clean); languages: {dict(langs)}\n")
    print("### Deterministic rule engine (offline)\n")
    res = evaluate(dataset)
    print_table(res)
    if a.json:
        Path(a.json).write_text(json.dumps(res, indent=1), encoding="utf-8")
    if a.ai:
        n = min(max(2, a.ai_n), 10)
        print_ai(asyncio.run(run_ai(pick_sample(dataset, n))))


if __name__ == "__main__":
    main()
