import { useState, type FormEvent } from "react";
import { KeyRound, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password could not be changed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-layer">
      <section className="dialog dialog--compact" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <header className="dialog__header">
          <span className="dialog__icon"><KeyRound /></span>
          <div><p className="eyebrow">Account security</p><h2 id="change-password-title">Change password</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field field--full"><span>Current password</span><input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label className="field field--full"><span>New password <small>At least 12 characters</small></span><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <label className="field field--full"><span>Confirm new password</span><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          </div>
          <p className="security-note">Changing your password signs this account out everywhere, including this browser.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="dialog__footer">
            <button type="button" className="button button--ghost" onClick={onClose}>Cancel</button>
            <button className="button button--primary" disabled={submitting}>{submitting ? "Changing…" : "Change password"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
