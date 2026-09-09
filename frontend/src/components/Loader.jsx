import { useEffect, useState } from "react";

const STEPS = ["parsing", "reviewing", "formatting"];

export default function Loader() {
  // Advance through steps; hold on the last one until the response lands.
  const [active, setActive] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setActive(STEPS.length - 1);
      return;
    }
    const id = window.setInterval(() => {
      setActive((i) => Math.min(i + 1, STEPS.length - 1));
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="loader-wrapper" role="status" aria-live="polite" aria-label="Analyzing code…">
      <div className="loader-terminal">
        <span className="loader-prompt">&gt;&nbsp;</span>
        <span>{STEPS[active]}</span>
        <span className="loader-dots"><span>.</span><span>.</span><span>.</span></span>
        <span className="loader-cursor">█</span>
      </div>

      <p className="loader-meta">Sending to Gemini AI — usually takes 2–8 seconds</p>

      <div className="loader-steps">
        {STEPS.map((label, i) => (
          <span key={label} style={{ display: "contents" }}>
            {i > 0 && <span className="loader-arrow">›</span>}
            <span
              className={
                "loader-step " +
                (i < active ? "done" : i === active ? "active" : "")
              }
            >
              {i < active ? "✓ " : ""}{label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
