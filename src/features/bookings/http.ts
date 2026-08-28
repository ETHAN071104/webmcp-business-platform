import "server-only";

import { BookingError } from "@/features/bookings/types";

const STATUS_BY_CODE: Record<BookingError["code"], number> = {
  capability_not_enabled: 404,
  BUSINESS_NOT_FOUND: 404,
  BUSINESS_NOT_PUBLISHED: 404,
  INVALID_INPUT: 400,
  INVALID_DATE: 400,
  SERVICE_NOT_FOUND: 404,
  STAFF_NOT_ELIGIBLE: 400,
  SLOT_UNAVAILABLE: 409,
  BOOKING_NOT_FOUND: 404,
};

export function bookingErrorResponse(error: unknown): Response {
  if (error instanceof BookingError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: STATUS_BY_CODE[error.code] },
    );
  }
  console.error("Booking request failed", error);
  return Response.json(
    { ok: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new BookingError("INVALID_INPUT", "Send a JSON request.");
  const data: unknown = await request.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new BookingError("INVALID_INPUT", "Invalid request body.");
  }
  return data as Record<string, unknown>;
}

export function requiredString(data: Record<string, unknown>, field: string): string {
  const value = data[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new BookingError("INVALID_INPUT", `Missing ${field}.`);
  }
  return value;
}

export function optionalString(data: Record<string, unknown>, field: string): string | null {
  const value = data[field];
  return typeof value === "string" ? value : null;
}
