"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Heading, Switch, Text } from "@radix-ui/themes";

import { AgentSurfaceView } from "@/components/admin/agent-surface-view";
import { getPublishReadiness, isReadyToPublish } from "@/features/admin/readiness";
import type {
  AdminSection,
  AdminWorkspace,
  AppearancePatch,
  AvailabilityInput,
  ContentInput,
  ServiceInput,
  StaffInput,
} from "@/features/admin/types";
import {
  CAPABILITIES,
  canUseOperation,
  getAgentCapabilityPreview,
  getMissingOperationCapabilities,
  type Capability,
} from "@/features/capabilities/capabilities";
import { resolveTheme } from "@/themes";

const SECTION_COPY: Record<AdminSection, { eyebrow: string; title: string; description: string }> = {
  template: { eyebrow: "Workspace", title: "Business configuration", description: "One structured profile powers the customer website and the tools available to agents." },
  business: { eyebrow: "Foundation", title: "Business information", description: "Keep customer-facing identity, contact details, and hero messaging current." },
  capabilities: { eyebrow: "Product controls", title: "Capabilities", description: "Choose which experiences appear on the website and which operations agents can use." },
  services: { eyebrow: "Catalog", title: "Services", description: "Maintain the treatments, prices, duration, and service tags customers can discover." },
  staff: { eyebrow: "Team", title: "Staff and service mapping", description: "Keep the team current and map each person to the services they can deliver." },
  availability: { eyebrow: "Scheduling", title: "Weekly availability", description: "Set the recurring hours used by the booking engine when it generates open slots." },
  content: { eyebrow: "Trust and proof", title: "Website content", description: "Manage FAQs, gallery images, and reviews without changing the template code." },
  appearance: { eyebrow: "Brand system", title: "Appearance", description: "Select a tested preset, then optionally override the four core brand colors." },
  preview: { eyebrow: "Quality check", title: "Human View and Agent View", description: "One business configuration powers the customer website and the structured WebMCP surface." },
  publish: { eyebrow: "Launch check", title: "Publish readiness", description: "Resolve configuration gaps before a future publishing workflow is enabled." },
};

const CAPABILITY_COPY: Record<Capability, { title: string; detail: string }> = {
  services: { title: "Services", detail: "Show the service catalog and enable service discovery tools." },
  staff: { title: "Staff", detail: "Show the team and let agents list available staff." },
  booking: { title: "Booking", detail: "Offer booking calls to action and scheduling tools when dependencies are on." },
  faq: { title: "FAQs", detail: "Show common questions and answers on the website." },
  gallery: { title: "Gallery", detail: "Show visual work and venue imagery on the website." },
  reviews: { title: "Reviews", detail: "Show customer ratings and quotes on the website." },
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optional(form: FormData, key: string) {
  return value(form, key) || null;
}

function SectionHeader({ section }: { section: AdminSection }) {
  const copy = SECTION_COPY[section];
  return (
    <header className="admin-page-header">
      <Text as="p" size="1" weight="bold" color="indigo">{copy.eyebrow.toUpperCase()}</Text>
      <Heading as="h1" size="7">{copy.title}</Heading>
      <Text as="p" size="3" color="gray">{copy.description}</Text>
    </header>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

export function AdminConsole({ initialWorkspace, section }: { initialWorkspace: AdminWorkspace; section: AdminSection }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewSurface, setPreviewSurface] = useState<"human" | "agent">("human");
  const [previewVersion, setPreviewVersion] = useState(0);

  async function mutate(command: unknown, success = "Changes saved.") {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/business/${workspace.business.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save changes.");
      setWorkspace(payload.workspace);
      setPreviewVersion((current) => current + 1);
      setStatus({ tone: "success", message: success });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save changes." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <SectionHeader section={section} />
      {status ? <div className={`admin-notice admin-notice-${status.tone}`} role="status">{status.message}</div> : null}
      {section === "template" ? <Overview workspace={workspace} /> : null}
      {section === "business" ? <BusinessEditor workspace={workspace} saving={saving} mutate={mutate} /> : null}
      {section === "capabilities" ? <CapabilitiesEditor workspace={workspace} saving={saving} mutate={mutate} /> : null}
      {section === "services" ? <ServicesEditor workspace={workspace} saving={saving} mutate={mutate} /> : null}
      {section === "staff" ? <StaffEditor workspace={workspace} saving={saving} mutate={mutate} /> : null}
      {section === "availability" ? <AvailabilityEditor workspace={workspace} saving={saving} mutate={mutate} /> : null}
      {section === "content" ? <ContentEditor workspace={workspace} saving={saving} mutate={mutate} /> : null}
      {section === "appearance" ? <AppearanceEditor workspace={workspace} saving={saving} mutate={mutate} /> : null}
      {section === "preview" ? <PreviewWorkspace workspace={workspace} surface={previewSurface} setSurface={setPreviewSurface} mode={previewMode} setMode={setPreviewMode} version={previewVersion} /> : null}
      {section === "publish" ? <PublishReadiness workspace={workspace} /> : null}
    </main>
  );
}

function Overview({ workspace }: { workspace: AdminWorkspace }) {
  const tools = getAgentCapabilityPreview(workspace.capabilities).flatMap((group) => group.tools).filter((tool) => tool.enabled).length;
  const readiness = getPublishReadiness(workspace);
  return (
    <div className="admin-overview-grid">
      <Card className="admin-summary-card admin-summary-card-wide">
        <div>
          <Text size="1" color="gray" weight="bold">CURRENT TEMPLATE</Text>
          <Heading as="h2" size="5">Service Business</Heading>
          <Text as="p" color="gray">A capability-aware commercial site with shared booking and agent operations.</Text>
        </div>
        <Badge color="indigo" variant="soft">Active</Badge>
      </Card>
      {[
        [workspace.services.filter((item) => item.active).length, "Active services"],
        [workspace.staff.filter((item) => item.active).length, "Active staff"],
        [tools, "Effective agent tools"],
        [readiness.filter((item) => item.ready).length + "/" + readiness.length, "Readiness checks"],
      ].map(([metric, label]) => <Card key={label} className="admin-metric"><strong>{metric}</strong><span>{label}</span></Card>)}
      <Card className="admin-summary-card admin-summary-card-wide">
        <div>
          <Heading as="h2" size="4">Configuration path</Heading>
          <Text as="p" color="gray">Complete identity, catalog, team, scheduling, content, and appearance. Then inspect both previews before checking readiness.</Text>
        </div>
        <div className="admin-step-row"><span>Identity</span><span>Operations</span><span>Brand</span><span>Verify</span></div>
      </Card>
    </div>
  );
}

function BusinessEditor({ workspace, saving, mutate }: EditorProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void mutate({ type: "business", value: {
      name: value(form, "name"), slug: value(form, "slug"), businessType: value(form, "businessType"),
      description: optional(form, "description"), phone: optional(form, "phone"), email: optional(form, "email"),
      address: optional(form, "address"), timezone: optional(form, "timezone"), heroTitle: optional(form, "heroTitle"),
      heroSubtitle: optional(form, "heroSubtitle"), heroImageUrl: optional(form, "heroImageUrl"),
    } });
  }
  const business = workspace.business;
  return <form className="admin-form" onSubmit={submit}>
    <Card className="admin-panel"><Heading as="h2" size="4">Business identity</Heading><div className="admin-form-grid">
      <Field label="Business name"><input name="name" required defaultValue={business.name} /></Field>
      <Field label="URL slug" hint="Lowercase letters, numbers, and hyphens."><input name="slug" required pattern="[a-z0-9-]+" defaultValue={business.slug} /></Field>
      <Field label="Business type"><input name="businessType" required defaultValue={business.businessType} /></Field>
      <Field label="Timezone"><input name="timezone" defaultValue={business.timezone ?? ""} /></Field>
      <Field label="Description"><textarea name="description" rows={4} defaultValue={business.description ?? ""} /></Field>
      <Field label="Address"><textarea name="address" rows={4} defaultValue={business.address ?? ""} /></Field>
    </div></Card>
    <Card className="admin-panel"><Heading as="h2" size="4">Contact and hero</Heading><div className="admin-form-grid">
      <Field label="Phone"><input name="phone" defaultValue={business.phone ?? ""} /></Field>
      <Field label="Email"><input name="email" type="email" defaultValue={business.email ?? ""} /></Field>
      <Field label="Hero title"><input name="heroTitle" defaultValue={business.heroTitle ?? ""} /></Field>
      <Field label="Hero subtitle"><input name="heroSubtitle" defaultValue={business.heroSubtitle ?? ""} /></Field>
      <Field label="Hero image URL"><input name="heroImageUrl" type="url" defaultValue={business.heroImageUrl ?? ""} /></Field>
    </div></Card>
    <div className="admin-form-actions"><Button type="submit" disabled={saving} highContrast>{saving ? "Saving" : "Save business info"}</Button></div>
  </form>;
}

type EditorProps = { workspace: AdminWorkspace; saving: boolean; mutate: (command: unknown, success?: string) => Promise<void> };

function CapabilitiesEditor({ workspace, saving, mutate }: EditorProps) {
  const bookingMissing = getMissingOperationCapabilities(workspace.capabilities, "create_booking");
  async function toggle(capability: Capability, enabled: boolean) {
    await mutate({ type: "capabilities", value: { [capability]: enabled } }, `${CAPABILITY_COPY[capability].title} ${enabled ? "enabled" : "disabled"}.`);
  }
  return <div className="admin-stack">
    <Card className="admin-panel">
      <div className="admin-capability-list">
        {CAPABILITIES.map((capability) => <div className="admin-capability-row" key={capability}>
          <div><strong>{CAPABILITY_COPY[capability].title}</strong><span>{CAPABILITY_COPY[capability].detail}</span></div>
          <Switch checked={workspace.capabilities[capability]} disabled={saving} onCheckedChange={(checked) => void toggle(capability, checked)} aria-label={`Toggle ${CAPABILITY_COPY[capability].title}`} />
        </div>)}
      </div>
    </Card>
    {workspace.capabilities.booking && bookingMissing.length ? <div className="admin-notice admin-notice-warning"><strong>Booking is configured but not effective.</strong> Turn on {bookingMissing.map((item) => CAPABILITY_COPY[item].title).join(" and ")} to enable booking sections and creation tools.</div> : null}
    <Card className="admin-panel"><Heading as="h2" size="4">Effective behavior</Heading><Text as="p" color="gray">Booking creation is {canUseOperation(workspace.capabilities, "create_booking") ? "available" : "unavailable"}. Dependency rules come from the same capability registry used by the website and agent runtime.</Text></Card>
  </div>;
}

function ServiceForm({ input, saving, mutate }: EditorProps & { input?: AdminWorkspace["services"][number] }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const command: ServiceInput = { id: input?.id, name: value(form, "name"), description: optional(form, "description"), category: optional(form, "category"), price: Number(value(form, "price")), durationMinutes: Number(value(form, "duration")), tags: value(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean), active: form.get("active") === "on" };
    void mutate({ type: "service", value: command }, input ? "Service updated." : "Service added.");
    if (!input) event.currentTarget.reset();
  }
  return <form className="admin-item-form" onSubmit={submit}>
    <div className="admin-item-heading"><strong>{input?.name ?? "Add service"}</strong>{input ? <Badge color={input.active ? "green" : "gray"}>{input.active ? "Active" : "Inactive"}</Badge> : null}</div>
    <div className="admin-form-grid admin-form-grid-compact">
      <Field label="Name"><input name="name" required defaultValue={input?.name ?? ""} /></Field>
      <Field label="Category"><input name="category" defaultValue={input?.category ?? ""} /></Field>
      <Field label="Price"><input name="price" type="number" min="0" step="0.01" required defaultValue={input?.price ?? 0} /></Field>
      <Field label="Duration, minutes"><input name="duration" type="number" min="5" step="5" required defaultValue={input?.durationMinutes ?? 60} /></Field>
      <Field label="Tags"><input name="tags" defaultValue={input?.tags.join(", ") ?? ""} /></Field>
      <Field label="Description"><textarea name="description" rows={2} defaultValue={input?.description ?? ""} /></Field>
    </div>
    <label className="admin-check"><input name="active" type="checkbox" defaultChecked={input?.active ?? true} /> Active and customer-visible</label>
    <Button type="submit" disabled={saving} variant={input ? "soft" : "solid"}>{input ? "Update service" : "Add service"}</Button>
  </form>;
}

function ServicesEditor(props: EditorProps) {
  return <div className="admin-stack"><Card className="admin-panel"><div className="admin-list-heading"><Heading as="h2" size="4">Service catalog</Heading><Badge>{props.workspace.services.length} total</Badge></div><div className="admin-editor-list">{props.workspace.services.map((item) => <ServiceForm key={item.id} {...props} input={item} />)}</div></Card><Card className="admin-panel admin-create-panel"><ServiceForm {...props} /></Card></div>;
}

function StaffForm({ input, workspace, saving, mutate }: EditorProps & { input?: AdminWorkspace["staff"][number] }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const command: StaffInput = { id: input?.id, name: value(form, "name"), bio: optional(form, "bio"), imageUrl: optional(form, "imageUrl"), active: form.get("active") === "on", serviceIds: form.getAll("serviceIds").map(String) };
    void mutate({ type: "staff", value: command }, input ? "Staff member updated." : "Staff member added.");
    if (!input) event.currentTarget.reset();
  }
  return <form className="admin-item-form" onSubmit={submit}>
    <div className="admin-item-heading"><strong>{input?.name ?? "Add staff member"}</strong>{input ? <Badge color={input.active ? "green" : "gray"}>{input.active ? "Active" : "Inactive"}</Badge> : null}</div>
    <div className="admin-form-grid admin-form-grid-compact"><Field label="Name"><input name="name" required defaultValue={input?.name ?? ""} /></Field><Field label="Image URL"><input name="imageUrl" type="url" defaultValue={input?.imageUrl ?? ""} /></Field><Field label="Bio"><textarea name="bio" rows={2} defaultValue={input?.bio ?? ""} /></Field></div>
    <fieldset className="admin-checkbox-group"><legend>Services this person can deliver</legend>{workspace.services.filter((service) => service.active).map((service) => <label key={service.id}><input type="checkbox" name="serviceIds" value={service.id} defaultChecked={input ? (workspace.staffServiceIds[input.id] ?? []).includes(service.id) : false} />{service.name}</label>)}</fieldset>
    <label className="admin-check"><input name="active" type="checkbox" defaultChecked={input?.active ?? true} /> Active and bookable</label>
    <Button type="submit" disabled={saving} variant={input ? "soft" : "solid"}>{input ? "Update staff" : "Add staff"}</Button>
  </form>;
}

function StaffEditor(props: EditorProps) {
  return <div className="admin-stack"><Card className="admin-panel"><div className="admin-list-heading"><Heading as="h2" size="4">Team</Heading><Badge>{props.workspace.staff.length} total</Badge></div><div className="admin-editor-list">{props.workspace.staff.map((item) => <StaffForm key={item.id} {...props} input={item} />)}</div></Card><Card className="admin-panel admin-create-panel"><StaffForm {...props} /></Card></div>;
}

function AvailabilityEditor({ workspace, saving, mutate }: EditorProps) {
  const firstStaff = workspace.staff.find((person) => person.active)?.id ?? workspace.staff[0]?.id ?? "";
  const [staffId, setStaffId] = useState(firstStaff);
  const selectedRules = workspace.availability.filter((rule) => rule.staffId === staffId);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const nextForStaff: AvailabilityInput[] = DAYS.flatMap((_, dayOfWeek) => form.get(`day-${dayOfWeek}`) === "on" ? [{ staffId, dayOfWeek, startTime: value(form, `start-${dayOfWeek}`), endTime: value(form, `end-${dayOfWeek}`), active: true }] : []);
    const otherStaff = workspace.availability.filter((rule) => rule.staffId !== staffId).map(({ staffId: id, dayOfWeek, startTime, endTime, active }) => ({ staffId: id, dayOfWeek, startTime, endTime, active }));
    void mutate({ type: "availability", value: [...otherStaff, ...nextForStaff] }, "Weekly availability updated.");
  }
  return <form className="admin-form" onSubmit={submit}><Card className="admin-panel"><div className="admin-list-heading"><Heading as="h2" size="4">Recurring weekly hours</Heading><select value={staffId} onChange={(event) => setStaffId(event.target.value)} aria-label="Staff member">{workspace.staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div><div className="admin-hours-list">{DAYS.map((day, index) => { const rule = selectedRules.find((item) => item.dayOfWeek === index && item.active); return <div className="admin-hours-row" key={day}><label className="admin-check"><input name={`day-${index}`} type="checkbox" defaultChecked={Boolean(rule)} key={`${staffId}-${index}-check`} />{day}</label><input name={`start-${index}`} type="time" defaultValue={rule?.startTime ?? "09:00"} key={`${staffId}-${index}-start`} /><span>to</span><input name={`end-${index}`} type="time" defaultValue={rule?.endTime ?? "17:00"} key={`${staffId}-${index}-end`} /></div>; })}</div></Card><div className="admin-form-actions"><Button type="submit" highContrast disabled={saving || !staffId}>{saving ? "Saving" : "Save weekly hours"}</Button></div></form>;
}

function ContentEditor({ workspace, saving, mutate }: EditorProps) {
  const [content, setContent] = useState<ContentInput>({
    faqs: workspace.faqs.map(({ id, question, answer, active }) => ({ id, question, answer, active })),
    gallery: workspace.gallery.map(({ id, imageUrl, altText }) => ({ id, imageUrl, altText })),
    reviews: workspace.reviews.map(({ id, customerName, rating, quote }) => ({ id, customerName, rating, quote })),
  });
  return <div className="admin-stack">
    <Card className="admin-panel"><div className="admin-list-heading"><Heading as="h2" size="4">FAQs</Heading><Button variant="soft" onClick={() => setContent((current) => ({ ...current, faqs: [...current.faqs, { question: "", answer: "", active: true }] }))}>Add FAQ</Button></div><div className="admin-editor-list">{content.faqs.map((item, index) => <div className="admin-content-row" key={item.id ?? index}><input aria-label="FAQ question" placeholder="Question" value={item.question ?? ""} onChange={(event) => setContent((current) => ({ ...current, faqs: current.faqs.map((entry, position) => position === index ? { ...entry, question: event.target.value } : entry) }))} /><textarea aria-label="FAQ answer" placeholder="Answer" rows={2} value={item.answer ?? ""} onChange={(event) => setContent((current) => ({ ...current, faqs: current.faqs.map((entry, position) => position === index ? { ...entry, answer: event.target.value } : entry) }))} /><Button color="red" variant="ghost" onClick={() => setContent((current) => ({ ...current, faqs: current.faqs.filter((_, position) => position !== index) }))}>Remove</Button></div>)}</div></Card>
    <Card className="admin-panel"><div className="admin-list-heading"><Heading as="h2" size="4">Gallery</Heading><Button variant="soft" onClick={() => setContent((current) => ({ ...current, gallery: [...current.gallery, { imageUrl: "", altText: "" }] }))}>Add image</Button></div><div className="admin-editor-list">{content.gallery.map((item, index) => <div className="admin-content-row admin-content-row-inline" key={item.id ?? index}><input aria-label="Gallery image URL" placeholder="Image URL" value={item.imageUrl ?? ""} onChange={(event) => setContent((current) => ({ ...current, gallery: current.gallery.map((entry, position) => position === index ? { ...entry, imageUrl: event.target.value } : entry) }))} /><input aria-label="Gallery alt text" placeholder="Alt text" value={item.altText ?? ""} onChange={(event) => setContent((current) => ({ ...current, gallery: current.gallery.map((entry, position) => position === index ? { ...entry, altText: event.target.value } : entry) }))} /><Button color="red" variant="ghost" onClick={() => setContent((current) => ({ ...current, gallery: current.gallery.filter((_, position) => position !== index) }))}>Remove</Button></div>)}</div></Card>
    <Card className="admin-panel"><div className="admin-list-heading"><Heading as="h2" size="4">Reviews</Heading><Button variant="soft" onClick={() => setContent((current) => ({ ...current, reviews: [...current.reviews, { customerName: "", rating: 5, quote: "" }] }))}>Add review</Button></div><div className="admin-editor-list">{content.reviews.map((item, index) => <div className="admin-content-row admin-content-row-inline" key={item.id ?? index}><input aria-label="Customer name" placeholder="Customer name" value={item.customerName ?? ""} onChange={(event) => setContent((current) => ({ ...current, reviews: current.reviews.map((entry, position) => position === index ? { ...entry, customerName: event.target.value } : entry) }))} /><input aria-label="Rating" type="number" min="1" max="5" value={item.rating ?? 5} onChange={(event) => setContent((current) => ({ ...current, reviews: current.reviews.map((entry, position) => position === index ? { ...entry, rating: Number(event.target.value) } : entry) }))} /><textarea aria-label="Review quote" placeholder="Customer quote" rows={2} value={item.quote ?? ""} onChange={(event) => setContent((current) => ({ ...current, reviews: current.reviews.map((entry, position) => position === index ? { ...entry, quote: event.target.value } : entry) }))} /><Button color="red" variant="ghost" onClick={() => setContent((current) => ({ ...current, reviews: current.reviews.filter((_, position) => position !== index) }))}>Remove</Button></div>)}</div></Card>
    <div className="admin-form-actions"><Button highContrast disabled={saving} onClick={() => void mutate({ type: "content", value: content }, "Website content updated.")}>{saving ? "Saving" : "Save all content"}</Button></div>
  </div>;
}

function AppearanceEditor({ workspace, saving, mutate }: EditorProps) {
  const business = workspace.business;
  const [appearance, setAppearance] = useState<AppearancePatch>({ themePreset: business.themePreset, brandPrimary: business.brandPrimary, brandAccent: business.brandAccent, brandBackground: business.brandBackground, brandDark: business.brandDark });
  const theme = resolveTheme({ preset: appearance.themePreset, overrides: { primary: appearance.brandPrimary, accent: appearance.brandAccent, background: appearance.brandBackground, dark: appearance.brandDark } });
  const colors = [["brandPrimary", "Primary", theme.primary], ["brandAccent", "Accent", theme.accent], ["brandBackground", "Background", theme.background], ["brandDark", "Dark", theme.dark]] as const;
  return <div className="admin-appearance-layout"><div className="admin-stack"><Card className="admin-panel"><Heading as="h2" size="4">Theme preset</Heading><div className="admin-theme-options">{(["elegant", "clean", "bold"] as const).map((preset) => <label key={preset} data-selected={appearance.themePreset === preset}><input type="radio" name="preset" checked={appearance.themePreset === preset} onChange={() => setAppearance((current) => ({ ...current, themePreset: preset }))} /><strong>{preset}</strong><span>{preset === "elegant" ? "Editorial and refined" : preset === "clean" ? "Quiet and minimal" : "Confident and graphic"}</span></label>)}</div></Card><Card className="admin-panel"><div className="admin-list-heading"><Heading as="h2" size="4">Color overrides</Heading><Button variant="ghost" onClick={() => setAppearance((current) => ({ ...current, brandPrimary: null, brandAccent: null, brandBackground: null, brandDark: null }))}>Reset colors</Button></div><div className="admin-color-grid">{colors.map(([key, label, fallback]) => <Field key={key} label={label} hint={appearance[key] ? "Custom override" : "Using preset color"}><div className="admin-color-input"><input type="color" value={appearance[key] ?? fallback} onChange={(event) => setAppearance((current) => ({ ...current, [key]: event.target.value }))} /><input value={appearance[key] ?? ""} placeholder={fallback} pattern="#[0-9A-Fa-f]{6}" onChange={(event) => setAppearance((current) => ({ ...current, [key]: event.target.value || null }))} /></div></Field>)}</div></Card><Button highContrast disabled={saving} onClick={() => void mutate({ type: "appearance", value: appearance }, "Appearance updated.")}>{saving ? "Saving" : "Save appearance"}</Button></div><Card className="admin-brand-swatch" style={{ background: theme.background, color: theme.foreground, borderColor: theme.border }}><span style={{ color: theme.primary }}>LIVE TOKENS</span><Heading as="h2" size="6" style={{ color: theme.dark }}>{business.name}</Heading><Text as="p" style={{ color: theme.foreground }}>A compact brand sample using the same resolved tokens as the website template.</Text><button style={{ background: theme.primary, color: theme.background }}>Primary action</button><div className="admin-swatch-bar" style={{ background: theme.accent }} /></Card></div>;
}

function PreviewWorkspace({ workspace, surface, setSurface, mode, setMode, version }: { workspace: AdminWorkspace; surface: "human" | "agent"; setSurface: (surface: "human" | "agent") => void; mode: "desktop" | "mobile"; setMode: (mode: "desktop" | "mobile") => void; version: number }) {
  return <div className="admin-preview-workspace"><div className="admin-view-switch" aria-label="Preview surface"><button data-active={surface === "human"} onClick={() => setSurface("human")}><strong>Human View</strong><span>Customer-facing website</span></button><button data-active={surface === "agent"} onClick={() => setSurface("agent")}><strong>Agent View</strong><span>WebMCP surface visualization</span></button></div>{surface === "human" ? <Card className="admin-preview-panel"><div className="admin-preview-toolbar"><div><strong>Human View</strong><span>Actual shared ServiceBusinessTemplate using privileged draft state</span></div><div className="admin-segmented" aria-label="Human View device"><button data-active={mode === "desktop"} onClick={() => setMode("desktop")}>Desktop</button><button data-active={mode === "mobile"} onClick={() => setMode("mobile")}>Mobile</button></div></div><div className="admin-iframe-stage" data-mode={mode}><iframe key={version} title={`${workspace.business.name} Human View draft website`} src={`/admin-preview/${workspace.business.id}?v=${version}`} /></div></Card> : <AgentSurfaceView workspace={workspace} />}</div>;
}

function PublishReadiness({ workspace }: { workspace: AdminWorkspace }) {
  const checks = getPublishReadiness(workspace); const ready = isReadyToPublish(workspace);
  return <div className="admin-publish-layout"><Card className="admin-panel"><div className="admin-readiness-score"><div><Text size="1" color="gray" weight="bold">READINESS</Text><Heading as="h2" size="6">{checks.filter((check) => check.ready).length} of {checks.length} checks complete</Heading></div><Badge color={ready ? "green" : "amber"}>{ready ? "Ready for publish flow" : "Needs attention"}</Badge></div><div className="admin-readiness-list">{checks.map((check) => <div key={check.id}><span className={check.ready ? "admin-check-ok" : "admin-check-pending"}>{check.ready ? "Ready" : "Review"}</span><div><strong>{check.label}</strong><span>{check.detail}</span></div></div>)}</div></Card><Card className="admin-publish-card"><Text size="1" color="gray" weight="bold">PHASE 5A LIMIT</Text><Heading as="h2" size="5">Publishing is not live yet</Heading><Text as="p" color="gray">This page verifies configuration readiness only. A later phase can add authenticated publishing, deployment, and production WebMCP checks.</Text><Button disabled size="3">Publish website</Button><Text size="1" color="gray">Live action intentionally disabled.</Text></Card></div>;
}
