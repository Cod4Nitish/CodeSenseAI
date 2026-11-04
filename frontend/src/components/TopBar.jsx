/**
 * CodeSense AI — global top bar (brand · nav · live status · account).
 * by Nitish Singh
 *
 * Shared by every route so the shell never jumps between pages.
 */

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../lib/theme";

function initials(name = "", email = "") {
  const src = (name || email).trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function UserMenu() {
  const { user, logout, promptLogin, isAuthed } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!isAuthed) {
    return (
      <button className="tb-signin" onClick={() => promptLogin("Sign in to CodeSense AI")}>
        Sign in
      </button>
    );
  }

  return (
    <div className="tb-user" ref={ref}>
      <button
        className="tb-avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user?.email}
      >
        <span className="tb-avatar">{initials(user?.full_name, user?.email)}</span>
        <span className="tb-user-name">{user?.full_name?.split(" ")[0] || "Account"}</span>
        <span className="tb-caret">▾</span>
      </button>

      {open && (
        <div className="tb-menu" role="menu">
          <div className="tb-menu-head">
            <div className="tb-menu-name">{user?.full_name}</div>
            <div className="tb-menu-email">{user?.email}</div>
            <div className="tb-plan-badge">{user?.plan || "Developer Pro"}</div>
          </div>
          <button
            className="tb-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/dashboard");
            }}
          >
            <span>▤</span> Executive Dashboard
          </button>
          <button
            className="tb-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/app");
            }}
          >
            <span>&gt;_</span> Review Workspace
          </button>
          <div className="tb-menu-sep" />
          <button
            className="tb-menu-item danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
              navigate("/");
            }}
          >
            <span>⏻</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const ICON = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const MODES = [
  ["light", "Light", <svg key="l" {...ICON}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>],
  ["dark", "Dark", <svg key="d" {...ICON}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>],
  ["system", "System", <svg key="s" {...ICON}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>],
];

function ThemeToggle() {
  const { settings, update } = useSettings();
  let dark = settings.theme === "dark";
  if (settings.theme === "system") {
    try { dark = !window.matchMedia("(prefers-color-scheme: light)").matches; } catch { dark = true; }
  }
  return (
    <button type="button" className="tb-icon-btn" onClick={() => update({ theme: dark ? "light" : "dark" })}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light theme" : "Dark theme"}>
      {dark ? MODES[0][2] : MODES[1][2]}
    </button>
  );
}

function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="set-switch" onClick={() => onChange(!checked)} />;
}

function SettingsMenu() {
  const { settings, update, reset } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="tb-user" ref={ref}>
      <button type="button" className="tb-icon-btn" onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog" aria-expanded={open} aria-label="Settings" title="Settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
      {open && (
        <div className="tb-menu settings-pop" role="dialog" aria-label="Settings">
          <div className="tb-menu-label">Settings</div>
          <label className="set-row"><span>Theme</span>
            <select value={settings.theme} onChange={(e) => update({ theme: e.target.value })}>
              <option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option>
            </select>
          </label>
          <div className="set-row"><span>Neo Brutal style</span>
            <Switch label="Neo Brutal style" checked={settings.skin === "neo-brutal"} onChange={(v) => update({ skin: v ? "neo-brutal" : "default" })} />
          </div>
          <div className="tb-menu-sep" />
          <label className="set-row"><span>Editor font size</span>
            <input type="number" min="11" max="20" value={settings.fontSize} onChange={(e) => update({ fontSize: e.target.value })} />
          </label>
          <div className="set-row"><span>Minimap</span>
            <Switch label="Minimap" checked={settings.minimap} onChange={(v) => update({ minimap: v })} />
          </div>
          <div className="set-row"><span>Word wrap</span>
            <Switch label="Word wrap" checked={settings.wordWrap} onChange={(v) => update({ wordWrap: v })} />
          </div>
          <label className="set-row"><span>Default language</span>
            <select value={settings.language} onChange={(e) => update({ language: e.target.value })}>
              {["python", "javascript", "typescript", "java", "cpp", "go", "auto"].map((l) => <option key={l} value={l}>{l === "cpp" ? "C++" : l === "auto" ? "Auto-detect" : l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </label>
          <label className="set-row"><span>PR review strictness</span>
            <select value={settings.strictness} onChange={(e) => update({ strictness: e.target.value })}>
              <option value="chill">Chill</option><option value="assertive">Assertive</option>
            </select>
          </label>
          <button type="button" className="btn btn-ghost set-reset" onClick={reset}>Reset to defaults</button>
          <div className="tb-menu-sep" />
          <div className="about">
            <strong>CodeSense AI</strong>
            <span>An AI-Powered Code and Bug Detection System</span>
            <span>Project No. 61 · Group 23AIA861 · Guide: Ms. Khushboo</span>
            <span>Domain: Application Based</span>
            <span>Team: Nitish Kumar Singh (lead), Shivam</span>
          </div>
        </div>
      )}
    </div>
  );
}

const NO_BAR = ["/", "/product", "/about", "/login", "/signup", "/forgot-password"];

export default function TopBar() {
  const { pathname } = useLocation();
  if (NO_BAR.includes(pathname.replace(/\/+$/, "") || "/")) return null;
  const link = ({ isActive }) => `tb-nav-link ${isActive ? "active" : ""}`;
  return (
    <header className="tb">
      <div className="tb-left">
        <Link to="/" className="tb-brand" aria-label="CodeSense AI - home" title="Back to home">
          <img className="tb-brand-logo" src="/favicon.svg" alt="" width="32" height="32" />
          <span className="tb-brand-name">CodeSense AI</span>
        </Link>
        <nav className="tb-nav" aria-label="App">
          <NavLink to="/app" end className={link}>Workspace</NavLink>
          <NavLink to="/pr" className={link}>PR Review</NavLink>
          <NavLink to="/learn" className={link}>Learn</NavLink>
          <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
        </nav>
      </div>

      <div className="tb-right">
        <ThemeToggle />
        <SettingsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
