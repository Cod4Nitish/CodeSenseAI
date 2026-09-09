import { useState, useRef, useEffect, useCallback } from "react";
import CodeInput from "./components/CodeInput";
import ResultsPanel from "./components/ResultsPanel";
import ShortcutsModal from "./components/ShortcutsModal";
import { analyzeCode } from "./api";
import { computeScore } from "./lib/score";
import { buildMarkdownReport, downloadTextFile } from "./lib/report";

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

export default function App() {
  const [code, setCode]           = useState(DEFAULT_CODE);
  const [language, setLang]       = useState("python");
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState(null);
  const [error, setError]         = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const hasMarkersRef = useRef(false);

  // ── Monaco: diagnostics (squiggles) ─────────────────────
  const clearMarkers = useCallback(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (model) monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    hasMarkersRef.current = false;
  }, []);

  const applyMarkers = useCallback((issues) => {
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
  }, []);

  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (results?.issues?.length) applyMarkers(results.issues);
  }

  // ── Analyze ─────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);
    clearHighlight();
    clearMarkers();
    try {
      const data = await analyzeCode(code, language);
      setResults(data);
      setScanCount((c) => c + 1);
      applyMarkers(data.issues);
    } catch (err) {
      setError(err.message || "Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [code, language, loading, applyMarkers, clearMarkers]);

  function handleClear() {
    setCode("");
    setResults(null);
    setError(null);
    clearHighlight();
    clearMarkers();
  }

  function handleLoadSample(sampleCode, sampleLang) {
    setCode(sampleCode);
    setLang(sampleLang);
    setResults(null);
    setError(null);
    clearHighlight();
    clearMarkers();
  }

  function handleCodeChange(next) {
    setCode(next);
    // Stale markers point at shifted line numbers once the code is edited.
    if (hasMarkersRef.current) clearMarkers();
  }

  // ── Monaco: click-to-jump line highlight ────────────────
  function clearHighlight() {
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current, []
      );
    }
  }

  function handleLineClick(lineNum, severity = "high") {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !lineNum) return;

    editor.revealLineInCenter(
      lineNum,
      monaco?.editor?.ScrollType?.Smooth ?? 0
    );

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: lineNum, endLineNumber: lineNum,
          startColumn: 1, endColumn: 1,
        },
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

  // ── Export .md ──────────────────────────────────────────
  function handleExport() {
    if (!results) return;
    const { filename, markdown } = buildMarkdownReport({ code, language, results });
    downloadTextFile(filename, markdown);
  }

  // ── Global keyboard shortcuts ───────────────────────────
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
  const tabName = `review.${LANG_EXT[language] ?? "txt"}`;
  const totalIssues = results
    ? results.issue_count.high + results.issue_count.medium + results.issue_count.low
    : 0;

  const statusDot = loading ? "running" : results ? "done" : "";
  const statusText = loading ? "analyzing" : results ? "done" : "idle";

  const scoreInfo = results ? computeScore(results.issue_count) : null;

  const statusColor =
    results?.issue_count?.high > 0 ? "var(--error)" :
    results?.issue_count?.medium > 0 ? "var(--warn)" :
    results ? "var(--ok)" : "";

  return (
    <>
      <div className="app-shell">

        {/* ── Titlebar ─────────────────────────────────── */}
        <header className="top-bar">
          <div className="top-bar-brand">
            <div className="brand-icon">&gt;_</div>
            <div className="brand-info">
              <span className="brand-name">CodeSense AI</span>
              <span className="brand-by">by Nitish Singh</span>
            </div>
            <span className="brand-version">v1.0</span>
          </div>

          <div className="tab-strip">
            <div className="tab tab-active">
              <span className="tab-dot" />
              <span>{tabName}</span>
              {code.length > 0 && <span className="tab-modified" />}
            </div>
            <div className="tab tab-muted">
              <span>review_output.json</span>
              {results && <span className="tab-modified" />}
            </div>
          </div>

          <div className="top-bar-right">
            <div className="run-status">
              <div className={`run-dot ${statusDot}`} />
              <span>{statusText}</span>
              {scanCount > 0 && !loading && (
                <span style={{ color: "var(--text-dim)" }}>· #{scanCount}</span>
              )}
            </div>
            <button
              className="shortcut-hint-btn"
              onClick={() => setShowShortcuts((v) => !v)}
              title="Keyboard shortcuts (?)"
            >?</button>
          </div>
        </header>

        {/* ── Split layout ──────────────────────────────── */}
        <main className="main-layout">
          <section className="editor-pane" aria-label="Code editor">
            <div className="pane-header">
              <span className="pane-header-label">editor</span>
              <span className="pane-header-meta">
                {language !== "auto" ? language : "auto-detect"}
              </span>
            </div>
            <CodeInput
              code={code}
              language={language}
              loading={loading}
              onCodeChange={handleCodeChange}
              onLanguageChange={setLang}
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              onLoadSample={handleLoadSample}
              onEditorMount={handleEditorMount}
            />
          </section>

          <div className="pane-divider" aria-hidden="true" />

          <section className="results-pane" aria-label="Review results">
            <div className="pane-header">
              <span className="pane-header-label">diagnostics</span>
              {results && (
                <span className="pane-header-meta" style={{ color: statusColor, fontWeight: 600 }}>
                  {totalIssues === 0
                    ? "✓ clean"
                    : `${totalIssues} issue${totalIssues !== 1 ? "s" : ""}`}
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
            />
          </section>
        </main>

        {/* ── Status bar ───────────────────────────────── */}
        <footer className="status-bar">
          <div className="status-bar-left">
            <div className="status-seg"><span>&gt;_ CodeSense AI</span></div>
            <div className="status-seg"><span>by Nitish Singh</span></div>
            <div className="status-seg"><span>AI · {results?.model || "gemini-3.1-flash-lite"}</span></div>
          </div>
          <div className="status-bar-right">
            {scoreInfo && (
              <div className={`status-seg status-${scoreInfo.tone}`} title={`${scoreInfo.label}`}>
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
            <div className="status-seg">
              <span>{code.length > 0 ? `${code.length.toLocaleString()} chars` : "empty"}</span>
            </div>
            <div className="status-seg">
              <span>{language !== "auto" ? language.toUpperCase() : "AUTO"}</span>
            </div>
            <div className="status-seg status-seg-btn"
              onClick={() => setShowShortcuts(true)} title="View shortcuts (?)">
              <span>?</span>
            </div>
          </div>
        </footer>
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
