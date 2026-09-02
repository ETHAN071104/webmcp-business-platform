import type { Business, BusinessCapabilities, Service, Staff } from "@/types/business";

export type BookingStatus = "confirmed" | "cancelled";
export type BookingCreatedVia = "website" | "webmcp";
export type BookingAudience = "public" | "trusted";

export type AvailabilityRule = {
  id: string;
  businessId: string;
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type Booking = {
  id: string;
  businessId: string;
  serviceId: string;
  staffId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  bookingReference: string;
  createdVia: BookingCreatedVia;
  createdAt: string;
  updatedAt: string;
};

export type BookingSlot = {
  startTime: string;
  endTime: string;
};

export type BookingPublicDetails = {
  reference: string;
  status: BookingStatus;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  service: { id: string; name: string; durationMinutes: number };
  staff: { id: string; name: string };
};

export type NewBookingRecord = Omit<Booking, "id" | "createdAt" | "updatedAt">;

export interface BookingRepository {
  findBusinessById(id: string): Promise<Business | null>;
  findPublishedBusinessBySlug(slug: string): Promise<Business | null>;
  findCapabilities(businessId: string): Promise<BusinessCapabilities | null>;
  findService(businessId: string, serviceId: string): Promise<Service | null>;
  findStaff(businessId: string, staffId: string): Promise<Staff | null>;
  listEligibleStaff(businessId: string, serviceId: string): Promise<Staff[]>;
  listAvailabilityRules(
    businessId: string,
    staffId: string,
    dayOfWeek: number,
  ): Promise<AvailabilityRule[]>;
  listConfirmedBookings(
    businessId: string,
    staffId: string,
    date: string,
    excludeBookingId?: string,
  ): Promise<Booking[]>;
  insertBooking(record: NewBookingRecord): Promise<Booking>;
  findBookingByReference(businessId: string, reference: string): Promise<Booking | null>;
  updateBookingSlot(
    bookingId: string,
    businessId: string,
    patch: Pick<Booking, "staffId" | "bookingDate" | "startTime" | "endTime">,
  ): Promise<Booking>;
  cancelBooking(bookingId: string, businessId: string): Promise<Booking>;
}

export type BookingErrorCode =
  | "capability_not_enabled"
  | "BUSINESS_NOT_FOUND"
  | "BUSINESS_NOT_PUBLISHED"
  | "INVALID_INPUT"
  | "INVALID_DATE"
  | "SERVICE_NOT_FOUND"
  | "STAFF_NOT_ELIGIBLE"
  | "SLOT_UNAVAILABLE"
  | "BOOKING_NOT_FOUND";

export class BookingError extends Error {
  constructor(
    readonly code: BookingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export class BookingRepositoryConflictError extends Error {
  constructor(readonly kind: "slot" | "reference") {
    super(kind === "slot" ? "Booking slot conflicts with an existing booking." : "Booking reference already exists.");
    this.name = "BookingRepositoryConflictError";
  }
}
