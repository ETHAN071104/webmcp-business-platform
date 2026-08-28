import type { AdminRepository } from "@/features/admin/repository";
import type {
  AppearancePatch,
  AvailabilityInput,
  BusinessPatch,
  ContentInput,
  ServiceInput,
  StaffInput,
} from "@/features/admin/types";
import { validateAppearance, validateAvailability, validateService, validateStaff } from "@/features/admin/validation";

export async function mutateAdminWorkspace(repository: AdminRepository, businessId: string, action:
  | { type: "business"; value: BusinessPatch }
  | { type: "capabilities"; value: Record<string, boolean> }
  | { type: "appearance"; value: AppearancePatch }
  | { type: "service"; value: ServiceInput }
  | { type: "staff"; value: StaffInput }
  | { type: "availability"; value: AvailabilityInput[] }
  | { type: "content"; value: ContentInput }
) {
  if (action.type === "business") await repository.updateBusiness(businessId, action.value);
  if (action.type === "capabilities") await repository.updateCapabilities(businessId, action.value);
  if (action.type === "appearance") { validateAppearance(action.value); await repository.updateAppearance(businessId, action.value); }
  if (action.type === "service") { validateService(action.value); await repository.saveService(businessId, action.value); }
  if (action.type === "staff") { validateStaff(action.value); await repository.saveStaff(businessId, action.value); }
  if (action.type === "availability") { validateAvailability(action.value); await repository.replaceAvailability(businessId, action.value); }
  if (action.type === "content") await repository.replaceContent(businessId, action.value);
  return repository.getWorkspace(businessId);
}
