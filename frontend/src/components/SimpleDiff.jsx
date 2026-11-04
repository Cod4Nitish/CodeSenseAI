/**
 * SimpleDiff - small unified line diff (LCS) for phones, where Monaco's side-by-side
 * DiffEditor is unusable. Read-only. by Nitish Kumar Singh
 */
import { useMemo } from "react";

export function diffLines(a, b) {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = x.length, m = y.length;
  if (n * m > 400000) {
    return [...x.map((t) => ({ k: "-", t })), ...y.map((t) => ({ k: "+", t }))];
  }
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ k: " ", t: x[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ k: "-", t: x[i++] });
    else out.push({ k: "+", t: y[j++] });
  }
  while (i < n) out.push({ k: "-", t: x[i++] });
  while (j < m) out.push({ k: "+", t: y[j++] });
  return out;
}

export default function SimpleDiff({ original, modified }) {
  const rows = useMemo(() => diffLines(original, modified), [original, modified]);
  const changed = rows.filter((r) => r.k !== " ").length;
  return (
    <div className="sdiff" role="region" aria-label="Changes: removed lines in red, added lines in green" tabIndex={0}>
      {changed === 0 && <p className="sdiff-none">No differences.</p>}
      {rows.map((r, i) => (
        <div key={i} className={`sdiff-row k${r.k === " " ? "0" : r.k === "+" ? "add" : "del"}`}>
          <span className="sdiff-mark" aria-hidden="true">{r.k}</span>
          <span className="sdiff-t">{r.t || " "}</span>
          <span className="sr-only">{r.k === "+" ? "added" : r.k === "-" ? "removed" : ""}</span>
        </div>
      ))}
    </div>
  );
}
