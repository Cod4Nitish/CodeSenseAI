/**
 * CodeSense AI - landing page (route: /welcome).
 * Styled only with App.css custom properties (see site/site.css + landing.css).
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SitePage from "./site/common";
import "./landing.css";

const DEMO_LINES = [
  { t: "import sqlite3, hashlib", i: null },
  { t: 'API_KEY = "sk-live-51Hxxxx"', i: 0 },
  { t: "def login(db, user, pw):", i: null },
  { t: "  q = \"SELECT * FROM users WHERE name='\" + user + \"'\"", i: 1 },
  { t: "  h = hashlib.md5(pw.encode())", i: 2 },
  { t: "  try: return check(db, q, h)", i: null },
  { t: "  except: pass", i: 3 },
];
const DEMO_ISSUES = [
  { line: 2, sev: "high", pen: 2.5, t: "Hardcoded secret", tag: "CWE-798", src: "AI + Rules" },
  { line: 4, sev: "high", pen: 2.5, t: "SQL injection", tag: "CWE-89", src: "AI + Rules" },
  { line: 5, sev: "medium", pen: 0.8, t: "Weak hash (MD5)", tag: "CWE-327", src: "Rules" },
  { line: 7, sev: "low", pen: 0.2, t: "Bare except", tag: "CWE-396", src: "Rules" },
];

function Demo() {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [scan, setScan] = useState(reduce ? DEMO_LINES.length : -1);
  const [shown, setShown] = useState(reduce ? 4.2 : 10);
  const found = DEMO_LINES.map((l, idx) => (l.i !== null && idx <= scan ? l.i : null)).filter((x) => x !== null);
  const target = Math.round((10 - found.reduce((s, k) => s + DEMO_ISSUES[k].pen, 0)) * 10) / 10;

  useEffect(() => {
    if (reduce) return;
    let id;
    const tick = () => setScan((s) => (s >= DEMO_LINES.length + 4 ? -1 : s + 1));
    id = setInterval(tick, 750);
    return () => clearInterval(id);
  }, [reduce]);

  const raf = useRef(0);
  useEffect(() => {
    if (reduce) { setShown(target); return; }
    cancelAnimationFrame(raf.current);
    const step = () => {
      setShown((v) => {
        const d = target - v;
        if (Math.abs(d) < 0.05) return target;
        raf.current = requestAnimationFrame(step);
        return v + d * 0.12;
      });
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduce]);

  const C = 2 * Math.PI * 38;
  const tone = shown >= 7 ? "var(--st-ok)" : shown >= 5 ? "var(--st-warn)" : "var(--st-err)";
  return (
    <div className="lp-demo" role="img" aria-label="Animated demo: code is scanned, issues are underlined, and the quality score drops from 10 to 4.2">
      <div className="mk">
        <div className="mk-bar"><span className="mk-dot" /><span className="mk-dot" /><span className="mk-dot" /><span style={{ marginLeft: 6 }}>login.py</span>
          <span style={{ marginLeft: "auto" }} className="st-tag ac">{scan >= DEMO_LINES.length ? "Done" : "Scanning"}</span></div>
        <div className="mk-body">
          <div className="mk-code lp-code">
            {DEMO_LINES.map((l, idx) => {
              const hit = l.i !== null && idx <= scan;
              return (
                <div key={idx} className={`mk-ln lp-ln${idx === scan ? " scanning" : ""}`}>
                  <i>{idx + 1}</i>
                  <span className={hit ? `mk-sq${DEMO_ISSUES[l.i].sev === "high" ? "" : " w"}` : undefined}>{l.t}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="lp-side">
        <div className="lp-gauge">
          <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
            <circle cx="50" cy="50" r="38" fill="none" stroke="var(--st-border)" strokeWidth="9" />
            <circle cx="50" cy="50" r="38" fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - shown / 10)} transform="rotate(-90 50 50)" />
          </svg>
          <div className="lp-gnum">{shown.toFixed(1)}<small>/10</small></div>
        </div>
        <ul className="lp-cards">
          {found.map((k) => {
            const it = DEMO_ISSUES[k];
            return (
              <li key={k} className={`mk-iss ${it.sev === "high" ? "" : it.sev === "medium" ? "w" : "o"} lp-pop`}>
                <div><b>{it.t} <span style={{ color: "var(--st-muted)", fontWeight: 400 }}>line {it.line}</span></b>
                  <div className="mk-tags"><span className={`st-tag ${it.sev === "high" ? "hi" : it.sev === "medium" ? "md" : ""}`}>{it.sev}</span><span className="st-tag">{it.tag}</span><span className="st-tag ok">{it.src}</span></div></div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const SHOTS = [
  { img: "review", title: "Find", text: "Every issue pinned to its line, with CWE tags.", alt: "CodeSense workspace showing a 4.2 out of 10 score and three security issues" },
  { img: "score", title: "Fix", text: "One click. Score 42% to 90%.", alt: "After auto-fix the quality score rises to 9.0 out of 10, grade A" },
  { img: "pr", title: "Review PRs", text: "Verified comments, no made-up lines.", alt: "Pull request review with verified high-risk comments" },
];

const FEATURES = [
  ["AI", "Two engines", "AI plus fixed rules"],
  ["✦", "Auto-fix", "Fix, then re-score"],
  ["PR", "GitHub PRs", "Paste a PR link"],
  ["अ", "Hinglish", "Explained simply"],
  ["?", "Quizzes", "Learn by finding bugs"],
  ["▤", "History", "Dashboard of reviews"],
];

const STEPS = [
  ["Paste", "your code or a PR link"],
  ["Review", "in a few seconds"],
  ["Fix", "and watch the score rise"],
];

const FAQ = [
  ["Do I need an account?", "No. Just paste your code. Sign in only if you want to save your history."],
  ["Which languages work?", "Python, JavaScript, TypeScript, Java, C++ and Go."],
  ["Can AI be wrong?", "Yes. Treat it as a fast first pass and check the findings."],
];

function Shot({ img, title, text, alt }) {
  return (
    <figure className="lp-shot" data-reveal>
      <div className="lp-frame">
        <div className="lp-frame-bar" aria-hidden="true"><i /><i /><i /></div>
        <img src={`/img/${img}.webp`} alt={alt} width="1280" height="764" loading="lazy" decoding="async" />
      </div>
      <figcaption><b>{title}</b><span>{text}</span></figcaption>
    </figure>
  );
}

export default function Landing() {
  return (
    <SitePage title="Welcome">
      <section className="st-sec lp-hero" aria-labelledby="hero-h" style={{ paddingTop: 40 }}>
        <div className="st-wrap lp-hero-grid">
          <div>
            <span className="st-eyebrow">Free AI code review</span>
            <h1 id="hero-h">Catch bugs <span className="st-grad">before they ship</span></h1>
            <p className="st-lead">Paste code. Get a score, simple explanations and one-click fixes.</p>
            <div className="stb-row" style={{ marginTop: 24 }}>
              <Link to="/app" className="stb primary">Start reviewing</Link>
              <Link to="/learn" className="stb">I'm a beginner</Link>
            </div>
            <p className="lp-note">No sign-up needed.</p>
          </div>
          <Demo />
        </div>
      </section>

      <section className="st-sec alt" aria-labelledby="see-h">
        <div className="st-wrap">
          <div className="st-sec-head" data-reveal><span className="st-eyebrow">See it work</span><h2 id="see-h">Find it. Fix it. Done.</h2></div>
          <div className="lp-shots">{SHOTS.map((x) => <Shot key={x.img} {...x} />)}</div>
        </div>
      </section>

      <section className="st-sec" aria-labelledby="feat-h">
        <div className="st-wrap">
          <div className="st-sec-head" data-reveal><span className="st-eyebrow">Features</span><h2 id="feat-h">Everything in one place</h2></div>
          <ul className="lp-feats">
            {FEATURES.map(([ic, t, d]) => (
              <li key={t} data-reveal><span className="lp-ic" aria-hidden="true">{ic}</span><b>{t}</b><span>{d}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="st-sec alt" aria-labelledby="how-h">
        <div className="st-wrap">
          <div className="st-sec-head" data-reveal><span className="st-eyebrow">How it works</span><h2 id="how-h">Three steps</h2></div>
          <ol className="lp-steps">
            {STEPS.map(([t, d], i) => (
              <li key={t} data-reveal><span className="lp-n">{i + 1}</span><b>{t}</b><span>{d}</span></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="st-sec" aria-labelledby="path-h">
        <div className="st-wrap">
          <div className="st-sec-head" data-reveal><span className="st-eyebrow">Start here</span><h2 id="path-h">Pick your path</h2></div>
          <div className="st-grid st-g2">
            <div className="st-card lp-path" data-reveal>
              <h3>Learning to code?</h3>
              <p>Plain-language help in English or Hinglish, plus quizzes.</p>
              <Link to="/learn" className="stb primary">Start Learn mode</Link>
            </div>
            <div className="st-card lp-path" data-reveal>
              <h3>Reviewing real code?</h3>
              <p>Editor, scored reports and pull-request review.</p>
              <div className="stb-row"><Link to="/app" className="stb primary">Start reviewing</Link><Link to="/pr?demo=1" className="stb">Try PR review</Link></div>
            </div>
          </div>
        </div>
      </section>

      <section className="st-sec alt" aria-labelledby="faq-h">
        <div className="st-wrap">
          <div className="st-sec-head" data-reveal><span className="st-eyebrow">FAQ</span><h2 id="faq-h">Quick answers</h2></div>
          <div className="lp-faq" data-reveal>
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="st-sec" aria-labelledby="cta-h">
        <div className="st-wrap" style={{ textAlign: "center" }} data-reveal>
          <h2 id="cta-h">Review your first file in a minute</h2>
          <div className="stb-row" style={{ justifyContent: "center", marginTop: 20 }}>
            <Link to="/app" className="stb primary">Review my first file</Link>
            <Link to="/about" className="stb">About the project</Link>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
