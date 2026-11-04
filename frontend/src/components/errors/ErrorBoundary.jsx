/**
 * Global crash boundary. The fallback uses only plain elements (no router hooks,
 * no context) so it cannot itself throw. Resets when `resetKey` changes (route).
 */
import { Component } from "react";
import { useLocation } from "react-router-dom";
import "./errors.css";

function redact(s) {
  return String(s ?? "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[jwt redacted]")
    .replace(/(token|password|secret|api[_-]?key)=([^&\s]+)/gi, "$1=[redacted]");
}

function buildDetails(error, info) {
  try {
    return redact(
      [
        `Message: ${error?.message || String(error)}`,
        `Route: ${window.location.pathname}${window.location.search}`,
        `Time: ${new Date().toISOString()}`,
        `Browser: ${navigator.userAgent}`,
        "",
        "Stack:",
        error?.stack || "(no stack)",
        info?.componentStack ? `\nComponent stack:${info.componentStack}` : "",
      ].join("\n")
    );
  } catch {
    return "Error details unavailable.";
  }
}

function Bug() {
  return (
    <svg className="er-art" viewBox="0 0 200 150" role="img" aria-label="A glitching bug">
      <g className="g2" opacity=".55" fill="var(--accent, #2b3bff)">
        <ellipse cx="100" cy="86" rx="34" ry="42" />
      </g>
      <g className="g1" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        <ellipse cx="100" cy="86" rx="34" ry="42" fill="var(--bg-surface, #ece8de)" />
        <path d="M100 44v84M66 78h68" strokeWidth="3" />
        <circle cx="100" cy="38" r="15" fill="var(--bg-surface, #ece8de)" />
        <path d="M91 25 80 11M109 25l11-14M66 70 44 58M66 100l-24 12M134 70l22-12M134 100l24 12" />
        <circle cx="94" cy="36" r="2.5" fill="currentColor" />
        <circle cx="106" cy="36" r="2.5" fill="currentColor" />
      </g>
      <g fill="var(--error, #b3261e)">
        <rect x="18" y="30" width="26" height="6" />
        <rect x="156" y="120" width="30" height="6" />
        <rect x="150" y="26" width="16" height="6" />
      </g>
    </svg>
  );
}

class CrashPage extends Component {
  state = { copied: "" };

  copy = async () => {
    try {
      await navigator.clipboard.writeText(this.props.details);
      this.setState({ copied: "Copied. Paste it when you report the problem." });
    } catch {
      this.setState({ copied: "Couldn't copy automatically. Open technical details and select the text." });
    }
  };

  render() {
    const { details } = this.props;
    return (
      <div className="er-page er-fullscreen" role="alert">
        <div className="er-card">
          <Bug />
          <h1>Something broke</h1>
          <p>
            CodeSense AI hit an unexpected error and stopped this screen. Your saved reviews are safe. Try reloading,
            or head back to the workspace.
          </p>
          <div className="er-actions">
            <button type="button" className="er-btn" onClick={() => window.location.reload()}>Reload</button>
            <a className="er-btn alt" href="/app">Go to workspace</a>
            <button type="button" className="er-btn alt" onClick={this.copy}>Copy error details</button>
          </div>
          <p className="er-status" role="status">{this.state.copied}</p>
          <details className="er-details">
            <summary>Technical details</summary>
            <pre>{details}</pre>
          </details>
        </div>
      </div>
    );
  }
}

export class ErrorBoundary extends Component {
  state = { error: null, details: "" };

  static getDerivedStateFromError(error) {
    return { error: error || new Error("Unknown error") };
  }

  componentDidCatch(error, info) {
    try {
      console.error("[CodeSense] render crash:", error, info?.componentStack);
    } catch { /* never throw from the boundary */ }
    this.setState({ details: buildDetails(error, info) });
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, details: "" });
    }
  }

  render() {
    if (this.state.error) {
      return <CrashPage details={this.state.details || buildDetails(this.state.error)} />;
    }
    return this.props.children;
  }
}

/** Route-aware wrapper: boundary resets whenever the path changes. */
export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
