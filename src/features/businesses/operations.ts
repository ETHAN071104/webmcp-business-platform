import type { BusinessRuntimeRepository } from "@/features/businesses/repository";
import { requireOperation } from "@/features/capabilities/require-capability";
import type { Service, Staff } from "@/types/business";

export type BusinessOperationAudience = "public" | "trusted";

export type PublicBusinessInfo = {
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string | null;
};

export class BusinessOperationError extends Error {
  constructor(
    readonly code: "business_not_found" | "business_not_published" | "service_not_found",
    message: string,
  ) {
    super(message);
    this.name = "BusinessOperationError";
  }
}

async function requireBusiness(
  repository: Pick<BusinessRuntimeRepository, "findBusinessById">,
  businessId: string,
  audience: BusinessOperationAudience,
) {
  const business = await repository.findBusinessById(businessId);
  if (!business) throw new BusinessOperationError("business_not_found", "Business not found.");
  if (audience === "public" && business.status !== "published") {
    throw new BusinessOperationError("business_not_published", "Business not found.");
  }
  return business;
}

export async function getBusinessInfo(
  repository: Pick<BusinessRuntimeRepository, "findBusinessById">,
  input: { businessId: string; audience: BusinessOperationAudience },
): Promise<PublicBusinessInfo> {
  const business = await requireBusiness(repository, input.businessId, input.audience);
  return {
    name: business.name,
    description: business.description,
    phone: business.phone,
    email: business.email,
    address: business.address,
    timezone: business.timezone,
  };
}

export async function listServicesForBusiness(
  repository: Pick<BusinessRuntimeRepository, "findBusinessById" | "findCapabilities" | "listServices">,
  input: { businessId: string; audience: BusinessOperationAudience },
): Promise<Service[]> {
  await requireBusiness(repository, input.businessId, input.audience);
  await requireOperation(repository, input.businessId, "list_services");
  return repository.listServices(input.businessId);
}

export async function getServiceDetails(
  repository: Pick<BusinessRuntimeRepository, "findBusinessById" | "findCapabilities" | "listServices">,
  input: { businessId: string; serviceId: string; audience: BusinessOperationAudience },
): Promise<Service> {
  await requireBusiness(repository, input.businessId, input.audience);
  await requireOperation(repository, input.businessId, "get_service_details");
  const service = (await repository.listServices(input.businessId)).find((candidate) => candidate.id === input.serviceId);
  if (!service) throw new BusinessOperationError("service_not_found", "Service not found.");
  return service;
}

export async function listStaffForBusiness(
  repository: Pick<BusinessRuntimeRepository, "findBusinessById" | "findCapabilities" | "listStaff">,
  input: { businessId: string; audience: BusinessOperationAudience },
): Promise<Staff[]> {
  await requireBusiness(repository, input.businessId, input.audience);
  await requireOperation(repository, input.businessId, "list_staff");
  return repository.listStaff(input.businessId);
}
