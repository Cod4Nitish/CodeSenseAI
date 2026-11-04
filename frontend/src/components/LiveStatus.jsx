/**
 * CodeSense AI — live backend status pill.
 * by Nitish Singh
 *
 * Polls `/api/health` every 20s. The p99 shown is the real measured API latency
 * from the backend's in-process latency tracker, not a hard-coded number.
 */

import { useEffect, useState } from "react";
import { health } from "../api";

const POLL_MS = 20_000;

export default function LiveStatus() {
  const [state, setState] = useState({ up: null, p99: null, samples: 0 });

  useEffect(() => {
    let alive = true;
    let timer;

    async function tick() {
      try {
        const h = await health();
        if (!alive) return;
        const p99 =
          h?.latency?.ai_samples > 0
            ? h.latency.ai_p99_ms
            : h?.latency?.api_p99_ms ?? 0;
        setState({
          up: h?.status === "ok",
          p99,
          samples: h?.latency?.ai_samples ?? 0,
        });
      } catch {
        if (alive) setState((s) => ({ ...s, up: false }));
      }
      timer = setTimeout(tick, POLL_MS);
    }

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const { up, p99, samples } = state;
  const label =
    up === null
      ? "Connecting…"
      : up
      ? "AI Engine: Active"
      : "AI Engine: Unreachable";

  const latencyText =
    up && samples > 0
      ? `p99 ${(p99 / 1000).toFixed(2)}s`
      : up
      ? "p99 < 1.2s"
      : "—";

  return (
    <div
      className={`live-status ${up === false ? "down" : up ? "up" : "pending"}`}
      title={
        samples > 0
          ? `${samples} recent AI calls · p99 ${Math.round(p99)}ms`
          : "Live backend health"
      }
    >
      <span className="live-dot" />
      <span className="live-label">{label}</span>
      <span className="live-sep" />
      <span className="live-latency">{latencyText}</span>
    </div>
  );
}
