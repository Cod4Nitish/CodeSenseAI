import { useState } from "react";
import SeverityBadge from "./SeverityBadge";

const TYPE_META = {
  bug:         { sym: "!!",  label: "bug" },
  security:    { sym: "SEC", label: "security" },
  performance: { sym: "PFM", label: "perf" },
  style:       { sym: "STL", label: "style" },
};

/**
 * IssueCard — controlled expand/collapse by parent.
 * Line number click → highlights that line in Monaco editor.
 */
export default function IssueCard({ issue, index, isExpanded, onToggle, onLineClick }) {
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[issue.type] ?? { sym: "???", label: issue.type };

  function handleCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(issue.suggested_fix).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleGutterClick(e) {
    e.stopPropagation(); // Don't toggle expand
    if (issue.line && onLineClick) onLineClick(issue.line, issue.severity);
  }

  return (
    <div
      className={`issue-card severity-${issue.severity}`}
      style={{ animationDelay: `${Math.min(index * 45, 250)}ms` }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div
        className="issue-card-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && onToggle()}
        aria-expanded={isExpanded}
        title={issue.title}
      >
        {/* Gutter — click to jump to line in editor */}
        <div
          className="issue-gutter"
          onClick={handleGutterClick}
          title={issue.line ? `Jump to line ${issue.line} in editor` : "No line info"}
        >
          <span className="issue-line-num">
            {issue.line != null ? `L${issue.line}` : "—"}
          </span>
        </div>

        {/* Content */}
        <div className="issue-header-main">
          {/* Type chip */}
          <div className="issue-type-chip">
            <span className="issue-type-sym">{meta.sym}</span>
            <span className="issue-type-lbl">{meta.label}</span>
          </div>

          {/* Title + badge */}
          <div className="issue-title-area">
            <span className="issue-title">{issue.title}</span>
            <div className="issue-title-meta">
              <SeverityBadge severity={issue.severity} />
            </div>
          </div>
        </div>

        {/* Toggle arrow */}
        <span className="issue-toggle" aria-hidden="true">
          {isExpanded ? "▲" : "▼"}
        </span>
      </div>

      {/* ── Body ───────────────────────────────────── */}
      {isExpanded && (
        <div className="issue-card-body">

          {/* Explanation */}
          <div className="issue-section">
            <div className="issue-section-label">explanation</div>
            <p className="issue-explanation">{issue.explanation}</p>
          </div>

          {/* Suggested fix */}
          <div className="issue-section">
            <div className="issue-section-label">suggested fix</div>
            <div className="issue-fix-wrapper">
              <pre className="issue-fix">
                <code>{issue.suggested_fix}</code>
              </pre>
              <button
                className={`copy-btn ${copied ? "copied" : ""}`}
                onClick={handleCopy}
                title="Copy fix to clipboard"
              >
                {copied ? "✓ copied" : "copy"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
