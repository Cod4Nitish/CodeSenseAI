/**
 * CodeSense AI - Learner mode (/learn): Understand, Quiz, Today.
 * Mobile-first. Every AI call handles 429/502 with a friendly message + Retry.
 * No fake AI results anywhere. by Nitish Kumar Singh
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ai, analyzeCode } from "../api";
import { friendlyError } from "../lib/errors";
import { TIPS, tipForDate } from "../lib/tips";
import {
  currentStreak, recordQuiz, resetProgress, useProgress, useTongue, weekActivity,
} from "../lib/progress";
import SimplifyBlock from "../components/SimplifyBlock";
import { EngineChip } from "../components/IssueCard";
import "./learn.css";

const LANGS = [["python", "Python"], ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["java", "Java"], ["cpp", "C++"], ["go", "Go"]];
const STARTER = `def average(numbers):
    total = 0
    for n in numbers:
        total += n
    return total / len(numbers)

print(average([]))
`;
const SEV_LABEL = { high: "Serious", medium: "Worth fixing", low: "Small" };

function ErrorBox({ error, onRetry }) {
  const fe = friendlyError(error);
  return (
    <div className="ai-error lc-error" role="alert">
      <strong>{fe.title}</strong>
      <p>{fe.hint}</p>
      <button type="button" className="btn btn-primary tap" onClick={onRetry}>Retry</button>
    </div>
  );
}

function TongueToggle() {
  const [tongue, setTongue] = useTongue();
  return (
    <div className="lc-seg" role="group" aria-label="Explanation language">
      {[["english", "English"], ["hinglish", "Hinglish"]].map(([id, label]) => (
        <button key={id} type="button" className="tap" aria-pressed={tongue === id} onClick={() => setTongue(id)}>{label}</button>
      ))}
    </div>
  );
}

function Chips({ label, value, options, onChange }) {
  return (
    <div className="lc-chips" role="group" aria-label={label}>
      <span className="lc-label">{label}</span>
      {options.map(([id, text]) => (
        <button key={id} type="button" className={`lc-chip tap ${value === id ? "on" : ""}`} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>
      ))}
    </div>
  );
}

/* ── a) Understand ─────────────────────────────────────────── */
function Understand() {
  const [code, setCode] = useState(() => { try { return localStorage.getItem("codesense_learn_code") ?? STARTER; } catch { return STARTER; } });
  const [language, setLanguage] = useState("python");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState(null);
  const [analyzedCode, setAnalyzedCode] = useState("");

  useEffect(() => { try { localStorage.setItem("codesense_learn_code", code); } catch { /* ignore */ } }, [code]);

  async function analyze() {
    if (!code.trim() || busy) return;
    setBusy(true); setError(""); setRes(null);
    try {
      const r = await analyzeCode(code, language, { persist: false });
      setRes(r); setAnalyzedCode(code);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally { setBusy(false); }
  }

  return (
    <section aria-label="Understand your code" className="lc-stack">
      <div className="lc-card">
        <label className="lc-label" htmlFor="lc-lang">Language</label>
        <select id="lc-lang" className="lc-select tap" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="lc-label" htmlFor="lc-code">Paste or type your code</label>
        <textarea id="lc-code" className="lc-textarea" value={code} spellCheck={false} autoCapitalize="off" autoCorrect="off"
          onChange={(e) => setCode(e.target.value)} rows={9} placeholder="Paste some code here..." />
        <button type="button" className="btn btn-primary tap lc-wide" onClick={analyze} disabled={busy || !code.trim()}>
          {busy ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {busy && <div className="ai-busy" role="status"><span className="ai-spinner" aria-hidden="true" />Reading your code...</div>}
      {error && <ErrorBox error={error} onRetry={analyze} />}
      {res?.engine === "rules-only" && (
        <div className="engine-banner" role="status">AI engine is unavailable right now - showing rule-based findings only.</div>
      )}
      {res && res.issues?.length === 0 && (
        <div className="lc-card lc-good"><strong>No problems found.</strong> Nice work. Try the Quiz tab next.</div>
      )}
      {res?.issues?.map((issue, i) => (
        <article key={`${i}-${issue.title}`} className={`lc-card lc-issue sev-${issue.severity}`}>
          <header>
            <span className={`severity-badge badge-${issue.severity}`}>{SEV_LABEL[issue.severity] || issue.severity}</span>
            {issue.line != null && <span className="lc-line">line {issue.line}</span>}
            <EngineChip source={issue.source} />
          </header>
          <h3>{issue.title}</h3>
          <SimplifyBlock code={analyzedCode} language={language} issue={issue} />
        </article>
      ))}
    </section>
  );
}

/* ── b) Quiz ───────────────────────────────────────────────── */
function Quiz() {
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("easy");
  const [topic, setTopic] = useState("");
  const [tongue] = useTongue();
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });
  const topRef = useRef(null);

  const load = useCallback(async () => {
    setBusy(true); setError(""); setPicked(null);
    try {
      const r = await ai.quiz({ language, difficulty, topic, tongue });
      if (!r || !r.code || !Array.isArray(r.options)) throw new Error("The AI sent an incomplete question.");
      setQ(r);
      topRef.current?.scrollIntoView?.({ block: "nearest" });
    } catch (err) {
      setError(err.message || "Request failed");
    } finally { setBusy(false); }
  }, [language, difficulty, topic, tongue]);

  function answer(line) {
    if (picked != null || !q) return;
    const ok = Number(line) === Number(q.bug_line);
    setPicked(line);
    recordQuiz(ok);
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }));
  }

  const correct = q && picked != null && Number(picked) === Number(q.bug_line);
  const lines = q ? q.code.replace(/\n$/, "").split("\n") : [];

  return (
    <section aria-label="Find the bug quiz" className="lc-stack" ref={topRef}>
      <div className="lc-card">
        <Chips label="Language" value={language} onChange={setLanguage} options={LANGS.slice(0, 5)} />
        <Chips label="Level" value={difficulty} onChange={setDifficulty} options={[["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]]} />
        <Chips label="Topic" value={topic} onChange={setTopic}
          options={[["", "Any"], ["security", "Security"], ["loops", "Loops"], ["errors", "Errors"], ["strings", "Strings"]]} />
        <div className="lc-score" aria-live="polite">
          <span>Score <b>{score.right}/{score.total}</b></span>
          <span>Streak <b>{score.streak}</b></span>
        </div>
        {!q && !busy && (
          <button type="button" className="btn btn-primary tap lc-wide" onClick={load}>Start quiz</button>
        )}
      </div>

      {busy && <div className="ai-busy" role="status"><span className="ai-spinner" aria-hidden="true" />Writing a question...</div>}
      {error && <ErrorBox error={error} onRetry={load} />}

      {q && !busy && (
        <div className="lc-card">
          <h3 className="lc-q">{q.question}</h3>
          <pre className="lc-code" aria-label="Code to inspect">
            {lines.map((l, i) => {
              const n = i + 1;
              const isBug = picked != null && n === Number(q.bug_line);
              return (
                <span key={n} className={`lc-codeline ${isBug ? "bug" : ""}`}>
                  <span className="ln" aria-hidden="true">{n}</span>{l || " "}{"\n"}
                </span>
              );
            })}
          </pre>
          <div className="lc-opts" role="group" aria-label="Which line has the bug?">
            {q.options.slice(0, 4).map((o) => {
              const state = picked == null ? "" : Number(o) === Number(q.bug_line) ? "right" : Number(o) === Number(picked) ? "wrong" : "dim";
              return (
                <button key={o} type="button" className={`lc-opt tap ${state}`} disabled={picked != null} onClick={() => answer(o)}>
                  Line {o}
                </button>
              );
            })}
          </div>
          {picked != null && (
            <div className={`lc-reveal ${correct ? "ok" : "bad"}`} role="status">
              <strong>{correct ? "Correct!" : `Not quite. The bug is on line ${q.bug_line}.`}</strong>
              <p>{q.explanation}</p>
              {q.fix && <pre className="lc-fix"><code>{q.fix}</code></pre>}
              <button type="button" className="btn btn-primary tap lc-wide" onClick={load}>Next question</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ── c) Today ──────────────────────────────────────────────── */
function WeekChart({ week }) {
  const max = Math.max(1, ...week.map((d) => d.n));
  return (
    <svg className="lc-chart" viewBox="0 0 210 84" role="img"
      aria-label={"Activity this week: " + week.map((d) => `${d.label} ${d.n}`).join(", ")}>
      {week.map((d, i) => {
        const h = d.n ? Math.max(6, (d.n / max) * 56) : 3;
        return (
          <g key={d.key} transform={`translate(${i * 30 + 4} 0)`}>
            <rect x="0" y={62 - h} width="22" height={h} rx="2" className={d.n ? "bar on" : "bar"} />
            <text x="11" y="78" textAnchor="middle" className="bar-lbl">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Today() {
  const [tongue, setTongue] = useTongue();
  const { tip, index } = tipForDate();
  const p = useProgress();
  const streak = currentStreak(p.days);
  const acc = p.quizzes ? Math.round((p.correct / p.quizzes) * 100) : 0;
  const [confirm, setConfirm] = useState(false);

  return (
    <section aria-label="Tip of the day and progress" className="lc-stack">
      <div className="lc-card lc-tip">
        <span className="lc-label">Tip of the day #{index + 1} of {TIPS.length} - {tip.tag}</span>
        <p className="lc-tip-text" lang={tongue === "hinglish" ? "hi-Latn" : "en"}>{tongue === "hinglish" ? tip.hi : tip.en}</p>
        <button type="button" className="lc-chip tap" onClick={() => setTongue(tongue === "hinglish" ? "english" : "hinglish")}>
          {tongue === "hinglish" ? "Show in English" : "Hinglish mein dikhao"}
        </button>
      </div>

      <div className="lc-card">
        <span className="lc-label">Your progress</span>
        <dl className="lc-stats">
          <div><dt>Quizzes answered</dt><dd>{p.quizzes}</dd></div>
          <div><dt>Accuracy</dt><dd>{acc}%</dd></div>
          <div><dt>Day streak</dt><dd>{streak}</dd></div>
          <div><dt>Best streak</dt><dd>{Math.max(p.best, streak)}</dd></div>
          <div><dt>Bugs understood</dt><dd>{p.understood}</dd></div>
        </dl>
        <WeekChart week={weekActivity(p)} />
        {confirm ? (
          <div className="lc-confirm" role="alert">
            <span>Delete all progress on this device?</span>
            <button type="button" className="btn btn-primary tap" onClick={() => { resetProgress(); setConfirm(false); }}>Yes, reset</button>
            <button type="button" className="btn btn-ghost tap" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost tap" onClick={() => setConfirm(true)}>Reset progress</button>
        )}
        <p className="lc-note">Stored only in this browser. Nothing is sent anywhere.</p>
      </div>
    </section>
  );
}

/* ── page ──────────────────────────────────────────────────── */
const TABS = [["understand", "Understand"], ["quiz", "Quiz"], ["today", "Today"]];

export default function Learn() {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem("codesense_learn_tab") || "understand"; } catch { return "understand"; } });
  useEffect(() => { try { localStorage.setItem("codesense_learn_tab", tab); } catch { /* ignore */ } }, [tab]);
  useEffect(() => { const t = document.title; document.title = "Learn - CodeSense AI"; return () => { document.title = t; }; }, []);

  function onKey(e) {
    const i = TABS.findIndex(([id]) => id === tab);
    if (e.key === "ArrowRight") setTab(TABS[(i + 1) % 3][0]);
    if (e.key === "ArrowLeft") setTab(TABS[(i + 2) % 3][0]);
  }

  return (
    <main className="page lc-page">
      <div className="lc-wrap">
        <header className="lc-hero">
          <h1 className="lc-title">Learn to code safely</h1>
          <p>Paste code, get plain-language help, then test yourself.</p>
          <TongueToggle />
        </header>
        <div className="lc-tabs" role="tablist" aria-label="Learn sections" onKeyDown={onKey}>
          {TABS.map(([id, label]) => (
            <button key={id} id={`tab-${id}`} role="tab" type="button" className="tap" aria-selected={tab === id}
              aria-controls={`panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "understand" && <Understand />}
          {tab === "quiz" && <Quiz />}
          {tab === "today" && <Today />}
        </div>
      </div>
    </main>
  );
}
