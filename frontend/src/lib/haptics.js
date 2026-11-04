/**
 * Tiny haptics helper: a short tick on commits / selection changes. Android only (iOS web has no vibrate API),
 * touch devices only, respects reduced motion. by Nitish Singh
 */
function ok() {
  try {
    return typeof navigator.vibrate === "function"
      && window.matchMedia("(pointer: coarse)").matches
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
}
export const tick = () => { if (ok()) navigator.vibrate(8); };
export const success = () => { if (ok()) navigator.vibrate([10, 40, 14]); };
