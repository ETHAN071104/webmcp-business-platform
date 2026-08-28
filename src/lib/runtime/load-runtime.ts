import type { BusinessRuntimeRepository } from "@/features/businesses/repository";
import type { Business, BusinessRuntime } from "@/types/business";

async function assembleRuntime(
  repository: BusinessRuntimeRepository,
  business: Business,
): Promise<BusinessRuntime> {
  const capabilities = await repository.findCapabilities(business.id);

  if (!capabilities) {
    throw new Error(`Business ${business.id} has no capability configuration.`);
  }

  const [services, staff, faqs, gallery, reviews] = await Promise.all([
    capabilities.services ? repository.listServices(business.id) : Promise.resolve([]),
    capabilities.staff ? repository.listStaff(business.id) : Promise.resolve([]),
    capabilities.faq ? repository.listFaqs(business.id) : Promise.resolve([]),
    capabilities.gallery ? repository.listGallery(business.id) : Promise.resolve([]),
    capabilities.reviews ? repository.listReviews(business.id) : Promise.resolve([]),
  ]);

  return {
    business,
    capabilities,
    services,
    staff,
    faqs,
    gallery,
    reviews,
  };
}

export async function loadPublishedBusinessRuntimeBySlug(
  repository: BusinessRuntimeRepository,
  slug: string,
): Promise<BusinessRuntime | null> {
  const business = await repository.findPublishedBusinessBySlug(slug);
  return business ? assembleRuntime(repository, business) : null;
}

export async function loadBusinessRuntimeById(
  repository: BusinessRuntimeRepository,
  id: string,
): Promise<BusinessRuntime | null> {
  const business = await repository.findBusinessById(id);
  return business ? assembleRuntime(repository, business) : null;
}
