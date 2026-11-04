/**
 * ScanConsole - compact terminal strip under the editor.
 * Stage lines are staged progress text; the findings it prints come straight from the
 * real response (never invented). It never delays the result: once the response is
 * back it finishes within ~1.1s. by Nitish Kumar Singh
 */
import { useEffect, useRef, useState } from "react";
import { computeScore } from "../lib/score";

export default function ScanConsole({ loading, results, lineCount, mode }) {
  const [log, setLog] = useState([]);
  const [typing, setTyping] = useState("");
  const timers = useRef([]);
  const endRef = useRef(null);
  const wasLoading = useRef(false);

  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  const later = (fn, ms) => { timers.current.push(window.setTimeout(fn, ms)); };
  const push = (text) => setLog((l) => [...l.slice(-7), text]);

  // typing effect for the newest line
  function type(text) {
    let i = 0;
    const step = Math.max(1, Math.ceil(text.length / 14));
    const run = () => {
      i = Math.min(text.length, i + step);
      setTyping(text.slice(0, i));
      if (i < text.length) later(run, 18);
      else { push(text); setTyping(""); }
    };
    run();
  }

  useEffect(() => {
    if (mode !== "full") { clear(); setLog([]); setTyping(""); return clear; }
    if (loading) {
      wasLoading.current = true;
      clear(); setLog([]); setTyping("");
      push(`$ scan  (${lineCount} line${lineCount === 1 ? "" : "s"})`);
      later(() => type(`parsing ${lineCount} lines...`), 150);
      later(() => type(`rule engine: scanning ${lineCount} lines for known patterns...`), 900);
      later(() => type("AI engine: reviewing..."), 2000);
      return clear;
    }
    if (wasLoading.current && results) {
      wasLoading.current = false;
      clear();
      // response is back: finish fast (<= ~1.1s), real findings first
      const order = [...(results.issues || [])].sort((a, b) => (a.source === "ai") - (b.source === "ai")).slice(0, 4);
      const lines = order.map((i) => {
        const cwe = (i.explanation || "").match(/CWE-\d+/i)?.[0];
        return `${i.line != null ? `line ${i.line}` : "file"}: ${i.title}${cwe ? ` (${cwe.toUpperCase()})` : ""}`;
      });
      const s = computeScore(results.issue_count);
      lines.push(results.engine === "rules-only" ? "AI engine: unavailable, rules only" : "merging AI + rules...");
      lines.push(`score ${s.display} / ${s.grade}`);
      setTyping("");
      lines.forEach((t, k) => later(() => push(t), 90 + k * Math.min(170, 900 / lines.length)));
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, results, mode]);

  useEffect(() => { const el = endRef.current; if (el) el.scrollTop = el.scrollHeight; }, [log, typing]);

  if (mode !== "full" || (!log.length && !typing)) return null;
  return (
    <div className="scan-console" ref={endRef} role="log" aria-live="off" aria-label="Scan console">
      {log.map((l, i) => <div key={i} className="sc-line"><span className="sc-p">&gt;</span> {l}</div>)}
      {typing && <div className="sc-line"><span className="sc-p">&gt;</span> {typing}<span className="sc-caret">_</span></div>}
    </div>
  );
}
