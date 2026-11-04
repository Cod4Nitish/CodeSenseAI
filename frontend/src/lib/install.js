/**
 * CodeSense AI - "Install app" helpers (PWA).
 * by Nitish Singh
 *
 * - detects the device (Windows / Android / iPhone-iPad / Mac) and browser
 * - captures Chrome/Edge's `beforeinstallprompt` as early as possible (it fires once, soon after load)
 * - exposes `useInstall()` for React and `openInstall()` so any button can open the chooser dialog
 */
import { useEffect, useState } from "react";

let deferred = null;                 // the saved beforeinstallprompt event
let installed = isStandalone();
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export function isStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();              // we show our own button instead of the mini-infobar
    deferred = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

/** "ios" | "android" | "windows" | "mac" (Linux / ChromeOS fall back to "windows" = desktop steps) */
export function detectPlatform() {
  const ua = navigator.userAgent || "";
  const touch = (navigator.maxTouchPoints || 0) > 1;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch)) return "ios"; // iPadOS pretends to be a Mac
  if (/Android/.test(ua)) return "android";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  return "windows";
}

/** "edge" | "chrome" | "firefox" | "samsung" | "safari" | "other" */
export function detectBrowser() {
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua)) return "edge";
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Firefox|FxiOS/.test(ua)) return "firefox";
  if (/CriOS|Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

export function canPrompt() {
  return !!deferred;
}

/** Shows the browser's native install prompt. Resolves to "accepted" | "dismissed" | "unavailable". */
export async function promptInstall() {
  if (!deferred) return "unavailable";
  const ev = deferred;
  deferred = null;
  emit();
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  } catch {
    return "unavailable";
  }
}

export function openInstall() {
  window.dispatchEvent(new CustomEvent("codesense:install"));
}

export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return { installed, canPrompt: !!deferred, promptInstall };
}
