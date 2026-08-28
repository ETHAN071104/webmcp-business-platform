import { getAvailableSlots } from "@/features/bookings/service";
import type { BookingRepository, BookingSlot } from "@/features/bookings/types";
import { getBusinessInfo } from "@/features/businesses/operations";
import type { BusinessRuntimeRepository } from "@/features/businesses/repository";
import { requireOperation } from "@/features/capabilities/require-capability";
import type { Service, Staff } from "@/types/business";

export type RecommendationInput = {
  businessId: string;
  occasion?: string;
  maxPrice?: number;
  date?: string;
  afterTime?: string;
  preferredStaffId?: string;
  preference?: string;
  now?: Date;
};

export type ServiceRecommendation = {
  service: Service;
  reason: string;
  matchingStaff: Staff[];
  earliestAvailableSlot?: BookingSlot & { date: string; staffId: string; staffName: string };
};

export class RecommendationError extends Error {
  constructor(
    readonly code: "service_not_found" | "no_availability",
    message: string,
  ) {
    super(message);
    this.name = "RecommendationError";
  }
}

function terms(input: RecommendationInput): string[] {
  return `${input.occasion ?? ""} ${input.preference ?? ""}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
}

function serviceScore(service: Service, requestedTerms: string[], maxPrice?: number): number {
  const tags = service.tags.map((tag) => tag.toLowerCase());
  const name = service.name.toLowerCase();
  const category = service.category?.toLowerCase() ?? "";
  const description = service.description?.toLowerCase() ?? "";
  let score = 0;
  for (const term of requestedTerms) {
    if (tags.some((tag) => tag === term || tag.includes(term) || term.includes(tag))) score += 12;
    if (name.includes(term) || category.includes(term)) score += 5;
    if (description.includes(term)) score += 3;
  }
  if (maxPrice !== undefined && maxPrice > 0) score += 2 * (1 - service.price / maxPrice);
  return score;
}

function reasonFor(service: Service, input: RecommendationInput, requestedTerms: string[], hasSlot: boolean): string {
  const searchable = `${service.name} ${service.category ?? ""} ${service.description ?? ""} ${service.tags.join(" ")}`.toLowerCase();
  const matched = requestedTerms.filter((term) => searchable.includes(term));
  const parts: string[] = [];
  if (matched.length) parts.push(`matches the ${matched.join(" and ")} preference`);
  if (input.maxPrice !== undefined) parts.push(`costs RM${service.price} within the RM${input.maxPrice} budget`);
  if (hasSlot && input.date) parts.push(`has availability on ${input.date}${input.afterTime ? ` after ${input.afterTime}` : ""}`);
  if (!parts.length) parts.push("is the strongest deterministic match among active services");
  return `${service.name} ${parts.join(", and ")}.`;
}

export async function recommendService(
  repositories: { businesses: BusinessRuntimeRepository; bookings: BookingRepository },
  input: RecommendationInput,
): Promise<ServiceRecommendation> {
  await getBusinessInfo(repositories.businesses, { businessId: input.businessId, audience: "public" });
  await requireOperation(repositories.businesses, input.businessId, "recommend_service");
  const [services, capabilities] = await Promise.all([
    repositories.businesses.listServices(input.businessId),
    repositories.businesses.findCapabilities(input.businessId),
  ]);
  const requestedTerms = terms(input);
  const candidates: Array<{
    service: Service;
    staff: Staff[];
    score: number;
    earliest?: BookingSlot & { date: string; staffId: string; staffName: string };
  }> = [];

  for (const service of services.filter((candidate) => candidate.active && (input.maxPrice === undefined || candidate.price <= input.maxPrice))) {
    let eligible = await repositories.bookings.listEligibleStaff(input.businessId, service.id);
    if (input.preferredStaffId) eligible = eligible.filter((person) => person.id === input.preferredStaffId);
    if (eligible.length === 0) continue;

    let earliest: BookingSlot & { date: string; staffId: string; staffName: string } | undefined;
    if (input.date) {
      for (const person of eligible) {
        const slots = await getAvailableSlots(repositories.bookings, {
          businessId: input.businessId,
          serviceId: service.id,
          staffId: person.id,
          date: input.date,
          audience: "public",
          now: input.now,
        });
        const slot = slots.find((candidate) => !input.afterTime || candidate.startTime >= input.afterTime);
        if (slot && (!earliest || slot.startTime < earliest.startTime || (slot.startTime === earliest.startTime && person.sortOrder < eligible.find((item) => item.id === earliest?.staffId)!.sortOrder))) {
          earliest = { ...slot, date: input.date, staffId: person.id, staffName: person.name };
        }
      }
      if (!earliest) continue;
    }

    candidates.push({ service, staff: eligible, earliest, score: serviceScore(service, requestedTerms, input.maxPrice) + (earliest ? 1 : 0) });
  }

  candidates.sort((left, right) =>
    right.score - left.score ||
    left.service.price - right.service.price ||
    left.service.sortOrder - right.service.sortOrder ||
    left.service.name.localeCompare(right.service.name),
  );
  const winner = candidates[0];
  if (!winner) {
    if (input.date) throw new RecommendationError("no_availability", "No matching service has availability for those constraints.");
    throw new RecommendationError("service_not_found", "No active service matches those constraints.");
  }

  return {
    service: winner.service,
    reason: reasonFor(winner.service, input, requestedTerms, Boolean(winner.earliest)),
    matchingStaff: capabilities?.staff ? winner.staff : [],
    earliestAvailableSlot: winner.earliest,
  };
}
