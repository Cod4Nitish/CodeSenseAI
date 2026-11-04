/**
 * CodeSense AI — dashboard KPI row.
 * by Nitish Singh
 */

import { pct } from "../../lib/format";

function Card({ label, value, sub, tone = "neutral", icon }) {
  return (
    <div className={`kpi-card tone-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon" aria-hidden="true">{icon}</span>
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function KpiCards({ stats }) {
  const {
    total_reviews,
    average_quality_score,
    critical_vulnerabilities_prevented,
    clean_pass_rate,
    total_issues_found,
    best_score,
  } = stats;

  const avgTone =
    average_quality_score >= 8.5 ? "ok" : average_quality_score >= 7 ? "warn" : average_quality_score > 0 ? "error" : "neutral";

  return (
    <div className="kpi-row">
      <Card
        label="Total Reviews Ran"
        value={total_reviews.toLocaleString()}
        sub={`${total_issues_found.toLocaleString()} findings surfaced`}
        icon="▤"
      />
      <Card
        label="Average Quality Score"
        value={total_reviews ? `${average_quality_score.toFixed(1)}/10` : "—"}
        sub={total_reviews ? `best run ${best_score.toFixed(1)}/10` : "no data yet"}
        tone={avgTone}
        icon="◎"
      />
      <Card
        label="Critical Vulns Prevented"
        value={critical_vulnerabilities_prevented.toLocaleString()}
        sub="high-severity security findings"
        tone={critical_vulnerabilities_prevented > 0 ? "error" : "ok"}
        icon="🛡"
      />
      <Card
        label="Clean Pass Rate"
        value={total_reviews ? pct(clean_pass_rate) : "—"}
        sub={total_reviews ? "reviews with zero issues" : "no data yet"}
        tone={clean_pass_rate >= 0.5 ? "ok" : clean_pass_rate > 0 ? "warn" : "neutral"}
        icon="✓"
      />
    </div>
  );
}
