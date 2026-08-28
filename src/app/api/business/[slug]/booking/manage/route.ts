import {
  cancelBooking,
  getBooking,
  getRescheduleSlots,
  updateBooking,
} from "@/features/bookings/service";
import {
  bookingErrorResponse,
  readJsonObject,
  requiredString,
} from "@/features/bookings/http";
import { createSupabaseBookingRepository } from "@/features/bookings/supabase-repository";
import { BookingError } from "@/features/bookings/types";

type Context = { params: Promise<{ slug: string }> };

async function contextFor(slug: string) {
  const repository = createSupabaseBookingRepository();
  const business = await repository.findPublishedBusinessBySlug(slug);
  if (!business) throw new BookingError("BUSINESS_NOT_FOUND", "Booking page not found.");
  return { repository, business };
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const { repository, business } = await contextFor(slug);
    const data = await readJsonObject(request);
    const booking = await getBooking(repository, {
      businessId: business.id,
      reference: requiredString(data, "reference"),
      verification: requiredString(data, "verification"),
      audience: "public",
    });
    return Response.json({ ok: true, booking });
  } catch (error) {
    return bookingErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const { repository, business } = await contextFor(slug);
    const data = await readJsonObject(request);
    const booking = await updateBooking(repository, {
      businessId: business.id,
      reference: requiredString(data, "reference"),
      verification: requiredString(data, "verification"),
      staffId: requiredString(data, "staffId"),
      date: requiredString(data, "date"),
      startTime: requiredString(data, "startTime"),
      audience: "public",
    });
    return Response.json({ ok: true, booking });
  } catch (error) {
    return bookingErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const { repository, business } = await contextFor(slug);
    const data = await readJsonObject(request);
    const slots = await getRescheduleSlots(repository, {
      businessId: business.id,
      reference: requiredString(data, "reference"),
      verification: requiredString(data, "verification"),
      staffId: requiredString(data, "staffId"),
      date: requiredString(data, "date"),
      audience: "public",
    });
    return Response.json({ ok: true, slots });
  } catch (error) {
    return bookingErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const { repository, business } = await contextFor(slug);
    const data = await readJsonObject(request);
    const booking = await cancelBooking(repository, {
      businessId: business.id,
      reference: requiredString(data, "reference"),
      verification: requiredString(data, "verification"),
      audience: "public",
    });
    return Response.json({ ok: true, booking });
  } catch (error) {
    return bookingErrorResponse(error);
  }
}
