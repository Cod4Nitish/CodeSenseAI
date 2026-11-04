/** Shows a banner while the browser reports no connection. Retry re-checks and calls onRetry. */
import { useEffect, useState } from "react";
import "./errors.css";

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return [online, setOnline];
}

export default function OfflineBanner({ onRetry }) {
  const [online, setOnline] = useOnline();
  if (online) return null;
  return (
    <div className="er-offline" role="status">
      <span>You're offline. Reviews and sign-in need a connection.</span>
      <button
        type="button"
        onClick={() => {
          const ok = navigator.onLine !== false;
          setOnline(ok);
          if (ok) onRetry?.();
        }}
      >
        Retry
      </button>
    </div>
  );
}
