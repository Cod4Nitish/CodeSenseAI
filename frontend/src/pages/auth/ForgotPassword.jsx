import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import { useAuth } from "../../auth/AuthContext";
import { friendlyAuthError } from "../../components/auth/AuthForms";

export default function ForgotPassword() {
  const { demoLogin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function guest() {
    setBusy(true);
    setError(null);
    try {
      await demoLogin();
    } catch (err) {
      setError(friendlyAuthError(err, "login").text);
      setBusy(false);
    }
  }

  return (
    <AuthShell labelledBy="au-h">
      <div className="au-card">
        <h1 id="au-h">Password reset</h1>
        <p className="au-sub">
          Password reset is not available yet in this college build, and no email is sent from here. Nothing is
          pending - please do not wait for a message.
        </p>
        <p className="au-sub">What you can do right now:</p>
        <div role="alert" className="au-alert" hidden={!error}>{error}</div>
        <button type="button" className="au-btn" onClick={guest} disabled={busy}>
          {busy ? "Starting demo..." : "Continue as guest (demo)"}
        </button>
        <div className="au-or" aria-hidden="true">or</div>
        <Link to="/signup" className="au-btn alt">Create a new account</Link>
        <p className="au-fine">
          Locked out of an existing account? Contact the team (Nitish Kumar Singh or Shivam) and they can help you
          directly.
        </p>
        <p className="au-foot"><Link to="/login">Back to sign in</Link></p>
      </div>
    </AuthShell>
  );
}
