/**
 * CodeSense AI — authentication modal (Sign In / Create Account tabs).
 * by Nitish Singh
 *
 * The "Try as Guest" button is deliberately the most prominent control: it lets
 * a reviewer see the full authenticated product (dashboard, audit history,
 * analytics) in one click, with nothing to type.
 */

import { useEffect, useRef, useState } from "react";

const TABS = [
  { id: "signin", label: "Sign In" },
  { id: "signup", label: "Create Account" },
];

export default function AuthModal({ intent, onClose, onLogin, onRegister, onDemo }) {
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, [tab]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (tab === "signin") run(() => onLogin(email.trim(), password));
    else run(() => onRegister(email.trim(), fullName.trim(), password));
  };

  return (
    <div
      className="auth-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
    >
      <div className="auth-modal">
        <div className="auth-modal-head">
          <div className="auth-brand">
            <span className="auth-brand-mark">&gt;_</span>
            <div>
              <div className="auth-brand-name">CodeSense AI</div>
              <div className="auth-brand-sub">Enterprise code review</div>
            </div>
          </div>
          <button className="auth-x" onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </div>

        {intent && <div className="auth-intent">{intent}</div>}

        {/* One-click guest access */}
        <button
          className="auth-guest"
          onClick={() => run(onDemo)}
          disabled={busy}
          type="button"
        >
          <span className="auth-guest-bolt">⚡</span>
          <span>
            <strong>Try as Guest</strong>
            <span className="auth-guest-note">instant demo · no signup · full dashboard</span>
          </span>
        </button>

        <div className="auth-divider"><span>or</span></div>

        <div className="auth-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`auth-tab ${tab === t.id ? "active" : ""}`}
              onClick={() => {
                setTab(t.id);
                setError(null);
              }}
              disabled={busy}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === "signup" && (
            <label className="auth-field">
              <span>Full name</span>
              <input
                ref={tab === "signup" ? firstFieldRef : null}
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={1}
                maxLength={120}
                disabled={busy}
                placeholder="Ada Lovelace"
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              ref={tab === "signin" ? firstFieldRef : null}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
              placeholder="you@company.com"
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={busy}
              placeholder={tab === "signup" ? "8+ chars, 1 letter, 1 number" : "••••••••"}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy
              ? "Working…"
              : tab === "signin"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <p className="auth-fineprint">
          Zero data retention by default — your code is analysed in-memory and is
          only stored in your private history when you are signed in.
        </p>
      </div>
    </div>
  );
}
