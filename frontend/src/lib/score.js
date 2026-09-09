/**
 * CodeSense AI — deterministic Quality Score engine.
 * by Nitish Singh
 *
 * Score  = 10 - (high * 2.5) - (medium * 0.8) - (low * 0.2),  clamped to [0, 10]
 * Grade  = A+ / A / B / C / D / F  by fixed thresholds
 */

const GRADES = [
  { min: 9.5, grade: "A+", tone: "ok", label: "Production ready" },
  { min: 8.5, grade: "A", tone: "ok", label: "Ship with minor cleanup" },
  { min: 7.0, grade: "B", tone: "warn", label: "Solid — needs polish" },
  { min: 5.5, grade: "C", tone: "warn", label: "Needs attention" },
  { min: 3.5, grade: "D", tone: "error", label: "High risk" },
  { min: -Infinity, grade: "F", tone: "error", label: "Critical — do not ship" },
];

export function computeScore(counts) {
  const high = Math.max(0, counts?.high ?? 0);
  const medium = Math.max(0, counts?.medium ?? 0);
  const low = Math.max(0, counts?.low ?? 0);

  const raw = 10 - high * 2.5 - medium * 0.8 - low * 0.2;
  const clamped = Math.min(10, Math.max(0, raw));
  const score = Math.round(clamped * 10) / 10; // one decimal, deterministic

  const bucket = GRADES.find((g) => score >= g.min) ?? GRADES[GRADES.length - 1];

  return {
    score, // number, 0.0 – 10.0
    display: score.toFixed(1), // "7.2"
    grade: bucket.grade,
    tone: bucket.tone, // "ok" | "warn" | "error"
    label: bucket.label,
    counts: { high, medium, low },
    total: high + medium + low,
  };
}
