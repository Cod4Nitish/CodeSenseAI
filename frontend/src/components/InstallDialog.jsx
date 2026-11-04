/**
 * InstallDialog - "Install CodeSense AI" chooser.
 * Opens from anywhere via openInstall() (top bar, settings, landing).
 * Pre-selects the detected device; the user can switch to Windows / Android / iPhone / Mac.
 * by Nitish Singh
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { detectBrowser, detectPlatform, useInstall } from "../lib/install";

const TABS = [
  { id: "windows", label: "Windows", icon: "⊞" },
  { id: "android", label: "Android", icon: "▲" },
  { id: "ios", label: "iPhone / iPad", icon: "◐" },
  { id: "mac", label: "Mac", icon: "⌘" },
];

const PLAT_NAME = { windows: "Windows", android: "Android", ios: "iPhone / iPad", mac: "Mac" };

/** Steps for the chosen platform, written for the browser the user is on when it is the current device. */
function stepsFor(target, current, browser) {
  const here = target === current;
  if (target === "windows") {
    if (here && browser === "firefox") {
      return { ok: false, note: "Firefox on Windows cannot install web apps.", steps: ["Open this page in Microsoft Edge or Google Chrome.", "Then click Install."] };
    }
    return {
      ok: true,
      steps: [
        "Open this site in Microsoft Edge or Google Chrome.",
        "Click the install icon at the right end of the address bar, or open the menu: Edge > Apps > Install this site as an app. Chrome > Cast, save and share > Install page as app.",
        "Click Install. CodeSense AI opens in its own window and gets a Start menu and desktop icon.",
      ],
    };
  }
  if (target === "android") {
    if (here && browser === "firefox") {
      return { ok: true, steps: ["Open the Firefox menu (three dots).", "Tap Install.", "Confirm. The app appears on your home screen."] };
    }
    if (here && browser === "samsung") {
      return { ok: true, steps: ["Open the menu (three lines) in Samsung Internet.", "Tap Add page to > Home screen.", "Confirm."] };
    }
    return {
      ok: true,
      steps: [
        "Open this site in Chrome on your Android phone.",
        "Tap Install app (or the three-dot menu > Install app / Add to Home screen).",
        "Confirm. CodeSense AI appears on your home screen and opens full screen.",
      ],
    };
  }
  if (target === "ios") {
    return {
      ok: false,
      note: here ? "Apple does not allow a one-tap install, but it takes 3 taps:" : "Do this on your iPhone or iPad (Safari works best):",
      steps: [
        "Open this site in Safari.",
        "Tap the Share button (the square with an arrow pointing up).",
        "Scroll down and tap Add to Home Screen, then tap Add.",
      ],
    };
  }
  // mac
  if (here && browser === "firefox") {
    return { ok: false, note: "Firefox on Mac cannot install web apps.", steps: ["Open this page in Chrome, Edge or Safari.", "Then follow the install steps there."] };
  }
  if (here && browser === "safari") {
    return { ok: false, steps: ["In the menu bar choose File > Add to Dock.", "Click Add. The app appears in your Dock and Launchpad."] };
  }
  return {
    ok: true,
    steps: [
      "Open this site in Chrome or Edge (Safari: File > Add to Dock).",
      "Click the install icon at the right end of the address bar.",
      "Click Install. CodeSense AI opens in its own window and appears in Launchpad.",
    ],
  };
}

export default function InstallDialog() {
  const [open, setOpen] = useState(false);
  const detected = useMemo(() => detectPlatform(), []);
  const browser = useMemo(() => detectBrowser(), []);
  const [tab, setTab] = useState(detected);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const { installed, canPrompt, promptInstall } = useInstall();
  const boxRef = useRef(null);

  useEffect(() => {
    const onOpen = () => { setTab(detected); setMsg(""); setOpen(true); };
    window.addEventListener("codesense:install", onOpen);
    return () => window.removeEventListener("codesense:install", onOpen);
  }, [detected]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    boxRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const info = stepsFor(tab, detected, browser);
  const sameDevice = tab === detected;
  const url = typeof window !== "undefined" ? window.location.origin + "/app" : "";

  async function installNow() {
    const out = await promptInstall();
    if (out === "accepted") { setMsg("Installed! Look for CodeSense AI in your apps."); }
    else if (out === "dismissed") { setMsg("No problem. You can install any time from here."); }
    else { setMsg("Your browser did not offer a one-tap install. Use the steps below."); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }

  return (
    <div className="inst-back" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="inst" role="dialog" aria-modal="true" aria-labelledby="inst-h" ref={boxRef} tabIndex={-1}>
        <button type="button" className="inst-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        <div className="inst-head">
          <img src="/favicon.svg" alt="" width="44" height="44" />
          <div>
            <h2 id="inst-h">Install CodeSense AI</h2>
            <p>Opens in its own window, with its own icon. Free.</p>
          </div>
        </div>

        {installed ? (
          <p className="inst-done">✓ CodeSense AI is already installed on this device.</p>
        ) : (
          <>
            <div className="inst-detect">
              Detected: <b>{PLAT_NAME[detected]}</b>. Not right? Pick your device:
            </div>
            <div className="inst-tabs" role="tablist" aria-label="Choose your device">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                  className={`inst-tab${tab === t.id ? " on" : ""}`} onClick={() => { setTab(t.id); setMsg(""); }}>
                  <span aria-hidden="true">{t.icon}</span>{t.label}
                  {t.id === detected && <i className="inst-you">this device</i>}
                </button>
              ))}
            </div>

            <div className="inst-body" role="tabpanel">
              {sameDevice && canPrompt && (
                <button type="button" className="btn btn-primary inst-go" onClick={installNow}>
                  ⬇ Install now
                </button>
              )}
              {info.note && <p className="inst-note">{info.note}</p>}
              {sameDevice && !canPrompt && info.ok && tab !== "ios" && (
                <p className="inst-note">One-tap install is not available in this browser or tab yet. Follow these steps:</p>
              )}
              {!sameDevice && (
                <p className="inst-note">You are on {PLAT_NAME[detected]}. To install for {PLAT_NAME[tab]}, open the link on that device:</p>
              )}
              <ol className="inst-steps">
                {info.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              {!sameDevice && (
                <div className="inst-link">
                  <code>{url}</code>
                  <button type="button" className="btn btn-ghost" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
                </div>
              )}
              {msg && <p className="inst-msg" role="status">{msg}</p>}
            </div>
          </>
        )}
        <p className="inst-foot">This is a web app install (PWA), not a download. It updates itself and uses almost no storage.</p>
      </div>
    </div>
  );
}
