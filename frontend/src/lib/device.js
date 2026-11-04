/**
 * CodeSense AI - device + motion helpers.
 * by Nitish Kumar Singh
 */
import { useEffect, useState } from "react";
import { useSettings } from "./theme";

const MOBILE_Q = "(max-width: 700px), (pointer: coarse)";

export function isMobileNow() {
  try { return window.matchMedia(MOBILE_Q).matches; } catch { return false; }
}

/** true on phones / touch devices: lightweight editor + bottom nav behaviours. */
export function useIsMobile() {
  const [m, setM] = useState(isMobileNow);
  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia(MOBILE_Q);
      const on = () => setM(mq.matches);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    } catch { return undefined; }
  }, []);
  return m;
}

export function prefersReducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/** "full" | "simple" | "off" - auto = Full on desktop, Simple on mobile, Off for reduced motion. */
export function resolveScanMode(setting, mobile) {
  if (prefersReducedMotion()) return "off";
  if (setting === "full" || setting === "simple" || setting === "off") return setting;
  return mobile ? "simple" : "full";
}

export function useScanMode() {
  const { settings } = useSettings();
  const mobile = useIsMobile();
  return resolveScanMode(settings.scan, mobile);
}
