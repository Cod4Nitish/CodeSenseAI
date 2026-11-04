/**
 * CodeSense AI - user settings + theme (single source of truth).
 * by Nitish Kumar Singh
 *
 * One JSON blob in localStorage (`codesense_settings`). The theme is applied by an
 * inline script in index.html before first paint (no flash); this module keeps
 * <html data-palette data-theme data-mode> in sync afterwards.
 *
 *   palette: "lofi" (default) | "pastel" | "graphite" | "paper" | "arctic"
 *   theme:   "light" | "dark" | "system"  (only lofi + pastel honour it; the other
 *            three palettes are fixed-mode: graphite = dark, paper/arctic = light)
 *   level:   "auto" | "beginner" | "developer"  (auto = Beginner on /learn, Developer elsewhere)
 */
import { useEffect, useState } from "react";

export const PALETTES = [
  { id: "lofi", name: "Dithered Lo-fi", mode: null, sw: ["#f2efe8", "#2b3bff", "#ff7acb", "#0a0a12"] },
  { id: "pastel", name: "Soft Pastel", mode: null, sw: ["#fff7f2", "#6c4fd6", "#ff8fab", "#1e1a2e"] },
  { id: "graphite", name: "Graphite & Lime", mode: "dark", sw: ["#09090b", "#c4f82a", "#1a1a1f", "#fafafa"] },
  { id: "paper", name: "Paper & Ink", mode: "light", sw: ["#eeece6", "#d63f17", "#fcfbf8", "#101216"] },
  { id: "arctic", name: "Arctic Glass", mode: "light", sw: ["#dcecf2", "#087a8c", "#ffffff", "#12304f"] },
];
const FIXED = { graphite: "dark", paper: "light", arctic: "light" };

/** Google Fonts per palette (loaded lazily, only the active one). Keep in sync with index.html. */
const FONT_URLS = {
  lofi: "https://fonts.googleapis.com/css2?family=Syne:wght@600;800&family=Space+Mono:wght@400;700&display=swap",
  pastel: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Fredoka:wght@500;600&display=swap",
  graphite: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap",
  paper: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Instrument+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap",
  arctic: "https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700;800&family=Fragment+Mono&display=swap",
};

export const DEFAULTS = {
  palette: "lofi",
  theme: "dark",
  level: "auto",
  scan: "auto",
  fontSize: 13,
  minimap: false,
  wordWrap: true,
  language: "python",
  strictness: "chill",
};

const KEY = "codesense_settings";
const EVT = "codesense:settings";
const LANGS = ["python", "javascript", "typescript", "java", "cpp", "go", "auto"];

function sanitize(raw) {
  const s = { ...DEFAULTS, ...(raw && typeof raw === "object" ? raw : {}) };
  if (!PALETTES.some((p) => p.id === s.palette)) s.palette = DEFAULTS.palette;
  if (!["dark", "light", "system"].includes(s.theme)) s.theme = DEFAULTS.theme;
  if (!["auto", "beginner", "developer"].includes(s.level)) s.level = DEFAULTS.level;
  if (!["auto", "full", "simple", "off"].includes(s.scan)) s.scan = DEFAULTS.scan;
  s.fontSize = Math.min(20, Math.max(11, Number(s.fontSize) || DEFAULTS.fontSize));
  s.minimap = !!s.minimap;
  s.wordWrap = !!s.wordWrap;
  if (!LANGS.includes(s.language)) s.language = DEFAULTS.language;
  if (!["chill", "assertive"].includes(s.strictness)) s.strictness = DEFAULTS.strictness;
  return s;
}

export function getSettings() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) || "null"));
  } catch {
    return { ...DEFAULTS };
  }
}

function systemIsLight() {
  try { return window.matchMedia("(prefers-color-scheme: light)").matches; } catch { return false; }
}

/** "dark" | "light" - the mode actually shown */
export function resolveTheme(s = getSettings()) {
  if (FIXED[s.palette]) return FIXED[s.palette];
  if (s.theme === "system") return systemIsLight() ? "light" : "dark";
  return s.theme;
}

export function isFixedMode(palette) {
  return !!FIXED[palette];
}

function loadFonts(palette) {
  try {
    const id = "cs-fonts-" + palette;
    if (document.getElementById(id) || !FONT_URLS[palette]) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet"; l.href = FONT_URLS[palette];
    document.head.appendChild(l);
  } catch { /* offline / blocked: system fonts are the fallback */ }
}

export function applyTheme(s = getSettings()) {
  const t = resolveTheme(s);
  const root = document.documentElement;
  root.dataset.palette = s.palette;
  root.dataset.theme = t;
  root.dataset.mode = t;
  loadFonts(s.palette);
  try {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", getComputedStyle(document.body).getPropertyValue("--bg-base").trim() || "#f2efe8");
  } catch { /* ignore */ }
}

function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

export function updateSettings(patch) {
  const next = sanitize({ ...getSettings(), ...patch });
  persist(next);
  applyTheme(next);
  window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
  return next;
}

export function resetSettings() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  const next = { ...DEFAULTS };
  applyTheme(next);
  window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
  return next;
}

export function useSettings() {
  const [settings, setLocal] = useState(getSettings);
  useEffect(() => {
    const on = (e) => setLocal(e.detail);
    window.addEventListener(EVT, on);
    // Follow the OS while "system" is selected.
    let mq;
    const onOs = () => applyTheme(getSettings());
    try {
      mq = window.matchMedia("(prefers-color-scheme: light)");
      mq.addEventListener("change", onOs);
    } catch { /* old browser */ }
    return () => {
      window.removeEventListener(EVT, on);
      mq?.removeEventListener?.("change", onOs);
    };
  }, []);
  return { settings, update: updateSettings, reset: resetSettings };
}

/** Back-compat helper used by the editor: is the resolved theme dark? */
export function useTheme() {
  const { settings } = useSettings();
  const resolved = resolveTheme(settings);
  return { theme: resolved, isDark: resolved === "dark", palette: settings.palette };
}

/** Beginner / Developer view. `inLearn` makes "auto" resolve to beginner. */
export function useLevel(inLearn = false) {
  const { settings } = useSettings();
  const level = settings.level === "auto" ? (inLearn ? "beginner" : "developer") : settings.level;
  return { level, beginner: level === "beginner" };
}
