import AuthShell from "../../components/auth/AuthShell";
import { SignupForm } from "../../components/auth/AuthForms";

export default function Signup() {
  return (
    <AuthShell labelledBy="au-h">
      <div className="au-card">
        <h1 id="au-h">Create your free account</h1>
        <p className="au-sub">Free signup - no credit card. Your account gives you:</p>
        <ul className="au-perks">
          <li>Private review history</li>
          <li>Analytics dashboard</li>
          <li>Saved PR reviews</li>
        </ul>
        <SignupForm />
      </div>
    </AuthShell>
  );
}
