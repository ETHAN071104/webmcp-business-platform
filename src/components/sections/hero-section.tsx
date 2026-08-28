import Image from "next/image";

import type { Business } from "@/types/business";

type HeroSectionProps = {
  business: Business;
  servicesAvailable: boolean;
  contactAvailable: boolean;
};

function businessTypeLabel(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function HeroSection({
  business,
  servicesAvailable,
  contactAvailable,
}: HeroSectionProps) {
  return (
    <section className={business.heroImageUrl ? "hero-section" : "hero-section hero-without-image"}>
      {business.heroImageUrl ? (
        <Image
          className="hero-background"
          src={business.heroImageUrl}
          alt={`${business.name} service space`}
          fill
          priority
          sizes="100vw"
        />
      ) : null}
      <div className="hero-scrim" />
      <div className="hero-copy page-shell">
        <p className="hero-kicker">
          {businessTypeLabel(business.businessType)}
          {business.address ? <span>{business.address}</span> : null}
        </p>
        <h1>{business.heroTitle ?? business.name}</h1>
        {business.heroSubtitle ? <p>{business.heroSubtitle}</p> : null}
        <div className="hero-actions">
          {contactAvailable ? (
            <a className="button button-primary" href="#contact">
              Contact
            </a>
          ) : null}
          {servicesAvailable ? (
            <a className="button button-on-image" href="#services">
              View services
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
