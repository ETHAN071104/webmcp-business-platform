import {
  CapabilityOperationDisabledError,
  type BackendOperationName,
} from "@/features/capabilities/capabilities";
import { requireOperation } from "@/features/capabilities/require-capability";
import {
  addDays,
  dayOfWeek,
  isDateWithinBookingWindow,
  localDateInTimeZone,
  localTimeInTimeZone,
  minutesToTime,
  normalizeTime,
  overlaps,
  timeToMinutes,
} from "@/features/bookings/time";
import {
  BookingError,
  BookingRepositoryConflictError,
  type Booking,
  type BookingAudience,
  type BookingCreatedVia,
  type BookingPublicDetails,
  type BookingRepository,
  type BookingSlot,
} from "@/features/bookings/types";

const DEFAULT_TIME_ZONE = "UTC";
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OperationContext = {
  repository: BookingRepository;
  businessId: string;
  audience: BookingAudience;
  operation: BackendOperationName;
};

async function requireBookingBusiness({ repository, businessId, audience, operation }: OperationContext) {
  const business = await repository.findBusinessById(businessId);
  if (!business) throw new BookingError("BUSINESS_NOT_FOUND", "Business not found.");
  if (audience === "public" && business.status !== "published") {
    throw new BookingError("BUSINESS_NOT_PUBLISHED", "This booking page is not available.");
  }

  try {
    await requireOperation(repository, businessId, operation);
  } catch (error) {
    if (error instanceof CapabilityOperationDisabledError) {
      throw new BookingError("capability_not_enabled", "This booking operation is not available for this business.");
    }
    throw error;
  }
  return business;
}

function clean(value: string | null | undefined): string | null {
  const result = value?.trim() ?? "";
  return result || null;
}

function normalizeContact(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : trimmed.replace(/[^0-9+]/g, "");
}

function verifyContact(booking: Booking, verification: string): boolean {
  const candidate = normalizeContact(verification);
  return [booking.customerEmail, booking.customerPhone]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeContact(value) === candidate);
}

function safeDetails(booking: Booking, serviceName: string, durationMinutes: number, staffName: string): BookingPublicDetails {
  return {
    reference: booking.bookingReference,
    status: booking.status,
    date: booking.bookingDate,
    startTime: normalizeTime(booking.startTime),
    endTime: normalizeTime(booking.endTime),
    customerName: booking.customerName,
    service: { id: booking.serviceId, name: serviceName, durationMinutes },
    staff: { id: booking.staffId, name: staffName },
  };
}

async function hydrateSafeDetails(repository: BookingRepository, booking: Booking): Promise<BookingPublicDetails> {
  const [service, staff] = await Promise.all([
    repository.findService(booking.businessId, booking.serviceId),
    repository.findStaff(booking.businessId, booking.staffId),
  ]);
  if (!service || !staff) throw new BookingError("BOOKING_NOT_FOUND", "Booking not found.");
  return safeDetails(booking, service.name, service.durationMinutes, staff.name);
}

export function generateBookingReference(businessSlug: string): string {
  const prefix = businessSlug.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X");
  const random = new Uint32Array(6);
  crypto.getRandomValues(random);
  const suffix = Array.from(random, (value) => REFERENCE_ALPHABET[value % REFERENCE_ALPHABET.length]).join("");
  return `${prefix}-${suffix}`;
}

export async function getEligibleStaff(
  repository: BookingRepository,
  input: { businessId: string; serviceId: string; audience: BookingAudience },
) {
  await requireBookingBusiness({ repository, businessId: input.businessId, audience: input.audience, operation: "get_available_slots" });
  const service = await repository.findService(input.businessId, input.serviceId);
  if (!service?.active) throw new BookingError("SERVICE_NOT_FOUND", "Service not found.");
  return repository.listEligibleStaff(input.businessId, input.serviceId);
}

export async function getAvailableSlots(
  repository: BookingRepository,
  input: {
    businessId: string;
    serviceId: string;
    staffId: string;
    date: string;
    audience: BookingAudience;
    excludeBookingId?: string;
    now?: Date;
  },
): Promise<BookingSlot[]> {
  const business = await requireBookingBusiness({
    repository,
    businessId: input.businessId,
    audience: input.audience,
    operation: "get_available_slots",
  });
  const now = input.now ?? new Date();
  const timeZone = business.timezone || DEFAULT_TIME_ZONE;
  if (!isDateWithinBookingWindow(input.date, timeZone, now)) {
    throw new BookingError("INVALID_DATE", "Choose a date from today through the next 30 days.");
  }

  const [service, staff, eligibleStaff] = await Promise.all([
    repository.findService(input.businessId, input.serviceId),
    repository.findStaff(input.businessId, input.staffId),
    repository.listEligibleStaff(input.businessId, input.serviceId),
  ]);
  if (!service?.active) throw new BookingError("SERVICE_NOT_FOUND", "Service not found.");
  if (!staff?.active || !eligibleStaff.some((candidate) => candidate.id === staff.id)) {
    throw new BookingError("STAFF_NOT_ELIGIBLE", "That team member does not offer this service.");
  }

  const [rules, existing] = await Promise.all([
    repository.listAvailabilityRules(input.businessId, input.staffId, dayOfWeek(input.date)),
    repository.listConfirmedBookings(input.businessId, input.staffId, input.date, input.excludeBookingId),
  ]);
  const today = localDateInTimeZone(now, timeZone);
  const currentTime = input.date === today ? timeToMinutes(localTimeInTimeZone(now, timeZone)) : -1;
  const starts = new Map<number, BookingSlot>();

  for (const rule of rules.filter((candidate) => candidate.active)) {
    const opening = timeToMinutes(rule.startTime);
    const closing = timeToMinutes(rule.endTime);
    for (let start = opening; start + service.durationMinutes <= closing; start += 15) {
      if (start <= currentTime) continue;
      const startTime = minutesToTime(start);
      const endTime = minutesToTime(start + service.durationMinutes);
      if (existing.some((booking) => overlaps(startTime, endTime, booking.startTime, booking.endTime))) continue;
      starts.set(start, { startTime, endTime });
    }
  }
  return [...starts.entries()].sort(([left], [right]) => left - right).map(([, slot]) => slot);
}

type BookingCreationInput = {
  businessId: string;
  serviceId: string;
  staffId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  audience: BookingAudience;
  now?: Date;
};

async function createBookingWithSource(
  repository: BookingRepository,
  input: BookingCreationInput & { createdVia: BookingCreatedVia },
  referenceFactory: (slug: string) => string = generateBookingReference,
): Promise<BookingPublicDetails> {
  const business = await requireBookingBusiness({ repository, businessId: input.businessId, audience: input.audience, operation: "create_booking" });
  const customerName = clean(input.customerName);
  const customerEmail = clean(input.customerEmail);
  const customerPhone = clean(input.customerPhone);
  if (
    !customerName ||
    (!customerEmail && !customerPhone) ||
    customerName.length > 120 ||
    (customerEmail !== null && (customerEmail.length > 254 || !EMAIL_PATTERN.test(customerEmail))) ||
    (customerPhone !== null && (customerPhone.length < 7 || customerPhone.length > 40))
  ) {
    throw new BookingError("INVALID_INPUT", "Enter your name and an email address or phone number.");
  }
  const requestedStart = normalizeTime(input.startTime);
  const slots = await getAvailableSlots(repository, { ...input, now: input.now });
  const selected = slots.find((slot) => slot.startTime === requestedStart);
  if (!selected) throw new BookingError("SLOT_UNAVAILABLE", "That time is no longer available. Choose another slot.");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const booking = await repository.insertBooking({
        businessId: input.businessId,
        serviceId: input.serviceId,
        staffId: input.staffId,
        customerName,
        customerEmail,
        customerPhone,
        bookingDate: input.date,
        startTime: selected.startTime,
        endTime: selected.endTime,
        status: "confirmed",
        bookingReference: referenceFactory(business.slug),
        createdVia: input.createdVia,
      });
      return hydrateSafeDetails(repository, booking);
    } catch (error) {
      if (error instanceof BookingRepositoryConflictError && error.kind === "reference") continue;
      if (error instanceof BookingRepositoryConflictError && error.kind === "slot") {
        throw new BookingError("SLOT_UNAVAILABLE", "That time was just booked. Choose another slot.");
      }
      throw error;
    }
  }
  throw new BookingError("INVALID_INPUT", "Could not generate a booking reference. Please try again.");
}

export function createWebsiteBooking(
  repository: BookingRepository,
  input: BookingCreationInput,
  referenceFactory?: (slug: string) => string,
): Promise<BookingPublicDetails> {
  return createBookingWithSource(repository, { ...input, createdVia: "website" }, referenceFactory);
}

export function createWebMCPBooking(
  repository: BookingRepository,
  input: BookingCreationInput,
  referenceFactory?: (slug: string) => string,
): Promise<BookingPublicDetails> {
  return createBookingWithSource(repository, { ...input, createdVia: "webmcp" }, referenceFactory);
}

export async function getBooking(
  repository: BookingRepository,
  input: { businessId: string; reference: string; verification: string; audience: BookingAudience },
): Promise<BookingPublicDetails> {
  await requireBookingBusiness({ repository, businessId: input.businessId, audience: input.audience, operation: "get_booking" });
  const booking = await repository.findBookingByReference(input.businessId, input.reference.trim().toUpperCase());
  if (!booking || !verifyContact(booking, input.verification)) {
    throw new BookingError("BOOKING_NOT_FOUND", "We could not find a booking with those details.");
  }
  return hydrateSafeDetails(repository, booking);
}

async function requireVerifiedBooking(
  repository: BookingRepository,
  input: { businessId: string; reference: string; verification: string; audience: BookingAudience },
  operation: BackendOperationName,
): Promise<Booking> {
  await requireBookingBusiness({ repository, businessId: input.businessId, audience: input.audience, operation });
  const booking = await repository.findBookingByReference(input.businessId, input.reference.trim().toUpperCase());
  if (!booking || !verifyContact(booking, input.verification)) {
    throw new BookingError("BOOKING_NOT_FOUND", "We could not find a booking with those details.");
  }
  return booking;
}

export async function getRescheduleSlots(
  repository: BookingRepository,
  input: {
    businessId: string;
    reference: string;
    verification: string;
    staffId: string;
    date: string;
    audience: BookingAudience;
    now?: Date;
  },
): Promise<BookingSlot[]> {
  const booking = await requireVerifiedBooking(repository, input, "get_reschedule_slots");
  if (booking.status === "cancelled") throw new BookingError("BOOKING_NOT_FOUND", "Cancelled bookings cannot be changed.");
  return getAvailableSlots(repository, {
    businessId: input.businessId,
    serviceId: booking.serviceId,
    staffId: input.staffId,
    date: input.date,
    audience: input.audience,
    excludeBookingId: booking.id,
    now: input.now,
  });
}

export async function updateBooking(
  repository: BookingRepository,
  input: {
    businessId: string;
    reference: string;
    verification: string;
    staffId: string;
    date: string;
    startTime: string;
    audience: BookingAudience;
    now?: Date;
  },
): Promise<BookingPublicDetails> {
  const booking = await requireVerifiedBooking(repository, input, "update_booking");
  if (booking.status === "cancelled") throw new BookingError("BOOKING_NOT_FOUND", "Cancelled bookings cannot be changed.");
  const requestedStart = normalizeTime(input.startTime);
  const slots = await getAvailableSlots(repository, {
    businessId: input.businessId,
    serviceId: booking.serviceId,
    staffId: input.staffId,
    date: input.date,
    audience: input.audience,
    excludeBookingId: booking.id,
    now: input.now,
  });
  const selected = slots.find((slot) => slot.startTime === requestedStart);
  if (!selected) throw new BookingError("SLOT_UNAVAILABLE", "That time is no longer available. Choose another slot.");
  try {
    const updated = await repository.updateBookingSlot(booking.id, input.businessId, {
      staffId: input.staffId,
      bookingDate: input.date,
      startTime: selected.startTime,
      endTime: selected.endTime,
    });
    return hydrateSafeDetails(repository, updated);
  } catch (error) {
    if (error instanceof BookingRepositoryConflictError && error.kind === "slot") {
      throw new BookingError("SLOT_UNAVAILABLE", "That time was just booked. Choose another slot.");
    }
    throw error;
  }
}

export async function cancelBooking(
  repository: BookingRepository,
  input: { businessId: string; reference: string; verification: string; audience: BookingAudience },
): Promise<BookingPublicDetails> {
  const booking = await requireVerifiedBooking(repository, input, "cancel_booking");
  const cancelled = booking.status === "cancelled" ? booking : await repository.cancelBooking(booking.id, input.businessId);
  return hydrateSafeDetails(repository, cancelled);
}

export function bookingDateBounds(timeZone: string | null, now = new Date()) {
  const minimum = localDateInTimeZone(now, timeZone || DEFAULT_TIME_ZONE);
  return { minimum, maximum: addDays(minimum, 30) };
}
