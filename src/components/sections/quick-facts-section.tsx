import type { BusinessRuntime } from "@/types/business";

function shortLocation(address: string): string {
  const parts = address.split(",").map((part) => part.trim());
  return parts.slice(-2).join(", ");
}

export function QuickFactsSection({ runtime }: { runtime: BusinessRuntime }) {
  const facts = [
    runtime.services.length
      ? { value: String(runtime.services.length), label: "Services" }
      : null,
    runtime.staff.length ? { value: String(runtime.staff.length), label: "Team members" } : null,
    runtime.business.address
      ? { value: shortLocation(runtime.business.address), label: "Location" }
      : null,
  ].filter((fact): fact is { value: string; label: string } => Boolean(fact));

  if (!facts.length) return null;

  return (
    <section className="quick-facts" aria-label="Business overview">
      <dl className="page-shell quick-facts-grid">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
