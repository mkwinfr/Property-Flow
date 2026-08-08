import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { PortalAuthProvider, usePortalAuth } from "./contexts/PortalAuthContext";
import { PortalLayout } from "./layouts/PortalLayout";
import { PortalDocumentsPage } from "./pages/portal/PortalDocumentsPage";
import { PortalMaintenancePage } from "./pages/portal/PortalMaintenancePage";
import { PortalMessagesPage } from "./pages/portal/PortalMessagesPage";
import { PortalPetsPage } from "./pages/portal/PortalPetsPage";
import { PortalChargesPage, PortalHomePage } from "./pages/portal/PortalPages";
import { Link, useRouter } from "./lib/router";

export function PortalApp() {
  return <PortalAuthProvider><PortalAppContent /></PortalAuthProvider>;
}

function PortalAppContent() {
  const { path, navigate } = useRouter();
  const { user, loading, login, logout } = usePortalAuth();

  if (loading) return <div className="app-loading"><span className="brand__mark">PS</span></div>;
  if (!user) return <PortalLoginPage onLogin={login} />;

  if (path === "/portal/lease" || path.startsWith("/portal/lease/")) {
    navigate("/portal/documents/lease", { replace: true });
    return null;
  }
  if (path === "/portal/application" || path.startsWith("/portal/application/")) {
    navigate("/portal/documents/application", { replace: true });
    return null;
  }
  if (path === "/portal/documents" || path === "/portal/documents/") {
    navigate("/portal/documents/lease", { replace: true });
    return null;
  }

  let page;
  if (path === "/portal" || path === "/portal/") page = <PortalHomePage user={user} />;
  else if (path === "/portal/maintenance" || path.startsWith("/portal/maintenance/")) page = <PortalMaintenancePage />;
  else if (path === "/portal/messages") page = <PortalMessagesPage />;
  else if (path.startsWith("/portal/documents")) page = <PortalDocumentsPage />;
  else if (path === "/portal/charges") page = <PortalChargesPage />;
  else if (path === "/portal/pets") page = <PortalPetsPage />;
  else page = <PortalHomePage user={user} />;

  return <PortalLayout user={user} onLogout={() => void logout()}>{page}</PortalLayout>;
}

function PortalLoginPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try { await onLogin(email, password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed"); }
    finally { setSubmitting(false); }
  };
  return <main className="login-page portal-login-page">
    <section className="login-story login-story--portal">
      <div className="login-brand"><span className="brand__mark">PS</span><strong>Property Suite</strong></div>
      <div className="login-story__content">
        <p className="eyebrow eyebrow--light"><Sparkles size={14} /> Resident experience</p>
        <h1>Everything About Home, Beautifully Organized.</h1>
        <p>Stay connected to your community, manage requests, and keep important household details in one secure place.</p>
        <div className="portal-login-benefits" aria-label="Portal benefits">
          <span><CheckCircle2 size={15} /> Secure household access</span>
          <span><CheckCircle2 size={15} /> Direct property communication</span>
        </div>
      </div>
    </section>
    <section className="login-panel">
      <form className="login-card" onSubmit={submit}>
        <div><p className="eyebrow">Resident sign in</p><h2>Welcome Home</h2><p>Enter the email associated with your household.</p></div>
        <label className="field"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@example.com" required /></label>
        <label className="field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button--primary button--large button--full" disabled={submitting}>{submitting ? "Signing in…" : "Continue to your portal"}<ArrowRight size={18} /></button>
        <p className="login-security-note"><ShieldCheck size={16} /> Secure resident access · Property staff? <Link to="/">Open workspace</Link></p>
      </form>
    </section>
  </main>;
}
