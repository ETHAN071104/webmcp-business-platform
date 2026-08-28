import {
  cancelBooking,
  createBooking,
  getAvailableSlots,
  getBooking,
  getEligibleStaff,
  updateBooking,
} from "@/features/bookings/service";
import { BookingError, type BookingRepository } from "@/features/bookings/types";
import {
  BusinessOperationError,
  getBusinessInfo,
  getServiceDetails,
  listServicesForBusiness,
  listStaffForBusiness,
} from "@/features/businesses/operations";
import { recommendService, RecommendationError } from "@/features/businesses/recommendation";
import type { BusinessRuntimeRepository } from "@/features/businesses/repository";
import { CapabilityOperationDisabledError } from "@/features/capabilities/capabilities";
import { AgentInputError, parseAgentToolInput } from "@/features/webmcp/schemas";
import type { AgentToolFailure, AgentToolResult, WebMCPToolName } from "@/features/webmcp/types";
import type { Service, Staff } from "@/types/business";

export type AgentToolRepositories = {
  businesses: BusinessRuntimeRepository;
  bookings: BookingRepository;
};

const currency = "MYR";

const publicService = (service: Service) => ({
  id: service.id,
  name: service.name,
  description: service.description,
  category: service.category,
  price: service.price,
  currency,
  duration_minutes: service.durationMinutes,
});

const publicStaff = (person: Staff, serviceIds?: string[]) => ({
  id: person.id,
  name: person.name,
  bio: person.bio,
  ...(serviceIds ? { service_ids: serviceIds } : {}),
});

const verificationFor = (input: { customerEmail?: string; customerPhone?: string }) =>
  input.customerEmail ?? input.customerPhone!;

export function agentToolError(error: unknown): AgentToolFailure {
  if (error instanceof AgentInputError) return { success: false, error: error.code, message: error.message };
  if (error instanceof CapabilityOperationDisabledError) {
    return { success: false, error: "capability_not_enabled", message: "This tool is not enabled for the current business." };
  }
  if (error instanceof BusinessOperationError) {
    return { success: false, error: error.code, message: error.message };
  }
  if (error instanceof RecommendationError) {
    return { success: false, error: error.code, message: error.message };
  }
  if (error instanceof BookingError) {
    const code = {
      capability_not_enabled: "capability_not_enabled",
      BUSINESS_NOT_FOUND: "business_not_found",
      BUSINESS_NOT_PUBLISHED: "business_not_found",
      INVALID_INPUT: "invalid_input",
      INVALID_DATE: "invalid_input",
      SERVICE_NOT_FOUND: "service_not_found",
      STAFF_NOT_ELIGIBLE: "staff_not_eligible",
      SLOT_UNAVAILABLE: "slot_no_longer_available",
      BOOKING_NOT_FOUND: "booking_not_found",
    }[error.code];
    const message = error.code === "SLOT_UNAVAILABLE"
      ? "That appointment time is no longer available. Call get_available_slots again."
      : error.message;
    return { success: false, error: code, message };
  }
  console.error("Agent tool execution failed", error);
  return { success: false, error: "internal_error", message: "The business could not complete this tool call. Please try again." };
}

export async function executeBusinessAgentTool(
  repositories: AgentToolRepositories,
  businessSlug: string,
  toolName: WebMCPToolName,
  rawInput: unknown,
  options: { now?: Date } = {},
): Promise<AgentToolResult> {
  try {
    const business = await repositories.businesses.findPublishedBusinessBySlug(businessSlug);
    if (!business) throw new BusinessOperationError("business_not_found", "Business not found.");

    switch (toolName) {
      case "get_business_info": {
        parseAgentToolInput(toolName, rawInput);
        const info = await getBusinessInfo(repositories.businesses, { businessId: business.id, audience: "public" });
        return { success: true, ...info };
      }
      case "list_services": {
        const input = parseAgentToolInput(toolName, rawInput);
        const services = (await listServicesForBusiness(repositories.businesses, { businessId: business.id, audience: "public" }))
          .filter((service) => !input.category || service.category?.toLowerCase() === input.category.toLowerCase())
          .filter((service) => input.maxPrice === undefined || service.price <= input.maxPrice);
        return { success: true, services: services.map(publicService) };
      }
      case "get_service_details": {
        const input = parseAgentToolInput(toolName, rawInput);
        const service = await getServiceDetails(repositories.businesses, { businessId: business.id, serviceId: input.serviceId, audience: "public" });
        return { success: true, service: publicService(service) };
      }
      case "recommend_service": {
        const input = parseAgentToolInput(toolName, rawInput);
        const result = await recommendService(repositories, { businessId: business.id, ...input, now: options.now });
        return {
          success: true,
          recommended_service: publicService(result.service),
          reason: result.reason,
          matching_staff: result.matchingStaff.map((person) => publicStaff(person)),
          ...(result.earliestAvailableSlot ? {
            earliest_available_slot: {
              date: result.earliestAvailableSlot.date,
              time: result.earliestAvailableSlot.startTime,
              end_time: result.earliestAvailableSlot.endTime,
              staff_id: result.earliestAvailableSlot.staffId,
              staff_name: result.earliestAvailableSlot.staffName,
            },
          } : {}),
        };
      }
      case "list_staff": {
        const input = parseAgentToolInput(toolName, rawInput);
        let staff = await listStaffForBusiness(repositories.businesses, { businessId: business.id, audience: "public" });
        const serviceIdsByStaff = new Map<string, string[]>();
        if (input.serviceId) {
          await getServiceDetails(repositories.businesses, { businessId: business.id, serviceId: input.serviceId, audience: "public" });
          const eligible = await repositories.bookings.listEligibleStaff(business.id, input.serviceId);
          const eligibleIds = new Set(eligible.map((person) => person.id));
          staff = staff.filter((person) => eligibleIds.has(person.id));
          for (const person of staff) serviceIdsByStaff.set(person.id, [input.serviceId]);
        } else {
          const capabilities = await repositories.businesses.findCapabilities(business.id);
          if (capabilities?.services) {
            const services = await listServicesForBusiness(repositories.businesses, { businessId: business.id, audience: "public" });
            for (const service of services) {
              const eligible = await repositories.bookings.listEligibleStaff(business.id, service.id);
              for (const person of eligible) {
                serviceIdsByStaff.set(person.id, [...(serviceIdsByStaff.get(person.id) ?? []), service.id]);
              }
            }
          }
        }
        return { success: true, staff: staff.map((person) => publicStaff(person, serviceIdsByStaff.get(person.id) ?? [])) };
      }
      case "get_available_slots": {
        const input = parseAgentToolInput(toolName, rawInput);
        let staff: Staff[];
        if (input.staffId) {
          const person = await repositories.bookings.findStaff(business.id, input.staffId);
          if (!person) throw new BookingError("STAFF_NOT_ELIGIBLE", "That team member does not offer this service.");
          staff = [person];
        } else {
          staff = await getEligibleStaff(repositories.bookings, { businessId: business.id, serviceId: input.serviceId, audience: "public" });
        }
        const optionsByStaff = [];
        for (const person of staff) {
          const slots = await getAvailableSlots(repositories.bookings, {
            businessId: business.id,
            serviceId: input.serviceId,
            staffId: person.id,
            date: input.date,
            audience: "public",
            now: options.now,
          });
          const filtered = slots.filter((slot) => !input.afterTime || slot.startTime >= input.afterTime);
          if (filtered.length) optionsByStaff.push({ staff_id: person.id, staff_name: person.name, slots: filtered.map((slot) => slot.startTime) });
        }
        if (!optionsByStaff.length) return { success: false, error: "no_availability", message: "No appointment times match those constraints." };
        return { success: true, date: input.date, options: optionsByStaff };
      }
      case "create_booking": {
        const input = parseAgentToolInput(toolName, rawInput);
        const booking = await createBooking(repositories.bookings, {
          businessId: business.id,
          ...input,
          createdVia: "agent",
          audience: "public",
          now: options.now,
        });
        const service = await repositories.bookings.findService(business.id, booking.service.id);
        return {
          success: true,
          booking_reference: booking.reference,
          status: booking.status,
          service: { id: booking.service.id, name: booking.service.name, duration_minutes: booking.service.durationMinutes },
          staff: booking.staff,
          date: booking.date,
          start_time: booking.startTime,
          end_time: booking.endTime,
          price: service?.price ?? null,
          currency,
        };
      }
      case "update_booking": {
        const input = parseAgentToolInput(toolName, rawInput);
        const verification = verificationFor(input);
        const current = await getBooking(repositories.bookings, {
          businessId: business.id,
          reference: input.bookingReference,
          verification,
          audience: "public",
        });
        const booking = await updateBooking(repositories.bookings, {
          businessId: business.id,
          reference: input.bookingReference,
          verification,
          staffId: input.newStaffId ?? current.staff.id,
          date: input.newDate ?? current.date,
          startTime: input.newStartTime ?? current.startTime,
          audience: "public",
          now: options.now,
        });
        return { success: true, booking_reference: booking.reference, status: booking.status, date: booking.date, start_time: booking.startTime, end_time: booking.endTime, service: booking.service, staff: booking.staff };
      }
      case "cancel_booking": {
        const input = parseAgentToolInput(toolName, rawInput);
        const booking = await cancelBooking(repositories.bookings, {
          businessId: business.id,
          reference: input.bookingReference,
          verification: verificationFor(input),
          audience: "public",
        });
        return { success: true, booking_reference: booking.reference, status: booking.status, message: "The booking is cancelled and its appointment slot has been released." };
      }
    }
  } catch (error) {
    return agentToolError(error);
  }
}
