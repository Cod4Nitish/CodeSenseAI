/** Shared shell + widgets for the marketing pages: SitePage, footer, TryBox, use cases. */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteNav from "../../components/site/SiteNav";
import { analyzeCode } from "../../api";
import { computeScore } from "../../lib/score";
import "./site.css";

function useReveal(ref) {
  useEffect(() => {
    const els = ref.current?.querySelectorAll("[data-reveal]") ?? [];
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { threshold: 0.1 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ref]);
}

export function SiteFooter() {
  return (
    <footer className="sf">
      <div className="st-wrap sf-grid">
        <div>
          <h3>CodeSense AI</h3>
          <p><strong style={{ color: "var(--st-bright)" }}>An AI-Powered Code and Bug Detection System</strong></p>
          <p style={{ marginTop: 8 }}>Project No. 61 · Group 23AIA861 · Guide: Ms. Khushboo · Domain: Application Based</p>
          <p style={{ marginTop: 8 }}>Built by Nitish Kumar Singh (lead developer) and Shivam.</p>
        </div>
        <nav aria-label="Footer pages">
          <h3>Explore</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/product">Product tour</Link></li>
            <li><Link to="/about">About the project</Link></li>
          </ul>
        </nav>
        <nav aria-label="Footer app">
          <h3>App</h3>
          <ul>
            <li><Link to="/app">Workspace</Link></li>
            <li><Link to="/pr">PR Review</Link></li>
            <li><Link to="/learn">Learn mode</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export default function SitePage({ title, children, subnav }) {
  const ref = useRef(null);
  useReveal(ref);
  useEffect(() => { document.title = `${title} - CodeSense AI`; }, [title]);
  const skip = (e) => {
    e.preventDefault();
    const m = document.getElementById("st-main");
    m?.focus();
    m?.scrollIntoView();
  };
  return (
    <div className="st" ref={ref}>
      <a className="st-skip" href="#st-main" onClick={skip}>Skip to content</a>
      <SiteNav />
      {subnav}
      <main id="st-main" tabIndex={-1} style={{ outline: "none" }}>{children}</main>
      <SiteFooter />
    </div>
  );
}

/* ---------------- Try it now (real POST /api/analyze) ---------------- */
export const SAMPLE = `import sqlite3, hashlib

API_KEY = "sk-live-51Hxxxxxxxxxxxxxxxx"

def login(db, user, pw):
    q = "SELECT * FROM users WHERE name='" + user + "'"
    row = db.execute(q).fetchone()
    h = hashlib.md5(pw.encode()).hexdigest()
    try:
        return row and row[2] == h
    except:
        pass
`;

const LANGS = [
  ["python", "Python"], ["javascript", "JavaScript"], ["typescript", "TypeScript"],
  ["java", "Java"], ["cpp", "C++"], ["go", "Go"],
];
const SRC = { ai: ["AI", "ac"], rules: ["Rules", "ok"], both: ["AI + Rules", "md"] };
const SEV = { high: "hi", medium: "md", low: "" };

export function TryBox({ compact = false }) {
  const nav = useNavigate();
  const [code, setCode] = useState(SAMPLE);
  const [lang, setLang] = useState("python");
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const ctl = useRef(null);
  useEffect(() => () => ctl.current?.abort(), []);

  async function run() {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setState("loading"); setErr("");
    try {
      const r = await analyzeCode(code, lang, { persist: false, signal: c.signal });
      setRes(r); setState("done");
    } catch (e) {
      if (e.name === "AbortError") return;
      setErr(e.message || "Something went wrong."); setState("error");
    }
  }
  function openWorkspace() {
    try { localStorage.setItem("codesense_code", code); localStorage.setItem("codesense_lang", lang); } catch { /* ignore */ }
    nav("/");
  }

  const sc = res ? computeScore(res.issue_count) : null;
  const top = res ? [...res.issues].sort((a, b) => ["high", "medium", "low"].indexOf(a.severity) - ["high", "medium", "low"].indexOf(b.severity)).slice(0, compact ? 3 : 5) : [];
  const id = compact ? "try-c" : "try";

  return (
    <section className="try" aria-labelledby={`${id}-h`}>
      <div className="try-head">
        <h3 id={`${id}-h`}>Try it now</h3>
        <label>Language
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
            {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      <label className="sr-only" htmlFor={`${id}-code`} style={{ position: "absolute", left: -9999 }}>Code to analyze</label>
      <textarea id={`${id}-code`} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
        style={compact ? { minHeight: 150 } : undefined} maxLength={20000} />
      <div className="try-foot">
        <button type="button" className="stb primary" onClick={run} disabled={state === "loading" || !code.trim()}>
          {state === "loading" ? <><span className="try-spin" aria-hidden="true" /> Analyzing...</> : "Analyze"}
        </button>
        <button type="button" className="stb" onClick={() => setCode(SAMPLE)}>Reset sample</button>
      </div>
      <div aria-live="polite">
        {state === "loading" && (
          <div className="try-load" role="status"><span className="try-sk" /><span className="try-sk" /></div>
        )}
        {state === "error" && (
          <div className="try-err" role="alert">
            <span>{err}</span>
            <button type="button" className="stb sm" onClick={run}>Retry</button>
          </div>
        )}
        {state === "done" && res && (
          <div className="try-res">
            <div className="try-score">
              <div className="try-big">{sc.display}<small> / 10</small></div>
              <span className={`try-grade ${sc.tone}`}>{res.grade || sc.grade}</span>
              <span className="st-tag ac">Engine: {res.engine === "rules-only" ? "Rules only" : "AI + Rules"}</span>
              <span className="st-tag">{res.issue_count.high} high · {res.issue_count.medium} medium · {res.issue_count.low} low</span>
            </div>
            {res.engine === "rules-only" && <p className="st-p" style={{ margin: 0 }}>The AI engine was unavailable, so only the deterministic rules ran.</p>}
            {top.length === 0 && <p className="st-p" style={{ margin: 0 }}>No issues found.</p>}
            {top.map((i, k) => (
              <div key={k} className={`mk-iss ${i.severity === "high" ? "" : i.severity === "medium" ? "w" : "o"}`}>
                <div>
                  <b>{i.title}{i.line ? ` (line ${i.line})` : ""}</b>
                  <span>{i.explanation}</span>
                  <div className="mk-tags">
                    <span className={`st-tag ${SEV[i.severity]}`}>{i.severity}</span>
                    <span className={`st-tag ${SRC[i.source]?.[1] || ""}`}>{SRC[i.source]?.[0] || i.source}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="stb-row">
              <button type="button" className="stb primary" onClick={openWorkspace}>Open in full workspace</button>
            </div>
          </div>
        )}
      </div>
      <div className="try-foot">
        <Link to="/pr?demo=1" className="stb sm">Try PR review sample</Link>
        <Link to="/learn" className="stb sm">Take a 1-minute quiz</Link>
        {state !== "done" && <button type="button" className="stb sm" onClick={openWorkspace}>Open in full workspace</button>}
      </div>
    </section>
  );
}

/* ---------------- Use cases ---------------- */
const P = {
  book: "M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zM8 7h6M8 11h6",
  dev: "M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12",
  teach: "M3 8l9-4 9 4-9 4-9-4zM7 10v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5",
  pr: "M7 4v10M7 18a2 2 0 100 .01M17 6a2 2 0 100 .01M17 8v5a3 3 0 01-3 3H9",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 118 0v3",
  target: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z",
  oss: "M4 6h16M4 12h10M4 18h6M17 14l3 3-3 3",
};
export const USE_CASES = [
  { ic: "book", who: "New coders and students", pain: "I do not understand what my code is doing wrong.", help: "Learn mode explains code simply in English or Hinglish and runs find-the-bug quizzes with a daily tip and progress.", to: "/learn", cta: "Open Learn mode" },
  { ic: "dev", who: "Junior developers", pain: "Nobody senior has time to read my code.", help: "Get a senior-style review: line-pinned issues, severity, explanation and a suggested fix you can apply.", to: "/", cta: "Open Workspace" },
  { ic: "teach", who: "Teachers and mentors", pain: "Reviewing a whole class of submissions takes hours.", help: "Paste a student's code and get a scored, tagged report in seconds, with a Markdown export to share back.", to: "/", cta: "Review a submission" },
  { ic: "pr", who: "Teams reviewing pull requests", pain: "Large diffs get skimmed before merge.", help: "Paste a diff for a walkthrough, risk level and file summary. Comments are checked against lines that really changed.", to: "/pr?demo=1", cta: "Try PR review sample" },
  { ic: "lock", who: "Security-minded developers", pain: "Secrets and injection flaws slip through.", help: "A deterministic rule engine flags hardcoded secrets, SQL injection and more, tagged with CWE ids.", to: "/product#engine", cta: "See the checks" },
  { ic: "target", who: "Interview and practice prep", pain: "I cannot tell if my solution is clean.", help: "Score and grade your practice solutions, then ask the assistant to explain or generate tests.", to: "/", cta: "Analyze my code" },
  { ic: "oss", who: "Open-source maintainers", pain: "Triaging incoming diffs is a time sink.", help: "Get a quick risk level and file-by-file summary of a submitted diff before a deeper human look.", to: "/pr", cta: "Open PR Review" },
];

export function UseCases({ limit }) {
  return (
    <ul className="st-grid st-g3">
      {USE_CASES.slice(0, limit || USE_CASES.length).map((u) => (
        <li key={u.who} className="st-card uc" data-reveal>
          <span className="uc-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[u.ic]} /></svg></span>
          <h3>{u.who}</h3>
          <p className="pain">&ldquo;{u.pain}&rdquo;</p>
          <p className="help">{u.help}</p>
          <Link to={u.to} className="stb sm">{u.cta}</Link>
        </li>
      ))}
    </ul>
  );
}
