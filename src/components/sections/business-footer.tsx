import type { WebsiteSection } from "@/features/capabilities/website-sections";
import type { Business } from "@/types/business";

type BusinessFooterProps = {
  business: Business;
  navigation: WebsiteSection[];
};

export function BusinessFooter({ business, navigation }: BusinessFooterProps) {
  return (
    <footer className="business-footer">
      <div className="page-shell footer-main">
        <div className="footer-brand">
          <a href="#top">{business.name}</a>
          {business.description ? <p>{business.description}</p> : null}
        </div>
        <nav aria-label="Footer navigation">
          {navigation.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <address>
          {business.phone ? <a href={`tel:${business.phone}`}>{business.phone}</a> : null}
          {business.email ? <a href={`mailto:${business.email}`}>{business.email}</a> : null}
          {business.address ? <span>{business.address}</span> : null}
        </address>
      </div>
      <div className="page-shell footer-bottom">
        <span>© {new Date().getFullYear()} {business.name}</span>
        <span>All rights reserved</span>
      </div>
    </footer>
  );
}
