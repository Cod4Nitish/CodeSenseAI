/**
 * CodeSense AI — AI Assistant drawer (chat · explain · tests).
 * by Nitish Singh
 *
 * Every call sends the CURRENT editor code. Nothing is faked: on any failure the
 * user sees a friendly message with a Retry button.
 */
import { useEffect, useRef, useState } from "react";
import { ai } from "../api";
import { friendlyError } from "../lib/errors";
import { CopyButton, Markdown } from "../lib/markdown";
import { downloadTextFile } from "../lib/report";

const PROMPTS = ["Why is this unsafe?", "Explain this code", "Make it faster"];
const FRAMEWORKS = ["", "pytest", "unittest", "jest", "vitest", "mocha", "junit", "go test", "gtest"];
const TEST_EXT = { python: "py", javascript: "js", typescript: "ts", java: "java", go: "go", cpp: "cpp", auto: "txt" };

function ErrorBox({ error, onRetry }) {
  const fe = friendlyError(error);
  return (
    <div className="ai-error" role="alert">
      <strong>{fe.title}</strong>
      <p>{fe.hint}</p>
      <button type="button" className="btn btn-primary btn-xs" onClick={onRetry}>↺ Retry</button>
      <details className="error-tech"><summary>technical details</summary><code>{error}</code></details>
    </div>
  );
}

function Busy({ label }) {
  return (
    <div className="ai-busy" role="status" aria-live="polite">
      <span className="ai-spinner" aria-hidden="true" />
      {label}
      <div className="skeleton-list" aria-hidden="true">
        {[0, 1].map((i) => <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 120}ms` }} />)}
      </div>
    </div>
  );
}

/* ── Chat ─────────────────────────────────────────────────── */
function ChatTab({ code, language, issues, onApplyCode }) {
  const [msgs, setMsgs] = useState([]); // {role, content, suggested?, applied?}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastMsg, setLastMsg] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, error]);

  async function send(text, base = msgs) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    setLastMsg(message);
    const history = base.slice(-10).map(({ role, content }) => ({ role, content }));
    const next = [...base, { role: "user", content: message }];
    setMsgs(next);
    setInput("");
    try {
      const r = await ai.chat({
        code, language, message, history,
        issues: issues.map(({ line, type, severity, title, explanation }) => ({ line, type, severity, title, explanation })),
      });
      setMsgs([...next, { role: "assistant", content: r.reply, suggested: r.suggested_code || "" }]);
    } catch (e) {
      setError(e.message || "Chat failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ai-chat">
      <div className="ai-scroll">
        {msgs.length === 0 && (
          <div className="ai-hello">
            <p className="empty-title">Ask about your code</p>
            <p className="empty-sub">The assistant sees your current editor code and findings.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>
            <span className="ai-role">{m.role === "user" ? "you" : "codesense"}</span>
            {m.role === "user" ? <p className="md-p">{m.content}</p> : <Markdown text={m.content} />}
            {m.suggested && (
              <div className="ai-suggest">
                <div className="md-pre">
                  <div className="md-pre-bar"><span>suggested code</span><CopyButton text={m.suggested} /></div>
                  <pre><code>{m.suggested}</code></pre>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={() => { onApplyCode(m.suggested); setMsgs((prev) => prev.map((x, k) => (k === i ? { ...x, applied: true } : x))); }}
                >
                  {m.applied ? "✓ applied to editor" : "Apply to editor"}
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <Busy label="Thinking…" />}
        {error && !busy && <ErrorBox error={error} onRetry={() => send(lastMsg, msgs.slice(0, -1))} />}
        <div ref={endRef} />
      </div>
      <div className="ai-chips">
        {PROMPTS.map((p) => (
          <button key={p} type="button" className="fchip" onClick={() => send(p)} disabled={busy}>{p}</button>
        ))}
      </div>
      <form className="ai-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <label className="sr-only" htmlFor="ai-chat-input">Message</label>
        <input id="ai-chat-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000}
          placeholder="Ask anything about this code…" autoComplete="off" />
        <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

/* ── Explain ──────────────────────────────────────────────── */
function ExplainTab({ code, language }) {
  const [level, setLevel] = useState("beginner");
  const [lang, setLang] = useState("english");
  const [state, setState] = useState({ busy: false, error: "", data: null });

  async function run() {
    setState({ busy: true, error: "", data: null });
    try {
      setState({ busy: false, error: "", data: await ai.explain({ code, language, level, lang }) });
    } catch (e) {
      setState({ busy: false, error: e.message || "Explain failed.", data: null });
    }
  }
  const { busy, error, data } = state;
  return (
    <div className="ai-pane ai-scroll">
      <div className="ai-controls">
        <label>Level
          <select value={level} onChange={(e) => setLevel(e.target.value)} disabled={busy}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
        </label>
        <label>Language
          <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={busy}>
            <option value="english">English</option>
            <option value="hinglish">Hinglish</option>
            <option value="hindi">हिन्दी</option>
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !code.trim()}>
          {busy ? "Explaining…" : "Explain code"}
        </button>
      </div>
      {busy && <Busy label="Reading your code…" />}
      {error && !busy && <ErrorBox error={error} onRetry={run} />}
      {data && !busy && (
        <div className="ai-result">
          <h3>Overview</h3>
          <Markdown text={data.overview} />
          {data.steps.length > 0 && (<><h3>Step by step</h3><ol className="md-list">{data.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></>)}
          {data.complexity && (<><h3>Complexity</h3><Markdown text={data.complexity} /></>)}
          {data.pitfalls.length > 0 && (<><h3>Pitfalls</h3><ul className="md-list">{data.pitfalls.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
        </div>
      )}
      {!data && !busy && !error && <p className="empty-sub">Pick a level and explain the code in your editor.</p>}
    </div>
  );
}

/* ── Tests ────────────────────────────────────────────────── */
function TestsTab({ code, language }) {
  const [framework, setFramework] = useState("");
  const [state, setState] = useState({ busy: false, error: "", data: null });

  async function run() {
    setState({ busy: true, error: "", data: null });
    try {
      setState({ busy: false, error: "", data: await ai.tests({ code, language, framework }) });
    } catch (e) {
      setState({ busy: false, error: e.message || "Test generation failed.", data: null });
    }
  }
  const { busy, error, data } = state;
  const ext = TEST_EXT[language] || "txt";
  return (
    <div className="ai-pane ai-scroll">
      <div className="ai-controls">
        <label>Framework
          <select value={framework} onChange={(e) => setFramework(e.target.value)} disabled={busy}>
            {FRAMEWORKS.map((f) => <option key={f} value={f}>{f || "Best default"}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !code.trim()}>
          {busy ? "Generating…" : "Generate tests"}
        </button>
      </div>
      {busy && <Busy label="Writing tests…" />}
      {error && !busy && <ErrorBox error={error} onRetry={run} />}
      {data && !busy && (
        <div className="ai-result">
          <h3>{data.framework} test file</h3>
          <div className="md-pre">
            <div className="md-pre-bar">
              <span>test_file.{ext}</span>
              <span className="md-actions">
                <CopyButton text={data.test_code} />
                <button type="button" className="copy-btn" onClick={() => downloadTextFile(`codesense_tests.${ext}`, data.test_code, "text/plain;charset=utf-8")}>download</button>
              </span>
            </div>
            <pre><code>{data.test_code}</code></pre>
          </div>
          {data.cases.length > 0 && (<><h3>Cases covered</h3><ul className="md-list">{data.cases.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
        </div>
      )}
      {!data && !busy && !error && <p className="empty-sub">Generate a ready-to-run test file for your code.</p>}
    </div>
  );
}

export default function AIPanel({ open, onClose, code, language, issues, onApplyCode }) {
  const [tab, setTab] = useState("chat");
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const tabs = [["chat", "Chat"], ["explain", "Explain"], ["tests", "Tests"]];
  return (
    <aside className="ai-drawer" role="dialog" aria-label="AI assistant">
      <div className="ai-head">
        <span className="ai-title">◈ AI Assistant</span>
        <div className="ai-tabs" role="tablist">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id}
              className={`ai-tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close assistant" title="Close (Esc)">✕</button>
      </div>
      {/* All tabs stay mounted so chat history and results survive tab switches. */}
      <div className="ai-body" hidden={tab !== "chat"}><ChatTab code={code} language={language} issues={issues} onApplyCode={onApplyCode} /></div>
      <div className="ai-body" hidden={tab !== "explain"}><ExplainTab code={code} language={language} /></div>
      <div className="ai-body" hidden={tab !== "tests"}><TestsTab code={code} language={language} /></div>
    </aside>
  );
}
