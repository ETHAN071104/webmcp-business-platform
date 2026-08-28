import type { BusinessCapabilities } from "@/types/business";
import {
  CapabilityDisabledError,
  CapabilityOperationDisabledError,
  getMissingOperationCapabilities,
  type BackendOperationName,
  type Capability,
} from "@/features/capabilities/capabilities";

export async function requireCapability(
  repository: {
    findCapabilities(businessId: string): Promise<BusinessCapabilities | null>;
  },
  businessId: string,
  capability: Capability,
): Promise<void> {
  const capabilities = await repository.findCapabilities(businessId);

  if (!capabilities?.[capability]) {
    throw new CapabilityDisabledError(businessId, capability);
  }
}

export async function requireOperation(
  repository: {
    findCapabilities(businessId: string): Promise<BusinessCapabilities | null>;
  },
  businessId: string,
  operation: BackendOperationName,
): Promise<void> {
  const capabilities = await repository.findCapabilities(businessId);
  const missing = capabilities
    ? getMissingOperationCapabilities(capabilities, operation)
    : getMissingOperationCapabilities({ services: false, staff: false, booking: false, faq: false, gallery: false, reviews: false }, operation);

  if (missing.length > 0) {
    throw new CapabilityOperationDisabledError(businessId, operation, missing);
  }
}
