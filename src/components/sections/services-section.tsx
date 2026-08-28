import type { Service } from "@/types/business";

const priceFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 0,
});

export function ServicesSection({ services }: { services: Service[] }) {
  return (
    <section id="services" className="services-section" data-section="services">
      <div className="page-shell services-layout">
        <header className="services-heading">
          <p className="section-kicker">Services</p>
          <h2>Clear choices. Thoughtful results.</h2>
          <p>Find the service that fits your needs, schedule, and budget.</p>
        </header>
        <div className="service-menu">
        {services.map((service) => (
          <article className="service-row" key={service.id}>
            <div className="service-copy">
              {service.category ? <p>{service.category}</p> : null}
              <h3>{service.name}</h3>
              {service.description ? <p className="service-description">{service.description}</p> : null}
            </div>
            <div className="service-meta">
              <strong>{priceFormatter.format(service.price)}</strong>
              <span>{service.durationMinutes} min</span>
            </div>
          </article>
        ))}
        </div>
      </div>
    </section>
  );
}
