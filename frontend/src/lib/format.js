/**
 * CodeSense AI — small formatting helpers shared by the dashboard.
 * by Nitish Singh
 */

const LANG_COLORS = {
  python: "#4B8BBE",
  javascript: "#e2b93d",
  typescript: "#3178c6",
  java: "#e76f00",
  cpp: "#9c033a",
  go: "#00ADD8",
  auto: "#818cf8",
};

export function langColor(lang) {
  return LANG_COLORS[lang] || "#818cf8";
}

export function langLabel(lang) {
  if (!lang || lang === "auto") return "AUTO";
  if (lang === "cpp") return "C++";
  if (lang === "javascript") return "JS";
  if (lang === "typescript") return "TS";
  return lang.charAt(0).toUpperCase() + lang.slice(1);
}

/**
 * The API emits naive UTC ISO strings ("2026-11-03T16:26:02.53"). `new Date()`
 * would read those as *local* time (a "just now" review showed as "6h ago" in
 * IST), so append "Z" when no offset is present.
 */
export function parseApiDate(iso) {
  if (typeof iso === "string" && /T\d{2}:\d{2}/.test(iso) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(iso)) {
    return new Date(iso + "Z");
  }
  return new Date(iso);
}

/** "2h ago", "3d ago", or a short date for anything older than a week. */
export function relativeTime(iso) {
  const then = parseApiDate(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 45) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return parseApiDate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function absoluteTime(iso) {
  const d = parseApiDate(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function gradeTone(grade) {
  if (["A+", "A"].includes(grade)) return "ok";
  if (["B", "C"].includes(grade)) return "warn";
  return "error";
}

export function pct(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}
