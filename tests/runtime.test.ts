import { describe, expect, it } from "vitest";

import type { BusinessRuntimeRepository } from "@/features/businesses/repository";
import {
  CapabilityDisabledError,
  hasCapability,
} from "@/features/capabilities/capabilities";
import { requireCapability } from "@/features/capabilities/require-capability";
import {
  getNavigationItems,
  getVisibleWebsiteSections,
} from "@/features/capabilities/website-sections";
import {
  loadBusinessRuntimeById,
  loadPublishedBusinessRuntimeBySlug,
} from "@/lib/runtime/load-runtime";
import { resolveTheme } from "@/themes";
import type {
  Business,
  BusinessCapabilities,
  BusinessRuntime,
  FAQ,
  GalleryItem,
  Review,
  Service,
  Staff,
} from "@/types/business";

const timestamp = "2026-08-27T00:00:00.000Z";

function business(overrides: Partial<Business> = {}): Business {
  return {
    id: "business-aria",
    slug: "aria-hair",
    name: "Aria Hair Studio",
    businessType: "service",
    description: "A test business",
    phone: null,
    email: null,
    address: null,
    timezone: "Asia/Kuala_Lumpur",
    heroTitle: "Hair that feels like you",
    heroSubtitle: null,
    heroImageUrl: null,
    themePreset: "elegant",
    brandPrimary: null,
    brandAccent: null,
    brandBackground: null,
    brandDark: null,
    status: "published",
    publishedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function runtime(overrides: {
  business?: Partial<Business>;
  capabilities?: Partial<BusinessCapabilities>;
  services?: Service[];
  staff?: Staff[];
  faqs?: FAQ[];
  gallery?: GalleryItem[];
  reviews?: Review[];
} = {}): BusinessRuntime {
  return {
    business: business({
      phone: "+60 3-5555 0100",
      email: "hello@example.com",
      address: "Bangsar, Kuala Lumpur",
      ...overrides.business,
    }),
    capabilities: capabilities(overrides.capabilities),
    services: overrides.services ?? [
      {
        id: "service-1",
        businessId: "business-aria",
        name: "Consultation",
        description: "A focused personal consultation.",
        category: "Consultations",
        price: 45,
        durationMinutes: 30,
        tags: [],
        active: true,
        sortOrder: 1,
      },
    ],
    staff: overrides.staff ?? [],
    faqs: overrides.faqs ?? [
      {
        id: "faq-1",
        businessId: "business-aria",
        question: "Do I need an appointment?",
        answer: "Appointments are recommended.",
        active: true,
        sortOrder: 1,
      },
    ],
    gallery: overrides.gallery ?? [],
    reviews: overrides.reviews ?? [],
  };
}

function capabilities(
  overrides: Partial<BusinessCapabilities> = {},
): BusinessCapabilities {
  return {
    businessId: "business-aria",
    services: true,
    staff: true,
    booking: false,
    faq: true,
    gallery: true,
    reviews: true,
    updatedAt: timestamp,
    ...overrides,
  };
}

class MemoryRepository implements BusinessRuntimeRepository {
  readonly calls: string[] = [];

  constructor(
    private readonly businesses: Business[],
    private readonly capabilityRows: BusinessCapabilities[],
  ) {}

  async findPublishedBusinessBySlug(slug: string): Promise<Business | null> {
    this.calls.push(`published:${slug}`);
    return (
      this.businesses.find(
        (candidate) => candidate.slug === slug && candidate.status === "published",
      ) ?? null
    );
  }

  async findBusinessById(id: string): Promise<Business | null> {
    return this.businesses.find((candidate) => candidate.id === id) ?? null;
  }

  async findCapabilities(businessId: string): Promise<BusinessCapabilities | null> {
    return this.capabilityRows.find((row) => row.businessId === businessId) ?? null;
  }

  async listServices(businessId: string): Promise<Service[]> {
    this.calls.push(`services:${businessId}`);
    return [
      {
        id: "service-1",
        businessId,
        name: "Classic Cut",
        description: null,
        category: "Cuts",
        price: 45,
        durationMinutes: 30,
        tags: ["everyday"],
        active: true,
        sortOrder: 1,
      },
    ];
  }

  async listStaff(businessId: string): Promise<Staff[]> {
    this.calls.push(`staff:${businessId}`);
    return [];
  }

  async listFaqs(businessId: string): Promise<FAQ[]> {
    this.calls.push(`faq:${businessId}`);
    return [];
  }

  async listGallery(businessId: string): Promise<GalleryItem[]> {
    this.calls.push(`gallery:${businessId}`);
    return [];
  }

  async listReviews(businessId: string): Promise<Review[]> {
    this.calls.push(`reviews:${businessId}`);
    return [];
  }
}

describe("published business runtime", () => {
  it("normalizes a published business and loads only its enabled content", async () => {
    const aria = business();
    const repository = new MemoryRepository([aria], [
      capabilities({ gallery: false, reviews: false }),
    ]);

    const runtime = await loadPublishedBusinessRuntimeBySlug(repository, "aria-hair");

    expect(runtime?.business.name).toBe("Aria Hair Studio");
    expect(runtime?.services[0]?.businessId).toBe(aria.id);
    expect(repository.calls).toContain(`services:${aria.id}`);
    expect(repository.calls).not.toContain(`gallery:${aria.id}`);
    expect(repository.calls).not.toContain(`reviews:${aria.id}`);
  });

  it("returns null for draft and unknown slugs", async () => {
    const draft = business({
      id: "business-draft",
      slug: "hidden-draft",
      status: "draft",
      publishedAt: null,
    });
    const repository = new MemoryRepository([draft], [
      capabilities({ businessId: draft.id }),
    ]);

    await expect(
      loadPublishedBusinessRuntimeBySlug(repository, "hidden-draft"),
    ).resolves.toBeNull();
    await expect(
      loadPublishedBusinessRuntimeBySlug(repository, "missing"),
    ).resolves.toBeNull();
  });

  it("keeps draft preview loading separate from the public loader", async () => {
    const draft = business({
      id: "business-draft",
      slug: "hidden-draft",
      status: "draft",
      publishedAt: null,
    });
    const repository = new MemoryRepository([draft], [
      capabilities({ businessId: draft.id }),
    ]);

    await expect(
      loadPublishedBusinessRuntimeBySlug(repository, draft.slug),
    ).resolves.toBeNull();
    await expect(loadBusinessRuntimeById(repository, draft.id)).resolves.toMatchObject({
      business: { id: draft.id, status: "draft" },
    });
  });

  it("supports a second slug through the same runtime loader", async () => {
    const aria = business();
    const luna = business({
      id: "business-luna",
      slug: "luna-wellness",
      name: "Luna Wellness Studio",
      themePreset: "clean",
    });
    const repository = new MemoryRepository([aria, luna], [
      capabilities(),
      capabilities({
        businessId: luna.id,
        staff: false,
        gallery: false,
        reviews: false,
      }),
    ]);

    const runtime = await loadPublishedBusinessRuntimeBySlug(repository, "luna-wellness");

    expect(runtime?.business.name).toBe("Luna Wellness Studio");
    expect(runtime?.business.themePreset).toBe("clean");
    expect(runtime?.services[0]?.businessId).toBe(luna.id);
  });
});

describe("capabilities", () => {
  it("removes disabled and empty sections from both composition and navigation", () => {
    const runtimeShape = runtime({
      capabilities: { services: false, staff: false, gallery: false, reviews: false, faq: true },
    });
    const sections = getVisibleWebsiteSections(runtimeShape).map((section) => section.id);
    const navigation = getNavigationItems(runtimeShape).map((section) => section.id);

    expect(hasCapability(runtimeShape, "services")).toBe(false);
    expect(sections).not.toContain("services");
    expect(sections).not.toContain("staff");
    expect(sections).toContain("faq");
    expect(navigation).not.toContain("services");
    expect(navigation).not.toContain("staff");
    expect(navigation).toContain("faq");
  });

  it("keeps the alternate capability combination coherent", () => {
    const runtimeShape = runtime({
      capabilities: { gallery: false, faq: false, reviews: true },
      staff: [
        {
          id: "staff-1",
          businessId: "business-aria",
          name: "Ari",
          bio: "A service specialist.",
          imageUrl: null,
          active: true,
          sortOrder: 1,
        },
      ],
      reviews: [
        {
          id: "review-1",
          businessId: "business-aria",
          customerName: "Farah",
          rating: 5,
          quote: "Thoughtful and professional.",
          sortOrder: 1,
        },
      ],
    });
    const sections = getVisibleWebsiteSections(runtimeShape).map((section) => section.id);

    expect(sections).toEqual(["about", "services", "staff", "reviews", "contact"]);
  });

  it("provides a reusable backend capability guard", async () => {
    const aria = business();
    const repository = new MemoryRepository([aria], [capabilities({ booking: false })]);

    await expect(requireCapability(repository, aria.id, "services")).resolves.toBeUndefined();
    await expect(requireCapability(repository, aria.id, "booking")).rejects.toBeInstanceOf(
      CapabilityDisabledError,
    );
  });
});

describe("theme resolution", () => {
  it("returns preset defaults when custom colors are absent", () => {
    const elegant = resolveTheme({ preset: "elegant" });
    const reset = resolveTheme({
      preset: "elegant",
      overrides: { primary: null, accent: null, background: null, dark: null },
    });

    expect(reset).toEqual(elegant);
  });

  it("applies valid custom colors and rejects invalid values", () => {
    const clean = resolveTheme({ preset: "clean" });
    const resolved = resolveTheme({
      preset: "clean",
      overrides: {
        primary: "#123456",
        accent: "#abc",
        background: "red",
        dark: "var(--unsafe)",
      },
    });

    expect(resolved.primary).toBe("#123456");
    expect(resolved.accent).toBe("#abc");
    expect(resolved.background).toBe(clean.background);
    expect(resolved.dark).toBe(clean.dark);
  });
});
