import type { AvailabilityRule } from "@/features/bookings/types";
import type {
  Business,
  BusinessCapabilities,
  BusinessRuntime,
  FAQ,
  GalleryItem,
  Review,
  Service,
  Staff,
  ThemePreset,
} from "@/types/business";

export const ADMIN_SECTIONS = [
  "template",
  "business",
  "capabilities",
  "services",
  "staff",
  "availability",
  "content",
  "appearance",
  "preview",
  "publish",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export type AdminWorkspace = {
  business: Business;
  capabilities: BusinessCapabilities;
  services: Service[];
  staff: Staff[];
  staffServiceIds: Record<string, string[]>;
  availability: AvailabilityRule[];
  faqs: FAQ[];
  gallery: GalleryItem[];
  reviews: Review[];
  previewRuntime: BusinessRuntime;
};

export type BusinessPatch = Partial<Pick<Business,
  "name" | "slug" | "businessType" | "description" | "phone" | "email" |
  "address" | "timezone" | "heroTitle" | "heroSubtitle" | "heroImageUrl"
>>;

export type AppearancePatch = {
  themePreset: ThemePreset;
  brandPrimary: string | null;
  brandAccent: string | null;
  brandBackground: string | null;
  brandDark: string | null;
};

export type ServiceInput = Pick<Service,
  "name" | "description" | "category" | "price" | "durationMinutes" | "tags" | "active"
> & { id?: string };

export type StaffInput = Pick<Staff, "name" | "bio" | "imageUrl" | "active"> & {
  id?: string;
  serviceIds: string[];
};

export type AvailabilityInput = Pick<AvailabilityRule,
  "staffId" | "dayOfWeek" | "startTime" | "endTime" | "active"
> & { id?: string };

export type ContentInput = {
  faqs: Array<Pick<FAQ, "question" | "answer" | "active"> & { id?: string }>;
  gallery: Array<Pick<GalleryItem, "imageUrl" | "altText"> & { id?: string }>;
  reviews: Array<Pick<Review, "customerName" | "rating" | "quote"> & { id?: string }>;
};

export function isAdminSection(value: string): value is AdminSection {
  return (ADMIN_SECTIONS as readonly string[]).includes(value);
}
