import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BusinessRuntimeRepository } from "@/features/businesses/repository";
import { createPublicSupabaseClient } from "@/lib/supabase/server";
import type {
  Business,
  BusinessCapabilities,
  FAQ,
  GalleryItem,
  Review,
  Service,
  Staff,
} from "@/types/business";
import type {
  BusinessCapabilitiesRow,
  BusinessRow,
  FAQRow,
  GalleryItemRow,
  ReviewRow,
  ServiceRow,
  StaffRow,
} from "@/types/database";

function queryFailed(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "Unknown Supabase error"}`);
}

export function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    businessType: row.business_type,
    description: row.description,
    phone: row.phone,
    email: row.email,
    address: row.address,
    timezone: row.timezone,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    heroImageUrl: row.hero_image_url,
    themePreset: row.theme_preset,
    brandPrimary: row.brand_primary,
    brandAccent: row.brand_accent,
    brandBackground: row.brand_background,
    brandDark: row.brand_dark,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCapabilities(row: BusinessCapabilitiesRow): BusinessCapabilities {
  return {
    businessId: row.business_id,
    services: row.services_enabled,
    staff: row.staff_enabled,
    booking: row.booking_enabled,
    faq: row.faq_enabled,
    gallery: row.gallery_enabled,
    reviews: row.reviews_enabled,
    updatedAt: row.updated_at,
  };
}

export function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    durationMinutes: row.duration_minutes,
    tags: row.tags ?? [],
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export function toStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    bio: row.bio,
    imageUrl: row.image_url,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export function toFaq(row: FAQRow): FAQ {
  return {
    id: row.id,
    businessId: row.business_id,
    question: row.question,
    answer: row.answer,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export function toGalleryItem(row: GalleryItemRow): GalleryItem {
  return {
    id: row.id,
    businessId: row.business_id,
    imageUrl: row.image_url,
    altText: row.alt_text,
    sortOrder: row.sort_order,
  };
}

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    businessId: row.business_id,
    customerName: row.customer_name,
    rating: row.rating,
    quote: row.quote,
    sortOrder: row.sort_order,
  };
}

export class SupabaseBusinessRuntimeRepository implements BusinessRuntimeRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findPublishedBusinessBySlug(slug: string): Promise<Business | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) queryFailed("Could not load published business", error);
    return data ? toBusiness(data as BusinessRow) : null;
  }

  async findBusinessById(id: string): Promise<Business | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) queryFailed("Could not load business", error);
    return data ? toBusiness(data as BusinessRow) : null;
  }

  async findCapabilities(businessId: string): Promise<BusinessCapabilities | null> {
    const { data, error } = await this.supabase
      .from("business_capabilities")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) queryFailed("Could not load business capabilities", error);
    return data ? toCapabilities(data as BusinessCapabilitiesRow) : null;
  }

  async listServices(businessId: string): Promise<Service[]> {
    const { data, error } = await this.supabase
      .from("services")
      .select("id, business_id, name, description, category, price, duration_minutes, tags, active, sort_order")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("sort_order");

    if (error) queryFailed("Could not load services", error);
    return ((data ?? []) as ServiceRow[]).map(toService);
  }

  async listStaff(businessId: string): Promise<Staff[]> {
    const { data, error } = await this.supabase
      .from("staff")
      .select("id, business_id, name, bio, image_url, active, sort_order")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("sort_order");

    if (error) queryFailed("Could not load staff", error);
    return ((data ?? []) as StaffRow[]).map(toStaff);
  }

  async listFaqs(businessId: string): Promise<FAQ[]> {
    const { data, error } = await this.supabase
      .from("faqs")
      .select("id, business_id, question, answer, active, sort_order")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("sort_order");

    if (error) queryFailed("Could not load FAQs", error);
    return ((data ?? []) as FAQRow[]).map(toFaq);
  }

  async listGallery(businessId: string): Promise<GalleryItem[]> {
    const { data, error } = await this.supabase
      .from("gallery_items")
      .select("id, business_id, image_url, alt_text, sort_order")
      .eq("business_id", businessId)
      .order("sort_order");

    if (error) queryFailed("Could not load gallery", error);
    return ((data ?? []) as GalleryItemRow[]).map(toGalleryItem);
  }

  async listReviews(businessId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from("reviews")
      .select("id, business_id, customer_name, rating, quote, sort_order")
      .eq("business_id", businessId)
      .order("sort_order");

    if (error) queryFailed("Could not load reviews", error);
    return ((data ?? []) as ReviewRow[]).map(toReview);
  }
}

export function createSupabaseBusinessRuntimeRepository(): BusinessRuntimeRepository {
  return new SupabaseBusinessRuntimeRepository(createPublicSupabaseClient());
}
