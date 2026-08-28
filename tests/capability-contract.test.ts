import { describe, expect, it } from "vitest";

import {
  getBusinessInfo,
  getServiceDetails,
  listServicesForBusiness,
  listStaffForBusiness,
} from "@/features/businesses/operations";
import type { BusinessRuntimeRepository } from "@/features/businesses/repository";
import {
  CapabilityOperationDisabledError,
  canRenderCapabilitySection,
  canUseOperation,
  getAgentCapabilityPreview,
  getEnabledAgentToolNames,
  type CapabilityState,
} from "@/features/capabilities/capabilities";
import { getNavigationItems, getVisibleWebsiteSections } from "@/features/capabilities/website-sections";
import type { Business, BusinessCapabilities, BusinessRuntime, FAQ, GalleryItem, Review, Service, Staff } from "@/types/business";

const timestamp = "2026-08-27T00:00:00.000Z";

const aria: Business = {
  id: "business-aria",
  slug: "aria-hair",
  name: "Aria Hair Studio",
  businessType: "service",
  description: "Thoughtful cuts and styling.",
  phone: "+60 3-5555 0148",
  email: "hello@aria.example",
  address: "Bangsar, Kuala Lumpur",
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
};

const service: Service = { id: "service-cut", businessId: aria.id, name: "Classic Cut", description: null, category: "Cuts", price: 45, durationMinutes: 30, tags: [], active: true, sortOrder: 1 };
const person: Staff = { id: "staff-alex", businessId: aria.id, name: "Alex", bio: null, imageUrl: null, active: true, sortOrder: 1 };
const faq: FAQ = { id: "faq-1", businessId: aria.id, question: "Do I need an appointment?", answer: "Recommended.", active: true, sortOrder: 1 };
const gallery: GalleryItem = { id: "gallery-1", businessId: aria.id, imageUrl: "/image.webp", altText: "Studio", sortOrder: 1 };
const review: Review = { id: "review-1", businessId: aria.id, customerName: "Nadia", rating: 5, quote: "Excellent.", sortOrder: 1 };

function state(overrides: Partial<CapabilityState> = {}): CapabilityState {
  return { services: true, staff: true, booking: true, faq: true, gallery: true, reviews: true, ...overrides };
}

function capabilities(overrides: Partial<CapabilityState> = {}): BusinessCapabilities {
  return { businessId: aria.id, ...state(overrides), updatedAt: timestamp };
}

class Repository implements BusinessRuntimeRepository {
  currentCapabilities = capabilities();
  findPublishedBusinessBySlug = async (slug: string) => slug === aria.slug ? aria : null;
  findBusinessById = async (id: string) => id === aria.id ? aria : null;
  findCapabilities = async (id: string) => id === aria.id ? this.currentCapabilities : null;
  listServices = async (id: string) => id === aria.id ? [service] : [];
  listStaff = async (id: string) => id === aria.id ? [person] : [];
  listFaqs = async (id: string) => id === aria.id ? [faq] : [];
  listGallery = async (id: string) => id === aria.id ? [gallery] : [];
  listReviews = async (id: string) => id === aria.id ? [review] : [];
}

function runtime(capabilityOverrides: Partial<CapabilityState> = {}): BusinessRuntime {
  return { business: aria, capabilities: capabilities(capabilityOverrides), services: [service], staff: [person], faqs: [faq], gallery: [gallery], reviews: [review] };
}

describe("canonical capability contract", () => {
  it("projects all nine future tools when Aria capabilities are enabled", () => {
    expect(getEnabledAgentToolNames(state())).toEqual([
      "get_business_info",
      "list_services",
      "get_service_details",
      "recommend_service",
      "list_staff",
      "get_available_slots",
      "create_booking",
      "update_booking",
      "cancel_booking",
    ]);
  });

  it("removes all booking tools when booking is disabled while keeping discovery tools", () => {
    expect(getEnabledAgentToolNames(state({ booking: false }))).toEqual([
      "get_business_info",
      "list_services",
      "get_service_details",
      "recommend_service",
      "list_staff",
    ]);
  });

  it("derives effective operation availability from explicit dependencies", () => {
    const noServices = state({ services: false, booking: true, staff: true });
    expect(canUseOperation(noServices, "create_booking")).toBe(false);
    expect(canUseOperation(noServices, "get_available_slots")).toBe(false);
    expect(canUseOperation(noServices, "update_booking")).toBe(false);
    expect(canUseOperation(noServices, "cancel_booking")).toBe(true);
    expect(getEnabledAgentToolNames(noServices)).toEqual(["get_business_info", "list_staff", "cancel_booking"]);

    const noStaff = state({ services: true, booking: true, staff: false });
    expect(canUseOperation(noStaff, "create_booking")).toBe(false);
    expect(canRenderCapabilitySection(noStaff, "booking")).toBe(false);
    expect(getEnabledAgentToolNames(noStaff)).toEqual([
      "get_business_info", "list_services", "get_service_details", "recommend_service", "cancel_booking",
    ]);
  });

  it("builds Agent Preview from the same definitions", () => {
    const preview = getAgentCapabilityPreview(state({ booking: false }));
    expect(preview.find((group) => group.group === "Discover")?.tools.every((tool) => tool.enabled)).toBe(true);
    expect(preview.find((group) => group.group === "Booking")?.tools.every((tool) => !tool.enabled)).toBe(true);
  });
});

describe("website capability projection", () => {
  it("keeps sections and navigation synchronized for every optional website capability", () => {
    const capabilitySections = ["services", "staff", "gallery", "reviews", "booking", "faq"] as const;
    for (const section of capabilitySections) {
      const candidate = runtime({ [section]: false });
      expect(getVisibleWebsiteSections(candidate).map((item) => item.id)).not.toContain(section);
      expect(getNavigationItems(candidate).map((item) => item.id)).not.toContain(section);
    }
  });

  it("hides the booking CTA when a supporting capability is inconsistent", () => {
    expect(getVisibleWebsiteSections(runtime({ booking: true, services: false })).map((item) => item.id)).not.toContain("booking");
    expect(getVisibleWebsiteSections(runtime({ booking: true, staff: false })).map((item) => item.id)).not.toContain("booking");
  });
});

describe("capability-safe reusable read operations", () => {
  it("returns normalized services and staff when enabled", async () => {
    const repository = new Repository();
    await expect(listServicesForBusiness(repository, { businessId: aria.id, audience: "public" })).resolves.toEqual([service]);
    await expect(getServiceDetails(repository, { businessId: aria.id, serviceId: service.id, audience: "public" })).resolves.toEqual(service);
    await expect(listStaffForBusiness(repository, { businessId: aria.id, audience: "public" })).resolves.toEqual([person]);
  });

  it("rejects service and staff reads with the stable capability error", async () => {
    const repository = new Repository();
    repository.currentCapabilities = capabilities({ services: false, staff: false });
    await expect(listServicesForBusiness(repository, { businessId: aria.id, audience: "public" })).rejects.toMatchObject({ code: "capability_not_enabled", operation: "list_services" });
    await expect(getServiceDetails(repository, { businessId: aria.id, serviceId: service.id, audience: "public" })).rejects.toBeInstanceOf(CapabilityOperationDisabledError);
    await expect(listStaffForBusiness(repository, { businessId: aria.id, audience: "public" })).rejects.toMatchObject({ code: "capability_not_enabled", operation: "list_staff" });
  });

  it("keeps business information baseline and returns only public fields", async () => {
    const repository = new Repository();
    repository.currentCapabilities = capabilities({ services: false, staff: false, booking: false, faq: false, gallery: false, reviews: false });
    await expect(getBusinessInfo(repository, { businessId: aria.id, audience: "public" })).resolves.toEqual({
      name: aria.name,
      description: aria.description,
      phone: aria.phone,
      email: aria.email,
      address: aria.address,
      timezone: aria.timezone,
    });
  });
});

describe("critical ON → OFF → ON demo contract", () => {
  it("switches website, backend, and future agent projection together", async () => {
    const repository = new Repository();
    for (const booking of [true, false, true]) {
      repository.currentCapabilities = capabilities({ booking });
      const currentRuntime = runtime({ booking });
      const websiteHasBooking = getVisibleWebsiteSections(currentRuntime).some((section) => section.id === "booking");
      const agentHasBooking = getEnabledAgentToolNames(currentRuntime.capabilities).includes("create_booking");
      expect(websiteHasBooking).toBe(booking);
      expect(agentHasBooking).toBe(booking);
      expect(canUseOperation(currentRuntime.capabilities, "create_booking")).toBe(booking);
    }
  });
});
