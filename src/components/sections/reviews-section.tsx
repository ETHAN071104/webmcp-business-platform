import type { Review } from "@/types/business";

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <section id="reviews" className="reviews-section" data-section="reviews">
      <div className="page-shell reviews-layout">
        <header className="reviews-heading">
          <p className="section-kicker">Reviews</p>
          <h2>Kind words from recent clients.</h2>
        </header>
        <div className="review-list">
        {reviews.map((review) => (
          <figure className="review-item" key={review.id}>
            <div className="rating" aria-label={`${review.rating ?? 0} out of 5 stars`}>
              {"★".repeat(review.rating ?? 0)}
            </div>
            <blockquote>“{review.quote}”</blockquote>
            <figcaption>{review.customerName}</figcaption>
          </figure>
        ))}
        </div>
      </div>
    </section>
  );
}
