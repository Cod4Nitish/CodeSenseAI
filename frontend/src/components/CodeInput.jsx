import Icon from "./Icon";
import { useEffect, useRef, useState } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { useTheme, useSettings } from "../lib/theme";
import { defineThemes, monacoThemeName } from "../lib/monacoThemes";
import { useIsMobile, useScanMode } from "../lib/device";
import { SCAN_TRAIL, useScanLine } from "../lib/scan";
import TextEditor from "./TextEditor";
import SimpleDiff from "./SimpleDiff";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "auto", label: "Auto-detect" },
];

const MONACO_LANG_MAP = {
  python: "python", javascript: "javascript", typescript: "typescript",
  java: "java", cpp: "cpp", go: "go", auto: "plaintext",
};

// ── Sample Snippets ──────────────────────────────────────────
const SAMPLES = [
  {
    id: "py-buggy",
    name: "Python — Security Issues",
    desc: "Hardcoded creds, SQL injection, division by zero",
    lang: "python",
    dot: "error",
    code: `import sqlite3

# Hardcoded credentials — never do this!
DB_PASSWORD = "super_secret_123"
API_KEY = "sk-abc123xyz789"

def get_user(conn, username):
    # SQL injection vulnerability
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    return conn.execute(query).fetchone()

def calculate_speed(distance, time):
    # No check for time == 0
    return distance / time

def read_file(filename):
    # File handle never closed
    f = open(filename, 'r')
    return f.read()
`,
  },
  {
    id: "py-clean",
    name: "Python — Clean Code",
    desc: "Well-typed, documented utility functions",
    lang: "python",
    dot: "ok",
    code: `from typing import Optional

def calculate_bmi(weight_kg: float, height_m: float) -> Optional[float]:
    """Calculate Body Mass Index safely.

    Args:
        weight_kg: Weight in kilograms
        height_m: Height in metres

    Returns:
        BMI value rounded to 2 decimals, or None if invalid input.
    """
    if height_m <= 0 or weight_kg <= 0:
        return None
    return round(weight_kg / (height_m ** 2), 2)

def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp value to [min_val, max_val]."""
    return max(min_val, min(value, max_val))
`,
  },
  {
    id: "js-buggy",
    name: "JavaScript — XSS + Async Bug",
    desc: "DOM injection, missing await, prototype pollution",
    lang: "javascript",
    dot: "error",
    code: `// XSS vulnerability — directly injecting user input into DOM
function renderUserComment(comment) {
  document.getElementById('output').innerHTML = comment;
}

// Missing await — async bug
async function fetchUser(id) {
  const res = fetch(\`/api/users/\${id}\`);  // missing await
  return res.json();
}

// Prototype pollution
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key];  // allows __proto__ injection
  }
}

// Global variable pollution
function calculate() {
  result = 42;  // no var/let/const
}
`,
  },
  {
    id: "js-clean",
    name: "JavaScript — Modern Clean",
    desc: "Proper async/await, safe DOM manipulation",
    lang: "javascript",
    dot: "ok",
    code: `/**
 * Safely escapes HTML to prevent XSS.
 * @param {string} str - Raw user input
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Fetches a user by ID with proper error handling.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function fetchUser(id) {
  try {
    const res = await fetch(\`/api/users/\${id}\`);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return await res.json();
  } catch (err) {
    console.error('fetchUser failed:', err);
    return null;
  }
}
`,
  },
  {
    id: "java-buggy",
    name: "Java — NullPointer + Resource Leak",
    desc: "Unchecked null, unclosed streams, catch-all",
    lang: "java",
    dot: "warn",
    code: `import java.io.*;

public class UserService {

    // NullPointerException risk — no null check
    public String getUserName(User user) {
        return user.getProfile().getName().toUpperCase();
    }

    // Resource leak — InputStream never closed
    public String readConfig(String path) throws Exception {
        InputStream is = new FileInputStream(path);
        return new String(is.readAllBytes());
    }

    // Swallowing all exceptions — terrible practice
    public int parseAge(String s) {
        try {
            return Integer.parseInt(s);
        } catch (Exception e) {
            // silently ignored!
            return 0;
        }
    }
}
`,
  },
];

const MAX_CHARS = 20_000;

const EDITOR_OPTIONS = {
  fontSize: 13,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontLigatures: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on",
  lineNumbers: "on",
  lineNumbersMinChars: 3,
  glyphMargin: false,
  folding: true,
  renderLineHighlight: "gutter",
  padding: { top: 12, bottom: 12 },
  tabSize: 4,
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  smoothScrolling: true,
  bracketPairColorization: { enabled: true },
  overviewRulerBorder: false,
  scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
};

export default function CodeInput({
  code, language, loading,
  onCodeChange, onLanguageChange, onAnalyze, onClear,
  onLoadSample, onEditorMount, onOpenFile, onPaste,
  // diff mode
  diffMode = false, canDiff = false, originalCode = "", suggestedCode = "",
  onToggleDiff, onAcceptSuggestions, onResetSuggestions,
  // mobile fallback editor + scan animation
  markers = [], flash = null, scanning = false,
}) {
  const isMobile = useIsMobile();
  const scanMode = useScanMode();
  const lineCount = code.split("\n").length;
  const scanLine = useScanLine(scanning && scanMode === "full", lineCount);
  const monacoEd = useRef(null);
  const scanColl = useRef(null);
  const [showSamples, setShowSamples] = useState(false);
  const fileRef = useRef(null);
  const { isDark, palette } = useTheme();
  const monacoTheme = monacoThemeName(palette, isDark);
  const { settings } = useSettings();
  const editorOptions = { ...EDITOR_OPTIONS, fontSize: settings.fontSize, minimap: { enabled: settings.minimap }, wordWrap: settings.wordWrap ? "on" : "off" };
  // Line-by-line scan on Monaco: moving band + recent lines tinted with a tick.
  useEffect(() => {
    const ed = monacoEd.current;
    if (!ed || isMobile) return undefined;
    if (!scanColl.current) scanColl.current = ed.createDecorationsCollection([]);
    if (scanLine == null) { scanColl.current.set([]); return undefined; }
    const decos = [];
    for (let k = 1; k <= SCAN_TRAIL; k++) {
      const ln = scanLine - k;
      if (ln >= 1) decos.push({ range: { startLineNumber: ln, endLineNumber: ln, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: "monaco-scan-done", linesDecorationsClassName: "monaco-scan-tick" } });
    }
    decos.push({ range: { startLineNumber: scanLine, endLineNumber: scanLine, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: "monaco-scan-now" } });
    scanColl.current.set(decos);
    return undefined;
  }, [scanLine, isMobile]);
  const mountEditor = (editor, monaco) => { monacoEd.current = editor; scanColl.current = null; onEditorMount?.(editor, monaco); };

  const charCount = code.length;
  const overLimit = charCount > MAX_CHARS;

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!loading && code.trim() && !overLimit) onAnalyze();
    }
  }

  function handleSampleClick(sample) {
    onLoadSample(sample.code, sample.lang);
    setShowSamples(false);
  }

  return (
    <div className="code-input-panel" onKeyDown={handleKeyDown}>
      {/* ── Toolbar ──────────────────────────────────── */}
      <div className="code-toolbar">
        {diffMode ? (
          <>
            <span className="diff-badge">⇄ diff · original ↔ AI-suggested</span>
            <div className="toolbar-actions" style={{ marginLeft: "auto" }}>
              <button className="btn btn-ghost" onClick={onResetSuggestions} title="Discard applied fixes">
                reset
              </button>
              <button className="btn btn-primary" onClick={onAcceptSuggestions} title="Copy the suggested version into the editor">
                ✓ apply to editor
              </button>
              <button className="btn btn-ghost" onClick={onToggleDiff} title="Back to editor">
                ✕ close diff
              </button>
            </div>
          </>
        ) : (
          <>
            <select
              id="language-select"
              className="lang-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              disabled={loading}
              aria-label="Select language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>

            <div className="samples-wrapper">
              <button
                className="samples-btn"
                onClick={() => setShowSamples((v) => !v)}
                disabled={loading}
                title="Load a sample snippet"
              >
                <Icon name="grid" />examples
              </button>

              {showSamples && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 99 }}
                    onClick={() => setShowSamples(false)}
                  />
                  <div className="samples-dropdown" style={{ zIndex: 100 }}>
                    <div className="samples-group-label">sample snippets</div>
                    {SAMPLES.map((s) => (
                      <div key={s.id} className="sample-item" onClick={() => handleSampleClick(s)}>
                        <div className={`sample-dot ${s.dot}`} />
                        <div className="sample-info">
                          <div className="sample-name">{s.name}</div>
                          <div className="sample-desc">{s.desc}</div>
                        </div>
                        <span className="sample-lang">{s.lang}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".py,.js,.jsx,.mjs,.ts,.tsx,.java,.go,.c,.cc,.cpp,.cxx,.h,.hpp,.txt"
              onChange={(e) => { onOpenFile?.(e.target.files?.[0]); e.target.value = ""; }}
            />
            <button className="samples-btn" onClick={() => fileRef.current?.click()} disabled={loading}
              title="Open a source file (or drag one onto the editor)">
              <Icon name="upload" />open
            </button>
            {canDiff && (
              <button
                className={`samples-btn ${diffMode ? "active" : ""}`}
                onClick={onToggleDiff}
                disabled={loading}
                title="Compare original vs AI-suggested fixes"
              >
                <Icon name="swap" />compare
              </button>
            )}

            {charCount > MAX_CHARS * 0.8 && (
              <span className={`char-pill ${overLimit ? "over" : ""}`}>
                {charCount.toLocaleString()}/{MAX_CHARS.toLocaleString()}
                {overLimit && " ⚠"}
              </span>
            )}

            <div className="toolbar-actions">
              <button
                id="clear-btn"
                className="btn btn-ghost"
                onClick={onClear}
                disabled={loading || !code}
                title="Clear editor"
              >
                clear
              </button>
              <button
                id="analyze-btn"
                className="btn btn-primary"
                onClick={onAnalyze}
                disabled={loading || !code.trim() || overLimit}
                title="Analyze code (Ctrl+Enter)"
              >
                {loading ? "reviewing…" : <><Icon name="play" filled />Review my code</>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Editor / Diff ─────────────────────────────── */}
      <div className={`editor-wrapper ${isMobile ? "is-mobile" : ""} scan-${scanMode}`}>
        {loading && scanMode !== "off" && scanMode !== "full" && (
          <div className="scan-overlay" aria-hidden="true">
            <div className="scan-wash" />
            <div className="scan-beam" />
            <span className="scan-tag">scanning…</span>
          </div>
        )}
        {diffMode && isMobile ? (
          <SimpleDiff original={originalCode} modified={suggestedCode} />
        ) : diffMode ? (
          <DiffEditor
            height="100%"
            language={MONACO_LANG_MAP[language]}
            original={originalCode}
            modified={suggestedCode}
            theme={monacoTheme}
            beforeMount={defineThemes}
            // Prevents monaco's "TextModel got disposed before DiffEditorWidget
            // model got reset" uncaught error when the diff view unmounts.
            keepCurrentOriginalModel
            keepCurrentModifiedModel
            options={{
              ...editorOptions,
              readOnly: true,
              renderSideBySide: true,
              renderOverviewRuler: false,
            }}
          />
        ) : isMobile ? (
          <TextEditor value={code} onChange={onCodeChange} markers={markers} flash={flash}
            scanLine={scanLine} scanTrail={SCAN_TRAIL} fontSize={Math.max(13, settings.fontSize)}
            onAnalyze={() => { if (!loading && code.trim() && !overLimit) onAnalyze(); }} />
        ) : (
          <Editor
            height="100%"
            language={MONACO_LANG_MAP[language]}
            value={code}
            onChange={(val) => onCodeChange(val ?? "")}
            theme={monacoTheme}
            beforeMount={defineThemes}
            onMount={mountEditor}
            options={editorOptions}
          />
        )}
      </div>
    </div>
  );
}
