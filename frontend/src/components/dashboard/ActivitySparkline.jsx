/**
 * CodeSense AI — 14-day activity sparkline (inline SVG).
 * by Nitish Singh
 */

export default function ActivitySparkline({ points }) {
  const w = 260;
  const h = 64;
  const pad = 4;
  const max = Math.max(1, ...points.map((p) => p.count));
  const n = points.length;

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(1, n - 1)) * (w - pad * 2);
    const y = h - pad - (p.count / max) * (h - pad * 2);
    return [x, y];
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[n - 1][0].toFixed(1)},${h - pad} L${coords[0][0].toFixed(1)},${h - pad} Z`;
  const totalRuns = points.reduce((s, p) => s + p.count, 0);

  return (
    <div className="panel spark-panel">
      <div className="panel-head">
        <h3 className="panel-title">Activity — last 14 days</h3>
        <span className="panel-meta">{totalRuns} run{totalRuns !== 1 ? "s" : ""}</span>
      </div>
      <svg className="spark-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Review activity over the last 14 days">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={points[i].count > 0 ? 2.1 : 1.2}
            fill={points[i].count > 0 ? "var(--accent)" : "var(--text-dim)"} />
        ))}
      </svg>
    </div>
  );
}
