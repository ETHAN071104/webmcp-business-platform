import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServiceBusinessTemplate } from "@/components/business/service-business-template";
import { AgentSurfaceView } from "@/components/admin/agent-surface-view";
import { mutateAdminWorkspace } from "@/features/admin/operations";
import { getPublishReadiness, isReadyToPublish } from "@/features/admin/readiness";
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
import { isAdminSection } from "@/features/admin/types";
import { canUseOperation, getAgentCapabilityPreview } from "@/features/capabilities/capabilities";
import { getAgentSurfaceProjection } from "@/features/capabilities/surface-projection";
import { getVisibleWebsiteSections } from "@/features/capabilities/website-sections";
import { getAllWebMCPToolDefinitions, getWebMCPToolDefinitions } from "@/features/webmcp/tool-definitions";
import { resolveTheme } from "@/themes";
import type { BusinessCapabilities } from "@/types/business";

const now = "2026-08-27T00:00:00.000Z";

function makeWorkspace(): AdminWorkspace {
  const business = {
    id: "aria", slug: "aria-hair", name: "Aria Hair Studio", businessType: "salon",
    description: "Considered cuts in Kuala Lumpur.", phone: "+60 3 1000 1000", email: "hello@aria.test",
    address: "Bangsar", timezone: "Asia/Kuala_Lumpur", heroTitle: "Hair that feels like you",
    heroSubtitle: "Calm craft, personal care.", heroImageUrl: null, themePreset: "elegant" as const,
    brandPrimary: null, brandAccent: null, brandBackground: null, brandDark: null,
    status: "published" as const, publishedAt: now, createdAt: now, updatedAt: now,
  };
  const capabilities = { businessId: "aria", services: true, staff: true, booking: true, faq: true, gallery: true, reviews: true, updatedAt: now };
  const services = [
    { id: "cut", businessId: "aria", name: "Signature Cut", description: "Consultation and cut.", category: "Cuts", price: 120, durationMinutes: 60, tags: ["popular"], active: true, sortOrder: 1 },
    { id: "hidden", businessId: "aria", name: "Internal Test", description: null, category: null, price: 1, durationMinutes: 5, tags: [], active: false, sortOrder: 2 },
  ];
  const staff = [{ id: "alex", businessId: "aria", name: "Alex", bio: "Senior stylist", imageUrl: null, active: true, sortOrder: 1 }];
  const faqs = [{ id: "faq", businessId: "aria", question: "Walk-ins?", answer: "Appointments are best.", active: true, sortOrder: 1 }];
  const gallery = [{ id: "image", businessId: "aria", imageUrl: "/demo/aria/craft.webp", altText: "A cut in progress", sortOrder: 1 }];
  const reviews = [{ id: "review", businessId: "aria", customerName: "Nora", rating: 5, quote: "Wonderful care.", sortOrder: 1 }];
  return {
    business, capabilities, services, staff, staffServiceIds: { alex: ["cut"] },
    availability: [{ id: "hours", businessId: "aria", staffId: "alex", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true }],
    faqs, gallery, reviews,
    previewRuntime: { business, capabilities, services: services.filter((item) => item.active), staff, faqs, gallery, reviews },
  };
}

class MemoryAdminRepository implements AdminRepository {
  constructor(public workspace = makeWorkspace()) {}
  async listBusinesses() { return [this.workspace.business]; }
  async getWorkspace(id: string) { return id === this.workspace.business.id ? structuredClone(this.workspace) : null; }
  private refresh() {
    const w = this.workspace;
    w.previewRuntime = {
      business: w.business, capabilities: w.capabilities,
      services: w.capabilities.services ? w.services.filter((item) => item.active) : [],
      staff: w.capabilities.staff ? w.staff.filter((item) => item.active) : [],
      faqs: w.capabilities.faq ? w.faqs.filter((item) => item.active) : [],
      gallery: w.capabilities.gallery ? w.gallery : [], reviews: w.capabilities.reviews ? w.reviews : [],
    };
  }
  async updateBusiness(_: string, patch: BusinessPatch) { Object.assign(this.workspace.business, patch); this.refresh(); }
  async updateCapabilities(_: string, patch: Partial<Omit<BusinessCapabilities, "businessId" | "updatedAt">>) { Object.assign(this.workspace.capabilities, patch); this.refresh(); }
  async updateAppearance(_: string, patch: AppearancePatch) { Object.assign(this.workspace.business, patch); this.refresh(); }
  async saveService(_: string, input: ServiceInput) {
    const item = input.id ? this.workspace.services.find((service) => service.id === input.id) : null;
    if (item) Object.assign(item, input); else this.workspace.services.push({ ...input, id: "new-service", businessId: "aria", sortOrder: 99 });
    this.refresh();
  }
  async saveStaff(_: string, input: StaffInput) {
    const { serviceIds, ...record } = input;
    const item = input.id ? this.workspace.staff.find((person) => person.id === input.id) : null;
    const id = input.id ?? "new-staff";
    if (item) Object.assign(item, record); else this.workspace.staff.push({ ...record, id, businessId: "aria", sortOrder: 99 });
    this.workspace.staffServiceIds[id] = serviceIds;
    this.refresh();
  }
  async replaceAvailability(_: string, input: AvailabilityInput[]) { this.workspace.availability = input.map((item, index) => ({ ...item, id: `rule-${index}`, businessId: "aria" })); }
  async replaceContent(_: string, input: ContentInput) {
    this.workspace.faqs = input.faqs.map((item, index) => ({ ...item, id: item.id ?? `faq-${index}`, businessId: "aria", sortOrder: index }));
    this.workspace.gallery = input.gallery.map((item, index) => ({ ...item, id: item.id ?? `gallery-${index}`, businessId: "aria", sortOrder: index }));
    this.workspace.reviews = input.reviews.map((item, index) => ({ ...item, id: item.id ?? `review-${index}`, businessId: "aria", sortOrder: index }));
    this.refresh();
  }
}

describe("Phase 5A admin console", () => {
  it("recognizes every supported route section and rejects unknown sections", () => {
    for (const section of ["template", "business", "capabilities", "services", "staff", "availability", "content", "appearance", "preview", "publish"]) expect(isAdminSection(section)).toBe(true);
    expect(isAdminSection("billing")).toBe(false);
  });

  it("persists business and service mutations through the domain operation", async () => {
    const repository = new MemoryAdminRepository();
    await mutateAdminWorkspace(repository, "aria", { type: "business", value: { heroTitle: "A new draft headline" } });
    await mutateAdminWorkspace(repository, "aria", { type: "service", value: { name: "Gloss Ritual", description: null, category: "Colour", price: 80, durationMinutes: 45, tags: ["shine"], active: true } });
    const reloaded = await repository.getWorkspace("aria");
    expect(reloaded?.business.heroTitle).toBe("A new draft headline");
    expect(reloaded?.services.some((service) => service.name === "Gloss Ritual")).toBe(true);
  });

  it("uses canonical dependency rules for capability and agent projections", async () => {
    const repository = new MemoryAdminRepository();
    await mutateAdminWorkspace(repository, "aria", { type: "capabilities", value: { staff: false } });
    const workspace = (await repository.getWorkspace("aria"))!;
    expect(canUseOperation(workspace.capabilities, "create_booking")).toBe(false);
    const createBooking = getAgentCapabilityPreview(workspace.capabilities).flatMap((group) => group.tools).find((tool) => tool.name === "create_booking");
    expect(createBooking?.enabled).toBe(false);
    expect(workspace.previewRuntime.staff).toEqual([]);
  });

  it("renders the actual shared business template with active-only draft records", () => {
    const workspace = makeWorkspace();
    const html = renderToStaticMarkup(<ServiceBusinessTemplate runtime={workspace.previewRuntime} />);
    expect(html).toContain("Hair that feels like you");
    expect(html).toContain("Signature Cut");
    expect(html).not.toContain("Internal Test");
  });

  it("projects Booking ON to the shared Human View and four WebMCP booking tools", () => {
    const workspace = makeWorkspace();
    const humanSections = getVisibleWebsiteSections(workspace.previewRuntime).map((section) => section.id);
    const projection = getAgentSurfaceProjection(workspace.capabilities);
    const booking = projection.capabilities.find((capability) => capability.id === "booking");
    expect(humanSections).toContain("booking");
    expect(booking).toMatchObject({ configured: true, effective: true });
    expect(booking?.agentTools.filter((tool) => tool.enabled).map((tool) => tool.name)).toEqual([
      "get_available_slots", "create_booking", "update_booking", "cancel_booking",
    ]);
    expect(projection.enabledToolNames).toHaveLength(9);
  });

  it("projects Booking OFF to both Human View and Agent View without hiding the mapping", () => {
    const workspace = makeWorkspace();
    workspace.capabilities.booking = false;
    const humanSections = getVisibleWebsiteSections(workspace.previewRuntime).map((section) => section.id);
    const projection = getAgentSurfaceProjection(workspace.capabilities);
    const booking = projection.capabilities.find((capability) => capability.id === "booking");
    expect(humanSections).not.toContain("booking");
    expect(booking).toMatchObject({ configured: false, effective: false });
    expect(booking?.agentTools).toHaveLength(4);
    expect(booking?.agentTools.every((tool) => !tool.enabled)).toBe(true);
    expect(projection.enabledToolNames).toHaveLength(5);
  });

  it("shows Booking configured ON but effective OFF when a canonical dependency is missing", () => {
    const workspace = makeWorkspace();
    workspace.capabilities.services = false;
    const booking = getAgentSurfaceProjection(workspace.capabilities).capabilities.find((capability) => capability.id === "booking");
    expect(booking).toMatchObject({ configured: true, effective: false, missingRequirements: ["services"] });
    expect(booking?.agentTools.filter((tool) => !tool.enabled).map((tool) => tool.name)).toEqual([
      "get_available_slots", "create_booking", "update_booking",
    ]);
    expect(booking?.agentTools.find((tool) => tool.name === "cancel_booking")?.enabled).toBe(true);
  });

  it("keeps Agent View tool metadata and enabled names aligned with Phase 4 registration", () => {
    const workspace = makeWorkspace();
    workspace.capabilities.booking = false;
    const projection = getAgentSurfaceProjection(workspace.capabilities);
    expect(projection.tools.map((tool) => tool.name)).toEqual(getAllWebMCPToolDefinitions().map((tool) => tool.name));
    expect(projection.enabledToolNames).toEqual(getWebMCPToolDefinitions(workspace.capabilities).map((tool) => tool.name));
  });

  it("renders Agent View as an explicit visualization with exact registered tool names", () => {
    const html = renderToStaticMarkup(<AgentSurfaceView workspace={makeWorkspace()} />);
    expect(html).toContain("A visualization of the structured WebMCP surface exposed to AI agents");
    for (const tool of getAllWebMCPToolDefinitions()) expect(html).toContain(tool.name);
    expect(html).toContain("Configure once. Serve humans and agents.");
  });

  it("applies theme overrides and resets to preset tokens", async () => {
    const repository = new MemoryAdminRepository();
    await mutateAdminWorkspace(repository, "aria", { type: "appearance", value: { themePreset: "clean", brandPrimary: "#123456", brandAccent: null, brandBackground: null, brandDark: null } });
    let workspace = (await repository.getWorkspace("aria"))!;
    expect(resolveTheme({ preset: workspace.business.themePreset, overrides: { primary: workspace.business.brandPrimary } }).primary).toBe("#123456");
    await mutateAdminWorkspace(repository, "aria", { type: "appearance", value: { themePreset: "clean", brandPrimary: null, brandAccent: null, brandBackground: null, brandDark: null } });
    workspace = (await repository.getWorkspace("aria"))!;
    expect(resolveTheme({ preset: workspace.business.themePreset, overrides: { primary: workspace.business.brandPrimary } })).toEqual(resolveTheme({ preset: "clean" }));
  });

  it("updates staff mappings and weekly availability", async () => {
    const repository = new MemoryAdminRepository();
    await mutateAdminWorkspace(repository, "aria", { type: "staff", value: { id: "alex", name: "Alex", bio: "Senior stylist", imageUrl: null, active: true, serviceIds: ["cut", "hidden"] } });
    await mutateAdminWorkspace(repository, "aria", { type: "availability", value: [{ staffId: "alex", dayOfWeek: 2, startTime: "10:00", endTime: "18:00", active: true }] });
    const workspace = (await repository.getWorkspace("aria"))!;
    expect(workspace.staffServiceIds.alex).toEqual(["cut", "hidden"]);
    expect(workspace.availability).toMatchObject([{ staffId: "alex", dayOfWeek: 2, startTime: "10:00", endTime: "18:00" }]);
  });

  it("reports readiness gaps and recognizes a complete Aria configuration", () => {
    const ready = makeWorkspace();
    expect(isReadyToPublish(ready)).toBe(true);
    const incomplete = makeWorkspace();
    incomplete.availability = [];
    const booking = getPublishReadiness(incomplete).find((check) => check.id === "booking");
    expect(booking?.ready).toBe(false);
    expect(isReadyToPublish(incomplete)).toBe(false);
  });
});
