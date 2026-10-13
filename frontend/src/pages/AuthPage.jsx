import { useRef, useState } from "react";
import { API, TOKEN_KEY, errorDetail, readableError, go } from "../utils/api.js";
import { Mark, ThemeButton } from "../components/SiteChrome.jsx";

function MeasuredAuthInput({ id, type = "text", value, onChange, placeholder, maxLength, autoComplete, required }) {
  const startedAt = useRef(null), typedCharacters = useRef(0), awaitingInput = useRef(false), eligible = useRef(true);
  const [speed, setSpeed] = useState(null);
  function handleFocus() { startedAt.current = null; typedCharacters.current = 0; awaitingInput.current = false; eligible.current = true; setSpeed(null); }
  function handleKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (!event.repeat && event.key.length === 1) { startedAt.current ??= performance.now(); typedCharacters.current += 1; awaitingInput.current = true; }
  }
  function handleChange(event) { if (!awaitingInput.current) eligible.current = false; awaitingInput.current = false; onChange(event); }
  function handleBlur() {
    const elapsed = startedAt.current == null ? 0 : Math.max(1000, performance.now() - startedAt.current);
    if (!eligible.current || typedCharacters.current < 3 || !elapsed || !value) return;
    setSpeed(Math.round((typedCharacters.current / 5) / (elapsed / 60000)));
  }
  return <>
    <div className="input-wrap"><span className="input-icon" aria-hidden="true">{id === "email" ? "✉" : "⌘"}</span><input id={id} type={type} value={value} onChange={handleChange} onFocus={handleFocus} onKeyDown={handleKeyDown} onKeyUp={() => { awaitingInput.current = false; }} onPaste={() => { eligible.current = false; setSpeed(null); }} onBlur={handleBlur} placeholder={placeholder} maxLength={maxLength} autoComplete={autoComplete} required={required} /></div>
    {speed !== null && <p className="auth-typing-speed" role="status" aria-live="polite">Typed at <strong>{speed} WPM</strong></p>}
  </>;
}

function AuthVisual({ type }) {
  const isRegister = type === "register";
  return <aside className="visual-panel"><a className="brand visual-brand" href="/"><Mark /><span>keyline<span className="brand-period">.</span></span></a><div className="visual-copy"><p className="form-kicker">{isRegister ? "A NEW ROUTINE STARTS HERE" : "GOOD TO HAVE YOU BACK"}</p><h1>{isRegister ? <>Your rhythm.<br/>Your <em>pace.</em></> : <>Find your<br/>typing <em>flow.</em></>}</h1><p className="visual-description">A few focused minutes can change the way you work. Build a little momentum, one word at a time.</p></div><div className="visual-decoration" aria-hidden="true"><span>01</span><i /><span>05</span></div></aside>;
}

export default function AuthPage({ type, theme, onToggle }) {
  const isRegister = type === "register";
  const [values, setValues] = useState({ username: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false), [message, setMessage] = useState(null), [busy, setBusy] = useState(false);
  const update = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setMessage(null);
    if (isRegister && values.password !== values.confirm) { setMessage({ text: "Those passwords don't match.", kind: "error" }); return; }
    if (isRegister && values.password.length < 8) { setMessage({ text: "Use at least 8 characters.", kind: "error" }); return; }
    setBusy(true);
    try {
      if (isRegister) {
        const created = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: values.username.trim(), email: values.email.trim(), password: values.password }) });
        if (!created.ok) throw new Error(await errorDetail(created, "We couldn't create your account."));
      }
      const response = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: values.email.trim(), password: values.password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.access_token) throw new Error(readableError(data.detail, readableError(data.message, "We couldn't sign you in. Please check your email and password.")));
      sessionStorage.setItem(TOKEN_KEY, data.access_token); setMessage({ text: "Signed in. Opening your practice…", kind: "success" }); go("/");
    } catch (err) { setMessage({ text: err.message || `Can't reach the API at ${API}. Make sure the backend is running.`, kind: "error" }); }
    finally { setBusy(false); }
  }
  return <main className="page-shell"><AuthVisual type={type} /><section className="form-panel" aria-labelledby="form-title"><ThemeButton theme={theme} onToggle={onToggle} auth /><div className="form-topline"><span>{isRegister ? "YOUR NEXT CHAPTER STARTS HERE" : "GOOD TO HAVE YOU BACK"}</span><span className="step-indicator"><i /> {isRegister ? "STEP 01 / 02" : "YOUR PRACTICE AWAITS"}</span></div><div className={`form-content${isRegister ? "" : " login-content"}`}><a className="mobile-brand brand" href="/"><Mark /><span>keyline<span className="brand-period">.</span></span></a><p className="form-kicker">{isRegister ? "FIRST THINGS FIRST" : "WELCOME BACK"}</p><h2 id="form-title">{isRegister ? "Make it yours." : "Pick up your pace."}</h2><p className="form-subtitle">{isRegister ? "Create an account and find your rhythm." : "Sign in to keep your progress moving."}</p>
    <form onSubmit={submit} noValidate>{isRegister && <><label htmlFor="username">Your name</label><MeasuredAuthInput id="username" value={values.username} onChange={update("username")} placeholder="e.g. Alex Morgan" maxLength="50" autoComplete="username" required /></>}<label htmlFor="email">Email address</label><MeasuredAuthInput id="email" type="email" value={values.email} onChange={update("email")} placeholder="you@example.com" maxLength="255" autoComplete="email" required /><label htmlFor="password">{isRegister ? "Create a password" : "Password"}{isRegister && <span className="label-note">8 CHARACTERS MIN.</span>}</label><div className="input-wrap"><span className="input-icon lock-icon">⌑</span><input id="password" type={showPassword ? "text" : "password"} value={values.password} onChange={update("password")} placeholder={isRegister ? "At least 8 characters" : "Enter your password"} maxLength="128" autoComplete={isRegister ? "new-password" : "current-password"} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((show) => !show)}>{showPassword ? "HIDE" : "SHOW"}</button></div>{isRegister && <><label htmlFor="confirm-password">Confirm password</label><div className="input-wrap"><span className="input-icon lock-icon">⌑</span><input id="confirm-password" type={showPassword ? "text" : "password"} value={values.confirm} onChange={update("confirm")} placeholder="Type it once more" autoComplete="new-password" required /></div></>}<button className="submit-button" type="submit" disabled={busy}><span className="button-text">{busy ? (isRegister ? "Creating your account…" : "Signing in…") : (isRegister ? "Create my account" : "Sign in")}</span><span className="button-arrow" aria-hidden="true">→</span></button>{message && <div className={`form-message visible ${message.kind}`} role="status">{message.text}</div>}</form><p className="signin-prompt">{isRegister ? "Already have an account?" : "New to Keyline?"} <a className="signin-link" href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"} <span aria-hidden="true">→</span></a></p></div><div className="form-footer"><span>© 2026 KEYLINE</span><span>SMALL STEPS. STEADY SPEED.</span></div></section></main>;
}
