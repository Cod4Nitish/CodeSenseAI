import { useEffect } from "react";

const SHORTCUTS = [
  { desc: "Analyze code",            keys: ["Ctrl / ⌘", "Enter"] },
  { desc: "Toggle this shortcuts panel", keys: ["?"] },
  { desc: "Close this modal",        keys: ["Esc"] },
  { desc: "Load sample snippet",     keys: ["click", "⊞ samples"] },
  { desc: "Jump to line in editor",  keys: ["click", "L· badge"] },
  { desc: "Copy suggested fix",      keys: ["click", "copy"] },
  { desc: "Expand / collapse all",   keys: ["click", "expand all"] },
  { desc: "Export Markdown report",  keys: ["click", "⬇ export .md"] },
  { desc: "Open a source file",      keys: ["click", "open"] },
  { desc: "Drop a file to load it",  keys: ["drag", "onto editor"] },
  { desc: "Paste from clipboard",    keys: ["click", "paste"] },
  { desc: "Stage every fix at once", keys: ["click", "fix all"] },
];

export default function ShortcutsModal({ onClose }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">Keyboard Shortcuts</span>
          <button className="modal-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* Shortcuts */}
        <div className="modal-body">
          {SHORTCUTS.map(({ desc, keys }) => (
            <div key={desc} className="shortcut-row">
              <span className="shortcut-desc">{desc}</span>
              <div className="shortcut-keys">
                {keys.map((k, i) => (
                  <span key={k}>
                    <span className="kbd">{k}</span>
                    {i < keys.length - 1 && (
                      <span style={{ color: "var(--text-dim)", margin: "0 2px", fontSize: "11px" }}>+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          CodeSense AI · by Nitish Singh · Press <strong>?</strong> anytime to toggle
        </div>
      </div>
    </div>
  );
}
