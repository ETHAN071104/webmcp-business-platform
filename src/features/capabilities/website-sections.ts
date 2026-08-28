import { canRenderCapabilitySection } from "@/features/capabilities/capabilities";
import type { BusinessRuntime } from "@/types/business";

export type WebsiteSectionId =
  | "about"
  | "services"
  | "staff"
  | "gallery"
  | "reviews"
  | "booking"
  | "faq"
  | "contact";

export type WebsiteSection = {
  id: WebsiteSectionId;
  label: string;
};

const sectionLabels: Record<WebsiteSectionId, string> = {
  about: "About",
  services: "Services",
  staff: "Team",
  gallery: "Gallery",
  reviews: "Reviews",
  booking: "Book",
  faq: "FAQ",
  contact: "Contact",
};

export function getVisibleWebsiteSections(
  runtime: BusinessRuntime,
): WebsiteSection[] {
  const visibleIds: WebsiteSectionId[] = [];

  if (runtime.business.description || runtime.gallery.some((item) => item.imageUrl)) {
    visibleIds.push("about");
  }
  if (canRenderCapabilitySection(runtime.capabilities, "services") && runtime.services.length > 0) {
    visibleIds.push("services");
  }
  if (canRenderCapabilitySection(runtime.capabilities, "staff") && runtime.staff.length > 0) {
    visibleIds.push("staff");
  }
  if (canRenderCapabilitySection(runtime.capabilities, "gallery") && runtime.gallery.some((item) => item.imageUrl)) {
    visibleIds.push("gallery");
  }
  if (canRenderCapabilitySection(runtime.capabilities, "reviews") && runtime.reviews.length > 0) {
    visibleIds.push("reviews");
  }
  if (canRenderCapabilitySection(runtime.capabilities, "booking")) {
    visibleIds.push("booking");
  }
  if (canRenderCapabilitySection(runtime.capabilities, "faq") && runtime.faqs.length > 0) {
    visibleIds.push("faq");
  }
  if (runtime.business.phone || runtime.business.email || runtime.business.address) {
    visibleIds.push("contact");
  }

  return visibleIds.map((id) => ({ id, label: sectionLabels[id] }));
}

export function getNavigationItems(runtime: BusinessRuntime): WebsiteSection[] {
  const navigationIds: WebsiteSectionId[] = [
    "about",
    "services",
    "staff",
    "gallery",
    "reviews",
    "booking",
    "faq",
    "contact",
  ];
  const visible = new Map(
    getVisibleWebsiteSections(runtime).map((section) => [section.id, section]),
  );

  return navigationIds.flatMap((id) => {
    const section = visible.get(id);
    return section ? [section] : [];
  });
}
