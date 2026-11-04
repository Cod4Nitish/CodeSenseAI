import NotFound from "./NotFound";

/** /__crash - throws on purpose to test the crash page. Dev builds or ?debug=1 only. */
export default function DebugCrash() {
  const allowed = import.meta.env.DEV || new URLSearchParams(window.location.search).get("debug") === "1";
  if (!allowed) return <NotFound />;
  throw new Error("Intentional test crash from /__crash");
}
