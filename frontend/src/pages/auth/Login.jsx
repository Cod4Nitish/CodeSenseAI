import { useLocation } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import { LoginForm } from "../../components/auth/AuthForms";

export default function Login() {
  const reason = new URLSearchParams(useLocation().search).get("reason");
  return (
    <AuthShell labelledBy="au-h">
      <div className="au-card">
        <h1 id="au-h">Welcome back</h1>
        <p className="au-sub">Sign in to see your review history and dashboard.</p>
        {reason === "expired" && <p className="au-notice" role="status">Your session expired. Please sign in again.</p>}
        <LoginForm />
      </div>
    </AuthShell>
  );
}
