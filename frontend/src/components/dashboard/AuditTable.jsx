/**
 * CodeSense AI — audit-history table.
 * by Nitish Singh
 *
 * "View Report" hands the review id to the workspace via router state; the
 * workspace fetches the full record and rehydrates the editor + diagnostics.
 */

import { useNavigate } from "react-router-dom";
import { absoluteTime, gradeTone, langColor, langLabel, relativeTime } from "../../lib/format";

export default function AuditTable({ rows, onDelete }) {
  const navigate = useNavigate();

  if (!rows.length) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Audit History</h3>
        </div>
        <div className="audit-empty">
          <p>No reviews recorded yet.</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/app")}>
            Run your first review →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 className="panel-title">Audit History</h3>
        <span className="panel-meta">{rows.length} record{rows.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="audit-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Lang</th>
              <th>Snippet</th>
              <th className="ta-c">Score</th>
              <th className="ta-c">Issues</th>
              <th className="ta-r">Report</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="audit-when" title={absoluteTime(r.created_at)}>
                  {relativeTime(r.created_at)}
                </td>
                <td>
                  <span
                    className="lang-chip"
                    style={{ "--lang": langColor(r.language) }}
                  >
                    {langLabel(r.language)}
                  </span>
                </td>
                <td className="audit-snippet">
                  <code>{r.code_preview}</code>
                </td>
                <td className="ta-c">
                  <span className={`score-pill tone-${gradeTone(r.grade)}`}>
                    {r.quality_score.toFixed(1)} · {r.grade}
                  </span>
                </td>
                <td className="ta-c">
                  <span className="issue-pill" title={`${r.high_count} high · ${r.medium_count} medium · ${r.low_count} low`}>
                    {r.total_issues}
                    {r.security_high_count > 0 && (
                      <span className="issue-pill-sec" title={`${r.security_high_count} critical security`}>
                        ⚠{r.security_high_count}
                      </span>
                    )}
                  </span>
                </td>
                <td className="ta-r audit-actions">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => navigate("/app", { state: { reviewId: r.id } })}
                    title="Re-open this scan in the workspace"
                  >
                    view report →
                  </button>
                  {onDelete && (
                    <button
                      className="icon-btn"
                      onClick={() => onDelete(r.id)}
                      title="Delete this record"
                      aria-label="Delete record"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
