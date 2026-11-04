/** Split-screen frame for /login /signup /forgot-password: brand panel + form card. */
import { Link } from "react-router-dom";
import "./auth.css";

export function ScanArt() {
  return (
    <div className="au-scan au-art" aria-hidden="true">
      <span className="beam" />
      <code>{"def total(items):"}</code>
      <code>{"  sum = 0"}</code>
      <code>{"  for i in range(len(items) + 1):"}</code>
      <code>
        {"    sum += "}
        <span className="bug">{"items[i]"}</span>
      </code>
      <code className="fix">{"  # off-by-one found, fix suggested"}</code>
    </div>
  );
}

export default function AuthShell({ children, labelledBy }) {
  return (
    <div className="au-page">
      <aside className="au-brand">
        <div className="au-brand-in">
          <Link to="/" className="au-logo">
            <span className="au-logo-mark" aria-hidden="true">&gt;_</span>
            CodeSense AI
          </Link>
          <p className="au-value">Catch bugs before they ship, with plain-English explanations and fixes.</p>
          <ul className="au-bullets">
            <li><b aria-hidden="true">01</b> Instant AI review of code and pull-request diffs</li>
            <li><b aria-hidden="true">02</b> Every issue explained with severity and a suggested fix</li>
            <li><b aria-hidden="true">03</b> Quality score and history so you can see yourself improve</li>
          </ul>
          <ScanArt />
        </div>
      </aside>
      <main className="au-main" aria-labelledby={labelledBy}>
        {children}
      </main>
    </div>
  );
}
