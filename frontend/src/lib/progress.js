/**
 * CodeSense AI - learner progress (localStorage only, never sent anywhere).
 * by Nitish Kumar Singh
 */
import { useEffect, useState } from "react";

const KEY = "codesense_progress";
const TONGUE_KEY = "codesense_tongue";
const EVT = "codesense:progress";

const EMPTY = { quizzes: 0, correct: 0, understood: 0, best: 0, days: {} };

export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function getProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") return { ...EMPTY, ...raw, days: { ...(raw.days || {}) } };
  } catch { /* ignore */ }
  return { ...EMPTY, days: {} };
}

function save(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVT));
}

/** Consecutive active days ending today (or yesterday, so the streak survives until midnight). */
export function currentStreak(days, now = new Date()) {
  const d = new Date(now);
  if (!days[dayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[dayKey(d)]) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

function touch(p) {
  const k = dayKey();
  p.days[k] = (p.days[k] || 0) + 1;
  p.best = Math.max(p.best, currentStreak(p.days));
}

export function recordQuiz(correct) {
  const p = getProgress();
  p.quizzes += 1;
  if (correct) p.correct += 1;
  touch(p);
  save(p);
}

export function recordUnderstood() {
  const p = getProgress();
  p.understood += 1;
  touch(p);
  save(p);
}

export function resetProgress() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT));
}

/** Last 7 days (oldest first) of activity counts. */
export function weekActivity(p, now = new Date()) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({ key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), n: p.days[dayKey(d)] || 0 });
  }
  return out;
}

export function useProgress() {
  const [p, setP] = useState(getProgress);
  useEffect(() => {
    const on = () => setP(getProgress());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return p;
}

/** "english" | "hinglish" - persisted. */
export function useTongue() {
  const read = () => {
    try { return localStorage.getItem(TONGUE_KEY) === "hinglish" ? "hinglish" : "english"; } catch { return "english"; }
  };
  const [t, setT] = useState(read);
  useEffect(() => {
    const on = () => setT(read());
    window.addEventListener("codesense:tongue", on);
    return () => window.removeEventListener("codesense:tongue", on);
  }, []);
  const set = (v) => {
    try { localStorage.setItem(TONGUE_KEY, v); } catch { /* ignore */ }
    setT(v);
    window.dispatchEvent(new Event("codesense:tongue"));
  };
  return [t, set];
}
