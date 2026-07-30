import { useNavigate } from "react-router";
import './home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <main className="content">
      <div className="content-glow content-glow-top" aria-hidden="true" />
      <div className="content-glow content-glow-bottom" aria-hidden="true" />

      <section className="greet-card">
        <span className="greet-badge">
          <span className="greet-badge-dot" />
          Ready when you are
        </span>

        <h1 className="greet-title">
          Good morning, <span className="greet-title-accent">Champ</span> <span className="greet-wave">👋</span>
        </h1>

        <p className="greet-sub">
          You're 6 days into your streak — that consistency is exactly what separates a good interview from a great one. Let's keep it going.
        </p>

        <div className="greet-actions">
          <button className="btn btn-primary" onClick={() => navigate("/setup")}>
            Start Your Journey <span className="arrow">→</span>
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/analytics")}>
            View Progress
          </button>
        </div>
      </section>
    </main>
  )
}