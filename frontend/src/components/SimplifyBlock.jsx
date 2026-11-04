/**
 * SimplifyBlock - "Explain simply" for one issue (POST /api/ai/simplify).
 * Shared by the Learn page (button) and beginner-mode issue cards (auto on expand).
 * Real AI only: on failure it shows a friendly message + Retry, never fake text.
 * by Nitish Kumar Singh
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ai } from "../api";
import { friendlyError } from "../lib/errors";
import { recordUnderstood, useTongue } from "../lib/progress";
import { CopyButton } from "../lib/markdown";

const cache = new Map(); // key -> response (session only)

function keyOf(code, language, issue, tongue) {
  return [language, tongue, issue.line, issue.title, code.length].join("|");
}

export default function SimplifyBlock({ code, language, issue, auto = false, label = "Explain simply" }) {
  const [tongue] = useTongue();
  const key = keyOf(code, language, issue, tongue);
  const [data, setData] = useState(() => cache.get(key) || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reqRef = useRef(0);

  const run = useCallback(async () => {
    const id = ++reqRef.current;
    setBusy(true);
    setError("");
    try {
      const r = await ai.simplify({
        code, language, issue_title: issue.title, issue_explanation: issue.explanation || "",
        line: Number.isInteger(issue.line) ? issue.line : 0, tongue,
      });
      if (id !== reqRef.current) return;
      cache.set(key, r);
      setData(r);
      recordUnderstood();
    } catch (err) {
      if (id === reqRef.current) setError(err.message || "Request failed");
    } finally {
      if (id === reqRef.current) setBusy(false);
    }
  }, [code, language, issue, tongue, key]);

  // Language toggle or a different issue: swap to the cached answer (or clear).
  useEffect(() => { setData(cache.get(key) || null); setError(""); }, [key]);
  useEffect(() => {
    if (auto && !cache.has(key)) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, key]);

  if (busy) {
    return (
      <div className="simp" role="status" aria-live="polite">
        <div className="ai-busy"><span className="ai-spinner" aria-hidden="true" />Simplifying...</div>
      </div>
    );
  }
  if (error) {
    const fe = friendlyError(error);
    return (
      <div className="ai-error simp" role="alert">
        <strong>{fe.title}</strong>
        <p>{fe.hint}</p>
        <button type="button" className="btn btn-primary btn-xs tap" onClick={run}>Retry</button>
      </div>
    );
  }
  if (!data) {
    return (
      <button type="button" className="btn btn-primary btn-xs tap simp-btn" onClick={(e) => { e.stopPropagation(); run(); }}>
        {label}
      </button>
    );
  }
  return (
    <div className="simp" onClick={(e) => e.stopPropagation()}>
      <p className="simp-text">{data.simple}</p>
      {data.analogy && <div className="simp-analogy"><b>Think of it like this:</b> {data.analogy}</div>}
      {data.fixed_example && (
        <div className="simp-fix">
          <div className="simp-fix-bar"><span>tiny fixed example</span><CopyButton text={data.fixed_example} /></div>
          <pre><code>{data.fixed_example}</code></pre>
        </div>
      )}
      {data.model && <span className="simp-model">by {data.model}</span>}
    </div>
  );
}
