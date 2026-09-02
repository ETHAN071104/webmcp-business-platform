import {
  createWebsiteBooking,
  getAvailableSlots,
  getEligibleStaff,
} from "@/features/bookings/service";
import {
  bookingErrorResponse,
  optionalString,
  readJsonObject,
  requiredString,
} from "@/features/bookings/http";
import { createSupabaseBookingRepository } from "@/features/bookings/supabase-repository";
import { BookingError } from "@/features/bookings/types";

type Context = { params: Promise<{ slug: string }> };

async function publicBusiness(repository: ReturnType<typeof createSupabaseBookingRepository>, slug: string) {
  const business = await repository.findPublishedBusinessBySlug(slug);
  if (!business) throw new BookingError("BUSINESS_NOT_FOUND", "Booking page not found.");
  return business;
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const repository = createSupabaseBookingRepository();
    const business = await publicBusiness(repository, slug);
    const url = new URL(request.url);
    const serviceId = url.searchParams.get("serviceId") ?? "";
    const staffId = url.searchParams.get("staffId");
    const date = url.searchParams.get("date");
    if (!serviceId) throw new BookingError("INVALID_INPUT", "Choose a service.");

    if (!staffId && !date) {
      const staff = await getEligibleStaff(repository, { businessId: business.id, serviceId, audience: "public" });
      return Response.json({ ok: true, staff: staff.map(({ id, name, imageUrl }) => ({ id, name, imageUrl })) });
    }
    if (!staffId || !date) throw new BookingError("INVALID_INPUT", "Choose a staff member and date.");
    const slots = await getAvailableSlots(repository, {
      businessId: business.id,
      serviceId,
      staffId,
      date,
      audience: "public",
    });
    return Response.json({ ok: true, slots });
  } catch (error) {
    return bookingErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const repository = createSupabaseBookingRepository();
    const business = await publicBusiness(repository, slug);
    const data = await readJsonObject(request);
    const booking = await createWebsiteBooking(repository, {
      businessId: business.id,
      serviceId: requiredString(data, "serviceId"),
      staffId: requiredString(data, "staffId"),
      date: requiredString(data, "date"),
      startTime: requiredString(data, "startTime"),
      customerName: requiredString(data, "customerName"),
      customerEmail: optionalString(data, "customerEmail"),
      customerPhone: optionalString(data, "customerPhone"),
      audience: "public",
    });
    return Response.json({ ok: true, booking }, { status: 201 });
  } catch (error) {
    return bookingErrorResponse(error);
  }
}
