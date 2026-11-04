/**
 * CodeSense AI — HTTP client.
 * by Nitish Singh
 *
 * A single fetch wrapper with request/response "interceptor" behaviour:
 *   • request  — injects `Authorization: Bearer <token>` from localStorage
 *   • response — parses FastAPI's `{ detail }` errors into real Error objects,
 *                and broadcasts a `codesense:unauthorized` event on a 401 so the
 *                auth layer can log the user out from one place.
 *
 * Kept dependency-free (no axios) — the surface is small and the native
 * `fetch` API covers everything we need.
 */

// Local dev talks to the FastAPI on :8000; any other host (production, LAN, PWA)
// uses same-origin so the frontend can be served by the FastAPI container itself.
function resolveApiBase() {
  // Only honour VITE_API_URL / the :8000 default on a local machine. A build made with a
  // dev .env must never point a deployed site at localhost.
  try {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return import.meta.env.VITE_API_URL || "http://localhost:8000";
    if (import.meta.env.VITE_API_URL && !/localhost|127\.0\.0\.1/.test(import.meta.env.VITE_API_URL)) return import.meta.env.VITE_API_URL;
  } catch { /* non-browser */ }
  return "";
}
const API_BASE = resolveApiBase();
const TOKEN_KEY = "codesense_token";

/* ── token store ────────────────────────────────────────────────────────── */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private-mode / storage disabled — tokens simply won't persist */
  }
}

export function clearToken() {
  setToken(null);
}

/* ── core request ──────────────────────────────────────────────────────── */
class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function apiFetch(path, { method = "GET", body, auth = true, signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkErr) {
    if (networkErr.name === "AbortError") throw networkErr;
    throw new ApiError(
      "Cannot reach the CodeSense backend" + (API_BASE ? ". Is it running on " + API_BASE + "?" : ". Check your connection."),
      0,
      null
    );
  }

  // 204 No Content
  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    if (response.status === 401 && auth) {
      window.dispatchEvent(new CustomEvent("codesense:unauthorized"));
    }
    const message =
      (data && (data.detail || data.error || data.message)) ||
      `Request failed: ${response.status} ${response.statusText}`;
    throw new ApiError(
      Array.isArray(message) ? formatValidationError(message) : message,
      response.status,
      data
    );
  }

  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

// FastAPI 422 payloads are arrays of {loc, msg, ...}; surface the first message.
function formatValidationError(errors) {
  const first = errors[0];
  if (first && typeof first === "object" && first.msg) {
    return first.msg.replace(/^Value error,\s*/i, "");
  }
  return "Validation failed.";
}

/* ── endpoints ─────────────────────────────────────────────────────────── */
export async function analyzeCode(code, language, { persist = true, signal } = {}) {
  return apiFetch("/api/analyze", {
    method: "POST",
    body: { code, language, persist },
    signal,
  });
}

export function fetchGithubPR(url, { signal } = {}) {
  return apiFetch(`/api/github/pr?url=${encodeURIComponent(url)}`, { signal });
}

export async function reviewDiff({ diff, title = "", description = "", profile = "chill" }, { signal } = {}) {
  return apiFetch("/api/review-diff", {
    method: "POST",
    body: { diff, title, description, profile },
    signal,
  });
}

/* ── AI assistant endpoints (same Gemini key) ───────────────────────────── */
export const ai = {
  chat: ({ code, language, message, history = [], issues = [] }, { signal } = {}) =>
    apiFetch("/api/ai/chat", { method: "POST", body: { code, language, message, history, issues }, signal }),
  fix: ({ code, language, issues = [] }, { signal } = {}) =>
    apiFetch("/api/ai/fix", { method: "POST", body: { code, language, issues }, signal }),
  explain: ({ code, language, level = "beginner", lang = "english" }, { signal } = {}) =>
    apiFetch("/api/ai/explain", { method: "POST", body: { code, language, level, lang }, signal }),
  simplify: ({ code, language, issue_title, issue_explanation, line, tongue = "english" }, { signal } = {}) =>
    apiFetch("/api/ai/simplify", { method: "POST", body: { code, language, issue_title, issue_explanation, line, tongue }, signal }),
  quiz: ({ language, difficulty = "easy", topic = "", tongue = "english" }, { signal } = {}) =>
    apiFetch("/api/ai/quiz", { method: "POST", body: { language, difficulty, topic, tongue }, signal }),
  tests: ({ code, language, framework = "" }, { signal } = {}) =>
    apiFetch("/api/ai/tests", { method: "POST", body: { code, language, framework }, signal }),
};

export const auth = {
  register: (email, full_name, password) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      auth: false,
      body: { email, full_name, password },
    }),
  login: (email, password) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    }),
  demo: () => apiFetch("/api/auth/demo", { method: "POST", auth: false }),
  me: () => apiFetch("/api/auth/me"),
};

export const reviews = {
  list: ({ limit = 50, offset = 0 } = {}) =>
    apiFetch(`/api/reviews?limit=${limit}&offset=${offset}`),
  get: (id) => apiFetch(`/api/reviews/${id}`),
  stats: () => apiFetch("/api/reviews/stats"),
  remove: (id) => apiFetch(`/api/reviews/${id}`, { method: "DELETE" }),
};

export const health = () => apiFetch("/api/health", { auth: false });

export { API_BASE, ApiError };
