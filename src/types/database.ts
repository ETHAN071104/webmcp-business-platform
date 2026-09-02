import type { BusinessStatus, ThemePreset } from "@/types/business";

export type BusinessRow = {
  id: string;
  slug: string;
  name: string;
  business_type: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  theme_preset: ThemePreset;
  brand_primary: string | null;
  brand_accent: string | null;
  brand_background: string | null;
  brand_dark: string | null;
  status: BusinessStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessCapabilitiesRow = {
  business_id: string;
  services_enabled: boolean;
  staff_enabled: boolean;
  booking_enabled: boolean;
  faq_enabled: boolean;
  gallery_enabled: boolean;
  reviews_enabled: boolean;
  updated_at: string;
};

export type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | string;
  duration_minutes: number;
  tags: string[] | null;
  active: boolean;
  sort_order: number;
};

export type StaffRow = {
  id: string;
  business_id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
};

export type FAQRow = {
  id: string;
  business_id: string;
  question: string | null;
  answer: string | null;
  active: boolean;
  sort_order: number;
};

export type GalleryItemRow = {
  id: string;
  business_id: string;
  image_url: string | null;
  alt_text: string | null;
  sort_order: number;
};

export type ReviewRow = {
  id: string;
  business_id: string;
  customer_name: string | null;
  rating: number | null;
  quote: string | null;
  sort_order: number;
};

export type AvailabilityRuleRow = {
  id: string;
  business_id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

export type StaffServiceRow = {
  staff_id: string;
  service_id: string;
};

export type BookingRow = {
  id: string;
  business_id: string;
  service_id: string;
  staff_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  booking_reference: string;
  created_via: "website" | "webmcp";
  created_at: string;
  updated_at: string;
};
