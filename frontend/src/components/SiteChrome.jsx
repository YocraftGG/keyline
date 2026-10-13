import { useCallback, useState } from 'react';
import { API, TOKEN_KEY, getToken, authHeaders } from '../utils/api.js';

function useTheme() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || "light");
  const toggle = () => setTheme((current) => {
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#121912" : "#f5f6f2");
    try { localStorage.setItem("keyline-theme", next); } catch { /* keep the current page theme */ }
    return next;
  });
  return [theme, toggle];
}

function ThemeButton({ theme, onToggle, auth = false }) {
  const next = theme === "dark" ? "light" : "dark";
  return <button className={`theme-toggle${auth ? " auth-theme-toggle" : ""}`} type="button" onClick={onToggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>{theme === "dark" ? "☀" : "☾"}</button>;
}

function Mark() { return <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>; }
function Footer() { return <footer className="practice-footer"><span>© 2026 KEYLINE</span><span>SMALL STEPS. STEADY SPEED.</span></footer>; }

function Header({ active, theme, onToggle, username = "", token, onSignOut }) {
  return <header className="practice-header">
    <a className="brand practice-brand" href="/" aria-label="Keyline practice home"><Mark /><span>keyline<span className="brand-period">.</span></span></a>
    <nav className="site-tabs" aria-label="Main navigation">
      <a className={`site-tab${active === "practice" ? " is-active" : ""}`} href="/">Practice</a>
      {token && <><a className={`site-tab${active === "profile" ? " is-active" : ""}`} href="/profile">Stats</a><a className={`site-tab${active === "history" ? " is-active" : ""}`} href="/history">Test history</a></>}
      <a className={`site-tab${active === "leaderboard" ? " is-active" : ""}`} href="/leaderboard">Leaderboard</a>
    </nav>
    <div className="practice-header-right">
      <span className="practice-user">{username || (active === "leaderboard" ? "THE COMMUNITY" : "")}</span>
      {token ? <button className="signout-button" type="button" onClick={onSignOut}>SIGN OUT <span aria-hidden="true">↗</span></button> : <nav className="guest-links" aria-label="Account"><a href="/register">Register</a><a href="/login">Sign in</a></nav>}
      <ThemeButton theme={theme} onToggle={onToggle} />
      {token && <a className={`settings-icon-button${active === "settings" ? " is-active" : ""}`} href="/settings" aria-label="Settings" title="Settings"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="7.1"/><path d="M12 2.2v2.2M12 19.6v2.2M2.2 12h2.2m15.2 0h2.2M5.08 5.08l1.56 1.56m10.72 10.72 1.56 1.56m0-13.84-1.56 1.56M6.64 17.36l-1.56 1.56"/></svg></a>}
    </div>
  </header>;
}

function useAccount() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(null);
  const clear = useCallback(() => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); }, []);
  const signOut = useCallback(async () => {
    const currentToken = getToken();
    try { if (currentToken) await fetch(`${API}/auth/logout`, { method: "POST", headers: authHeaders(currentToken) }); } catch { /* clear local session when offline */ }
    clear();
    go("/");
  }, [clear]);
  return { token, setToken, user, setUser, clear, signOut };
}

export { useTheme, useAccount, Header, Footer, ThemeButton, Mark };

