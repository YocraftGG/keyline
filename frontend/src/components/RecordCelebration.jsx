export default function RecordCelebration({ wpm, fading }) {
  const colors = ["#829a32", "#bdd94a", "#e8b94f", "#d47e65", "#829fbd"];
  return <div className={`record-celebration${fading ? " is-fading" : ""}`} role="status" aria-live="polite">
    <div className="record-confetti" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 8) * 0.07}s`, backgroundColor: colors[index % colors.length] }} />)}</div>
    <div className="record-celebration-card"><span>NEW PERSONAL BEST</span><strong>{wpm} <small>WPM</small></strong><span>You’re getting faster!</span></div>
  </div>;
}

