import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminRepository } from "@/features/admin/repository";
import type {
  AdminWorkspace,
  AppearancePatch,
  AvailabilityInput,
  BusinessPatch,
  ContentInput,
  ServiceInput,
  StaffInput,
} from "@/features/admin/types";
import type { AvailabilityRule } from "@/features/bookings/types";
import {
  toBusiness,
  toCapabilities,
  toFaq,
  toGalleryItem,
  toReview,
  toService,
  toStaff,
} from "@/features/businesses/supabase-repository";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { BusinessCapabilities } from "@/types/business";
import type {
  AvailabilityRuleRow,
  BusinessCapabilitiesRow,
  BusinessRow,
  FAQRow,
  GalleryItemRow,
  ReviewRow,
  ServiceRow,
  StaffRow,
  StaffServiceRow,
} from "@/types/database";

type SupabaseError = { message: string } | null;

function queryFailed(context: string, error: SupabaseError): never {
  throw new Error(`${context}: ${error?.message ?? "Unknown Supabase error"}`);
}

function toAvailability(row: AvailabilityRuleRow): AvailabilityRule {
  return {
    id: row.id,
    businessId: row.business_id,
    staffId: row.staff_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    active: row.active,
  };
}

export class SupabaseAdminRepository implements AdminRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listBusinesses() {
    const { data, error } = await this.supabase.from("businesses").select("*").order("name");
    if (error) queryFailed("Could not load businesses", error);
    return ((data ?? []) as BusinessRow[]).map(toBusiness);
  }

  async getWorkspace(businessId: string): Promise<AdminWorkspace | null> {
    const [businessResult, capabilitiesResult, servicesResult, staffResult, linksResult, availabilityResult, faqsResult, galleryResult, reviewsResult] = await Promise.all([
      this.supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
      this.supabase.from("business_capabilities").select("*").eq("business_id", businessId).maybeSingle(),
      this.supabase.from("services").select("*").eq("business_id", businessId).order("sort_order"),
      this.supabase.from("staff").select("*").eq("business_id", businessId).order("sort_order"),
      this.supabase.from("staff_services").select("staff_id, service_id"),
      this.supabase.from("availability_rules").select("*").eq("business_id", businessId).order("day_of_week"),
      this.supabase.from("faqs").select("*").eq("business_id", businessId).order("sort_order"),
      this.supabase.from("gallery_items").select("*").eq("business_id", businessId).order("sort_order"),
      this.supabase.from("reviews").select("*").eq("business_id", businessId).order("sort_order"),
    ]);
    const resultErrors = [businessResult, capabilitiesResult, servicesResult, staffResult, linksResult, availabilityResult, faqsResult, galleryResult, reviewsResult];
    const failed = resultErrors.find((result) => result.error);
    if (failed?.error) queryFailed("Could not load admin workspace", failed.error);
    if (!businessResult.data) return null;
    if (!capabilitiesResult.data) throw new Error(`Business ${businessId} has no capability configuration.`);

    const business = toBusiness(businessResult.data as BusinessRow);
    const capabilities = toCapabilities(capabilitiesResult.data as BusinessCapabilitiesRow);
    const services = ((servicesResult.data ?? []) as ServiceRow[]).map(toService);
    const staff = ((staffResult.data ?? []) as StaffRow[]).map(toStaff);
    const faqs = ((faqsResult.data ?? []) as FAQRow[]).map(toFaq);
    const gallery = ((galleryResult.data ?? []) as GalleryItemRow[]).map(toGalleryItem);
    const reviews = ((reviewsResult.data ?? []) as ReviewRow[]).map(toReview);
    const staffIds = new Set(staff.map((person) => person.id));
    const staffServiceIds: Record<string, string[]> = Object.fromEntries(staff.map((person) => [person.id, []]));
    for (const link of (linksResult.data ?? []) as StaffServiceRow[]) {
      if (staffIds.has(link.staff_id)) staffServiceIds[link.staff_id].push(link.service_id);
    }
    const previewRuntime = {
      business,
      capabilities,
      services: capabilities.services ? services.filter((item) => item.active) : [],
      staff: capabilities.staff ? staff.filter((item) => item.active) : [],
      faqs: capabilities.faq ? faqs.filter((item) => item.active) : [],
      gallery: capabilities.gallery ? gallery : [],
      reviews: capabilities.reviews ? reviews : [],
    };
    return {
      business,
      capabilities,
      services,
      staff,
      staffServiceIds,
      availability: ((availabilityResult.data ?? []) as AvailabilityRuleRow[]).map(toAvailability),
      faqs,
      gallery,
      reviews,
      previewRuntime,
    };
  }

  async updateBusiness(businessId: string, patch: BusinessPatch) {
    const row = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.businessType !== undefined ? { business_type: patch.businessType } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.address !== undefined ? { address: patch.address } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      ...(patch.heroTitle !== undefined ? { hero_title: patch.heroTitle } : {}),
      ...(patch.heroSubtitle !== undefined ? { hero_subtitle: patch.heroSubtitle } : {}),
      ...(patch.heroImageUrl !== undefined ? { hero_image_url: patch.heroImageUrl } : {}),
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.supabase.from("businesses").update(row).eq("id", businessId);
    if (error) queryFailed("Could not update business", error);
  }

  async updateCapabilities(businessId: string, patch: Partial<Omit<BusinessCapabilities, "businessId" | "updatedAt">>) {
    const row = Object.fromEntries(Object.entries(patch).map(([key, value]) => [`${key}_enabled`, value]));
    const { error } = await this.supabase.from("business_capabilities").update({ ...row, updated_at: new Date().toISOString() }).eq("business_id", businessId);
    if (error) queryFailed("Could not update capabilities", error);
  }

  async updateAppearance(businessId: string, patch: AppearancePatch) {
    const { error } = await this.supabase.from("businesses").update({
      theme_preset: patch.themePreset,
      brand_primary: patch.brandPrimary,
      brand_accent: patch.brandAccent,
      brand_background: patch.brandBackground,
      brand_dark: patch.brandDark,
      updated_at: new Date().toISOString(),
    }).eq("id", businessId);
    if (error) queryFailed("Could not update appearance", error);
  }

  async saveService(businessId: string, input: ServiceInput) {
    const row = { business_id: businessId, name: input.name, description: input.description, category: input.category, price: input.price, duration_minutes: input.durationMinutes, tags: input.tags, active: input.active };
    const query = input.id
      ? this.supabase.from("services").update(row).eq("id", input.id).eq("business_id", businessId)
      : this.supabase.from("services").insert({ ...row, sort_order: 100 });
    const { error } = await query;
    if (error) queryFailed("Could not save service", error);
  }

  async saveStaff(businessId: string, input: StaffInput) {
    const row = { business_id: businessId, name: input.name, bio: input.bio, image_url: input.imageUrl, active: input.active };
    let staffId = input.id;
    if (staffId) {
      const { error } = await this.supabase.from("staff").update(row).eq("id", staffId).eq("business_id", businessId);
      if (error) queryFailed("Could not save staff", error);
    } else {
      const { data, error } = await this.supabase.from("staff").insert({ ...row, sort_order: 100 }).select("id").single();
      if (error) queryFailed("Could not save staff", error);
      staffId = data.id as string;
    }
    const { error: deleteError } = await this.supabase.from("staff_services").delete().eq("staff_id", staffId);
    if (deleteError) queryFailed("Could not update staff service mapping", deleteError);
    if (input.serviceIds.length) {
      const { error } = await this.supabase.from("staff_services").insert(input.serviceIds.map((serviceId) => ({ staff_id: staffId, service_id: serviceId })));
      if (error) queryFailed("Could not update staff service mapping", error);
    }
  }

  async replaceAvailability(businessId: string, input: AvailabilityInput[]) {
    const { error: deleteError } = await this.supabase.from("availability_rules").delete().eq("business_id", businessId);
    if (deleteError) queryFailed("Could not replace availability", deleteError);
    if (!input.length) return;
    const { error } = await this.supabase.from("availability_rules").insert(input.map((rule) => ({
      business_id: businessId,
      staff_id: rule.staffId,
      day_of_week: rule.dayOfWeek,
      start_time: rule.startTime,
      end_time: rule.endTime,
      active: rule.active,
    })));
    if (error) queryFailed("Could not replace availability", error);
  }

  async replaceContent(businessId: string, input: ContentInput) {
    for (const table of ["faqs", "gallery_items", "reviews"]) {
      const { error } = await this.supabase.from(table).delete().eq("business_id", businessId);
      if (error) queryFailed("Could not replace content", error);
    }
    if (input.faqs.length) {
      const { error } = await this.supabase.from("faqs").insert(input.faqs.map((item, index) => ({ business_id: businessId, question: item.question, answer: item.answer, active: item.active, sort_order: index })));
      if (error) queryFailed("Could not save FAQs", error);
    }
    if (input.gallery.length) {
      const { error } = await this.supabase.from("gallery_items").insert(input.gallery.map((item, index) => ({ business_id: businessId, image_url: item.imageUrl, alt_text: item.altText, sort_order: index })));
      if (error) queryFailed("Could not save gallery", error);
    }
    if (input.reviews.length) {
      const { error } = await this.supabase.from("reviews").insert(input.reviews.map((item, index) => ({ business_id: businessId, customer_name: item.customerName, rating: item.rating, quote: item.quote, sort_order: index })));
      if (error) queryFailed("Could not save reviews", error);
    }
  }
}

export function createSupabaseAdminRepository(): AdminRepository {
  return new SupabaseAdminRepository(createServiceRoleSupabaseClient());
}
