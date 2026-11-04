/**
 * CodeSense AI — trust / compliance strip.
 * by Nitish Singh
 *
 * Each badge is backed by a real property of the system, not a decorative claim:
 *   • Zero-retention   — anonymous analyses are never written to disk; signed-in
 *                        history is opt-out per request (`persist: false`).
 *   • OWASP Top-10     — the review prompt explicitly maps findings to the
 *                        OWASP Top-10 and CWE categories.
 *   • SOC 2-aligned    — stateless JWT auth, per-user data isolation enforced at
 *                        the query layer, bcrypt at cost 12, audit trail.
 * Wording is intentionally "-ready" / "-aligned": this is a capstone, not an
 * audited product.
 */

const BADGES = [
  {
    icon: "🛡️",
    title: "SOC 2 Type II-ready architecture",
    detail:
      "Stateless JWT sessions, per-user data isolation at the query layer, bcrypt (cost 12), full audit trail.",
  },
  {
    icon: "🔒",
    title: "Zero data retention by default",
    detail:
      "Anonymous reviews run in-memory and are never persisted. Signed-in history is opt-out per request.",
  },
  {
    icon: "🎯",
    title: "OWASP Top-10 & CWE coverage",
    detail:
      "The review model is instructed to classify findings against the OWASP Top-10 and CWE taxonomies.",
  },
];

export default function TrustBar({ compact = false }) {
  return (
    <div className={`trust-bar ${compact ? "compact" : ""}`}>
      {BADGES.map((b) => (
        <div className="trust-badge" key={b.title} title={b.detail}>
          <span className="trust-badge-icon" aria-hidden="true">
            {b.icon}
          </span>
          <span className="trust-badge-text">
            <span className="trust-badge-title">{b.title}</span>
            {!compact && <span className="trust-badge-detail">{b.detail}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
