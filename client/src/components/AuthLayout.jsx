export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="hero-copy">
          <span className="hero-kicker">Diabetes Care Platform</span>
          <h1>Type-2 Detection &amp; Prevention starts with secure access.</h1>
          <p>
            Sign in to review patient risk insights, prevention plans, and
            personalized recommendations in one calm, protected workspace.
          </p>
        </div>

        <div className="hero-card">
          <strong>Medical-friendly design</strong>
          <span>
            Built for clean onboarding, simple authentication, and future
            integration with predictive dashboards.
          </span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
