import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span className="brand__mark">PS</span><strong>Property Suite</strong></div>
        <div className="login-story__content">
          <p className="eyebrow eyebrow--light">Property operations, composed</p>
          <h1>Move every unit from notice to ready—with clarity.</h1>
          <p>One calm workspace for property teams to coordinate turns, units, inspections, and day-to-day operations.</p>
          <div className="story-points">
            <span><CheckCircle2 /> Clear ownership and progress</span>
            <span><ShieldCheck /> Property-scoped access</span>
            <span><Building2 /> Built for multi-property teams</span>
          </div>
        </div>
        <small>Private operations platform · Authorized access only</small>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div><p className="eyebrow">Welcome back</p><h2>Sign in to your workspace</h2><p>Use your Property Suite account credentials.</p></div>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--large" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}<ArrowRight size={18} />
          </button>
          <p className="login-security-note"><ShieldCheck size={16} /> Access is protected by Cloudflare Access and Property Suite authentication.</p>
        </form>
      </section>
    </main>
  );
}
