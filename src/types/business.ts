export type BusinessStatus = "draft" | "published";
export type ThemePreset = "elegant" | "clean" | "bold";

export type Business = {
  id: string;
  slug: string;
  name: string;
  businessType: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  themePreset: ThemePreset;
  brandPrimary: string | null;
  brandAccent: string | null;
  brandBackground: string | null;
  brandDark: string | null;
  status: BusinessStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessCapabilities = {
  businessId: string;
  services: boolean;
  staff: boolean;
  booking: boolean;
  faq: boolean;
  gallery: boolean;
  reviews: boolean;
  updatedAt: string;
};

export type Service = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  durationMinutes: number;
  tags: string[];
  active: boolean;
  sortOrder: number;
};

export type Staff = {
  id: string;
  businessId: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type FAQ = {
  id: string;
  businessId: string;
  question: string | null;
  answer: string | null;
  active: boolean;
  sortOrder: number;
};

export type GalleryItem = {
  id: string;
  businessId: string;
  imageUrl: string | null;
  altText: string | null;
  sortOrder: number;
};

export type Review = {
  id: string;
  businessId: string;
  customerName: string | null;
  rating: number | null;
  quote: string | null;
  sortOrder: number;
};

export type BusinessRuntime = {
  business: Business;
  capabilities: BusinessCapabilities;
  services: Service[];
  staff: Staff[];
  faqs: FAQ[];
  gallery: GalleryItem[];
  reviews: Review[];
};
