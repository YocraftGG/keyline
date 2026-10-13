import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API, TOKEN_KEY, getToken, authHeaders, errorDetail } from "../utils/api.js";
import { useAccount, Header, Footer } from "../components/SiteChrome.jsx";
import RecordCelebration from "../components/RecordCelebration.jsx";

export default function PracticePage({ theme, onToggle }) {
  const { token, setToken, signOut } = useAccount();
  const [user, setUser] = useState(null), [difficulty, setDifficulty] = useState("easy"), [practiceMode, setPracticeMode] = useState("random");
  const [upper, setUpper] = useState(() => localStorage.getItem("keyline-uppercase") !== "false");
  const [punctuation, setPunctuation] = useState(() => localStorage.getItem("keyline-punctuation") !== "false");
  const [source, setSource] = useState(null), [typed, setTyped] = useState(""), [phase, setPhase] = useState("loading");
  const [error, setError] = useState(""), [seconds, setSeconds] = useState(0), [mistakes, setMistakes] = useState(0), [keystrokes, setKeystrokes] = useState(0);
  const [result, setResult] = useState(null), [saveMessage, setSaveMessage] = useState(""), [saveError, setSaveError] = useState(false), [retry, setRetry] = useState(false);
  const [personalBest, setPersonalBest] = useState(() => {
    if (getToken()) return null;
    const saved = Number(localStorage.getItem("keyline-guest-best-wpm"));
    return Number.isFinite(saved) ? saved : 0;
  });
  const [recordWpm, setRecordWpm] = useState(null), [recordFading, setRecordFading] = useState(false), [isNewRecord, setIsNewRecord] = useState(false);
  const input = useRef(null), startAt = useRef(null), lastTyped = useRef(""), mistakeCounts = useRef({});
  const sentence = useMemo(() => {
    if (!source) return "";
    let text = source.text;
    if (!upper) text = text.toLowerCase();
    if (!punctuation) text = text.replace(/[’']/gu, "").replace(/\p{P}/gu, " ").replace(/\s+/gu, " ").trim();
    return text;
  }, [source, upper, punctuation]);

  const loadPassage = useCallback(async (level = difficulty, mode = practiceMode) => {
    setPhase("loading"); setError(""); setTyped(""); setResult(null); setIsNewRecord(false); setRecordWpm(null); setRecordFading(false); setSaveMessage(""); setRetry(false); setSeconds(0); setMistakes(0); setKeystrokes(0); startAt.current = null; lastTyped.current = ""; mistakeCounts.current = {};
    try {
      const endpoint = mode === "adaptive" ? "adaptive" : "random";
      const response = await fetch(`${API}/sentences/${endpoint}?difficulty=${encodeURIComponent(level)}`, { headers: mode === "adaptive" ? authHeaders(token) : undefined });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401 && mode === "adaptive") throw new Error("Sign in again to use adaptive practice.");
      if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : response.status === 404 ? "There aren't any passages at this level yet. Try another difficulty." : "Couldn't load a passage.");
      setSource(body); setPhase("ready"); requestAnimationFrame(() => input.current?.focus());
    } catch (err) { setError(err.message || `Can't reach the API at ${API}. Start the backend, then try again.`); setPhase("error"); }
  }, [difficulty, practiceMode, token]);

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      if (token) {
        try { const response = await fetch(`${API}/users/me/stats`, { headers: authHeaders(token) }); if (response.ok) { const stats = await response.json(); if (!cancelled) setPersonalBest(Number(stats.best_wpm) || 0); } else if (!cancelled) setPersonalBest(0); }
        catch { if (!cancelled) setPersonalBest(0); }
      }
      if (!cancelled) await loadPassage();
    }
    void prepare(); return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/auth/me`, { headers: authHeaders(token) }).then(async (response) => { if (response.status === 401) { sessionStorage.removeItem(TOKEN_KEY); setToken(null); } else if (response.ok) setUser(await response.json()); }).catch(() => {});
  }, [token, setToken]);
  useEffect(() => {
    if (recordWpm === null) return undefined;
    setRecordFading(false);
    const fadeTimer = window.setTimeout(() => setRecordFading(true), 2400);
    const removeTimer = window.setTimeout(() => setRecordWpm(null), 3400);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(removeTimer); };
  }, [recordWpm]);
  useEffect(() => {
    if (startAt.current === null || phase !== "typing") return undefined;
    const timer = window.setInterval(() => setSeconds((Date.now() - startAt.current) / 1000), 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  async function saveTest(value) {
    if (!token) { setSaveMessage("Sign in to save this result."); setSaveError(true); setRetry(false); return; }
    setSaveMessage("Saving your result…"); setSaveError(false); setRetry(false);
    try {
      const response = await fetch(`${API}/tests`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify(value) });
      if (response.status === 401) { sessionStorage.removeItem(TOKEN_KEY); setToken(null); setSaveMessage("Your session expired. Sign in to save this result."); setSaveError(true); return; }
      if (!response.ok) throw new Error(await errorDetail(response, "The server couldn't save this test."));
      setSaveMessage("Result saved to your account.");
    } catch (err) { setSaveMessage(err.message || "Couldn't save this result. Check your connection and retry."); setSaveError(true); setRetry(true); }
  }
  function completeTest(value) {
    if (personalBest !== null && value.wpm > personalBest) {
      setPersonalBest(value.wpm); setRecordWpm(value.wpm); setIsNewRecord(true);
      if (!token) { try { localStorage.setItem("keyline-guest-best-wpm", String(value.wpm)); } catch { /* celebrate for this visit */ } }
    }
    setResult(value); setSeconds(value.duration); setPhase("complete"); void saveTest(value);
  }
  function changeText(event) {
    const next = event.target.value;
    let start = 0;
    while (start < lastTyped.current.length && start < next.length && lastTyped.current[start] === next[start]) start++;
    let suffix = 0;
    while (suffix < lastTyped.current.length - start && suffix < next.length - start && lastTyped.current[lastTyped.current.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
    const newlyTyped = next.slice(start, next.length - suffix);
    let nextMistakes = mistakes;
    for (let i = 0; i < newlyTyped.length; i++) {
      const typedCharacter = newlyTyped[i];
      const expectedCharacter = sentence[start + i];
      if (typedCharacter !== expectedCharacter) {
        nextMistakes++;
        if (expectedCharacter && /[a-z]/i.test(expectedCharacter)) {
          const key = expectedCharacter.toLocaleLowerCase();
          mistakeCounts.current[key] = (mistakeCounts.current[key] || 0) + 1;
        }
        const targetIndex = start + i;
        const previousTarget = sentence[targetIndex - 1];
        const previousTyped = next[targetIndex - 1];
        if (
          targetIndex > 0 && previousTarget && /[a-z]/i.test(previousTarget) &&
          expectedCharacter && /[a-z]/i.test(expectedCharacter) &&
          previousTyped !== previousTarget && typedCharacter !== expectedCharacter
        ) {
          const pattern = `${previousTarget}${expectedCharacter}`.toLocaleLowerCase();
          mistakeCounts.current[pattern] = (mistakeCounts.current[pattern] || 0) + 1;
        }
      }
    }
    const nextKeystrokes = keystrokes + newlyTyped.length;
    setMistakes(nextMistakes); setKeystrokes(nextKeystrokes); lastTyped.current = next; setTyped(next);
    if (startAt.current === null && next.length) { startAt.current = Date.now(); setPhase("typing"); }
    if (next.length >= sentence.length) {
      const elapsed = Math.max(1, Math.round(startAt.current === null ? 0 : (Date.now() - startAt.current) / 1000));
      const correct = [...next].reduce((count, char, index) => count + (char === sentence[index] ? 1 : 0), 0);
      completeTest({ sentence_id: source.id, wpm: Math.max(0, Math.round((correct / 5) / (elapsed / 60))), accuracy: next.length ? Math.round((correct / next.length) * 10000) / 100 : 0, characters: nextKeystrokes, errors: nextMistakes, duration: elapsed, mistake_counts: { ...mistakeCounts.current } });
    }
  }
  function resetSentence() { setTyped(""); lastTyped.current = ""; mistakeCounts.current = {}; startAt.current = null; setSeconds(0); setMistakes(0); setKeystrokes(0); setResult(null); setIsNewRecord(false); setRecordWpm(null); setRecordFading(false); setSaveMessage(""); setPhase("ready"); requestAnimationFrame(() => input.current?.focus()); }
  function toggleOption(which) {
    const value = which === "upper" ? !upper : !punctuation;
    if (which === "upper") { setUpper(value); localStorage.setItem("keyline-uppercase", String(value)); }
    else { setPunctuation(value); localStorage.setItem("keyline-punctuation", String(value)); }
    setTyped(""); lastTyped.current = ""; mistakeCounts.current = {}; startAt.current = null; setMistakes(0); setKeystrokes(0); setSeconds(0); setPhase("ready"); setResult(null); setIsNewRecord(false); setRecordWpm(null); setRecordFading(false); setSaveMessage(""); requestAnimationFrame(() => input.current?.focus());
  }
  function changeMode(mode) {
    if (mode === "adaptive" && !token) return;
    setPracticeMode(mode);
    void loadPassage(difficulty, mode);
  }
  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  return <><div className="practice-body"><Header active="practice" theme={theme} onToggle={onToggle} username={user ? `PRACTICING AS ${user.username.toUpperCase()}` : token ? "ACCOUNT SESSION" : "GUEST PRACTICE"} token={token} onSignOut={signOut}/>
    <main className="practice-main"><div className="practice-heading"><div><p className="form-kicker">A FEW MINUTES. A BETTER RHYTHM.</p><h1 className="practice-title">Find your <em>flow.</em></h1><p className="practice-subtitle">A little practice goes a long way. Take it one passage at a time.</p></div><div className="practice-controls"><label htmlFor="difficulty">DIFFICULTY</label><div className="difficulty-select-wrap"><select id="difficulty" value={difficulty} onChange={(event) => { setDifficulty(event.target.value); void loadPassage(event.target.value); }}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div></div></div>
      <div className="practice-text-options"><span className="practice-options-label">TEXT OPTIONS</span><button type="button" className="text-option-toggle" aria-pressed={upper} onClick={() => toggleOption("upper")}>Uppercase</button><button type="button" className="text-option-toggle" aria-pressed={punctuation} onClick={() => toggleOption("punctuation")}>Punctuation</button></div>
      <div className="practice-text-options practice-mode-options"><span className="practice-options-label">PRACTICE MODE</span><button type="button" className="text-option-toggle" aria-pressed={practiceMode === "random"} onClick={() => changeMode("random")}>Random passage</button><button type="button" className="text-option-toggle" aria-pressed={practiceMode === "adaptive"} disabled={!token} title={!token ? "Sign in to use adaptive practice" : undefined} onClick={() => changeMode("adaptive")}>Adaptive focus</button>{!token && <span className="practice-mode-note">Sign in to practice your most-missed letters.</span>}</div>
      {phase === "complete" ? <section className="result-panel" id="result-panel"><div className="result-heading"><div><p className="form-kicker">PRACTICE COMPLETE</p><h2>{isNewRecord ? "New personal best!" : "Nice work."}</h2></div></div><div className="result-metrics"><div><span>SPEED</span><strong>{result?.wpm}</strong><small> WPM</small></div><div><span>ACCURACY</span><strong>{Number(result?.accuracy).toFixed(2)}%</strong></div><div><span>ERRORS</span><strong>{result?.errors}</strong></div><div><span>TIME</span><strong>{formattedTime}</strong></div></div><p className={`result-save-state${saveError ? " save-error" : ""}`}>{saveMessage}</p><div className="result-actions"><button type="button" className="start-button" onClick={() => void loadPassage()}>Try another passage <span aria-hidden="true">→</span></button>{retry && <button type="button" className="text-button" onClick={() => result && void saveTest(result)}>Retry save</button>}</div></section> : <section className="practice-card"><div className="practice-card-top"><span className="passage-meta"><i className="level-dot" data-level={source?.difficulty || difficulty} />{(source?.difficulty || difficulty).toUpperCase()}<span className="meta-divider">·</span>{(source?.category || "GENERAL").toUpperCase()}{source?.focus_characters?.length > 0 && <span className="focus-character-badge">FOCUS · {source.focus_characters.join(" + ")}</span>}</span><span id="timer">{formattedTime}</span></div><div className={`passage-area${phase === "typing" ? " is-focused" : ""}`} onClick={() => input.current?.focus()}><p className="passage-text" aria-label="Typing passage">{phase === "loading" ? "Getting a passage ready…" : phase === "error" ? error : sentence.split("").map((char, index) => <span key={index} className={index < typed.length ? typed[index] === char ? "char-correct" : "char-incorrect" : index === typed.length ? "char-current" : ""}>{char}</span>)}</p><input ref={input} className="typing-input" aria-label="Type the passage shown above" value={typed} maxLength={sentence.length || undefined} disabled={!source || phase === "loading" || phase === "error" || phase === "complete"} onChange={changeText} onPaste={(event) => event.preventDefault()} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); resetSentence(); } }} /></div><div className="practice-card-bottom"><div className="live-metrics"><div className="live-metric"><span>PROGRESS</span><strong>{typed.length}<small> / {sentence.length || "—"}</small></strong></div><div className="live-metric"><span>KEYSTROKES</span><strong>{keystrokes}</strong></div><div className="live-metric"><span>LIVE ACCURACY</span><strong>{keystrokes ? `${Math.round(Math.max(0, (keystrokes - mistakes) / keystrokes) * 100)}%` : "—"}</strong></div></div><button className="start-button" type="button" disabled={phase === "loading"} onClick={() => void loadPassage()}>{source ? "Restart test" : "Try again"}<span aria-hidden="true">→</span></button></div></section>}
      {!token && <p className="practice-footnote">Sign in to save your practice results. <a href="/login">Sign in</a></p>}
      {saveError && phase === "complete" && <div className="auth-notice">{saveMessage}{!token && <> <a href="/login">Sign in</a> to save future results.</>}</div>}
    </main><Footer /></div>{recordWpm !== null && <RecordCelebration wpm={recordWpm} fading={recordFading} />}</>;
}
