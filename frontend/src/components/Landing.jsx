/**
 * CodeSense AI - simple start panel shown in the Workspace before the first review.
 * One idea, one big button, three steps. by Nitish Singh
 */
import { useNavigate } from "react-router-dom";

const STEPS = [
  { n: "1", title: "Paste your code", text: "Or open a file" },
  { n: "2", title: "Click Review", text: "Takes a few seconds" },
  { n: "3", title: "Read and fix", text: "Plain-English tips" },
];

export default function Landing({ onDemo }) {
  const navigate = useNavigate();
  return (
    <div className="landing landing-simple">
      <div className="landing-hero">
        <span className="landing-eyebrow">Free AI code review</span>
        <h1 className="landing-title">
          Paste code. Get a <span className="grad">clear review</span>.
        </h1>
        <p className="landing-sub">
          Finds bugs and security problems, explains them in simple words, and shows how to fix them.
          Works for beginners and pros.
        </p>
        <div className="landing-cta">
          <button type="button" className="btn btn-primary btn-lg" onClick={onDemo}>
            ▶ Try an example
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate("/learn")}>
            I'm a beginner →
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate("/pr")}>
            Review a GitHub PR →
          </button>
        </div>
      </div>

      <ol className="how-steps simple-steps" aria-label="How it works">
        {STEPS.map((s) => (
          <li key={s.n} className="how-step">
            <span className="how-n">{s.n}</span>
            <div><strong>{s.title}</strong><span>{s.text}</span></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
