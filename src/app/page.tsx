import Link from "next/link";

export default function HomePage() {
  return (
    <main className="platform-page">
      <div className="platform-shell">
        <p className="platform-kicker">Phase 0 · Foundation</p>
        <h1>Configure once. Serve humans and agents.</h1>
        <p className="platform-lead">
          A configurable website runtime for small service businesses, backed by one shared
          business state.
        </p>
        <div className="platform-actions">
          <Link className="platform-primary" href="/business/aria-hair">
            View Aria Hair Studio
          </Link>
          <Link className="platform-secondary" href="/templates">
            View templates
          </Link>
        </div>
        <div className="principle-grid" aria-label="Architecture principles">
          <article>
            <span>01</span>
            <h2>One business</h2>
            <p>Identity, content, services, and capabilities live in Supabase.</p>
          </article>
          <article>
            <span>02</span>
            <h2>One state</h2>
            <p>A normalized runtime is the shared source of truth.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Two interfaces</h2>
            <p>The website works now; agent tools can use the same feature layer later.</p>
          </article>
        </div>
      </div>
    </main>
  );
}
