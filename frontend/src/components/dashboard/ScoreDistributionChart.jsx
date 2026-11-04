/**
 * CodeSense AI — score-distribution bar chart (pure CSS, no chart lib).
 * by Nitish Singh
 */

export default function ScoreDistributionChart({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <h3 className="panel-title">Score Distribution</h3>
        <span className="panel-meta">{total} review{total !== 1 ? "s" : ""}</span>
      </div>

      <div className="dist-chart" role="img" aria-label="Distribution of quality scores by grade band">
        {buckets.map((b) => {
          const h = b.count === 0 ? 3 : 10 + (b.count / max) * 90;
          return (
            <div className="dist-col" key={b.label}>
              <div className="dist-bar-wrap">
                <span className="dist-count">{b.count}</span>
                <div
                  className={`dist-bar tone-${b.tone}`}
                  style={{ height: `${h}%` }}
                />
              </div>
              <div className="dist-x">
                <span className="dist-grade">{b.grade_band}</span>
                <span className="dist-range">{b.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
