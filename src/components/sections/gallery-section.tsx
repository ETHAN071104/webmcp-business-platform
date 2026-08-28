import Image from "next/image";

import type { GalleryItem } from "@/types/business";

export function GallerySection({ items }: { items: GalleryItem[] }) {
  const visibleItems = items.filter(
    (item): item is GalleryItem & { imageUrl: string } => Boolean(item.imageUrl),
  );

  return (
    <section id="gallery" className="gallery-section page-shell" data-section="gallery">
      <header className="gallery-heading">
        <h2>A closer look.</h2>
      </header>
      <div className="gallery-grid">
        {visibleItems.map((item, index) => (
          <div className="gallery-image" key={item.id}>
            <Image
              src={item.imageUrl}
              alt={item.altText ?? "Business gallery image"}
              fill
              sizes={index === 0 ? "(max-width: 767px) 100vw, 62vw" : "(max-width: 767px) 100vw, 34vw"}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
