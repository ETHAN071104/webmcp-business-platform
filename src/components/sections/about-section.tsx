import Image from "next/image";

import type { Business, GalleryItem } from "@/types/business";

type AboutSectionProps = {
  business: Business;
  image: GalleryItem | null;
};

export function AboutSection({ business, image }: AboutSectionProps) {
  return (
    <section id="about" className="about-section page-shell" data-section="about">
      {image?.imageUrl ? (
        <div className="about-image">
          <Image
            src={image.imageUrl}
            alt={image.altText ?? `${business.name} at work`}
            fill
            loading="eager"
            sizes="(max-width: 767px) 100vw, 48vw"
          />
        </div>
      ) : null}
      <div className="about-copy">
        <h2>Service that starts with listening.</h2>
        {business.description ? <p>{business.description}</p> : null}
        <dl className="about-details">
          {business.timezone ? (
            <div>
              <dt>Local time</dt>
              <dd>{business.timezone.replaceAll("_", " ").replace("/", ", ")}</dd>
            </div>
          ) : null}
          {business.address ? (
            <div>
              <dt>Visit</dt>
              <dd>{business.address}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
