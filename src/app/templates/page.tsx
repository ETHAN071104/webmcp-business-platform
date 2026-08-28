import Link from "next/link";

const templates = [
  {
    name: "Service Business",
    status: "Available",
    description: "Services, staff, social proof, gallery, FAQs, and contact details.",
    available: true,
  },
  {
    name: "Product Business",
    status: "Coming Soon",
    description: "A future engine for configurable product catalogues.",
    available: false,
  },
  {
    name: "Restaurant",
    status: "Coming Soon",
    description: "A future engine for menus, dining information, and reservations.",
    available: false,
  },
];

export default function TemplatesPage() {
  return (
    <main className="platform-page">
      <div className="platform-shell">
        <Link className="back-link" href="/">
          ← Platform home
        </Link>
        <p className="platform-kicker">Platform templates</p>
        <h1>One platform, focused business engines.</h1>
        <p className="platform-lead">
          Phase 0 implements one reusable Service Business template. The other engines are
          intentionally deferred.
        </p>
        <div className="template-grid">
          {templates.map((template) => (
            <article className="template-card" key={template.name}>
              <span className={template.available ? "status available" : "status"}>
                {template.status}
              </span>
              <h2>{template.name}</h2>
              <p>{template.description}</p>
              {template.available ? (
                <Link href="/business/aria-hair">View reference business →</Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
