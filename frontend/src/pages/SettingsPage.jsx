import { useEffect, useState } from "react";
import { API, TOKEN_KEY, authHeaders, go } from "../utils/api.js";
import { useAccount, Header, Footer } from "../components/SiteChrome.jsx";

export default function SettingsPage({ theme, onToggle }) {
  const account = useAccount();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);

  useEffect(() => {
    if (!account.token) return;
    let cancelled = false;
    fetch(`${API}/auth/me`, { headers: authHeaders(account.token) }).then(async (response) => {
      if (response.status === 401) { sessionStorage.removeItem(TOKEN_KEY); go("/login"); return; }
      if (!response.ok) throw new Error("Couldn't load your account details.");
      const data = await response.json();
      if (!cancelled) { setUser(data); setUsername(data.username); }
    }).catch((error) => { if (!cancelled) setMessage({ kind: "error", text: error.message || "Couldn't reach the API." }); });
    return () => { cancelled = true; };
  }, [account.token]);

  async function updateUsername(event) {
    event.preventDefault(); setMessage(null); setSaving(true);
    try {
      const response = await fetch(`${API}/users/me`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders(account.token) }, body: JSON.stringify({ username: username.trim() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Couldn't update your username.");
      setUser(data); setUsername(data.username); setMessage({ kind: "success", text: "Username updated." });
    } catch (error) { setMessage({ kind: "error", text: error.message || "Couldn't reach the API." }); }
    finally { setSaving(false); }
  }

  async function deleteAccount(event) {
    event.preventDefault(); setDeleteMessage(null); setDeleting(true);
    try {
      const response = await fetch(`${API}/users/me`, { method: "DELETE", headers: { "Content-Type": "application/json", ...authHeaders(account.token) }, body: JSON.stringify({ password }) });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Couldn't delete your account.");
      }
      sessionStorage.removeItem(TOKEN_KEY);
      setDeleteMessage({ kind: "success", text: "Your account and saved tests have been deleted. Returning to practice…" });
      window.setTimeout(() => go("/"), 1400);
    } catch (error) { setDeleteMessage({ kind: "error", text: error.message || "Couldn't reach the API." }); }
    finally { setDeleting(false); }
  }

  async function changePassword(event) {
    event.preventDefault(); setPasswordMessage(null);
    if (newPassword !== confirmNewPassword) { setPasswordMessage({ kind: "error", text: "The new passwords don't match." }); return; }
    if (newPassword.length < 8) { setPasswordMessage({ kind: "error", text: "Use at least 8 characters for your new password." }); return; }
    setChangingPassword(true);
    try {
      const response = await fetch(`${API}/users/me/password`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders(account.token) }, body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Couldn't change your password.");
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
      setPasswordMessage({ kind: "success", text: "Password changed successfully." });
    } catch (error) { setPasswordMessage({ kind: "error", text: error.message || "Couldn't reach the API." }); }
    finally { setChangingPassword(false); }
  }

  return <div className="practice-body"><Header active="settings" theme={theme} onToggle={onToggle} username={user ? `ACCOUNT · ${user.username.toUpperCase()}` : "ACCOUNT SETTINGS"} token={account.token} onSignOut={account.signOut}/><main className="profile-main">
    <div className="profile-page-heading"><div><p className="form-kicker">YOUR ACCOUNT</p><h1 className="profile-title">Account <em>settings.</em></h1></div><p className="profile-intro">Manage your account details and saved practice.</p></div>
    {!account.token ? <div className="profile-guest">You need to <a href="/login">sign in</a> to manage your account.</div> : <>
      <section className="wpm-chart-card settings-card"><div><p className="form-kicker">ACCOUNT DETAILS</p><h2>Your information</h2></div>{user ? <dl className="settings-account-details"><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Member since</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.created_at))}</dd></div></dl> : <p className="history-count">Loading account details…</p>}
        <form className="settings-form" onSubmit={updateUsername}><label htmlFor="settings-username">Username</label><div className="settings-form-row"><input id="settings-username" value={username} onChange={(event) => setUsername(event.target.value)} minLength="1" maxLength="50" required disabled={!user}/><button className="start-button" type="submit" disabled={saving || !user || username.trim() === user.username}>{saving ? "Saving…" : "Save username"}</button></div>{message && <p className={`settings-message ${message.kind}`} role="status">{message.text}</p>}</form>
      </section>
      <section className="wpm-chart-card settings-card"><div><p className="form-kicker">SECURITY</p><h2>Change password</h2><p className="chart-caption">Choose a new password with at least 8 characters.</p></div><form className="settings-form settings-password-form" onSubmit={changePassword}><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required/><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength="8" maxLength="128" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required/><label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" autoComplete="new-password" minLength="8" maxLength="128" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required/><button className="start-button" type="submit" disabled={changingPassword}>{changingPassword ? "Updating password…" : "Update password"}</button>{passwordMessage && <p className={`settings-message ${passwordMessage.kind}`} role="status">{passwordMessage.text}</p>}</form></section>
      <section className="settings-danger-zone"><div><p className="form-kicker">DANGER ZONE</p><h2>Delete your account</h2><p>This permanently deletes your account and all saved test results.</p></div><form className="settings-form" onSubmit={deleteAccount}><label htmlFor="delete-password">Confirm with your password</label><input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required/><label className="settings-confirm-label"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required/> I understand this will permanently delete my account and tests.</label><button className="delete-account-button" type="submit" disabled={deleting || !confirmed}>{deleting ? "Deleting account…" : "Delete account"}</button>{deleteMessage && <p className={`settings-message ${deleteMessage.kind}`} role="status">{deleteMessage.text}</p>}</form></section>
    </>}
  </main><Footer/></div>;
}
