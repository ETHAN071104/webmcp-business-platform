import { describe, expect, it } from "vitest";

import {
  cancelBooking,
  createWebsiteBooking,
  getAvailableSlots,
  getBooking,
  getEligibleStaff,
  getRescheduleSlots,
  updateBooking,
} from "@/features/bookings/service";
import { overlaps } from "@/features/bookings/time";
import {
  BookingError,
  BookingRepositoryConflictError,
  type AvailabilityRule,
  type Booking,
  type BookingRepository,
  type NewBookingRecord,
} from "@/features/bookings/types";
import type { Business, BusinessCapabilities, Service, Staff } from "@/types/business";

const BUSINESS_ID = "business-aria";
const OTHER_BUSINESS_ID = "business-other";
const SERVICE_ID = "service-cut";
const STAFF_ID = "staff-alex";
const MIA_ID = "staff-mia";
const FIXED_NOW = new Date("2026-08-27T01:00:00.000Z"); // 09:00 in Kuala Lumpur.

function business(overrides: Partial<Business> = {}): Business {
  return {
    id: BUSINESS_ID,
    slug: "aria-hair",
    name: "Aria Hair Studio",
    businessType: "service",
    description: null,
    phone: null,
    email: null,
    address: null,
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
    publishedAt: "2026-08-01T00:00:00Z",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

function capabilities(overrides: Partial<BusinessCapabilities> = {}): BusinessCapabilities {
  return {
    businessId: BUSINESS_ID,
    services: true,
    staff: true,
    booking: true,
    faq: false,
    gallery: false,
    reviews: false,
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

const cut: Service = {
  id: SERVICE_ID,
  businessId: BUSINESS_ID,
  name: "Classic Cut",
  description: null,
  category: "Cuts",
  price: 45,
  durationMinutes: 30,
  tags: [],
  active: true,
  sortOrder: 1,
};

const alex: Staff = {
  id: STAFF_ID,
  businessId: BUSINESS_ID,
  name: "Alex",
  bio: null,
  imageUrl: null,
  active: true,
  sortOrder: 1,
};

const mia: Staff = { ...alex, id: MIA_ID, name: "Mia", sortOrder: 2 };

class MemoryBookingRepository implements BookingRepository {
  businesses = [business(), business({ id: OTHER_BUSINESS_ID, slug: "other" })];
  capabilities = [capabilities(), capabilities({ businessId: OTHER_BUSINESS_ID })];
  services = [cut];
  staff = [alex, mia];
  eligible = new Map([[SERVICE_ID, [STAFF_ID]]]);
  rules: AvailabilityRule[] = [{
    id: "rule-1",
    businessId: BUSINESS_ID,
    staffId: STAFF_ID,
    dayOfWeek: 4,
    startTime: "10:00",
    endTime: "19:00",
    active: true,
  }];
  bookings: Booking[] = [];

  async findBusinessById(id: string) { return this.businesses.find((item) => item.id === id) ?? null; }
  async findPublishedBusinessBySlug(slug: string) { return this.businesses.find((item) => item.slug === slug && item.status === "published") ?? null; }
  async findCapabilities(businessId: string) { return this.capabilities.find((item) => item.businessId === businessId) ?? null; }
  async findService(businessId: string, serviceId: string) { return this.services.find((item) => item.businessId === businessId && item.id === serviceId) ?? null; }
  async findStaff(businessId: string, staffId: string) { return this.staff.find((item) => item.businessId === businessId && item.id === staffId) ?? null; }
  async listEligibleStaff(businessId: string, serviceId: string) {
    const ids = this.eligible.get(serviceId) ?? [];
    return this.staff.filter((item) => item.businessId === businessId && item.active && ids.includes(item.id));
  }
  async listAvailabilityRules(businessId: string, staffId: string, selectedDay: number) {
    return this.rules.filter((item) => item.businessId === businessId && item.staffId === staffId && item.dayOfWeek === selectedDay && item.active);
  }
  async listConfirmedBookings(businessId: string, staffId: string, date: string, excludeBookingId?: string) {
    return this.bookings.filter((item) => item.businessId === businessId && item.staffId === staffId && item.bookingDate === date && item.status === "confirmed" && item.id !== excludeBookingId);
  }
  async insertBooking(record: NewBookingRecord) {
    if (this.bookings.some((item) => item.bookingReference === record.bookingReference)) throw new BookingRepositoryConflictError("reference");
    if (this.bookings.some((item) => item.staffId === record.staffId && item.bookingDate === record.bookingDate && item.status === "confirmed" && overlaps(record.startTime, record.endTime, item.startTime, item.endTime))) {
      throw new BookingRepositoryConflictError("slot");
    }
    const created = { ...record, id: `booking-${this.bookings.length + 1}`, createdAt: "2026-08-27T01:00:00Z", updatedAt: "2026-08-27T01:00:00Z" };
    this.bookings.push(created);
    return created;
  }
  async findBookingByReference(businessId: string, reference: string) { return this.bookings.find((item) => item.businessId === businessId && item.bookingReference === reference) ?? null; }
  async updateBookingSlot(bookingId: string, businessId: string, patch: Pick<Booking, "staffId" | "bookingDate" | "startTime" | "endTime">) {
    const booking = this.bookings.find((item) => item.id === bookingId && item.businessId === businessId);
    if (!booking) throw new Error("Missing booking");
    if (this.bookings.some((item) => item.id !== bookingId && item.staffId === patch.staffId && item.bookingDate === patch.bookingDate && item.status === "confirmed" && overlaps(patch.startTime, patch.endTime, item.startTime, item.endTime))) {
      throw new BookingRepositoryConflictError("slot");
    }
    Object.assign(booking, patch);
    return booking;
  }
  async cancelBooking(bookingId: string, businessId: string) {
    const booking = this.bookings.find((item) => item.id === bookingId && item.businessId === businessId);
    if (!booking) throw new Error("Missing booking");
    booking.status = "cancelled";
    return booking;
  }
}

function existingBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-existing",
    businessId: BUSINESS_ID,
    serviceId: SERVICE_ID,
    staffId: STAFF_ID,
    customerName: "Sam",
    customerEmail: "sam@example.com",
    customerPhone: "+60 12 345 6789",
    bookingDate: "2026-08-27",
    startTime: "11:00",
    endTime: "11:30",
    status: "confirmed",
    bookingReference: "ARIA-EXIST1",
    createdVia: "website",
    createdAt: "2026-08-20T00:00:00Z",
    updatedAt: "2026-08-20T00:00:00Z",
    ...overrides,
  };
}

describe("booking feature layer", () => {
  it("generates 15-minute slots inside rules and removes overlapping confirmed bookings", async () => {
    const repository = new MemoryBookingRepository();
    repository.bookings.push(existingBooking());
    const slots = await getAvailableSlots(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", audience: "public", now: FIXED_NOW });
    expect(slots[0]).toEqual({ startTime: "10:00", endTime: "10:30" });
    expect(slots.some((slot) => slot.startTime === "10:45")).toBe(false);
    expect(slots.some((slot) => slot.startTime === "11:00")).toBe(false);
    expect(slots.some((slot) => slot.startTime === "11:15")).toBe(false);
    expect(slots.at(-1)).toEqual({ startTime: "18:30", endTime: "19:00" });
  });

  it("ignores cancelled bookings when calculating availability", async () => {
    const repository = new MemoryBookingRepository();
    repository.bookings.push(existingBooking({ status: "cancelled" }));
    const slots = await getAvailableSlots(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", audience: "public", now: FIXED_NOW });
    expect(slots.some((slot) => slot.startTime === "11:00")).toBe(true);
  });

  it("returns only staff assigned to the selected service", async () => {
    const repository = new MemoryBookingRepository();
    const result = await getEligibleStaff(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, audience: "public" });
    expect(result.map((person) => person.name)).toEqual(["Alex"]);
    await expect(getAvailableSlots(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: MIA_ID, date: "2026-08-27", audience: "public", now: FIXED_NOW })).rejects.toMatchObject({ code: "STAFF_NOT_ELIGIBLE" });
  });

  it("rejects dates outside the business-local 30-day window", async () => {
    const repository = new MemoryBookingRepository();
    await expect(getAvailableSlots(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-26", audience: "public", now: FIXED_NOW })).rejects.toMatchObject({ code: "INVALID_DATE" });
    await expect(getAvailableSlots(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-09-27", audience: "public", now: FIXED_NOW })).rejects.toMatchObject({ code: "INVALID_DATE" });
  });

  it("enforces booking capability on every operation", async () => {
    const repository = new MemoryBookingRepository();
    repository.bookings.push(existingBooking());
    repository.capabilities[0] = capabilities({ booking: false });
    await expect(getAvailableSlots(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", audience: "public", now: FIXED_NOW })).rejects.toMatchObject({ code: "capability_not_enabled" });
    await expect(createWebsiteBooking(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", startTime: "10:00", customerName: "Nadia", customerEmail: "nadia@example.com", audience: "public", now: FIXED_NOW })).rejects.toMatchObject({ code: "capability_not_enabled" });
    await expect(updateBooking(repository, { businessId: BUSINESS_ID, reference: "ARIA-EXIST1", verification: "sam@example.com", staffId: STAFF_ID, date: "2026-08-27", startTime: "12:00", audience: "public", now: FIXED_NOW })).rejects.toMatchObject({ code: "capability_not_enabled" });
    await expect(cancelBooking(repository, { businessId: BUSINESS_ID, reference: "ARIA-EXIST1", verification: "sam@example.com", audience: "public" })).rejects.toMatchObject({ code: "capability_not_enabled" });
    await expect(getBooking(repository, { businessId: BUSINESS_ID, reference: "ARIA-NOPE00", verification: "x@example.com", audience: "public" })).rejects.toMatchObject({ code: "capability_not_enabled" });
  });

  it("rejects booking creation when configured booking lacks service or staff dependencies", async () => {
    const repository = new MemoryBookingRepository();
    const input = { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", startTime: "10:00", customerName: "Nadia", customerEmail: "nadia@example.com", audience: "public" as const, now: FIXED_NOW };
    repository.capabilities[0] = capabilities({ booking: true, services: false, staff: true });
    await expect(createWebsiteBooking(repository, input)).rejects.toMatchObject({ code: "capability_not_enabled" });
    repository.capabilities[0] = capabilities({ booking: true, services: true, staff: false });
    await expect(createWebsiteBooking(repository, input)).rejects.toMatchObject({ code: "capability_not_enabled" });
  });

  it("proves booking ON → OFF → ON across the real feature operations", async () => {
    const repository = new MemoryBookingRepository();
    repository.bookings.push(existingBooking());
    const slotsInput = { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", audience: "public" as const, now: FIXED_NOW };
    const createInput = { ...slotsInput, startTime: "10:00", customerName: "Nadia", customerEmail: "nadia@example.com" };
    const verifiedInput = { businessId: BUSINESS_ID, reference: "ARIA-EXIST1", verification: "sam@example.com", audience: "public" as const };

    await expect(getAvailableSlots(repository, slotsInput)).resolves.toContainEqual({ startTime: "10:00", endTime: "10:30" });

    repository.capabilities[0] = capabilities({ booking: false });
    await expect(getAvailableSlots(repository, slotsInput)).rejects.toMatchObject({ code: "capability_not_enabled" });
    await expect(createWebsiteBooking(repository, createInput)).rejects.toMatchObject({ code: "capability_not_enabled" });
    await expect(updateBooking(repository, { ...verifiedInput, staffId: STAFF_ID, date: "2026-08-27", startTime: "12:00", now: FIXED_NOW })).rejects.toMatchObject({ code: "capability_not_enabled" });
    await expect(cancelBooking(repository, verifiedInput)).rejects.toMatchObject({ code: "capability_not_enabled" });

    repository.capabilities[0] = capabilities({ booking: true });
    await expect(getAvailableSlots(repository, slotsInput)).resolves.toContainEqual({ startTime: "10:00", endTime: "10:30" });
    await expect(cancelBooking(repository, verifiedInput)).resolves.toMatchObject({ status: "cancelled" });
  });

  it("blocks public operations for draft businesses", async () => {
    const repository = new MemoryBookingRepository();
    repository.businesses[0] = business({ status: "draft" });
    await expect(getAvailableSlots(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", audience: "public", now: FIXED_NOW })).rejects.toMatchObject({ code: "BUSINESS_NOT_PUBLISHED" });
  });

  it("creates a website booking with a human-friendly reference and validated end time", async () => {
    const repository = new MemoryBookingRepository();
    const result = await createWebsiteBooking(repository, {
      businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", startTime: "10:15", customerName: "Nadia", customerEmail: "nadia@example.com", audience: "public", now: FIXED_NOW,
    }, () => "ARIA-BOOK01");
    expect(result.reference).toBe("ARIA-BOOK01");
    expect(result.endTime).toBe("10:45");
    expect(repository.bookings[0]).toMatchObject({ createdVia: "website", status: "confirmed" });
  });

  it("keeps website provenance server-controlled when source fields are supplied", async () => {
    const repository = new MemoryBookingRepository();
    const input = {
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      staffId: STAFF_ID,
      date: "2026-08-27",
      startTime: "10:15",
      customerName: "Nadia",
      customerEmail: "nadia@example.com",
      audience: "public" as const,
      now: FIXED_NOW,
      created_via: "webmcp",
      source: "webmcp",
    } as unknown as Parameters<typeof createWebsiteBooking>[1];
    await createWebsiteBooking(repository, input, () => "ARIA-SOURCE01");
    expect(repository.bookings[0]).toMatchObject({ createdVia: "website" });
  });

  it("rejects a stale slot when a concurrent insert wins", async () => {
    const repository = new MemoryBookingRepository();
    const originalInsert = repository.insertBooking.bind(repository);
    repository.insertBooking = async (record) => {
      repository.bookings.push(existingBooking({ startTime: record.startTime, endTime: record.endTime }));
      return originalInsert(record);
    };
    await expect(createWebsiteBooking(repository, {
      businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", startTime: "10:15", customerName: "Nadia", customerEmail: "nadia@example.com", audience: "public", now: FIXED_NOW,
    }, () => "ARIA-RACE01")).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("looks up only by business, reference, and matching email or normalized phone", async () => {
    const repository = new MemoryBookingRepository();
    repository.bookings.push(existingBooking());
    await expect(getBooking(repository, { businessId: BUSINESS_ID, reference: "aria-exist1", verification: "SAM@example.com", audience: "public" })).resolves.toMatchObject({ reference: "ARIA-EXIST1" });
    await expect(getBooking(repository, { businessId: BUSINESS_ID, reference: "ARIA-EXIST1", verification: "+60 (12) 345-6789", audience: "public" })).resolves.toMatchObject({ staff: { name: "Alex" } });
    await expect(getBooking(repository, { businessId: OTHER_BUSINESS_ID, reference: "ARIA-EXIST1", verification: "sam@example.com", audience: "public" })).rejects.toMatchObject({ code: "BOOKING_NOT_FOUND" });
  });

  it("updates date, time, and eligible staff while excluding the booking itself", async () => {
    const repository = new MemoryBookingRepository();
    repository.bookings.push(existingBooking());
    const updated = await updateBooking(repository, { businessId: BUSINESS_ID, reference: "ARIA-EXIST1", verification: "sam@example.com", staffId: STAFF_ID, date: "2026-08-27", startTime: "11:15", audience: "public", now: FIXED_NOW });
    expect(updated).toMatchObject({ startTime: "11:15", endTime: "11:45", service: { id: SERVICE_ID } });
  });

  it("returns the current slot during a verified reschedule search", async () => {
    const repository = new MemoryBookingRepository();
    repository.bookings.push(existingBooking());
    const slots = await getRescheduleSlots(repository, { businessId: BUSINESS_ID, reference: "ARIA-EXIST1", verification: "sam@example.com", staffId: STAFF_ID, date: "2026-08-27", audience: "public", now: FIXED_NOW });
    expect(slots.some((slot) => slot.startTime === "11:00")).toBe(true);
  });

  it("cancels idempotently and releases the slot", async () => {
    const repository = new MemoryBookingRepository();
    repository.bookings.push(existingBooking());
    const input = { businessId: BUSINESS_ID, reference: "ARIA-EXIST1", verification: "sam@example.com", audience: "public" as const };
    await expect(cancelBooking(repository, input)).resolves.toMatchObject({ status: "cancelled" });
    await expect(cancelBooking(repository, input)).resolves.toMatchObject({ status: "cancelled" });
    const slots = await getAvailableSlots(repository, { businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", audience: "public", now: FIXED_NOW });
    expect(slots.some((slot) => slot.startTime === "11:00")).toBe(true);
  });

  it("requires a customer contact method", async () => {
    const repository = new MemoryBookingRepository();
    await expect(createWebsiteBooking(repository, {
      businessId: BUSINESS_ID, serviceId: SERVICE_ID, staffId: STAFF_ID, date: "2026-08-27", startTime: "10:00", customerName: "Nadia", audience: "public", now: FIXED_NOW,
    })).rejects.toBeInstanceOf(BookingError);
  });
});
