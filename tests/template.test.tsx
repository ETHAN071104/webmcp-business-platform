import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServiceBusinessTemplate } from "@/components/business/service-business-template";
import type { BusinessRuntime } from "@/types/business";

const timestamp = "2026-08-27T00:00:00.000Z";

function lunaRuntime(): BusinessRuntime {
  return {
    business: {
      id: "business-luna",
      slug: "luna-wellness",
      name: "Luna Wellness Studio",
      businessType: "service",
      description: "Simple restorative treatments for busy city days.",
      phone: "+60 3-5555 0192",
      email: "care@lunawellness.example",
      address: "7 Jalan SS 21/1A, Petaling Jaya",
      timezone: "Asia/Kuala_Lumpur",
      heroTitle: "Make space to reset",
      heroSubtitle: "A quiet studio for practical, restorative care.",
      heroImageUrl: null,
      themePreset: "clean",
      brandPrimary: null,
      brandAccent: null,
      brandBackground: null,
      brandDark: null,
      status: "published",
      publishedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    capabilities: {
      businessId: "business-luna",
      services: true,
      staff: false,
      booking: false,
      faq: true,
      gallery: false,
      reviews: false,
      updatedAt: timestamp,
    },
    services: [
      {
        id: "service-luna",
        businessId: "business-luna",
        name: "Restorative Massage",
        description: "A focused full-body reset.",
        category: "Wellness",
        price: 120,
        durationMinutes: 60,
        tags: ["restorative"],
        active: true,
        sortOrder: 1,
      },
    ],
    staff: [],
    faqs: [
      {
        id: "faq-luna",
        businessId: "business-luna",
        question: "What should I bring?",
        answer: "Just arrive a few minutes early.",
        active: true,
        sortOrder: 1,
      },
    ],
    gallery: [],
    reviews: [],
  };
}

describe("ServiceBusinessTemplate", () => {
  it("renders generic second-business content without unavailable sections or links", () => {
    const html = renderToStaticMarkup(
      <ServiceBusinessTemplate runtime={lunaRuntime()} />,
    );

    expect(html).toContain("Luna Wellness Studio");
    expect(html).toContain("Restorative Massage");
    expect(html).toContain('data-section="services"');
    expect(html).toContain('data-section="faq"');
    expect(html).not.toContain('data-section="staff"');
    expect(html).not.toContain('data-section="gallery"');
    expect(html).not.toContain('data-section="reviews"');
    expect(html).not.toContain('href="#staff"');
    expect(html).not.toContain('href="#gallery"');
    expect(html.toLowerCase()).not.toContain("salon");
    expect(html.toLowerCase()).not.toContain("stylist");
    expect(html.toLowerCase()).not.toContain("hair");
  });

  it("adds the conversion section only when booking is enabled", () => {
    const disabledHtml = renderToStaticMarkup(
      <ServiceBusinessTemplate runtime={lunaRuntime()} />,
    );
    const enabledRuntime = lunaRuntime();
    enabledRuntime.capabilities.booking = true;
    enabledRuntime.capabilities.staff = true;
    const enabledHtml = renderToStaticMarkup(
      <ServiceBusinessTemplate runtime={enabledRuntime} />,
    );

    expect(disabledHtml).not.toContain('data-section="booking"');
    expect(disabledHtml).not.toContain('href="#booking"');
    expect(enabledHtml).toContain('data-section="booking"');
    expect(enabledHtml).toContain('href="#booking"');
    expect(enabledHtml).toContain("Book an appointment");
    expect(enabledHtml).toContain('href="/business/luna-wellness/booking"');
  });
});
