import type {
  Business,
  BusinessCapabilities,
  FAQ,
  GalleryItem,
  Review,
  Service,
  Staff,
} from "@/types/business";

export interface BusinessRuntimeRepository {
  findPublishedBusinessBySlug(slug: string): Promise<Business | null>;
  findBusinessById(id: string): Promise<Business | null>;
  findCapabilities(businessId: string): Promise<BusinessCapabilities | null>;
  listServices(businessId: string): Promise<Service[]>;
  listStaff(businessId: string): Promise<Staff[]>;
  listFaqs(businessId: string): Promise<FAQ[]>;
  listGallery(businessId: string): Promise<GalleryItem[]>;
  listReviews(businessId: string): Promise<Review[]>;
}
