/** /about - project details, team, architecture, stack, API, security, limitations. */
import { Link } from "react-router-dom";
import SitePage from "./common";

const DETAILS = [
  ["Title", "CodeSense AI - An AI-Powered Code and Bug Detection System"],
  ["Project No.", "61"], ["Group", "23AIA861"], ["Guide", "Ms. Khushboo"], ["Domain", "Application Based"],
];
const TEAM = [["Nitish Kumar Singh", "Lead developer"], ["Shivam", "Team member"]];
const OBJECTIVES = [
  "Detect bugs and security flaws in source code automatically and explain them clearly.",
  "Combine an AI model with a deterministic rule engine so results are both smart and repeatable.",
  "Review pull-request diffs and keep comments tied to lines that really changed.",
  "Give learners a friendly way to understand and fix mistakes.",
  "Provide a single, transparent quality score and grade.",
];
const STACK = [
  ["Frontend", "React 18, Vite, Monaco Editor, React Router"],
  ["Backend", "FastAPI (Python), Pydantic validation"],
  ["AI", "Google Gemini, called from the server only"],
  ["Rules", "Custom deterministic rule engine (CWE-tagged)"],
  ["Data", "PostgreSQL or SQLite via SQLAlchemy"],
  ["Auth", "bcrypt password hashing, JWT"],
];
const API = [
  ["POST", "/api/analyze", "Analyze a code snippet"],
  ["POST", "/api/review-diff", "Review a unified diff"],
  ["POST", "/api/ai/chat", "Assistant chat"],
  ["POST", "/api/ai/fix", "Auto-fix with diff"],
  ["POST", "/api/ai/explain", "Explain code"],
  ["POST", "/api/ai/tests", "Generate tests"],
  ["POST", "/api/ai/simplify", "Simple explanation (Learn)"],
  ["POST", "/api/ai/quiz", "Find-the-bug quiz"],
  ["*", "/api/auth/*", "Register, login, current user"],
  ["*", "/api/reviews", "Per-user review history"],
];
const SECURITY = [
  "Passwords hashed with bcrypt", "JWT-based authentication", "Rate limiting on the API",
  "Input validation (size and type limits)", "Per-user data isolation", "AI API key kept only on the server",
];
const LIMITS = ["Rule coverage is strongest for Python and JavaScript.", "AI output can still be imperfect; findings should be reviewed by a person.", "Analysis works on pasted code or diffs, not whole repositories.", "Input size is capped (20,000 characters per analysis)."];
const FUTURE = ["GitHub PR bot", "Repo-wide context", "More analyzers such as Bandit, Semgrep and ESLint", "VS Code extension"];

function Arch() {
  const box = (x, y, w, h, t, s) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill="var(--st-surface)" stroke="var(--st-border)" strokeWidth="1.5" />
      <text x={x + w / 2} y={y + h / 2 - (s ? 3 : -4)} textAnchor="middle" fill="var(--st-bright)" fontSize="13" fontWeight="700">{t}</text>
      {s && <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fill="var(--st-muted)" fontSize="11">{s}</text>}
    </g>
  );
  const arrow = (d) => <path d={d} fill="none" stroke="var(--st-accent)" strokeWidth="2" markerEnd="url(#ah)" />;
  return (
    <figure data-reveal>
      <svg viewBox="0 0 760 330" role="img" aria-labelledby="arch-t arch-d" style={{ width: "100%", height: "auto", background: "var(--st-panel)", border: "1px solid var(--st-border)", borderRadius: 14 }}>
        <title id="arch-t">CodeSense AI architecture</title>
        <desc id="arch-d">React, Vite and Monaco frontend calls a FastAPI backend, which runs the rule engine and Gemini AI in parallel, merges results and computes the score, then stores history in PostgreSQL or SQLite.</desc>
        <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--st-accent)" /></marker></defs>
        {box(20, 125, 150, 70, "Frontend", "React + Vite + Monaco")}
        {box(230, 125, 140, 70, "FastAPI", "validation, auth, limits")}
        {box(450, 40, 140, 64, "Rule engine", "deterministic, CWE")}
        {box(450, 216, 140, 64, "Gemini AI", "server-side key")}
        {box(630, 125, 110, 70, "Merge + score", "dedupe, grade")}
        {box(230, 255, 140, 56, "History DB", "PostgreSQL / SQLite")}
        {arrow("M170 160H228")}
        {arrow("M370 145L448 82")}
        {arrow("M370 175L448 240")}
        {arrow("M590 72L650 123")}
        {arrow("M590 248L650 197")}
        {arrow("M300 197V253")}
      </svg>
      <figcaption className="st-p">Request flow: the browser sends code to FastAPI, the rule engine and the AI analyse it, results are merged and scored, and signed-in users get the review saved to history.</figcaption>
    </figure>
  );
}

function Sec({ id, eyebrow, title, alt, children }) {
  return (
    <section className={`st-sec${alt ? " alt" : ""}`} aria-labelledby={`${id}-h`}>
      <div className="st-wrap">
        <div className="st-sec-head" data-reveal><span className="st-eyebrow">{eyebrow}</span><h2 id={`${id}-h`}>{title}</h2></div>
        {children}
      </div>
    </section>
  );
}

export default function About() {
  return (
    <SitePage title="About">
      <section className="st-sec" aria-labelledby="ab-h">
        <div className="st-wrap" data-reveal>
          <span className="st-eyebrow">About the project</span>
          <h1 id="ab-h">CodeSense AI<br /><span className="st-grad">An AI-Powered Code and Bug Detection System</span></h1>
          <dl className="st-grid st-g2" style={{ marginTop: 28 }}>
            {DETAILS.map(([k, v]) => (
              <div key={k} className="st-card" style={{ padding: 14 }}>
                <dt className="st-eyebrow" style={{ marginBottom: 4 }}>{k}</dt>
                <dd style={{ color: "var(--st-bright)", fontWeight: 600 }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Sec id="team" eyebrow="Team" title="Who built it" alt>
        <ul className="st-grid st-g2">
          {TEAM.map(([n, r]) => <li key={n} className="st-card" data-reveal><h3>{n}</h3><p>{r}</p></li>)}
        </ul>
      </Sec>

      <Sec id="problem" eyebrow="Problem statement" title="Why this project exists">
        <p className="st-p" data-reveal style={{ marginTop: 0 }}>Manual code review is slow and inconsistent, and security flaws such as SQL injection or hardcoded secrets often reach production. Learners rarely have a senior to review their code. Plain AI reviewers help, but they can invent problems or comment on lines that do not exist, while plain linters are precise but shallow.</p>
        <p className="st-p" data-reveal>CodeSense AI combines both approaches and cross-checks them, then reports the result as a transparent score with explanations a beginner can follow.</p>
      </Sec>

      <Sec id="objectives" eyebrow="Objectives" title="What we set out to do" alt>
        <ol className="st-grid">{OBJECTIVES.map((o, i) => <li key={i} className="st-card" data-reveal style={{ display: "flex", gap: 12 }}><span className="st-tag ac">{i + 1}</span><span>{o}</span></li>)}</ol>
      </Sec>

      <Sec id="architecture" eyebrow="Architecture" title="How the pieces fit"><Arch /></Sec>

      <Sec id="stack" eyebrow="Tech stack" title="Built with" alt>
        <ul className="st-grid st-g3">{STACK.map(([k, v]) => <li key={k} className="st-card" data-reveal><h3>{k}</h3><p>{v}</p></li>)}</ul>
      </Sec>

      <Sec id="api" eyebrow="API" title="Endpoints">
        <ul className="st-grid st-g2">
          {API.map(([m, p, d]) => (
            <li key={p} className="st-card" style={{ padding: 14 }} data-reveal>
              <div className="mk-row"><code style={{ fontFamily: "var(--st-mono)", color: "var(--st-bright)", fontSize: 14, overflowWrap: "anywhere" }}>{p}</code><span className="st-tag ac">{m}</span></div>
              <p style={{ marginTop: 4 }}>{d}</p>
            </li>
          ))}
        </ul>
      </Sec>

      <Sec id="security" eyebrow="Security" title="Security features" alt>
        <ul className="st-grid st-g3">{SECURITY.map((s) => <li key={s} className="st-card" data-reveal style={{ padding: 14, color: "var(--st-bright)", fontWeight: 600 }}>{s}</li>)}</ul>
      </Sec>

      <Sec id="limits" eyebrow="Honest notes" title="Limitations and future scope">
        <div className="st-grid st-g2">
          <div className="st-card" data-reveal><h3>Limitations</h3><ul style={{ marginTop: 8, display: "grid", gap: 6, color: "var(--st-muted)" }}>{LIMITS.map((l) => <li key={l}>- {l}</li>)}</ul></div>
          <div className="st-card" data-reveal><h3>Future scope</h3><ul style={{ marginTop: 8, display: "grid", gap: 6, color: "var(--st-muted)" }}>{FUTURE.map((l) => <li key={l}>- {l}</li>)}</ul></div>
        </div>
        <div className="stb-row" style={{ marginTop: 28 }}>
          <Link to="/app" className="stb primary">Open the app</Link>
          <Link to="/product" className="stb">Product tour</Link>
          <Link to="/learn" className="stb">Learn mode</Link>
        </div>
      </Sec>
    </SitePage>
  );
}
