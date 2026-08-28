import type { Business, BusinessCapabilities } from "@/types/business";
import type {
  AdminWorkspace,
  AppearancePatch,
  AvailabilityInput,
  BusinessPatch,
  ContentInput,
  ServiceInput,
  StaffInput,
} from "@/features/admin/types";

export interface AdminRepository {
  listBusinesses(): Promise<Business[]>;
  getWorkspace(businessId: string): Promise<AdminWorkspace | null>;
  updateBusiness(businessId: string, patch: BusinessPatch): Promise<void>;
  updateCapabilities(businessId: string, patch: Partial<Omit<BusinessCapabilities, "businessId" | "updatedAt">>): Promise<void>;
  updateAppearance(businessId: string, patch: AppearancePatch): Promise<void>;
  saveService(businessId: string, input: ServiceInput): Promise<void>;
  saveStaff(businessId: string, input: StaffInput): Promise<void>;
  replaceAvailability(businessId: string, input: AvailabilityInput[]): Promise<void>;
  replaceContent(businessId: string, input: ContentInput): Promise<void>;
}
