/**
 * Login + signup forms for the full-page auth flow. One implementation, used by
 * /login and /signup. Password rules mirror backend/schemas/auth.py exactly:
 * 8-128 characters, at least one letter and one digit.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./auth.css";

/* ── helpers ─────────────────────────────────────────────────────────── */
export function safeNext(search) {
  const n = new URLSearchParams(search).get("next");
  if (!n || !n.startsWith("/") || n.startsWith("//") || /^\/(login|signup|forgot-password)(\/|\?|$)/.test(n)) return "/app";
  return n;
}

export function announce(message) {
  window.dispatchEvent(new CustomEvent("codesense:toast", { detail: { message } }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RULES = [
  { id: "len", label: "8 to 128 characters", test: (p) => p.length >= 8 && p.length <= 128 },
  { id: "letter", label: "At least one letter", test: (p) => /[A-Za-z]/.test(p) },
  { id: "digit", label: "At least one digit", test: (p) => /\d/.test(p) },
];

function strength(p) {
  if (!p) return { score: 0, label: "" };
  const met = PASSWORD_RULES.every((r) => r.test(p));
  if (!met) return { score: 1, label: "Weak - meet all the rules below" };
  let s = 2;
  if (p.length >= 12) s += 1;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p) && /[^A-Za-z0-9]/.test(p)) s += 1;
  else if (p.length < 12) s = 2;
  return { score: Math.min(s, 4), label: ["", "Weak", "Okay", "Good", "Strong"][Math.min(s, 4)] };
}

/** Map any thrown API error to friendly copy. */
export function friendlyAuthError(err, mode) {
  const status = err?.status;
  if (status === 0 || /cannot reach/i.test(err?.message || "")) {
    return { text: "We can't reach the CodeSense server. Check that the backend is running, or your connection, then try again." };
  }
  if (status === 409) return { text: "That email is already registered.", switchTo: "login" };
  if (status === 401) return { text: "Incorrect email or password. Check both and try again." };
  if (status === 429) return { text: "Too many attempts. Please wait a minute before trying again." };
  if (status >= 500) return { text: "The server hit a problem. Please try again in a moment." };
  return { text: err?.message || (mode === "signup" ? "Could not create the account." : "Could not sign in.") };
}

/* ── small pieces ────────────────────────────────────────────────────── */
function Spinner() {
  return <span className="au-spin" aria-hidden="true" />;
}

function PasswordInput({ id, value, onChange, autoComplete, invalid, describedBy, inputRef }) {
  const [show, setShow] = useState(false);
  return (
    <div className="au-input-wrap">
      <input
        id={id}
        ref={inputRef}
        className="au-input has-toggle"
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        maxLength={128}
      />
      <button type="button" className="au-toggle" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-controls={id}>
        {show ? "Hide" : "Show"}
        <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}> password</span>
      </button>
    </div>
  );
}

function Field({ id, label, error, children }) {
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className="au-err" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

function useAuthRedirect() {
  const { isAuthed } = useAuth();
  const { search } = useLocation();
  const navigate = useNavigate();
  const next = safeNext(search);
  useEffect(() => {
    if (isAuthed) navigate(next, { replace: true });
  }, [isAuthed, next, navigate]);
  return { next, search };
}

function ServerAlert({ alertRef, error, otherPath, search }) {
  return (
    <div className="au-alert" role="alert" tabIndex={-1} ref={alertRef} hidden={!error}>
      {error && (
        <>
          {error.text}{" "}
          {error.switchTo && (
            <Link to={`${otherPath}${search}`}>Sign in instead</Link>
          )}
        </>
      )}
    </div>
  );
}

function GuestButton({ busy, setBusy, onError, disabled }) {
  const { demoLogin } = useAuth();
  async function go() {
    setBusy("guest");
    try {
      await demoLogin();
      announce("Welcome! You are exploring as a guest.");
    } catch (err) {
      onError(friendlyAuthError(err, "login"));
      setBusy(null);
    }
  }
  return (
    <button type="button" className="au-btn alt" onClick={go} disabled={disabled}>
      {busy === "guest" && <Spinner />}
      {busy === "guest" ? "Starting demo..." : "Continue as guest (demo)"}
    </button>
  );
}

/* ── Login ───────────────────────────────────────────────────────────── */
export function LoginForm() {
  const { login } = useAuth();
  const { search } = useAuthRedirect();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [server, setServer] = useState(null);
  const [busy, setBusy] = useState(null);
  const emailRef = useRef(null);
  const pwRef = useRef(null);
  const alertRef = useRef(null);
  const uid = useId();

  useEffect(() => { emailRef.current?.focus(); }, []);
  useEffect(() => { if (server) alertRef.current?.focus(); }, [server]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const errs = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    setErrors(errs);
    setServer(null);
    if (errs.email) return emailRef.current?.focus();
    if (errs.password) return pwRef.current?.focus();
    setBusy("submit");
    try {
      await login(email.trim(), password);
      announce("Welcome back!");
    } catch (err) {
      setServer(friendlyAuthError(err, "login"));
      setBusy(null);
    }
  }

  const eid = `${uid}-email`;
  const pid = `${uid}-pw`;
  return (
    <form onSubmit={submit} noValidate>
      <ServerAlert alertRef={alertRef} error={server} otherPath="/signup" search={search} />
      <Field id={eid} label="Email" error={errors.email}>
        <input id={eid} ref={emailRef} className="au-input" type="email" inputMode="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email || undefined} aria-describedby={errors.email ? `${eid}-err` : undefined} />
      </Field>
      <Field id={pid} label="Password" error={errors.password}>
        <PasswordInput id={pid} inputRef={pwRef} value={password} onChange={setPassword} autoComplete="current-password"
          invalid={!!errors.password} describedBy={errors.password ? `${pid}-err` : undefined} />
      </Field>
      <p style={{ margin: "-6px 0 14px", fontSize: 13 }}>
        <Link className="au-link" to="/forgot-password">Forgot password?</Link>
      </p>
      <button type="submit" className="au-btn" disabled={!!busy}>
        {busy === "submit" && <Spinner />}
        {busy === "submit" ? "Signing in..." : "Sign in"}
      </button>
      <div className="au-or" aria-hidden="true">or</div>
      <GuestButton busy={busy} setBusy={setBusy} onError={setServer} disabled={!!busy} />
      <p className="au-foot">New here? <Link to={`/signup${search}`}>Create a free account</Link></p>
    </form>
  );
}

/* ── Signup ──────────────────────────────────────────────────────────── */
export function SignupForm() {
  const { register } = useAuth();
  const { search } = useAuthRedirect();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [server, setServer] = useState(null);
  const [busy, setBusy] = useState(null);
  const refs = { name: useRef(null), email: useRef(null), password: useRef(null), confirm: useRef(null) };
  const alertRef = useRef(null);
  const uid = useId();

  useEffect(() => { refs.name.current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (server) alertRef.current?.focus(); }, [server]);

  const st = strength(password);
  const allMet = PASSWORD_RULES.every((r) => r.test(password));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const errs = {};
    if (!name.trim()) errs.name = "Enter your full name.";
    if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!allMet) errs.password = "Password must be 8-128 characters and include at least one letter and one digit.";
    if (confirm !== password) errs.confirm = "Passwords do not match.";
    setErrors(errs);
    setServer(null);
    const first = ["name", "email", "password", "confirm"].find((k) => errs[k]);
    if (first) return refs[first].current?.focus();
    setBusy("submit");
    try {
      await register(email.trim(), name.trim(), password);
      announce(`Welcome to CodeSense AI, ${name.trim().split(/\s+/)[0]}!`);
    } catch (err) {
      const fe = friendlyAuthError(err, "signup");
      if (err?.status === 409) setErrors({ email: fe.text });
      setServer(fe);
      setBusy(null);
    }
  }

  const id = (k) => `${uid}-${k}`;
  const desc = (k) => (errors[k] ? `${id(k)}-err` : undefined);
  return (
    <form onSubmit={submit} noValidate>
      <ServerAlert alertRef={alertRef} error={server} otherPath="/login" search={search} />
      <Field id={id("name")} label="Full name" error={errors.name}>
        <input id={id("name")} ref={refs.name} className="au-input" type="text" autoComplete="name" value={name} maxLength={120}
          onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} aria-describedby={desc("name")} />
      </Field>
      <Field id={id("email")} label="Email" error={errors.email}>
        <input id={id("email")} ref={refs.email} className="au-input" type="email" inputMode="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email || undefined} aria-describedby={desc("email")} />
      </Field>
      <Field id={id("password")} label="Password" error={errors.password}>
        <PasswordInput id={id("password")} inputRef={refs.password} value={password} onChange={setPassword} autoComplete="new-password"
          invalid={!!errors.password} describedBy={[desc("password"), `${uid}-rules`].filter(Boolean).join(" ")} />
        <div className="au-meter" data-s={st.score} aria-hidden="true"><i /><i /><i /><i /></div>
        <p className="au-strength" aria-live="polite">{password ? `Strength: ${st.label}` : "Strength: enter a password"}</p>
        <ul className="au-rules" id={`${uid}-rules`} aria-label="Password rules">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.id} data-ok={ok}>
                <span className="mark" aria-hidden="true">{ok ? "✓" : "○"}</span>
                <span>{r.label}<span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{ok ? " (met)" : " (not met yet)"}</span></span>
              </li>
            );
          })}
        </ul>
      </Field>
      <Field id={id("confirm")} label="Confirm password" error={errors.confirm}>
        <PasswordInput id={id("confirm")} inputRef={refs.confirm} value={confirm} onChange={setConfirm} autoComplete="new-password"
          invalid={!!errors.confirm} describedBy={desc("confirm")} />
      </Field>
      <button type="submit" className="au-btn" disabled={!!busy}>
        {busy === "submit" && <Spinner />}
        {busy === "submit" ? "Creating account..." : "Create free account"}
      </button>
      <p className="au-fine">
        By creating an account you agree to use CodeSense AI for learning and review purposes. This is a college
        project build: the terms and privacy policy are summarised here, your code and account data are used only to
        run your reviews and are not sold or shared.
      </p>
      <div className="au-or" aria-hidden="true">or</div>
      <GuestButton busy={busy} setBusy={setBusy} onError={setServer} disabled={!!busy} />
      <p className="au-foot">Already have an account? <Link to={`/login${search}`}>Sign in</Link></p>
    </form>
  );
}

/* ── global toast (mounted once in App) ──────────────────────────────── */
export function Toaster() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let t;
    function on(e) {
      setMsg(e.detail?.message || null);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 4000);
    }
    window.addEventListener("codesense:toast", on);
    return () => { window.removeEventListener("codesense:toast", on); clearTimeout(t); };
  }, []);
  return (
    <div aria-live="polite" role="status">
      {msg && <div className="au-toast">{msg}</div>}
    </div>
  );
}
