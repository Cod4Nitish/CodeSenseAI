/**
 * TextEditor - lightweight touch-friendly code editor (textarea + line numbers).
 * Used instead of Monaco on phones / coarse pointers. No dependencies.
 *
 *  - auto-resizes with its content, monospace, no wrapping (editor scrolls sideways)
 *  - Tab inserts spaces (Escape then Tab moves focus on, so keyboard users are not trapped)
 *  - `markers` [{line, severity, title}] show as gutter badges + wavy underlines
 *  - `flash` {line, severity, key} scrolls to and pulses a line (diagnostic click-to-jump)
 *  - `scanLine` / `scanTrail` draw the line-by-line scan band while a review runs
 * by Nitish Kumar Singh
 */
import { useEffect, useMemo, useRef } from "react";

const PAD = 10;
const SYM = { high: "!", medium: "▲", low: "i" };

export default function TextEditor({
  value, onChange, markers = [], flash = null, scanLine = null, scanTrail = 0,
  fontSize = 14, readOnly = false, onAnalyze, ariaLabel = "Code editor",
}) {
  const scroller = useRef(null);
  const taRef = useRef(null);
  const escapeTab = useRef(false);
  const lh = Math.round(fontSize * 1.65);
  const lines = useMemo(() => value.split("\n"), [value]);
  const maxLen = useMemo(() => lines.reduce((m, l) => Math.max(m, l.length), 0), [lines]);
  const height = lines.length * lh + PAD * 2;
  const bySev = useMemo(() => {
    const m = new Map();
    markers.forEach((k) => {
      const prev = m.get(k.line);
      const rank = { high: 3, medium: 2, low: 1 };
      if (!prev || rank[k.severity] > rank[prev.severity]) m.set(k.line, k);
    });
    return m;
  }, [markers]);

  // click-to-jump from the diagnostics list
  useEffect(() => {
    if (!flash || !scroller.current) return;
    const el = scroller.current;
    const top = Math.max(0, (flash.line - 1) * lh - el.clientHeight / 3);
    try { el.scrollTo({ top, behavior: "smooth" }); } catch { el.scrollTop = top; }
  }, [flash, lh]);

  function onKeyDown(e) {
    if (e.key === "Escape") { escapeTab.current = true; return; }
    if (e.key === "Tab" && !e.shiftKey && !readOnly) {
      if (escapeTab.current) { escapeTab.current = false; return; }
      e.preventDefault();
      const ta = e.target;
      const { selectionStart: s, selectionEnd: en } = ta;
      const next = value.slice(0, s) + "    " + value.slice(en);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
      return;
    }
    escapeTab.current = false;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onAnalyze?.(); }
  }

  const band = (line, cls, key) => (
    <div key={key} className={cls} style={{ top: PAD + (line - 1) * lh, height: lh }} />
  );

  return (
    <div className="te" ref={scroller} style={{ "--te-lh": `${lh}px`, "--te-fs": `${fontSize}px` }}>
      <div className="te-inner" style={{ height, minWidth: "100%", width: `calc(${maxLen}ch + 84px)` }}>
        <div className="te-gutter" aria-hidden="true" style={{ paddingTop: PAD }}>
          {lines.map((_, i) => {
            const k = bySev.get(i + 1);
            return (
              <div key={i} className={`te-ln ${k ? "has sev-" + k.severity : ""}`} style={{ height: lh, lineHeight: `${lh}px` }} title={k?.title}>
                {k ? <span className="te-sym">{SYM[k.severity] || "i"}</span> : null}{i + 1}
                {scanLine != null && i + 1 <= scanLine && i + 1 > scanLine - scanTrail && <span className="te-tick">{"✓"}</span>}
              </div>
            );
          })}
        </div>
        <div className="te-body">
          <div className="te-bands" aria-hidden="true">
            {markers.map((k, i) => band(k.line, `te-band sev-${k.severity}`, `m${i}`))}
            {flash && band(flash.line, `te-band te-flash sev-${flash.severity || "high"}`, `f${flash.key}`)}
            {scanLine != null && Array.from({ length: Math.min(scanTrail, scanLine - 1) }, (_, i) =>
              band(scanLine - 1 - i, "te-band te-scan-done", `s${scanLine - 1 - i}`))}
            {scanLine != null && band(scanLine, "te-band te-scan-now", "scan-now")}
          </div>
          <textarea
            ref={taRef}
            className="te-ta"
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            aria-label={ariaLabel}
            placeholder="Paste or type code here..."
            style={{ height, paddingTop: PAD, paddingBottom: PAD }}
          />
        </div>
      </div>
    </div>
  );
}
