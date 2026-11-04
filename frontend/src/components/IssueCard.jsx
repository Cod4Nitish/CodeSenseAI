import { useState } from "react";
import SeverityBadge from "./SeverityBadge";
import SimplifyBlock from "./SimplifyBlock";

const BEGINNER_TYPE = { bug: "mistake", security: "safety", performance: "speed", style: "tidy-up" };
const BEGINNER_SEV = { high: "Serious", medium: "Worth fixing", low: "Small" };

/** Which engine found it: AI, deterministic Rules, or both (cross-checked). */
export function EngineChip({ source }) {
  if (source !== "ai" && source !== "rules" && source !== "both") return null;
  const label = source === "both" ? "AI + Rules ✓" : source === "ai" ? "AI" : "Rules";
  const title = source === "both"
    ? "Found by the AI and confirmed by the deterministic rule engine"
    : source === "ai" ? "Found by the AI model" : "Found by the deterministic rule engine";
  return <span className={`eng-chip eng-${source}`} title={title}>{label}</span>;
}

const TYPE_META = {
  bug:         { sym: "!!",  label: "bug" },
  security:    { sym: "SEC", label: "security" },
  performance: { sym: "PFM", label: "perf" },
  style:       { sym: "STL", label: "style" },
};

/** Pull a "[CWE-89 · OWASP A03:2021 Injection]" style tag off the explanation. */
function parseTag(text = "") {
  const m = text.match(/^\s*\[([^\]]*CWE-\d+[^\]]*)\]\s*/i);
  if (!m) return { tag: null, rest: text };
  return { tag: m[1].trim(), rest: text.slice(m[0].length) };
}

/**
 * IssueCard — controlled expand/collapse by parent.
 * • Line-number click  → highlights that line in the Monaco editor.
 * • "apply fix"        → best-effort line replacement in a working copy, then
 *                        surfaced in the diff view for review before accepting.
 */
export default function IssueCard({
  issue, index, isExpanded, onToggle, onLineClick, onApplyFix, applied,
  code = "", language = "python", beginner = false,
}) {
  const [copied, setCopied] = useState(false);
  const { tag, rest } = parseTag(issue.explanation);
  const meta = TYPE_META[issue.type] ?? { sym: "???", label: issue.type };

  function handleCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(issue.suggested_fix).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function handleGutterClick(e) {
    e.stopPropagation();
    if (issue.line && onLineClick) onLineClick(issue.line, issue.severity);
  }

  const canApply = Number.isInteger(issue.line) && issue.line >= 1;

  return (
    <div
      className={`issue-card severity-${issue.severity}`}
      style={{ animationDelay: `${Math.min(index * 45, 250)}ms` }}
    >
      <div
        className="issue-card-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
        }}
        aria-expanded={isExpanded}
        title={issue.title}
      >
        <div
          className="issue-gutter"
          onClick={handleGutterClick}
          title={issue.line ? `Jump to line ${issue.line} in editor` : "No line info"}
        >
          <span className="issue-line-num">
            {issue.line != null ? `L${issue.line}` : "—"}
          </span>
        </div>

        <div className="issue-header-main">
          <div className="issue-type-chip">
            <span className="issue-type-sym">{meta.sym}</span>
            <span className="issue-type-lbl">{beginner ? BEGINNER_TYPE[issue.type] || meta.label : meta.label}</span>
          </div>

          <div className="issue-title-area">
            <span className="issue-title">{issue.title}</span>
            <div className="issue-title-meta">
              {beginner
                ? <span className={`severity-badge badge-${issue.severity}`}>{BEGINNER_SEV[issue.severity] || issue.severity}</span>
                : <SeverityBadge severity={issue.severity} />}
              <EngineChip source={issue.source} />
              {!beginner && issue.rule_id && <span className="rule-chip" title="Deterministic rule id">{issue.rule_id}</span>}
              {!beginner && tag && <span className="cwe-chip" title="Security taxonomy tag">{tag}</span>}
              {applied && <span className="issue-applied-tag">✓ fix staged</span>}
            </div>
          </div>
        </div>

        <span className="issue-toggle" aria-hidden="true">
          {isExpanded ? "▲" : "▼"}
        </span>
      </div>

      {isExpanded && (
        <div className="issue-card-body">
          {beginner ? (
            <div className="issue-section">
              <div className="issue-section-label">in plain words</div>
              <SimplifyBlock auto code={code} language={language} issue={issue} />
            </div>
          ) : (
            <div className="issue-section">
              <div className="issue-section-label">explanation</div>
              <p className="issue-explanation">{rest}</p>
            </div>
          )}

          <div className="issue-section">
            <div className="issue-section-label">{beginner ? "how to fix" : "suggested fix"}</div>
            <div className="issue-fix-wrapper">
              <pre className="issue-fix">
                <code>{issue.suggested_fix}</code>
              </pre>
              <div className="issue-fix-actions">
                <button
                  className={`copy-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopy}
                  title="Copy fix to clipboard"
                >
                  {copied ? "✓ copied" : "copy"}
                </button>
                <button
                  className={`copy-btn apply-btn ${applied ? "applied" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyFix?.(issue);
                  }}
                  disabled={!canApply}
                  title={
                    canApply
                      ? "Stage this fix at line " + issue.line + " and open the diff view"
                      : "This finding has no specific line to apply to"
                  }
                >
                  {applied ? "✓ staged" : "apply fix →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
