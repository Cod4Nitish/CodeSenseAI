import { useState, useEffect } from "react";
import IssueCard from "./IssueCard";
import ScoreBadge from "./ScoreBadge";
import Loader from "./Loader";
import Landing from "./Landing";
import { friendlyError } from "../lib/errors";
import { useLevel } from "../lib/theme";
import { prefersReducedMotion } from "../lib/device";

/** Number that ticks up from 0 (skipped for reduced motion). */
function Tick({ n }) {
  const [v, setV] = useState(prefersReducedMotion() ? n : 0);
  useEffect(() => {
    if (prefersReducedMotion() || n === 0) { setV(n); return undefined; }
    let raf; const t0 = performance.now();
    const f = (now) => { const t = Math.min((now - t0) / 600, 1); setV(Math.round(n * t)); if (t < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{v}</>;
}

export default function ResultsPanel({
  loading, results, error, onRetry, onLineClick, onExport,
  onApplyFix, onFixAll, onDemo, appliedLines, sourceLabel, code = "", language = "python",
}) {
  const { beginner } = useLevel(false);
  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState(() => new Set());
  const [exported, setExported] = useState(false);

  useEffect(() => {
    setExpanded(new Set());
    setExported(false);
    setSevFilter("all");
    setTypeFilter("all");
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

  if (loading) {
    return (
      <div className="results-panel results-loading">
        <Loader />
        <div className="skeleton-list" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 120}ms` }} />)}
        </div>
      </div>
    );
  }

  if (error) {
    const fe = friendlyError(error);
    return (
      <div className="results-panel results-error">
        <div className="error-block" role="alert">
          <span className="error-symbol">[!] {fe.kind}</span>
          <p className="error-title">{fe.title}</p>
          <p className="error-detail">{fe.hint}</p>
          <button id="retry-btn" className="btn btn-primary" onClick={onRetry}>
            ↺ retry
          </button>
          <details className="error-tech">
            <summary>technical details</summary>
            <code>{error}</code>
          </details>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results-panel results-empty">
        <Landing onDemo={onDemo} />
      </div>
    );
  }

  const { summary, issues, issue_count } = results;
  const hasIssues = issues && issues.length > 0;
  const maxCount = Math.max(issue_count.high, issue_count.medium, issue_count.low, 1);
  const visible = (issues || [])
    .map((issue, i) => ({ issue, i }))
    .filter(({ issue }) =>
      (sevFilter === "all" || issue.severity === sevFilter) &&
      (typeFilter === "all" || issue.type === typeFilter));
  const types = [...new Set((issues || []).map((i) => i.type))];
  const fixable = (issues || []).filter((i) => Number.isInteger(i.line) && i.suggested_fix).length;
  const allExpanded = hasIssues && visible.length > 0 && visible.every(({ i }) => expanded.has(i));
  const noneExpanded = expanded.size === 0;
  const applied = appliedLines || new Set();

  return (
    <div className="results-panel results-populated">
      {results.engine === "rules-only" && (
        <div className="engine-banner" role="status">
          AI engine is unavailable right now - showing rule-based findings only.
        </div>
      )}
      <div className="score-slot">
        <ScoreBadge issueCount={issue_count} />
      </div>

      <div className="results-summary">
        <div className="summary-label">
          analysis summary
          {sourceLabel && <span className="summary-source"> · {sourceLabel}</span>}
        </div>
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

      <div className="severity-stats">
        {[
          { key: "high",   label: "errors",   count: issue_count.high },
          { key: "medium", label: "warnings", count: issue_count.medium },
          { key: "low",    label: "info",     count: issue_count.low },
        ].map(({ key, label, count }) => (
          <div key={key} className={`stat-item stat-${key}`}>
            <span className="stat-count"><Tick n={count} /></span>
            <span className="stat-label">{label}</span>
            <div className="stat-bar">
              <div className="stat-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {hasIssues ? (
        <div className="issues-list">
          <div className="filter-bar" role="group" aria-label="Filter issues">
            {["all", "high", "medium", "low"].map((k) => (
              <button key={k} type="button" aria-pressed={sevFilter === k}
                className={`fchip sev-${k} ${sevFilter === k ? "on" : ""}`} onClick={() => setSevFilter(k)}>
                {k}
              </button>
            ))}
            <span className="filter-sep" aria-hidden="true" />
            {["all", ...types].map((k) => (
              <button key={k} type="button" aria-pressed={typeFilter === k}
                className={`fchip ${typeFilter === k ? "on" : ""}`} onClick={() => setTypeFilter(k)}>
                {k === "performance" ? "perf" : k}
              </button>
            ))}
            <button type="button" className="btn btn-primary btn-xs fixall-btn" onClick={onFixAll}
              disabled={!fixable} title="Stage every suggested fix and open the before/after diff">
              ✦ fix all ({fixable})
            </button>
          </div>
          <div className="issues-list-header">
            <span className="issues-gutter-header">line</span>
            <span className="issues-content-header">
              <span>{visible.length === issues.length ? `${issues.length} issue${issues.length !== 1 ? "s" : ""} found` : `${visible.length} of ${issues.length} shown`}</span>
              <div className="expand-controls">
                <button
                  className="expand-btn"
                  onClick={() => setExpanded(new Set(visible.map(({ i }) => i)))}
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

          {visible.length === 0 && (
            <p className="filter-empty">No issues match these filters.</p>
          )}
          {visible.map(({ issue, i }) => (
            <IssueCard
              key={`${i}-${issue.title}`}
              issue={issue}
              index={i}
              isExpanded={expanded.has(i)}
              onToggle={() => toggleCard(i)}
              onLineClick={onLineClick}
              onApplyFix={onApplyFix}
              applied={issue.line != null && applied.has(issue.line)}
              code={code}
              language={language}
              beginner={beginner}
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
