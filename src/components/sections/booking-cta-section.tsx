import type { Business } from "@/types/business";

export function BookingCtaSection({ business }: { business: Business }) {
  return (
    <section id="booking" className="booking-cta-section" data-section="booking">
      <div className="page-shell booking-cta-inner">
        <div>
          <h2>Ready to book?</h2>
          <p>Choose a service and find a time that works for you.</p>
        </div>
        <a className="button button-dark" href={`/business/${business.slug}/booking`}>
          Book an appointment
        </a>
      </div>
    </section>
  );
}
