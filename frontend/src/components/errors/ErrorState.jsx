/**
 * Reusable inline error UI.
 *
 *   <ErrorState variant="offline|server|session|rate|500|generic" error={err} retryAfter={10} onRetry={fn} />
 *
 * `variantFor(err)` picks a variant from an ApiError (status 0 = unreachable).
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { clearToken } from "../../api";
import "./errors.css";

export function variantFor(err) {
  const s = err?.status;
  if (s === 0 || /cannot reach/i.test(err?.message || "")) return "server";
  if (s === 401) return "session";
  if (s === 429) return "rate";
  if (s >= 500) return "500";
  return "generic";
}

const COPY = {
  offline: { tone: "warn", title: "You're offline", text: "Your device has no internet connection. Reconnect and try again." },
  server: { tone: "error", title: "Server unreachable", text: "The CodeSense backend is not responding. It may be offline or restarting. Nothing was lost." },
  session: { tone: "warn", title: "Session expired", text: "Your sign-in is no longer valid. Please sign in again to continue." },
  rate: { tone: "warn", title: "Too many requests", text: "You're sending requests too quickly." },
  500: { tone: "error", title: "Server error", text: "Something went wrong on our side. Please try again in a moment." },
  generic: { tone: "error", title: "Something went wrong", text: "The request failed." },
};

function useSafeLogout() {
  try {
    return useAuth().logout; // eslint-disable-line react-hooks/rules-of-hooks
  } catch {
    return null;
  }
}

export default function ErrorState({ variant, error, retryAfter, onRetry, title, message, className = "" }) {
  const v = variant || variantFor(error);
  const c = COPY[v] || COPY.generic;
  const logout = useSafeLogout();
  const { pathname, search } = useLocation();
  const [wait, setWait] = useState(v === "rate" ? Math.max(1, Number(retryAfter) || 10) : 0);

  useEffect(() => {
    if (v === "session") {
      clearToken();
      logout?.();
    }
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const detail = message || (v === "generic" && error?.message) || c.text;
  const next = encodeURIComponent(pathname + search);
  return (
    <div className={`er-inline ${className}`} data-tone={c.tone} role="alert">
      <span className="ico" aria-hidden="true">!</span>
      <div>
        <h2>{title || c.title}</h2>
        <p>
          {detail}
          {v === "rate" && (wait > 0 ? ` Please wait ${wait} second${wait === 1 ? "" : "s"}.` : " You can retry now.")}
        </p>
        <div className="er-actions">
          {v === "session" && <Link className="er-btn" to={`/login?next=${next}&reason=expired`}>Sign in</Link>}
          {onRetry && v !== "session" && (
            <button type="button" className="er-btn" onClick={onRetry} disabled={wait > 0}>
              {wait > 0 ? `Retry in ${wait}s` : "Retry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
