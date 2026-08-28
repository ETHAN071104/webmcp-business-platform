import type { Business } from "@/types/business";

export function ContactSection({ business }: { business: Business }) {
  return (
    <section id="contact" className="contact-section" data-section="contact">
      <div className="page-shell contact-grid">
        <div>
          <h2>Plan your visit.</h2>
          <p>Questions or service requests? The team is ready to help.</p>
        </div>
        <address className="contact-details">
          {business.address ? (
            <div>
              <span>Visit</span>
              <p>{business.address}</p>
            </div>
          ) : null}
          {business.phone ? (
            <div>
              <span>Call</span>
              <a href={`tel:${business.phone}`}>{business.phone}</a>
            </div>
          ) : null}
          {business.email ? (
            <div>
              <span>Email</span>
              <a href={`mailto:${business.email}`}>{business.email}</a>
            </div>
          ) : null}
        </address>
      </div>
    </section>
  );
}
