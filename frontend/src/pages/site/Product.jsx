/** /product - complete product tour with mock UI panels (pure CSS, no screenshots). */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SitePage, { TryBox, UseCases } from "./common";

const NAV = [
  ["overview", "Overview"], ["try", "Try it"], ["features", "Features"], ["workspace", "Workspace"],
  ["pr-review", "PR Review"], ["assistant", "AI Assistant"], ["learn", "Learn"], ["history", "History"],
  ["pwa", "Install"], ["engine", "Detection engine"], ["compare", "Compare"], ["use-cases", "Who uses it"],
];

const FEATURES = [
  ["Monaco editor with squiggles", "Issues are underlined on the exact line, like in a real IDE."],
  ["Score and grade", "10 - 2.5 x high - 0.8 x medium - 0.2 x low, clamped to 0 to 10."],
  ["CWE / OWASP tags", "Security findings reference standard weakness classes."],
  ["AI + rule engine", "Two independent detectors, merged and de-duplicated."],
  ["PR / diff review", "Walkthrough, risk level, file summary and line comments."],
  ["Hallucination guard", "PR comments are checked against lines that really changed."],
  ["Committable suggestions", "Fixes shown as code you can copy straight in."],
  ["AI assistant", "Chat, auto-fix with diff preview, explain code, generate tests."],
  ["Learn mode", "Simple explanations in English or Hinglish, quizzes, daily tip."],
  ["History and dashboard", "Sign in to keep a private record of past reviews."],
  ["Markdown export", "Download a review as a .md file."],
  ["Install as an app", "Works on desktop and phone as a PWA."],
];

const RULES = [
  ["Hardcoded secrets", "CWE-798", "hi"], ["SQL injection", "CWE-89", "hi"], ["eval / exec", "CWE-95", "hi"],
  ["Shell command injection", "CWE-78", "hi"], ["Insecure deserialization", "CWE-502", "hi"],
  ["Weak hash", "CWE-327", "md"], ["TLS verification off", "CWE-295", "hi"], ["Debug mode enabled", "CWE-489", "md"],
  ["XSS via innerHTML", "CWE-79", "hi"], ["Bare except", "CWE-396", "low"], ["Silently ignored exception", "CWE-390", "low"],
  ["Mutable default argument", "CWE-1321", "md"], ["Possible division by zero", "CWE-369", "md"], ["Python syntax errors", "", "hi"],
];

const COMPARE = [
  ["Understands intent and logic", "No", "Yes", "Yes"],
  ["Same result every run", "Yes", "No", "Rules: yes. AI: reviewed"],
  ["Can invent problems", "Rarely", "Yes", "Cross-checked, guarded"],
  ["Explains why, with a fix", "Terse", "Yes", "Yes, plus CWE tags"],
  ["Single quality score", "Rarely", "No", "Yes, fixed formula"],
  ["Works without setup", "Needs config", "Yes", "Paste and go"],
];

function Sec({ id, eyebrow, title, children, alt }) {
  return (
    <section id={id} className={`st-sec st-anchor${alt ? " alt" : ""}`} aria-labelledby={`${id}-h`}>
      <div className="st-wrap">
        <div className="st-sec-head" data-reveal>
          <span className="st-eyebrow">{eyebrow}</span>
          <h2 id={`${id}-h`}>{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Split({ text, children }) {
  return (
    <div className="st-grid st-g2" style={{ alignItems: "center", gap: 28 }}>
      <div data-reveal>{text}</div>
      <div data-reveal>{children}</div>
    </div>
  );
}

const Bar = ({ t }) => (
  <div className="mk-bar"><span className="mk-dot" /><span className="mk-dot" /><span className="mk-dot" /><span style={{ marginLeft: 6 }}>{t}</span></div>
);

function MockWorkspace() {
  return (
    <div className="mk" role="img" aria-label="Mock of the workspace: code with underlined issues, score and issue cards">
      <Bar t="app.py" />
      <div className="mk-body">
        <div className="mk-code">
          <div className="mk-ln"><i>1</i><span>API_KEY = <span className="mk-sq">&quot;sk-live-51H...&quot;</span></span></div>
          <div className="mk-ln"><i>2</i><span>q = <span className="mk-sq">&quot;SELECT * ... &quot; + user</span></span></div>
          <div className="mk-ln"><i>3</i><span>h = <span className="mk-sq w">hashlib.md5(pw)</span></span></div>
        </div>
        <div className="mk-row"><span className="st-tag">2 high · 1 medium</span><b style={{ color: "var(--st-bright)" }}>Score 4.2 / 10 · D</b></div>
        <div className="mk-iss"><div><b>SQL injection</b><span>User input is concatenated into a query.</span>
          <div className="mk-tags"><span className="st-tag hi">high</span><span className="st-tag">CWE-89</span><span className="st-tag">OWASP A03</span><span className="st-tag md">AI + Rules</span></div></div></div>
        <div className="mk-iss w"><div><b>Weak hash (MD5)</b><span>Use a salted, slow password hash.</span>
          <div className="mk-tags"><span className="st-tag md">medium</span><span className="st-tag">CWE-327</span><span className="st-tag ok">Rules</span></div></div></div>
      </div>
    </div>
  );
}

function MockPR() {
  return (
    <div className="mk" role="img" aria-label="Mock of a pull request review with diff, risk level and a verified comment">
      <Bar t="PR review" />
      <div className="mk-body">
        <div className="mk-row"><span className="st-tag md">Risk: medium</span><span className="st-tag">2 files changed</span></div>
        <div className="mk-code">
          <div className="mk-ln mk-del"><i>-</i><span>q = &quot;SELECT ...&quot; % uid</span></div>
          <div className="mk-ln mk-add"><i>+</i><span>q = &quot;SELECT ...&quot; + uid</span></div>
        </div>
        <div className="mk-iss"><div><b>Line 42: injection risk</b><span>Suggested: use a parameterised query.</span>
          <div className="mk-tags"><span className="st-tag ok">Verified on changed line</span><span className="st-tag">Suggestion</span></div></div></div>
        <div className="mk-tags"><span className="st-tag">Walkthrough</span><span className="st-tag">File summary</span><span className="st-tag">Export .md</span></div>
      </div>
    </div>
  );
}

function MockChat() {
  return (
    <div className="mk" role="img" aria-label="Mock of the AI assistant chat with an auto-fix diff">
      <Bar t="AI assistant" />
      <div className="mk-body">
        <div className="mk-bub u">Fix the SQL injection on line 2</div>
        <div className="mk-bub a">Use a parameterised query:
          <div className="mk-code" style={{ marginTop: 6 }}>
            <div className="mk-ln mk-del"><i>-</i><span>q = &quot;...&quot; + user</span></div>
            <div className="mk-ln mk-add"><i>+</i><span>db.execute(&quot;... ?&quot;, (user,))</span></div>
          </div></div>
        <div className="mk-tags"><span className="st-tag ac">Auto-fix</span><span className="st-tag ac">Explain</span><span className="st-tag ac">Generate tests</span></div>
      </div>
    </div>
  );
}

function MockLearn() {
  return (
    <div className="mk" role="img" aria-label="Mock of Learn mode with a simple explanation and a find-the-bug quiz">
      <Bar t="Learn mode" />
      <div className="mk-body">
        <div className="mk-row"><span className="st-tag ac">English</span><span className="st-tag ac">Hinglish</span></div>
        <div className="mk-bub a">Yeh code user ka input seedha query mein jod deta hai, isliye hacker query badal sakta hai.</div>
        <div className="mk-iss w"><div><b>Find the bug</b><span>Which line is unsafe? Pick one.</span></div></div>
        <div className="mk-row"><span className="st-tag">Daily tip</span><span className="st-tag ok">Progress tracked</span></div>
      </div>
    </div>
  );
}

function MockHistory() {
  return (
    <div className="mk" role="img" aria-label="Mock of the dashboard with a bar chart and audit rows">
      <Bar t="Dashboard" />
      <div className="mk-body">
        <div className="mk-bars" aria-hidden="true">{[30, 45, 38, 60, 52, 75, 68].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
        <div className="mk-row"><span>auth.py</span><span className="st-tag md">C</span><span className="st-tag">Python</span></div>
        <div className="mk-row"><span>cart.js</span><span className="st-tag ok">A</span><span className="st-tag">JavaScript</span></div>
      </div>
    </div>
  );
}

function MockPWA() {
  return (
    <div className="mk" role="img" aria-label="Mock of a phone with the app installed" style={{ maxWidth: 240, marginInline: "auto" }}>
      <Bar t="CodeSense AI" />
      <div className="mk-body" style={{ placeItems: "center", padding: 22 }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: "linear-gradient(135deg,var(--st-accent),var(--st-ok))", display: "grid", placeItems: "center", color: "var(--st-base)", fontWeight: 800 }}>CS</div>
        <b style={{ color: "var(--st-bright)" }}>Install CodeSense AI</b>
        <span className="st-tag ac">Add to home screen</span>
      </div>
    </div>
  );
}

export default function Product() {
  const [active, setActive] = useState("overview");
  const { hash } = useLocation();

  useEffect(() => {
    const secs = NAV.map(([id]) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver((es) => {
      const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (v) setActive(v.target.id);
    }, { rootMargin: "-120px 0px -60% 0px" });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50);
  }, [hash]);

  const go = (e, id) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActive(id);
  };

  const subnav = (
    <nav className="pn" aria-label="On this page">
      <ul className="st-wrap">
        {NAV.map(([id, l]) => (
          <li key={id}><a href={`#${id}`} className={active === id ? "on" : ""} aria-current={active === id ? "true" : undefined} onClick={(e) => go(e, id)}>{l}</a></li>
        ))}
      </ul>
    </nav>
  );

  return (
    <SitePage title="Product" subnav={subnav}>
      <section id="overview" className="st-sec st-anchor" aria-labelledby="ov-h">
        <div className="st-wrap" data-reveal>
          <span className="st-eyebrow">Product tour</span>
          <h1 id="ov-h">Every part of <span className="st-grad">CodeSense AI</span>, in one scroll</h1>
          <p className="st-lead">Paste code or a pull-request diff and get a scored, line-accurate review that combines an AI model with a deterministic rule engine. Beginners get explanations and quizzes. Developers get a workspace and PR review.</p>
          <div className="stb-row" style={{ marginTop: 22 }}>
            <Link to="/app" className="stb primary">Open Workspace</Link>
            <Link to="/pr" className="stb">PR Review</Link>
            <Link to="/learn" className="stb">Learn mode</Link>
          </div>
        </div>
      </section>

      <section id="try" className="st-sec alt st-anchor" aria-label="Try it now">
        <div className="st-wrap" data-reveal>
          <div className="st-sec-head"><span className="st-eyebrow">Live demo</span><h2>Analyze real code, right here</h2>
            <p className="st-p">This calls the real analysis API. The sample has a hardcoded secret, SQL injection, a weak hash and a bare except.</p></div>
          <TryBox />
        </div>
      </section>

      <Sec id="features" eyebrow="Features" title="What you get">
        <ul className="st-grid st-g3">
          {FEATURES.map(([t, d]) => <li key={t} className="st-card" data-reveal><h3>{t}</h3><p>{d}</p></li>)}
        </ul>
      </Sec>

      <Sec id="workspace" eyebrow="Workspace" title="A review workspace that feels like an IDE" alt>
        <Split text={<>
          <p className="st-p" style={{ marginTop: 0 }}>The Monaco editor underlines problems with squiggles on the exact line. Each issue card explains the problem, shows a suggested fix and carries CWE and OWASP tags where they apply.</p>
          <p className="st-p">Every finding shows its source: <span className="st-tag ac">AI</span> <span className="st-tag ok">Rules</span> or <span className="st-tag md">AI + Rules</span> when both agree.</p>
          <p className="st-p">Quality score = <code style={{ fontFamily: "var(--st-mono)", color: "var(--st-bright)" }}>10 - 2.5*high - 0.8*medium - 0.2*low</code>, clamped to 0 to 10, then mapped to a letter grade.</p>
          <div className="stb-row" style={{ marginTop: 16 }}><Link to="/app" className="stb primary sm">Open Workspace</Link></div>
        </>}><MockWorkspace /></Split>
      </Sec>

      <Sec id="pr-review" eyebrow="PR Review" title="Review a diff before it merges">
        <Split text={<>
          <p className="st-p" style={{ marginTop: 0 }}>Paste a unified diff and get a walkthrough, an overall risk level and a file-by-file summary. Inline comments come with committable suggestions.</p>
          <p className="st-p">A hallucination guard checks each comment against the lines that actually changed, so feedback about code that is not in the diff is dropped. Export the review as a .md file.</p>
          <div className="stb-row" style={{ marginTop: 16 }}><Link to="/pr?demo=1" className="stb primary sm">Try PR review sample</Link></div>
        </>}><MockPR /></Split>
      </Sec>

      <Sec id="assistant" eyebrow="AI Assistant" title="Ask, fix, explain, test" alt>
        <Split text={<>
          <p className="st-p" style={{ marginTop: 0 }}>Chat about your code and its findings. Auto-fix proposes a change and shows it as a diff before you apply it.</p>
          <p className="st-p">Explain turns unfamiliar code into plain language, and Generate tests produces starter unit tests for the code under review. The AI key stays on the server.</p>
          <div className="stb-row" style={{ marginTop: 16 }}><Link to="/app" className="stb primary sm">Open Workspace</Link></div>
        </>}><MockChat /></Split>
      </Sec>

      <Sec id="learn" eyebrow="Learn mode" title="For people who are still learning">
        <Split text={<>
          <p className="st-p" style={{ marginTop: 0 }}>Get a simple explanation of any code in English or Hinglish, then test yourself with a find-the-bug quiz.</p>
          <p className="st-p">A daily tip and progress tracking help build a habit, so mistakes stop turning into habits.</p>
          <div className="stb-row" style={{ marginTop: 16 }}><Link to="/learn" className="stb primary sm">Take a 1-minute quiz</Link></div>
        </>}><MockLearn /></Split>
      </Sec>

      <Sec id="history" eyebrow="History and Dashboard" title="See your quality over time" alt>
        <Split text={<>
          <p className="st-p" style={{ marginTop: 0 }}>Signed-in users get a private record of past reviews with scores, languages and trends. Data is isolated per user.</p>
          <p className="st-p">Open any past review back in the workspace.</p>
          <div className="stb-row" style={{ marginTop: 16 }}><Link to="/dashboard" className="stb primary sm">Open Dashboard</Link></div>
        </>}><MockHistory /></Split>
      </Sec>

      <Sec id="pwa" eyebrow="Install" title="Works on desktop and phone">
        <Split text={<>
          <p className="st-p" style={{ marginTop: 0 }}>CodeSense AI is a responsive web app that can be installed as a PWA from your browser, so it opens like a native app on desktop or phone.</p>
          <div className="stb-row" style={{ marginTop: 16 }}><Link to="/app" className="stb primary sm">Open the app</Link></div>
        </>}><MockPWA /></Split>
      </Sec>

      <Sec id="engine" eyebrow="Detection engine" title="What the rule engine checks" alt>
        <p className="st-p" style={{ margin: "-12px 0 20px" }} data-reveal>These deterministic checks run the same way every time and are merged with the AI findings.</p>
        <ul className="st-grid st-g3">
          {RULES.map(([n, c, s]) => (
            <li key={n} className="st-card mk-row" style={{ padding: 14 }} data-reveal>
              <span style={{ color: "var(--st-bright)", fontWeight: 600 }}>{n}</span>
              {c ? <span className={`st-tag ${s === "hi" ? "hi" : s === "md" ? "md" : ""}`}>{c}</span> : <span className="st-tag hi">Syntax</span>}
            </li>
          ))}
        </ul>
        <div className="st-card" style={{ marginTop: 18 }} data-reveal>
          <h3>Supported languages</h3>
          <p>Python, JavaScript, TypeScript, Java, C++ and Go. Honest note: rule coverage is strongest for Python and JavaScript. For the other languages, findings come mainly from the AI engine.</p>
        </div>
      </Sec>

      <Sec id="compare" eyebrow="Comparison" title="Plain linter vs plain AI vs CodeSense">
        <div style={{ overflowX: "auto" }} data-reveal>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 14 }}>
            <caption style={{ position: "absolute", left: -9999 }}>Qualitative comparison</caption>
            <thead><tr>{["", "Plain linter", "Plain AI", "CodeSense AI"].map((h) => <th key={h} scope="col" style={{ textAlign: "left", padding: "10px 12px", color: "var(--st-bright)", borderBottom: "1px solid var(--st-border)" }}>{h}</th>)}</tr></thead>
            <tbody>{COMPARE.map((r) => (
              <tr key={r[0]}>{r.map((c, i) => i === 0
                ? <th scope="row" key={i} style={{ textAlign: "left", padding: "10px 12px", color: "var(--st-bright)", fontWeight: 600, borderBottom: "1px solid var(--st-border)" }}>{c}</th>
                : <td key={i} style={{ padding: "10px 12px", color: i === 3 ? "var(--st-bright)" : "var(--st-muted)", borderBottom: "1px solid var(--st-border)" }}>{c}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </Sec>

      <Sec id="use-cases" eyebrow="Who uses it" title="Use cases" alt>
        <UseCases />
      </Sec>

      <section className="st-sec" aria-labelledby="cta-h">
        <div className="st-wrap" data-reveal style={{ textAlign: "center" }}>
          <h2 id="cta-h">Ready to try it on your own code?</h2>
          <div className="stb-row" style={{ justifyContent: "center", marginTop: 20 }}>
            <Link to="/app" className="stb primary">Open Workspace</Link>
            <Link to="/pr?demo=1" className="stb">PR Review sample</Link>
            <Link to="/learn" className="stb">Learn mode</Link>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
