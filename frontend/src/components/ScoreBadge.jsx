import { useEffect, useState } from "react";
import { computeScore } from "../lib/score";

/**
 * ScoreBadge — deterministic Quality Score + letter grade.
 * Sits prominently above the issue list.
 *
 * Score = 10 - (high*2.5) - (medium*0.8) - (low*0.2), clamped [0, 10]
 */
export default function ScoreBadge({ issueCount }) {
  const { score, display, grade, tone, label, counts, total } =
    computeScore(issueCount);

  // Count-up animation for the numeric score (respects reduced-motion).
  const [shown, setShown] = useState(score);
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setShown(score);
      return;
    }
    let raf;
    const start = performance.now();
    const from = 0;
    const dur = 520;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (score - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const pct = Math.round((score / 10) * 100);

  return (
    <div className={`score-badge tone-${tone}`} role="img"
         aria-label={`Quality score ${display} out of 10, grade ${grade}, ${label}`}>
      <div className="score-grade-ring">
        <span className="score-grade">{grade}</span>
      </div>

      <div className="score-main">
        <div className="score-line">
          <span className="score-value">{shown.toFixed(1)}</span>
          <span className="score-max">/ 10</span>
          <span className="score-label">{label}</span>
        </div>

        <div className="score-track" aria-hidden="true">
          <div className="score-track-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="score-breakdown" aria-hidden="true">
          <span className="sb-item sb-high">{counts.high} high</span>
          <span className="sb-dot">·</span>
          <span className="sb-item sb-medium">{counts.medium} medium</span>
          <span className="sb-dot">·</span>
          <span className="sb-item sb-low">{counts.low} low</span>
          <span className="sb-dot">·</span>
          <span className="sb-item">{total} total</span>
        </div>
      </div>
    </div>
  );
}
