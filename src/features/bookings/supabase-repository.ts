import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  toBusiness,
  toCapabilities,
  toService,
  toStaff,
} from "@/features/businesses/supabase-repository";
import {
  BookingRepositoryConflictError,
  type AvailabilityRule,
  type Booking,
  type BookingRepository,
  type NewBookingRecord,
} from "@/features/bookings/types";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type {
  AvailabilityRuleRow,
  BookingRow,
  BusinessCapabilitiesRow,
  BusinessRow,
  ServiceRow,
  StaffRow,
} from "@/types/database";

type SupabaseError = { message: string; code?: string } | null;

function queryFailed(context: string, error: SupabaseError): never {
  if (error?.code === "23P01") throw new BookingRepositoryConflictError("slot");
  if (error?.code === "23505") throw new BookingRepositoryConflictError("reference");
  throw new Error(`${context}: ${error?.message ?? "Unknown Supabase error"}`);
}

function toAvailabilityRule(row: AvailabilityRuleRow): AvailabilityRule {
  return {
    id: row.id,
    businessId: row.business_id,
    staffId: row.staff_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    active: row.active,
  };
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    staffId: row.staff_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    bookingDate: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    bookingReference: row.booking_reference,
    createdVia: row.created_via,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBookingRow(record: NewBookingRecord) {
  return {
    business_id: record.businessId,
    service_id: record.serviceId,
    staff_id: record.staffId,
    customer_name: record.customerName,
    customer_email: record.customerEmail,
    customer_phone: record.customerPhone,
    booking_date: record.bookingDate,
    start_time: record.startTime,
    end_time: record.endTime,
    status: record.status,
    booking_reference: record.bookingReference,
    created_via: record.createdVia,
  };
}

export class SupabaseBookingRepository implements BookingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findBusinessById(id: string) {
    const { data, error } = await this.supabase.from("businesses").select("*").eq("id", id).maybeSingle();
    if (error) queryFailed("Could not load business", error);
    return data ? toBusiness(data as BusinessRow) : null;
  }

  async findPublishedBusinessBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) queryFailed("Could not load published business", error);
    return data ? toBusiness(data as BusinessRow) : null;
  }

  async findCapabilities(businessId: string) {
    const { data, error } = await this.supabase
      .from("business_capabilities")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();
    if (error) queryFailed("Could not load capabilities", error);
    return data ? toCapabilities(data as BusinessCapabilitiesRow) : null;
  }

  async findService(businessId: string, serviceId: string) {
    const { data, error } = await this.supabase
      .from("services")
      .select("id, business_id, name, description, category, price, duration_minutes, tags, active, sort_order")
      .eq("business_id", businessId)
      .eq("id", serviceId)
      .maybeSingle();
    if (error) queryFailed("Could not load service", error);
    return data ? toService(data as ServiceRow) : null;
  }

  async findStaff(businessId: string, staffId: string) {
    const { data, error } = await this.supabase
      .from("staff")
      .select("id, business_id, name, bio, image_url, active, sort_order")
      .eq("business_id", businessId)
      .eq("id", staffId)
      .maybeSingle();
    if (error) queryFailed("Could not load staff", error);
    return data ? toStaff(data as StaffRow) : null;
  }

  async listEligibleStaff(businessId: string, serviceId: string) {
    const { data: links, error: linkError } = await this.supabase
      .from("staff_services")
      .select("staff_id")
      .eq("service_id", serviceId);
    if (linkError) queryFailed("Could not load staff services", linkError);
    const ids = (links ?? []).map((link) => link.staff_id as string);
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from("staff")
      .select("id, business_id, name, bio, image_url, active, sort_order")
      .eq("business_id", businessId)
      .eq("active", true)
      .in("id", ids)
      .order("sort_order");
    if (error) queryFailed("Could not load eligible staff", error);
    return ((data ?? []) as StaffRow[]).map(toStaff);
  }

  async listAvailabilityRules(businessId: string, staffId: string, selectedDayOfWeek: number) {
    const { data, error } = await this.supabase
      .from("availability_rules")
      .select("id, business_id, staff_id, day_of_week, start_time, end_time, active")
      .eq("business_id", businessId)
      .eq("staff_id", staffId)
      .eq("day_of_week", selectedDayOfWeek)
      .eq("active", true);
    if (error) queryFailed("Could not load availability", error);
    return ((data ?? []) as AvailabilityRuleRow[]).map(toAvailabilityRule);
  }

  async listConfirmedBookings(businessId: string, staffId: string, date: string, excludeBookingId?: string) {
    let query = this.supabase
      .from("bookings")
      .select("*")
      .eq("business_id", businessId)
      .eq("staff_id", staffId)
      .eq("booking_date", date)
      .eq("status", "confirmed");
    if (excludeBookingId) query = query.neq("id", excludeBookingId);
    const { data, error } = await query;
    if (error) queryFailed("Could not load existing bookings", error);
    return ((data ?? []) as BookingRow[]).map(toBooking);
  }

  async insertBooking(record: NewBookingRecord) {
    const { data, error } = await this.supabase.from("bookings").insert(toBookingRow(record)).select("*").single();
    if (error) queryFailed("Could not create booking", error);
    return toBooking(data as BookingRow);
  }

  async findBookingByReference(businessId: string, reference: string) {
    const { data, error } = await this.supabase
      .from("bookings")
      .select("*")
      .eq("business_id", businessId)
      .eq("booking_reference", reference)
      .maybeSingle();
    if (error) queryFailed("Could not look up booking", error);
    return data ? toBooking(data as BookingRow) : null;
  }

  async updateBookingSlot(
    bookingId: string,
    businessId: string,
    patch: Pick<Booking, "staffId" | "bookingDate" | "startTime" | "endTime">,
  ) {
    const { data, error } = await this.supabase
      .from("bookings")
      .update({
        staff_id: patch.staffId,
        booking_date: patch.bookingDate,
        start_time: patch.startTime,
        end_time: patch.endTime,
      })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .eq("status", "confirmed")
      .select("*")
      .single();
    if (error) queryFailed("Could not update booking", error);
    return toBooking(data as BookingRow);
  }

  async cancelBooking(bookingId: string, businessId: string) {
    const { data, error } = await this.supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select("*")
      .single();
    if (error) queryFailed("Could not cancel booking", error);
    return toBooking(data as BookingRow);
  }
}

export function createSupabaseBookingRepository(): BookingRepository {
  return new SupabaseBookingRepository(createServiceRoleSupabaseClient());
}
