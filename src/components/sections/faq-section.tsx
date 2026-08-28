import type { FAQ } from "@/types/business";

export function FAQSection({ faqs }: { faqs: FAQ[] }) {
  return (
    <section id="faq" className="faq-section page-shell" data-section="faq">
      <header className="faq-heading">
        <h2>Questions, answered.</h2>
        <p>Useful details before you visit.</p>
      </header>
      <div className="faq-list">
        {faqs.map((faq) => (
          <details key={faq.id}>
            <summary>{faq.question ?? "Question"}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
