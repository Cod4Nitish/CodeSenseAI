/**
 * Scan animation driver: a moving line index that loops while `active`.
 * Stops immediately when the response arrives. by Nitish Kumar Singh
 */
import { useEffect, useState } from "react";

export const SCAN_TRAIL = 5;

/** Returns the 1-based line currently being "scanned", or null when idle. */
export function useScanLine(active, totalLines) {
  const [line, setLine] = useState(null);
  useEffect(() => {
    if (!active || !totalLines) { setLine(null); return undefined; }
    // ~2.4s per pass; bigger files skip lines per tick so the pass length stays constant
    const tick = 90;
    const step = Math.max(1, Math.ceil(totalLines / (2400 / tick)));
    let cur = 1;
    setLine(1);
    const id = window.setInterval(() => {
      cur += step;
      if (cur > totalLines) cur = 1;
      setLine(cur);
    }, tick);
    return () => window.clearInterval(id);
  }, [active, totalLines]);
  return line;
}
