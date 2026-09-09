import { useState, useEffect } from "react";
import IssueCard from "./IssueCard";
import ScoreBadge from "./ScoreBadge";
import Loader from "./Loader";

export default function ResultsPanel({
  loading, results, error, onRetry, onLineClick, onExport,
}) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [exported, setExported] = useState(false);

  // Collapse everything whenever a fresh result arrives.
  useEffect(() => {
    setExpanded(new Set());
    setExported(false);
  }, [results]);

  function toggleCard(index) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  function handleExport() {
    onExport?.();
    setExported(true);
    window.setTimeout(() => setExported(false), 2000);
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="results-panel results-loading">
        <Loader />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className="results-panel results-error">
        <div className="error-block">
          <span className="error-symbol">[!] analysis failed</span>
          <p className="error-title">Something went wrong</p>
          <p className="error-detail">{error}</p>
          <button id="retry-btn" className="btn btn-ghost" onClick={onRetry}>
            ↺ try again
          </button>
        </div>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────
  if (!results) {
    return (
      <div className="results-panel results-empty">
        <div className="empty-block">
          <div className="empty-code-art">
            <span className="c">// waiting for analysis...</span>{"\n"}
            <span className="c">// </span>{"\n"}
            <span className="g">▶</span> paste code on the left{"\n"}
            <span className="g">▶</span> select language{"\n"}
            <span className="g">▶</span> hit <span className="w">analyze</span> or <span className="w">Ctrl+Enter</span>
          </div>
          <p className="empty-title">No analysis yet</p>
          <p className="empty-sub">
            CodeSense AI will check your code for bugs, security vulnerabilities,
            performance issues, and style problems.
          </p>
          <div className="empty-hint">
            <span>try a</span>
            <span className="hint-key">sample</span>
            <span>snippet to get started</span>
          </div>
        </div>
      </div>
    );
  }

  const { summary, issues, issue_count } = results;
  const hasIssues = issues && issues.length > 0;
  const maxCount = Math.max(issue_count.high, issue_count.medium, issue_count.low, 1);
  const allExpanded = hasIssues && expanded.size === issues.length;
  const noneExpanded = expanded.size === 0;

  return (
    <div className="results-panel results-populated">

      {/* ── Score ───────────────────────────────────── */}
      <div className="score-slot">
        <ScoreBadge issueCount={issue_count} />
      </div>

      {/* ── Summary ─────────────────────────────────── */}
      <div className="results-summary">
        <div className="summary-label">analysis summary</div>
        <p className="summary-text">{summary}</p>
        <div className="summary-actions">
          <button
            className={`btn btn-ghost btn-xs ${exported ? "btn-done" : ""}`}
            onClick={handleExport}
            title="Download a full Markdown report"
          >
            {exported ? "✓ exported" : "⬇ export .md"}
          </button>
        </div>
      </div>

      {/* ── Severity stats ──────────────────────────── */}
      <div className="severity-stats">
        {[
          { key: "high",   label: "errors",   count: issue_count.high },
          { key: "medium", label: "warnings", count: issue_count.medium },
          { key: "low",    label: "info",     count: issue_count.low },
        ].map(({ key, label, count }) => (
          <div key={key} className={`stat-item stat-${key}`}>
            <span className="stat-count">{count}</span>
            <span className="stat-label">{label}</span>
            <div className="stat-bar">
              <div className="stat-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Issues or clean ─────────────────────────── */}
      {hasIssues ? (
        <div className="issues-list">
          <div className="issues-list-header">
            <span className="issues-gutter-header">line</span>
            <span className="issues-content-header">
              <span>{issues.length} issue{issues.length !== 1 ? "s" : ""} found</span>
              <div className="expand-controls">
                <button
                  className="expand-btn"
                  onClick={() => setExpanded(new Set(issues.map((_, i) => i)))}
                  disabled={allExpanded}
                  title="Expand all issues"
                >expand all</button>
                <button
                  className="expand-btn"
                  onClick={() => setExpanded(new Set())}
                  disabled={noneExpanded}
                  title="Collapse all issues"
                >collapse all</button>
              </div>
            </span>
          </div>

          {issues.map((issue, i) => (
            <IssueCard
              key={`${i}-${issue.title}`}
              issue={issue}
              index={i}
              isExpanded={expanded.has(i)}
              onToggle={() => toggleCard(i)}
              onLineClick={onLineClick}
            />
          ))}
        </div>
      ) : (
        <div className="clean-block">
          <div className="clean-check">✓</div>
          <p className="clean-title">No issues found</p>
          <p className="clean-sub">Your code looks clean — great work!</p>
        </div>
      )}
    </div>
  );
}
