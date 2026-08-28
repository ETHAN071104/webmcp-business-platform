import type { CSSProperties } from "react";

import { BusinessNavbar } from "@/components/business/business-navbar";
import { BusinessFooter } from "@/components/sections/business-footer";
import { AboutSection } from "@/components/sections/about-section";
import { BookingCtaSection } from "@/components/sections/booking-cta-section";
import { ContactSection } from "@/components/sections/contact-section";
import { FAQSection } from "@/components/sections/faq-section";
import { GallerySection } from "@/components/sections/gallery-section";
import { HeroSection } from "@/components/sections/hero-section";
import { QuickFactsSection } from "@/components/sections/quick-facts-section";
import { ReviewsSection } from "@/components/sections/reviews-section";
import { ServicesSection } from "@/components/sections/services-section";
import { StaffSection } from "@/components/sections/staff-section";
import {
  getNavigationItems,
  getVisibleWebsiteSections,
} from "@/features/capabilities/website-sections";
import { resolveTheme } from "@/themes";
import type { BusinessRuntime } from "@/types/business";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export function ServiceBusinessTemplate({ runtime }: { runtime: BusinessRuntime }) {
  const { business } = runtime;
  const tokens = resolveTheme({
    preset: business.themePreset,
    overrides: {
      primary: business.brandPrimary,
      accent: business.brandAccent,
      background: business.brandBackground,
      dark: business.brandDark,
    },
  });
  const visibleSections = new Set(
    getVisibleWebsiteSections(runtime).map((section) => section.id),
  );
  const navigation = getNavigationItems(runtime);
  const aboutImage = runtime.gallery.find((item) => item.imageUrl) ?? null;
  const galleryItems = runtime.gallery.length >= 3 ? runtime.gallery.slice(1) : runtime.gallery;
  const style: ThemeStyle = {
    "--theme-font-heading": tokens.fontHeading,
    "--theme-font-body": tokens.fontBody,
    "--theme-radius": tokens.radius,
    "--theme-background": tokens.background,
    "--theme-foreground": tokens.foreground,
    "--theme-primary": tokens.primary,
    "--theme-accent": tokens.accent,
    "--theme-dark": tokens.dark,
    "--theme-muted": tokens.muted,
    "--theme-border": tokens.border,
    "--theme-surface": tokens.surface,
    "--theme-section-spacing": tokens.sectionSpacing,
  };

  return (
    <main className="business-site" style={style}>
      <BusinessNavbar
        businessName={business.name}
        items={navigation}
        contactAvailable={visibleSections.has("contact")}
      />
      <div id="top">
        <HeroSection
          business={business}
          servicesAvailable={visibleSections.has("services")}
          contactAvailable={visibleSections.has("contact")}
        />
      </div>
      <QuickFactsSection runtime={runtime} />
      {visibleSections.has("about") ? (
        <AboutSection business={business} image={aboutImage} />
      ) : null}
      {visibleSections.has("services") ? <ServicesSection services={runtime.services} /> : null}
      {visibleSections.has("staff") ? <StaffSection staff={runtime.staff} /> : null}
      {visibleSections.has("gallery") ? <GallerySection items={galleryItems} /> : null}
      {visibleSections.has("reviews") ? <ReviewsSection reviews={runtime.reviews} /> : null}
      {visibleSections.has("booking") ? <BookingCtaSection business={business} /> : null}
      {visibleSections.has("faq") ? <FAQSection faqs={runtime.faqs} /> : null}
      {visibleSections.has("contact") ? <ContactSection business={business} /> : null}
      <BusinessFooter business={business} navigation={navigation} />
    </main>
  );
}
