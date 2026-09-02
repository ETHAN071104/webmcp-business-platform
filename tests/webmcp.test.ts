import { describe, expect, it } from "vitest";

import { overlaps } from "@/features/bookings/time";
import {
  BookingRepositoryConflictError,
  type AvailabilityRule,
  type Booking,
  type BookingRepository,
  type NewBookingRecord,
} from "@/features/bookings/types";
import type { BusinessRuntimeRepository } from "@/features/businesses/repository";
import { getEnabledAgentToolNames, type CapabilityState } from "@/features/capabilities/capabilities";
import {
  getWebMCPModelContext,
  registerBusinessTools,
} from "@/features/webmcp/register-business-tools";
import { parseAgentToolInput } from "@/features/webmcp/schemas";
import { executeBusinessAgentTool } from "@/features/webmcp/server-adapters";
import { getWebMCPToolDefinitions } from "@/features/webmcp/tool-definitions";
import type { WebMCPModelContext, WebMCPTool } from "@/features/webmcp/types";
import type {
  Business,
  BusinessCapabilities,
  FAQ,
  GalleryItem,
  Review,
  Service,
  Staff,
} from "@/types/business";

const BUSINESS_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_BUSINESS_ID = "10000000-0000-4000-8000-000000000002";
const CLASSIC_ID = "20000000-0000-4000-8000-000000000001";
const EXECUTIVE_ID = "20000000-0000-4000-8000-000000000002";
const STYLING_ID = "20000000-0000-4000-8000-000000000003";
const PREMIUM_ID = "20000000-0000-4000-8000-000000000004";
const FOREIGN_SERVICE_ID = "20000000-0000-4000-8000-000000000005";
const ALEX_ID = "30000000-0000-4000-8000-000000000001";
const FIXED_NOW = new Date("2026-08-27T01:00:00.000Z");
const timestamp = "2026-08-27T00:00:00.000Z";

function state(overrides: Partial<CapabilityState> = {}): CapabilityState {
  return { services: true, staff: true, booking: true, faq: true, gallery: true, reviews: true, ...overrides };
}

function business(id = BUSINESS_ID, slug = "aria-hair"): Business {
  return {
    id,
    slug,
    name: slug === "aria-hair" ? "Aria Hair Studio" : "Other Studio",
    businessType: "service",
    description: "Thoughtful cuts and styling.",
    phone: "+60 3-5555 0148",
    email: "hello@aria.example",
    address: "Bangsar, Kuala Lumpur",
    timezone: "Asia/Kuala_Lumpur",
    heroTitle: null,
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
}

const services: Service[] = [
  [CLASSIC_ID, "Classic Cut", "A polished everyday cut with consultation.", 45, 30, ["casual", "everyday"]],
  [EXECUTIVE_ID, "Executive Cut", "A sharp, professional finish for important days.", 65, 45, ["professional", "interview", "formal"]],
  [STYLING_ID, "Cut + Styling", "A tailored cut finished with event-ready styling.", 75, 60, ["styling", "professional"]],
  [PREMIUM_ID, "Premium Restyle", "A longer consultation and complete change of shape.", 95, 75, ["premium", "restyle"]],
].map(([id, name, description, price, durationMinutes, tags], index) => ({
  id: id as string,
  businessId: BUSINESS_ID,
  name: name as string,
  description: description as string,
  category: "Cuts",
  price: price as number,
  durationMinutes: durationMinutes as number,
  tags: tags as string[],
  active: true,
  sortOrder: index + 1,
}));

services.push({
  ...services[0],
  id: FOREIGN_SERVICE_ID,
  businessId: OTHER_BUSINESS_ID,
  name: "Foreign Service",
});

const alex: Staff = {
  id: ALEX_ID,
  businessId: BUSINESS_ID,
  name: "Alex",
  bio: "Known for precise cuts.",
  imageUrl: null,
  active: true,
  sortOrder: 1,
};

class MemoryAgentRepository implements BusinessRuntimeRepository, BookingRepository {
  businesses = [business(), business(OTHER_BUSINESS_ID, "other-studio")];
  currentCapabilities: BusinessCapabilities = { businessId: BUSINESS_ID, ...state(), updatedAt: timestamp };
  staff = [alex];
  bookings: Booking[] = [];
  rules: AvailabilityRule[] = [{
    id: "40000000-0000-4000-8000-000000000001",
    businessId: BUSINESS_ID,
    staffId: ALEX_ID,
    dayOfWeek: 5,
    startTime: "10:00",
    endTime: "19:00",
    active: true,
  }];

  async findPublishedBusinessBySlug(slug: string) { return this.businesses.find((item) => item.slug === slug && item.status === "published") ?? null; }
  async findBusinessById(id: string) { return this.businesses.find((item) => item.id === id) ?? null; }
  async findCapabilities(businessId: string) {
    if (businessId === BUSINESS_ID) return this.currentCapabilities;
    return { ...this.currentCapabilities, businessId };
  }
  async listServices(businessId: string) { return services.filter((item) => item.businessId === businessId && item.active); }
  async listStaff(businessId: string) { return this.staff.filter((item) => item.businessId === businessId && item.active); }
  async listFaqs(): Promise<FAQ[]> { return []; }
  async listGallery(): Promise<GalleryItem[]> { return []; }
  async listReviews(): Promise<Review[]> { return []; }
  async findService(businessId: string, serviceId: string) { return services.find((item) => item.businessId === businessId && item.id === serviceId) ?? null; }
  async findStaff(businessId: string, staffId: string) { return this.staff.find((item) => item.businessId === businessId && item.id === staffId) ?? null; }
  async listEligibleStaff(businessId: string, serviceId: string) {
    const service = await this.findService(businessId, serviceId);
    return service ? this.staff.filter((item) => item.businessId === businessId && item.active) : [];
  }
  async listAvailabilityRules(businessId: string, staffId: string, selectedDay: number) {
    return this.rules.filter((item) => item.businessId === businessId && item.staffId === staffId && item.dayOfWeek === selectedDay && item.active);
  }
  async listConfirmedBookings(businessId: string, staffId: string, date: string, excludeBookingId?: string) {
    return this.bookings.filter((item) => item.businessId === businessId && item.staffId === staffId && item.bookingDate === date && item.status === "confirmed" && item.id !== excludeBookingId);
  }
  async insertBooking(record: NewBookingRecord) {
    if (this.bookings.some((item) => item.staffId === record.staffId && item.bookingDate === record.bookingDate && item.status === "confirmed" && overlaps(record.startTime, record.endTime, item.startTime, item.endTime))) {
      throw new BookingRepositoryConflictError("slot");
    }
    const created: Booking = { ...record, id: `booking-${this.bookings.length + 1}`, createdAt: timestamp, updatedAt: timestamp };
    this.bookings.push(created);
    return created;
  }
  async findBookingByReference(businessId: string, reference: string) { return this.bookings.find((item) => item.businessId === businessId && item.bookingReference === reference) ?? null; }
  async updateBookingSlot(bookingId: string, businessId: string, patch: Pick<Booking, "staffId" | "bookingDate" | "startTime" | "endTime">) {
    const booking = this.bookings.find((item) => item.id === bookingId && item.businessId === businessId)!;
    Object.assign(booking, patch);
    return booking;
  }
  async cancelBooking(bookingId: string, businessId: string) {
    const booking = this.bookings.find((item) => item.id === bookingId && item.businessId === businessId)!;
    booking.status = "cancelled";
    return booking;
  }
}

describe("WebMCP capability projection", () => {
  it("selects definitions from the exact Phase 3 projection", () => {
    for (const capabilities of [state(), state({ booking: false }), state({ services: false }), state({ staff: false })]) {
      expect(getWebMCPToolDefinitions(capabilities).map((tool) => tool.name)).toEqual(getEnabledAgentToolNames(capabilities));
    }
  });

  it("removes booking registrations instead of leaving disabled mutation tools exposed", () => {
    expect(getWebMCPToolDefinitions(state({ booking: false })).map((tool) => tool.name)).toEqual([
      "get_business_info", "list_services", "get_service_details", "recommend_service", "list_staff",
    ]);
    expect(getWebMCPToolDefinitions(state({ services: false })).map((tool) => tool.name)).toEqual([
      "get_business_info", "list_staff", "cancel_booking",
    ]);
  });
});

describe("WebMCP schemas", () => {
  it("rejects missing contacts, malformed dates/times, and invalid IDs", () => {
    expect(() => parseAgentToolInput("create_booking", { service_id: CLASSIC_ID, staff_id: ALEX_ID, date: "2026-02-30", start_time: "25:00", customer_name: "Nadia" })).toThrow();
    expect(() => parseAgentToolInput("get_service_details", { service_id: "not-an-id" })).toThrow(/service_id/);
    expect(() => parseAgentToolInput("get_available_slots", { service_id: CLASSIC_ID, date: "28-08-2026" })).toThrow(/date/);
  });

  it("accepts the structured primary demo inputs", () => {
    expect(parseAgentToolInput("recommend_service", { occasion: "interview", max_price: 80, date: "2026-08-28", after_time: "18:00", preference: "professional" })).toMatchObject({ maxPrice: 80, afterTime: "18:00" });
  });
});

describe("WebMCP lifecycle", () => {
  it("aborts old registrations, cleans up, and safely detects unsupported documents", async () => {
    const records: Array<{ tool: WebMCPTool; signal?: AbortSignal }> = [];
    const context: WebMCPModelContext = {
      async registerTool(tool, options) { records.push({ tool, signal: options?.signal }); },
    };
    const first = registerBusinessTools(context, "aria-hair", getWebMCPToolDefinitions(state()));
    await first.ready;
    const second = registerBusinessTools(context, "aria-hair", getWebMCPToolDefinitions(state({ booking: false })));
    await second.ready;
    expect(records.slice(0, 9).every((record) => record.signal?.aborted)).toBe(true);
    expect(second.names).toHaveLength(5);
    second.dispose();
    expect(records.slice(9).every((record) => record.signal?.aborted)).toBe(true);
    expect(getWebMCPModelContext({} as Document)).toBeNull();
  });
});

describe("WebMCP server adapters and shared booking state", () => {
  it("returns safe business data and capability-safe service/staff reads", async () => {
    const repository = new MemoryAgentRepository();
    const repositories = { businesses: repository, bookings: repository };
    await expect(executeBusinessAgentTool(repositories, "aria-hair", "get_business_info", {})).resolves.toMatchObject({ success: true, name: "Aria Hair Studio" });
    await expect(executeBusinessAgentTool(repositories, "aria-hair", "list_services", { max_price: 65 })).resolves.toMatchObject({ success: true, services: [{ name: "Classic Cut" }, { name: "Executive Cut" }] });
    await expect(executeBusinessAgentTool(repositories, "aria-hair", "list_staff", { service_id: EXECUTIVE_ID })).resolves.toMatchObject({ success: true, staff: [{ name: "Alex", service_ids: [EXECUTIVE_ID] }] });
    repository.currentCapabilities = { ...repository.currentCapabilities, staff: false };
    await expect(executeBusinessAgentTool(repositories, "aria-hair", "list_staff", {})).resolves.toMatchObject({ success: false, error: "capability_not_enabled" });
  });

  it("prevents cross-business service lookup", async () => {
    const repository = new MemoryAgentRepository();
    await expect(executeBusinessAgentTool({ businesses: repository, bookings: repository }, "aria-hair", "get_service_details", { service_id: FOREIGN_SERVICE_ID })).resolves.toMatchObject({ success: false, error: "service_not_found" });
  });

  it("deterministically recommends Executive Cut for the Aria interview scenario", async () => {
    const repository = new MemoryAgentRepository();
    const result = await executeBusinessAgentTool({ businesses: repository, bookings: repository }, "aria-hair", "recommend_service", {
      occasion: "interview",
      max_price: 80,
      date: "2026-08-28",
      after_time: "18:00",
      preference: "professional",
    }, { now: FIXED_NOW });
    expect(result).toMatchObject({
      success: true,
      recommended_service: { id: EXECUTIVE_ID, name: "Executive Cut", price: 65 },
      matching_staff: [{ id: ALEX_ID }],
      earliest_available_slot: { date: "2026-08-28", time: "18:00", staff_id: ALEX_ID },
    });
  });

  it("uses the shared booking domain for WebMCP create, update, and cancel", async () => {
    const repository = new MemoryAgentRepository();
    const repositories = { businesses: repository, bookings: repository };
    const availability = await executeBusinessAgentTool(repositories, "aria-hair", "get_available_slots", { service_id: EXECUTIVE_ID, date: "2026-08-28", staff_id: ALEX_ID, after_time: "18:00" }, { now: FIXED_NOW });
    expect(availability).toMatchObject({ success: true, options: [{ slots: ["18:00", "18:15"] }] });

    const created = await executeBusinessAgentTool(repositories, "aria-hair", "create_booking", {
      service_id: EXECUTIVE_ID,
      staff_id: ALEX_ID,
      date: "2026-08-28",
      start_time: "18:00",
      customer_name: "Nadia",
      customer_email: "nadia@example.com",
    }, { now: FIXED_NOW });
    expect(created).toMatchObject({ success: true, status: "confirmed", service: { id: EXECUTIVE_ID }, start_time: "18:00" });
    expect(repository.bookings[0]).toMatchObject({ createdVia: "webmcp", status: "confirmed" });
    if (!created.success) throw new Error("Expected WebMCP booking creation to succeed.");
    const reference = String(created.booking_reference);

    const updated = await executeBusinessAgentTool(repositories, "aria-hair", "update_booking", {
      booking_reference: reference,
      customer_email: "nadia@example.com",
      new_start_time: "18:15",
    }, { now: FIXED_NOW });
    expect(updated).toMatchObject({ success: true, start_time: "18:15" });
    expect(repository.bookings[0].startTime).toBe("18:15");

    const cancelled = await executeBusinessAgentTool(repositories, "aria-hair", "cancel_booking", {
      booking_reference: reference,
      customer_email: "nadia@example.com",
    });
    expect(cancelled).toMatchObject({ success: true, status: "cancelled" });
    expect(repository.bookings[0].status).toBe("cancelled");
  });

  it("requires verification and propagates capability denial for mutations", async () => {
    const repository = new MemoryAgentRepository();
    const repositories = { businesses: repository, bookings: repository };
    const created = await executeBusinessAgentTool(repositories, "aria-hair", "create_booking", {
      service_id: CLASSIC_ID, staff_id: ALEX_ID, date: "2026-08-28", start_time: "10:00", customer_name: "Nadia", customer_email: "nadia@example.com",
    }, { now: FIXED_NOW });
    if (!created.success) throw new Error("Expected agent booking creation to succeed.");
    const reference = String(created.booking_reference);
    await expect(executeBusinessAgentTool(repositories, "aria-hair", "cancel_booking", { booking_reference: reference, customer_email: "wrong@example.com" })).resolves.toMatchObject({ success: false, error: "booking_not_found" });
    repository.currentCapabilities = { ...repository.currentCapabilities, booking: false };
    await expect(executeBusinessAgentTool(repositories, "aria-hair", "create_booking", { service_id: CLASSIC_ID, staff_id: ALEX_ID, date: "2026-08-28", start_time: "11:00", customer_name: "Sam", customer_email: "sam@example.com" }, { now: FIXED_NOW })).resolves.toMatchObject({ success: false, error: "capability_not_enabled" });
  });

  it("rejects client-supplied booking provenance", async () => {
    const repository = new MemoryAgentRepository();
    const result = await executeBusinessAgentTool({ businesses: repository, bookings: repository }, "aria-hair", "create_booking", {
      service_id: CLASSIC_ID,
      staff_id: ALEX_ID,
      date: "2026-08-28",
      start_time: "10:00",
      customer_name: "Sam",
      customer_email: "sam@example.com",
      created_via: "website",
      source: "website",
    }, { now: FIXED_NOW });
    expect(result).toMatchObject({ success: false, error: "invalid_input" });
    expect(repository.bookings).toHaveLength(0);
  });
});
