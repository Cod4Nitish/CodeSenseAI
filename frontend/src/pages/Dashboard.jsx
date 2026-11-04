/**
 * CodeSense AI — Executive Dashboard.
 * by Nitish Singh
 *
 * KPI cards + score distribution + activity sparkline + per-language breakdown
 * + the full audit-history table. Requires an authenticated session; anonymous
 * visitors get a gated call-to-action rather than a hard redirect.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { reviews } from "../api";
import KpiCards from "../components/dashboard/KpiCards";
import ScoreDistributionChart from "../components/dashboard/ScoreDistributionChart";
import ActivitySparkline from "../components/dashboard/ActivitySparkline";
import LanguageBreakdown from "../components/dashboard/LanguageBreakdown";
import AuditTable from "../components/dashboard/AuditTable";
import TrustBar from "../components/TrustBar";

export default function Dashboard() {
  const { isAuthed, isLoading, user, promptLogin } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [errMsg, setErrMsg] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setErrMsg("");
    try {
      const [s, list] = await Promise.all([reviews.stats(), reviews.list({ limit: 100 })]);
      setStats(s);
      setRows(list);
      setState("ready");
    } catch (err) {
      setErrMsg(err.message || "Failed to load dashboard.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (isAuthed) load();
  }, [isAuthed, load]);

  const handleDelete = useCallback(
    async (id) => {
      const prev = rows;
      setRows((r) => r.filter((x) => x.id !== id));
      try {
        await reviews.remove(id);
        const s = await reviews.stats();
        setStats(s);
      } catch {
        setRows(prev); // rollback
      }
    },
    [rows]
  );

  /* ── gated states ─────────────────────────────────────────────────── */
  if (isLoading) {
    return <div className="page dash"><div className="dash-loading">Loading session…</div></div>;
  }

  if (!isAuthed) {
    return (
      <div className="page dash">
        <div className="dash-gate">
          <div className="dash-gate-mark">▤</div>
          <h2>Executive Dashboard</h2>
          <p>
            Sign in to see review analytics, audit history, and one-click report
            replay. Or jump in instantly with the guest account.
          </p>
          <div className="dash-gate-actions">
            <button className="btn btn-primary" onClick={() => promptLogin("Sign in to view your dashboard")}>
              Sign in
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/app")}>
              Back to workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page dash">
      <div className="dash-head">
        <div>
          <h1 className="dash-title">Executive Dashboard</h1>
          <p className="dash-sub">
            {user?.full_name} · <span className="dash-plan">{user?.plan}</span>
          </p>
        </div>
        <div className="dash-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={state === "loading"}>
            {state === "loading" ? "refreshing…" : "↻ refresh"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/app")}>
            + New review
          </button>
        </div>
      </div>

      {state === "error" && (
        <div className="dash-error">
          {errMsg}
          <button className="btn btn-ghost btn-xs" onClick={load}>retry</button>
        </div>
      )}

      {stats && (
        <>
          <KpiCards stats={stats} />

          <div className="dash-grid">
            <ScoreDistributionChart buckets={stats.score_distribution} />
            <ActivitySparkline points={stats.activity} />
            <LanguageBreakdown items={stats.by_language} />
          </div>

          <AuditTable rows={rows} onDelete={handleDelete} />
        </>
      )}

      {state === "loading" && !stats && <div className="dash-loading">Crunching your history…</div>}

      <TrustBar />
    </div>
  );
}
