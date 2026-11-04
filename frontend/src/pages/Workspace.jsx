/**
 * CodeSense AI — review workspace (editor ↔ diagnostics).
 * by Nitish Singh
 *
 * Everything the original single-page app did, plus:
 *   • loads any past review from the dashboard (`location.state.reviewId`)
 *   • "apply fix" stages a best-effort line replacement into a working copy
 *   • a Monaco DiffEditor toggle to review original ↔ AI-suggested before accepting
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import CodeInput from "../components/CodeInput";
import ResultsPanel from "../components/ResultsPanel";
import ShortcutsModal from "../components/ShortcutsModal";
import { ai, analyzeCode, reviews } from "../api";
import AIPanel from "../components/AIPanel";
import ScanConsole from "../components/ScanConsole";
import { useIsMobile, useScanMode } from "../lib/device";
import { friendlyError } from "../lib/errors";
import { getSettings } from "../lib/theme";
import { useAuth } from "../auth/AuthContext";
import { computeScore } from "../lib/score";
import { buildMarkdownReport, downloadTextFile } from "../lib/report";
import { parseApiDate } from "../lib/format";

const DEFAULT_CODE = `import sqlite3

# Hardcoded credentials — never do this
DB_PASSWORD = "super_secret_123"

def get_user(conn, username):
    # SQL injection: user input concatenated straight into SQL
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    return conn.execute(query).fetchone()

def calculate_speed(distance, time):
    return distance / time  # no guard for time == 0
`;

const LANG_EXT = {
  python: "py", javascript: "js", typescript: "ts",
  java: "java", cpp: "cpp", go: "go", auto: "txt",
};

const MARKER_OWNER = "codesense";
const LS_CODE = "codesense_code";
const LS_LANG = "codesense_lang";
const LANGS = ["python", "javascript", "typescript", "java", "cpp", "go", "auto"];
const EXT_LANG = {
  py: "python", js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  ts: "typescript", tsx: "typescript", java: "java", go: "go",
  cpp: "cpp", cc: "cpp", cxx: "cpp", c: "cpp", h: "cpp", hpp: "cpp",
};
const MAX_CHARS = 20_000;

function lsGet(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/** Replace 1-based `lineNo` in `source` with `replacement` (which may be multi-line). */
function replaceLine(source, lineNo, replacement) {
  const lines = source.split("\n");
  if (lineNo < 1 || lineNo > lines.length) return source;
  const indentMatch = lines[lineNo - 1].match(/^\s*/);
  const indent = indentMatch ? indentMatch[0] : "";
  const repl = replacement.replace(/\n+$/, "");
  // If the fix looks like a bare snippet (single line, no existing indent), keep
  // the original indentation so the result still parses.
  let patched;
  if (repl.includes("\n")) {
    const nonEmpty = repl.split("\n").filter((l) => l.trim());
    const minIndent = Math.min(...nonEmpty.map((l) => l.match(/^\s*/)[0].length));
    // Snippet came without the surrounding indentation: re-indent it to fit.
    patched = minIndent === 0 && indent
      ? repl.split("\n").map((l) => (l.trim() ? indent + l : l)).join("\n")
      : repl;
  } else {
    patched = indent + repl.replace(/^\s+/, "");
  }
  lines.splice(lineNo - 1, 1, patched);
  return lines.join("\n");
}

export default function Workspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  const [code, setCode]           = useState(() => lsGet(LS_CODE, DEFAULT_CODE));
  const [language, setLang]       = useState(() => {
    const l = lsGet(LS_LANG, getSettings().language);
    return LANGS.includes(l) ? l : "python";
  });
  const [notice, setNotice]       = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [aiOpen, setAiOpen]       = useState(false);
  const [fixing, setFixing]       = useState(false);
  const [fixChanges, setFixChanges] = useState(null); // string[] while an auto-fix diff is open
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState(null);
  const [error, setError]         = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sourceLabel, setSourceLabel] = useState(null);

  // diff / apply-fix
  const [analyzedCode, setAnalyzedCode]   = useState(code);
  const [suggestedCode, setSuggestedCode] = useState(null);
  const [appliedLines, setAppliedLines]   = useState(() => new Set());
  const [showDiff, setShowDiff]           = useState(false);

  // phones / touch: lightweight textarea editor instead of Monaco
  const isMobile = useIsMobile();
  const scanMode = useScanMode();
  const mobileRef = useRef(isMobile);
  mobileRef.current = isMobile;
  const [textMarkers, setTextMarkers] = useState([]);
  const [flash, setFlash] = useState(null);
  const editorPaneRef = useRef(null);
  const resultsPaneRef = useRef(null);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const hasMarkersRef = useRef(false);
  const markersStaleRef = useRef(false); // true once the code no longer matches `results`
  const loadedReviewRef = useRef(null);
  const analyzeRef = useRef(null);    // latest handleAnalyze, for Monaco's Ctrl+Enter command
  const inFlightRef = useRef(false);  // guards against double-submit within one tick

  useEffect(() => { lsSet(LS_CODE, code); }, [code]);
  useEffect(() => { lsSet(LS_LANG, language); }, [language]);
  useEffect(() => {
    if (!notice) return undefined;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // ── Monaco markers ──────────────────────────────────────
  const clearMarkers = useCallback(() => {
    markersStaleRef.current = true;
    setTextMarkers([]);
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (model) monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    hasMarkersRef.current = false;
  }, []);

  const applyMarkers = useCallback((issues) => {
    if (mobileRef.current) {
      setTextMarkers((issues || []).filter((i) => Number.isInteger(i.line) && i.line >= 1)
        .map((i) => ({ line: i.line, severity: i.severity, title: i.title })));
      hasMarkersRef.current = (issues || []).length > 0;
      markersStaleRef.current = false;
      return;
    }
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;

    const sevMap = {
      high: monaco.MarkerSeverity.Error,
      medium: monaco.MarkerSeverity.Warning,
      low: monaco.MarkerSeverity.Info,
    };
    const lineCount = model.getLineCount();

    const markers = (issues || [])
      .filter((i) => Number.isInteger(i.line) && i.line >= 1 && i.line <= lineCount)
      .map((i) => {
        const startColumn = model.getLineFirstNonWhitespaceColumn(i.line) || 1;
        const endColumn = model.getLineMaxColumn(i.line);
        return {
          startLineNumber: i.line,
          endLineNumber: i.line,
          startColumn,
          endColumn: Math.max(endColumn, startColumn + 1),
          message: `${i.title}\n\n${i.explanation}`,
          severity: sevMap[i.severity] ?? monaco.MarkerSeverity.Info,
          source: "CodeSense AI",
        };
      });

    monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
    hasMarkersRef.current = markers.length > 0;
    markersStaleRef.current = false;
  }, []);

  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Monaco binds Ctrl/Cmd+Enter to "insert line below" and stops propagation,
    // so the window-level shortcut never sees it while the editor has focus.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => analyzeRef.current?.());
    // Editor remounts when the diff view closes; only restore markers that still
    // describe the current code (not after "apply to editor" or user edits).
    if (!markersStaleRef.current && results?.issues?.length) applyMarkers(results.issues);
  }

  // ── Analyze ─────────────────────────────────────────────
  const runAnalysis = useCallback(async (src, lang) => {
    if (!src.trim() || inFlightRef.current) return;
    if (src.length > MAX_CHARS) {
      setNotice({ kind: "error", text: `Code is over the ${MAX_CHARS.toLocaleString()} character limit. Trim it or analyse a smaller file.` });
      return;
    }
    let analysisResult = null;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setResults(null);
    setSourceLabel(null);
    setShowDiff(false);
    setSuggestedCode(null);
    setAppliedLines(new Set());
    clearHighlight();
    clearMarkers();
    try {
      const data = await analyzeCode(src, lang, { persist: isAuthed });
      setResults(data);
      setAnalyzedCode(src);
      setScanCount((c) => c + 1);
      applyMarkers(data.issues);
      analysisResult = data;
      if (mobileRef.current) window.setTimeout(() => resultsPaneRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" }), 120);
    } catch (err) {
      setError(err.message || "Unknown error occurred.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
    return analysisResult;
  }, [isAuthed, applyMarkers, clearMarkers]);

  const handleAnalyze = useCallback(() => {
    if (loading) return;
    runAnalysis(code, language);
  }, [code, language, loading, runAnalysis]);
  analyzeRef.current = handleAnalyze;

  /** One-click presenter path: load the built-in vulnerable sample and analyse it. */
  const handleDemo = useCallback(() => {
    if (loading) return;
    setCode(DEFAULT_CODE);
    setLang("python");
    runAnalysis(DEFAULT_CODE, "python");
  }, [loading, runAnalysis]);

  // ── File open / drop / paste ────────────────────────────
  async function handleOpenFile(file) {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.size > 500_000) {
      setNotice({ kind: "error", text: `"${file.name}" is too large to review (max ${MAX_CHARS.toLocaleString()} characters).` });
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      setNotice({ kind: "error", text: `Could not read "${file.name}".` });
      return;
    }
    if (text.includes("\u0000")) {
      setNotice({ kind: "error", text: `"${file.name}" looks like a binary file, not source code.` });
      return;
    }
    const lang = EXT_LANG[ext];
    setCode(text);
    setLang(lang || "auto");
    resetDerived();
    setNotice(
      text.length > MAX_CHARS
        ? { kind: "error", text: `Loaded ${file.name}, but it is ${text.length.toLocaleString()} chars; the limit is ${MAX_CHARS.toLocaleString()}. Trim it to analyse.` }
        : { kind: "ok", text: `Loaded ${file.name} (${lang ? lang : "language auto-detect"}).` }
    );
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setNotice({ kind: "error", text: "Clipboard is empty." });
        return;
      }
      setCode(text);
      resetDerived();
      setNotice({ kind: "ok", text: "Pasted from clipboard." });
    } catch {
      setNotice({ kind: "error", text: "Clipboard access was blocked by the browser. Click into the editor and press Ctrl+V instead." });
    }
  }

  function onDragOver(e) {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setDragging(true);
    }
  }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleOpenFile(f);
  }

  function resetDerived() {
    setResults(null);
    setError(null);
    setSourceLabel(null);
    setShowDiff(false);
    setSuggestedCode(null);
    setAppliedLines(new Set());
    clearHighlight();
    clearMarkers();
  }

  function handleClear() {
    setCode("");
    resetDerived();
  }

  function handleLoadSample(sampleCode, sampleLang) {
    setCode(sampleCode);
    setLang(sampleLang);
    resetDerived();
  }

  function handleCodeChange(next) {
    setCode(next);
    if (hasMarkersRef.current) clearMarkers();
  }

  // ── Apply-fix / diff ────────────────────────────────────
  const handleApplyFix = useCallback(
    (issue) => {
      if (!Number.isInteger(issue.line) || issue.line < 1) return;
      const base = suggestedCode ?? analyzedCode ?? code;
      const next = replaceLine(base, issue.line, issue.suggested_fix || "");
      setSuggestedCode(next);
      setAppliedLines((prev) => new Set(prev).add(issue.line));
      setShowDiff(true);
    },
    [suggestedCode, analyzedCode, code]
  );

  const handleFixAll = useCallback(() => {
    const issues = (results?.issues || []).filter((i) => Number.isInteger(i.line) && i.line >= 1 && i.suggested_fix);
    if (!issues.length) return;
    // Bottom-up so multi-line replacements never shift lines still to be patched.
    const seen = new Set();
    const ordered = [...issues].sort((a, b) => b.line - a.line).filter((i) => !seen.has(i.line) && seen.add(i.line));
    let next = analyzedCode;
    ordered.forEach((i) => { next = replaceLine(next, i.line, i.suggested_fix); });
    setSuggestedCode(next);
    setAppliedLines(new Set(ordered.map((i) => i.line)));
    setShowDiff(true);
  }, [results, analyzedCode]);

  // Auto-fix whole file (Gemini) -> Monaco diff, Accept / Discard
  const handleAutoFix = useCallback(async () => {
    if (fixing || !code.trim() || loading) return;
    if (code.length > MAX_CHARS) {
      setNotice({ kind: "error", text: `Code is over the ${MAX_CHARS.toLocaleString()} character limit.` });
      return;
    }
    setFixing(true);
    setNotice(null);
    try {
      const r = await ai.fix({ code, language, issues: results?.issues || [] });
      if (!r.fixed_code || r.fixed_code === code) {
        setNotice({ kind: "ok", text: "Auto-fix found nothing to change in this file." });
        return;
      }
      setAnalyzedCode(code);
      setSuggestedCode(r.fixed_code);
      setAppliedLines(new Set());
      setFixChanges(r.changes || []);
      setShowDiff(true);
    } catch (err) {
      const fe = friendlyError(err.message);
      setNotice({ kind: "error", text: `Auto-fix failed: ${fe.title}. ${fe.hint}`, retry: handleAutoFix });
    } finally {
      setFixing(false);
    }
  }, [fixing, code, language, loading, results]);

  const handleAcceptSuggestions = useCallback(() => {
    if (suggestedCode == null) return;
    const next = suggestedCode;
    const before = results?.issue_count ? Math.round(computeScore(results.issue_count).score * 10) : null;
    setCode(next);
    setAnalyzedCode(next);
    setSuggestedCode(null);
    setAppliedLines(new Set());
    setShowDiff(false);
    setFixChanges(null);
    clearMarkers();
    // Re-review the fixed code right away so the score shows the real improvement.
    window.setTimeout(async () => {
      const data = await runAnalysis(next, language);
      if (data?.issue_count && before != null) {
        const after = Math.round(computeScore(data.issue_count).score * 10);
        setNotice({
          kind: after >= before ? "ok" : "error",
          text: after >= before
            ? `Fixed! Quality score ${before}% → ${after}%.`
            : `Score went ${before}% → ${after}%. Click "Fix it for me" again to clean up what is left.`,
        });
      }
    }, 0);
  }, [suggestedCode, clearMarkers, results, language, runAnalysis]);

  const handleResetSuggestions = useCallback(() => {
    setFixChanges(null);
    setSuggestedCode(null);
    setAppliedLines(new Set());
    setShowDiff(false);
  }, []);

  const handleToggleDiff = useCallback(() => {
    if (showDiff) setFixChanges(null);
    setShowDiff((v) => (v ? false : suggestedCode != null));
  }, [suggestedCode, showDiff]);

  const applyAiCode = useCallback((next) => {
    setCode(next);
    resetDerived();
    setNotice({ kind: "ok", text: "Applied the assistant code to the editor." });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load a past review from the dashboard ───────────────
  useEffect(() => {
    const reviewId = location.state?.reviewId;
    if (!reviewId || loadedReviewRef.current === reviewId) return;
    loadedReviewRef.current = reviewId;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await reviews.get(reviewId);
        if (cancelled) return;
        const restored = {
          summary: d.summary,
          issues: d.issues,
          issue_count: d.issue_count,
          quality_score: d.quality_score,
          grade: d.grade,
          model: d.model,
          review_id: d.id,
        };
        setCode(d.code_snippet);
        setLang(d.language);
        setResults(restored);
        setAnalyzedCode(d.code_snippet);
        setSuggestedCode(null);
        setAppliedLines(new Set());
        setShowDiff(false);
        const when = parseApiDate(d.created_at).toLocaleString();
        setSourceLabel(`history #${d.id} · ${when}`);
        setTimeout(() => applyMarkers(d.issues), 60);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load that review.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    })();

    return () => {
      cancelled = true;
      // Let a re-run (e.g. React StrictMode's mount→unmount→mount) load it again;
      // otherwise the first fetch is discarded and the second is skipped → stuck loader.
      if (loadedReviewRef.current === reviewId) loadedReviewRef.current = null;
    };
  }, [location.state, location.pathname, navigate, applyMarkers]);

  // ── Line highlight ──────────────────────────────────────
  function clearHighlight() {
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current, []
      );
    }
  }

  function handleLineClick(lineNum, severity = "high") {
    if (mobileRef.current) {
      if (!lineNum) return;
      setFlash({ line: lineNum, severity, key: Date.now() });
      editorPaneRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
      window.setTimeout(() => setFlash(null), 3000);
      return;
    }
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !lineNum) return;

    editor.revealLineInCenter(lineNum, monaco?.editor?.ScrollType?.Smooth ?? 0);

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: { startLineNumber: lineNum, endLineNumber: lineNum, startColumn: 1, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: `monaco-issue-highlight sev-${severity}`,
          overviewRuler: {
            color:
              severity === "high" ? "#f87171" :
              severity === "medium" ? "#fb923c" : "#4ade80",
            position: 4,
          },
        },
      },
    ]);

    window.clearTimeout(handleLineClick._t);
    handleLineClick._t = window.setTimeout(clearHighlight, 3000);
  }

  // ── Export ──────────────────────────────────────────────
  function handleExport() {
    if (!results) return;
    const { filename, markdown } = buildMarkdownReport({ code, language, results });
    downloadTextFile(filename, markdown);
  }

  // ── Global shortcuts ────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAnalyze();
        return;
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !typing) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
      if (e.key === "Escape") setShowShortcuts(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAnalyze]);

  // ── Derived ─────────────────────────────────────────────
  const totalIssues = results
    ? results.issue_count.high + results.issue_count.medium + results.issue_count.low
    : 0;
  const scoreInfo = results ? computeScore(results.issue_count) : null;
  const statusColor =
    results?.issue_count?.high > 0 ? "var(--error)" :
    results?.issue_count?.medium > 0 ? "var(--warn)" :
    results ? "var(--ok)" : "";

  return (
    <>
      <div className="workspace">
        <main className="main-layout">
          <section
            ref={editorPaneRef}
            className={`editor-pane ${dragging ? "is-dragging" : ""}`}
            aria-label="Code editor"
            onDragOver={onDragOver}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="pane-header">
              <span className="pane-header-label">editor</span>
              <span className="pane-header-actions">
                <button type="button" className="ai-launch" onClick={handleAutoFix}
                  disabled={fixing || loading || !code.trim()} title="Let Gemini fix the whole file, then review a before/after diff">
                  {fixing ? "⟳ fixing…" : "✦ Fix it for me"}
                </button>
                <button type="button" className={`ai-launch ${aiOpen ? "on" : ""}`} onClick={() => setAiOpen((v) => !v)}
                  aria-pressed={aiOpen} title="Chat, explain code, generate tests">
                  ◈ Ask AI
                </button>
              </span>
              <span className="pane-header-meta">
                {language !== "auto" ? language : "auto-detect"}
                {sourceLabel && <span className="pane-source"> · {sourceLabel}</span>}
              </span>
            </div>
            {notice && (
              <div className={`inline-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
                <span>{notice.text}</span>
                {notice.retry && <button type="button" className="notice-retry" onClick={() => { const f = notice.retry; setNotice(null); f(); }}>↺ Retry</button>}
                <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">✕</button>
              </div>
            )}
            {fixChanges && showDiff && (
              <div className="fix-changes" role="status">
                <strong>Gemini auto-fix · {fixChanges.length} change{fixChanges.length !== 1 ? "s" : ""}</strong>
                <ul>{fixChanges.slice(0, 8).map((c, i) => <li key={i}>{c}</li>)}</ul>
                <span>Review the diff below, then use <em>apply to editor</em> to accept or <em>reset</em> to discard.</span>
              </div>
            )}
            {dragging && <div className="drop-overlay" aria-hidden="true">Drop a source file to load it</div>}
            <CodeInput
              onOpenFile={handleOpenFile}
              onPaste={handlePaste}
              code={code}
              language={language}
              loading={loading}
              onCodeChange={handleCodeChange}
              onLanguageChange={setLang}
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              onLoadSample={handleLoadSample}
              onEditorMount={handleEditorMount}
              diffMode={showDiff}
              canDiff={suggestedCode != null}
              originalCode={analyzedCode}
              suggestedCode={suggestedCode ?? analyzedCode}
              onToggleDiff={handleToggleDiff}
              onAcceptSuggestions={handleAcceptSuggestions}
              onResetSuggestions={handleResetSuggestions}
              markers={textMarkers}
              flash={flash}
              scanning={loading}
            />
            <ScanConsole loading={loading} results={results} lineCount={code.split("\n").length} mode={isMobile ? "off" : scanMode} />
          </section>

          <div className="pane-divider" aria-hidden="true" />

          <section className="results-pane" aria-label="Review results" ref={resultsPaneRef}>
            <div className="pane-header">
              <span className="pane-header-label">diagnostics</span>
              {results && (
                <span className="pane-header-meta" style={{ color: statusColor, fontWeight: 600 }}>
                  {totalIssues === 0 ? "✓ clean" : `${totalIssues} issue${totalIssues !== 1 ? "s" : ""}`}
                </span>
              )}
            </div>
            <ResultsPanel
              loading={loading}
              results={results}
              error={error}
              onRetry={handleAnalyze}
              onLineClick={handleLineClick}
              onExport={handleExport}
              onApplyFix={handleApplyFix}
              onFixAll={handleFixAll}
              onDemo={handleDemo}
              appliedLines={appliedLines}
              sourceLabel={sourceLabel}
              code={analyzedCode}
              language={language}
            />
          </section>
        </main>

        <footer className="status-bar">
          <div className="status-bar-left">
            <div className="status-seg"><span>&gt;_ CodeSense AI</span></div>
          </div>
          <div className="status-bar-right">
            {scoreInfo && (
              <div className={`status-seg status-${scoreInfo.tone}`} title={scoreInfo.label}>
                <span>score {scoreInfo.display} · {scoreInfo.grade}</span>
              </div>
            )}
            {results && (
              <div className={`status-seg ${
                results.issue_count.high > 0 ? "status-error" :
                results.issue_count.medium > 0 ? "status-warn" : "status-ok"
              }`}>
                {results.issue_count.high > 0
                  ? `⚠ ${results.issue_count.high} error${results.issue_count.high !== 1 ? "s" : ""}`
                  : "✓ no errors"}
              </div>
            )}
            <div className="status-seg status-seg-btn" onClick={() => setShowShortcuts(true)} title="View shortcuts (?)">
              <span>?</span>
            </div>
          </div>
        </footer>

      </div>

      <AIPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        code={code}
        language={language}
        issues={results?.issues || []}
        onApplyCode={applyAiCode}
      />
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
