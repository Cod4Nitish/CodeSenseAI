import { Link, Navigate, useLocation } from "react-router-dom";
import "../../components/errors/errors.css";

/** Old/alias paths that used to land on the workspace through the catch-all redirect. */
const LEGACY = ["/index.html", "/home", "/workspace", "/app", "/review", "/editor"];

export default function NotFound() {
  const { pathname } = useLocation();
  if (LEGACY.includes(pathname.replace(/\/+$/, "").toLowerCase())) return <Navigate to="/app" replace />;
  return (
    <main className="er-page">
      <div className="er-card">
        <div className="er-code" aria-hidden="true">4<span>0</span>4</div>
        <h1>Page not found</h1>
        <p>
          We couldn't find <code style={{ fontFamily: "var(--font-mono, monospace)", wordBreak: "break-all" }}>{pathname}</code>.
          It may have moved, or the link has a typo. Try one of these:
        </p>
        <ul className="er-links" aria-label="Quick links">
          <li><Link to="/app">Workspace</Link></li>
          <li><Link to="/pr">PR Review</Link></li>
          <li><Link to="/learn">Learn</Link></li>
          <li><Link to="/product">Product</Link></li>
          <li><Link to="/">Home</Link></li>
        </ul>
      </div>
    </main>
  );
}
