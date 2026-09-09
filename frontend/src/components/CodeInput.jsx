import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";

const LANGUAGES = [
  { value: "python",     label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java",       label: "Java" },
  { value: "cpp",        label: "C++" },
  { value: "auto",       label: "Auto-detect" },
];

const MONACO_LANG_MAP = {
  python: "python", javascript: "javascript", typescript: "typescript",
  java: "java", cpp: "cpp", auto: "plaintext",
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

export default function CodeInput({
  code, language, loading,
  onCodeChange, onLanguageChange, onAnalyze, onClear,
  onLoadSample, onEditorMount,
}) {
  const [showSamples, setShowSamples] = useState(false);
  const charCount = code.length;
  const overLimit = charCount > MAX_CHARS;
  const pct = Math.min((charCount / MAX_CHARS) * 100, 100);

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

        {/* Language selector */}
        <select
          id="language-select"
          className="lang-select"
          value={language}
          onChange={e => onLanguageChange(e.target.value)}
          disabled={loading}
          aria-label="Select language"
        >
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        {/* Samples dropdown */}
        <div className="samples-wrapper">
          <button
            className="samples-btn"
            onClick={() => setShowSamples(v => !v)}
            disabled={loading}
            title="Load a sample snippet"
          >
            <span>⊞</span> samples
          </button>

          {showSamples && (
            <>
              {/* Click-outside dismiss */}
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={() => setShowSamples(false)}
              />
              <div className="samples-dropdown" style={{ zIndex: 100 }}>
                <div className="samples-group-label">sample snippets</div>
                {SAMPLES.map(s => (
                  <div
                    key={s.id}
                    className="sample-item"
                    onClick={() => handleSampleClick(s)}
                  >
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

        <div className="toolbar-sep" />

        {/* Char counter */}
        <span className={`char-pill ${overLimit ? "over" : ""}`}>
          {charCount.toLocaleString()}/{MAX_CHARS.toLocaleString()}
          {overLimit && " ⚠"}
        </span>

        {/* Actions */}
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
            {loading ? "analyzing…" : "▶ analyze"}
          </button>
        </div>
      </div>

      {/* ── Monaco Editor ─────────────────────────────── */}
      <div className="editor-wrapper">
        <Editor
          height="100%"
          language={MONACO_LANG_MAP[language]}
          value={code}
          onChange={val => onCodeChange(val ?? "")}
          theme="vs-dark"
          onMount={onEditorMount}
          options={{
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
            hideCursorInOverviewRuler: false,
            scrollbar: {
              verticalScrollbarSize: 4,
              horizontalScrollbarSize: 4,
            },
          }}
        />
      </div>
    </div>
  );
}
