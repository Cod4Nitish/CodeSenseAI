/**
 * Loader - shown while a review runs. Instead of a blank spinner it shows:
 *   - a live pipeline (read, rules, AI, score) with a timer and a smooth progress bar
 *   - a "while you wait" lesson card: what a bug is, how it happens, risky vs safer code
 * by Nitish Singh
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { LESSONS, TAG_LABEL } from "../lib/lessons";

const STAGES = [
  { label: "Reading your code", at: 0 },
  { label: "Running rule checks", at: 1.2 },
  { label: "AI is reviewing", at: 2.6 },
  { label: "Cross-checking and scoring", at: 9 },
];
const LESSON_MS = 7000;

function pickStart() {
  try {
    const n = Number(sessionStorage.getItem("cs_lesson") || "-1");
    const next = (n + 1 + Math.floor(Math.random() * 3)) % LESSONS.length;
    sessionStorage.setItem("cs_lesson", String(next));
    return next;
  } catch {
    return Math.floor(Math.random() * LESSONS.length);
  }
}

export default function Loader() {
  const reduced = useMemo(() => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  }, []);
  const [sec, setSec] = useState(0);
  const [idx, setIdx] = useState(pickStart);
  const [hi, setHi] = useState(() => {
    try { return localStorage.getItem("cs_lesson_lang") === "hi"; } catch { return false; }
  });
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0); // restarts the lesson timer bar
  const startRef = useRef(performance.now());

  // elapsed seconds (0.1s resolution, drives stages and the progress bar)
  useEffect(() => {
    const id = window.setInterval(() => setSec((performance.now() - startRef.current) / 1000), 100);
    return () => window.clearInterval(id);
  }, []);

  // auto-advance the lesson
  useEffect(() => {
    if (paused) return undefined;
    const id = window.setTimeout(() => { setIdx((i) => (i + 1) % LESSONS.length); setTick((t) => t + 1); }, LESSON_MS);
    return () => window.clearTimeout(id);
  }, [idx, paused, tick]);

  const stage = STAGES.reduce((a, s, i) => (sec >= s.at ? i : a), 0);
  const pct = Math.round(94 * (1 - Math.exp(-sec / 7))); // eases toward ~94%, never claims 100% early
  const lesson = LESSONS[idx];
  const t = hi ? lesson.hi : lesson.en;

  function go(d) { setIdx((i) => (i + d + LESSONS.length) % LESSONS.length); setTick((x) => x + 1); }
  function toggleLang() {
    setHi((v) => { try { localStorage.setItem("cs_lesson_lang", v ? "en" : "hi"); } catch { /* ignore */ } return !v; });
  }

  let note = "Usually takes a few seconds.";
  if (sec > 10) note = "The AI is a bit busy. Retrying automatically, hang on.";
  if (sec > 25) note = "Still working. Almost there.";

  return (
    <div className="ld" role="status" aria-live="polite" aria-label="Reviewing your code">
      {/* ---- live progress ---- */}
      <div className="ld-top">
        <div className="ld-scan" aria-hidden="true">
          {[78, 56, 90, 44, 70, 62].map((w, i) => (
            <i key={i} style={{ width: `${w}%`, animationDelay: `${i * 0.18}s` }} />
          ))}
          {!reduced && <b />}
        </div>
        <div className="ld-stat">
          <div className="ld-title">{STAGES[stage].label}<span className="ld-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></div>
          <div className="ld-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          <div className="ld-meta"><span>{pct}%</span><span>{Math.floor(sec)}s</span></div>
        </div>
      </div>

      <ol className="ld-stages" aria-hidden="true">
        {STAGES.map((s, i) => (
          <li key={s.label} className={i < stage ? "done" : i === stage ? "on" : ""}>
            <span className="ld-tick">{i < stage ? "✓" : i + 1}</span>{s.label}
          </li>
        ))}
      </ol>
      <p className="ld-note">{note}</p>

      {/* ---- while you wait ---- */}
      <section className="ld-card" aria-label="While you wait: a quick lesson"
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
        <div className="ld-card-head">
          <span className="ld-kicker">While you wait</span>
          <button type="button" className="ld-lang" onClick={toggleLang} aria-label="Switch language">
            <b className={!hi ? "on" : ""}>EN</b><b className={hi ? "on" : ""}>Hinglish</b>
          </button>
        </div>

        <div className="ld-lesson" key={lesson.id}>
          <div className="ld-lesson-title">
            <span className={`ld-tag ${lesson.tag}`}>{TAG_LABEL[lesson.tag]}</span>
            <h3>{lesson.title}</h3>
          </div>
          <p><b>{hi ? "Kya hai: " : "What it is: "}</b>{t.what}</p>
          <p><b>{hi ? "Kaise hota hai: " : "How it happens: "}</b>{t.how}</p>
          <div className="ld-code ld-bad"><span>{hi ? "Risky" : "Risky"}</span><pre>{lesson.bad}</pre></div>
          <div className="ld-code ld-good"><span>{hi ? "Safe" : "Safer"}</span><pre>{lesson.good}</pre></div>
        </div>

        <div className="ld-card-foot">
          <button type="button" className="ld-nav" onClick={() => go(-1)} aria-label="Previous lesson">‹</button>
          <div className="ld-pips" aria-hidden="true">
            {LESSONS.map((l, i) => <i key={l.id} className={i === idx ? "on" : ""} />)}
          </div>
          <button type="button" className="ld-nav" onClick={() => go(1)} aria-label="Next lesson">›</button>
        </div>
        {!reduced && !paused && <div className="ld-timer" key={`${idx}-${tick}`} aria-hidden="true" style={{ animationDuration: `${LESSON_MS}ms` }} />}
      </section>
    </div>
  );
}
