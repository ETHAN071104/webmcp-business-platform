import { canUseOperation, getEnabledAgentToolNames } from "@/features/capabilities/capabilities";
import type { AdminWorkspace } from "@/features/admin/types";

export type ReadinessCheck = { id: string; label: string; ready: boolean; detail: string };

export function getPublishReadiness(workspace: AdminWorkspace): ReadinessCheck[] {
  const activeServices = workspace.services.filter((item) => item.active);
  const activeStaff = workspace.staff.filter((item) => item.active);
  const mappedStaff = activeStaff.filter((person) => (workspace.staffServiceIds[person.id] ?? []).some((id) => activeServices.some((service) => service.id === id)));
  const availableStaff = new Set(workspace.availability.filter((rule) => rule.active).map((rule) => rule.staffId));
  const bookingConfigured = mappedStaff.some((person) => availableStaff.has(person.id));
  const bookingEffective = canUseOperation(workspace.capabilities, "create_booking");

  return [
    { id: "identity", label: "Business identity", ready: Boolean(workspace.business.name.trim() && workspace.business.slug.trim() && workspace.business.description?.trim()), detail: "Name, URL slug, and description are complete." },
    { id: "services", label: "Active services", ready: !workspace.capabilities.services || activeServices.length > 0, detail: workspace.capabilities.services ? `${activeServices.length} active service${activeServices.length === 1 ? "" : "s"}.` : "Services are disabled." },
    { id: "staff", label: "Active staff", ready: !workspace.capabilities.staff || activeStaff.length > 0, detail: workspace.capabilities.staff ? `${activeStaff.length} active staff member${activeStaff.length === 1 ? "" : "s"}.` : "Staff is disabled." },
    { id: "booking", label: "Booking setup", ready: !bookingEffective || bookingConfigured, detail: !bookingEffective ? "Booking tools are not currently effective." : "At least one active staff member needs a service mapping and availability." },
    { id: "agent", label: "Agent tools", ready: getEnabledAgentToolNames(workspace.capabilities).length > 0, detail: `${getEnabledAgentToolNames(workspace.capabilities).length} agent tools will be available.` },
  ];
}

export function isReadyToPublish(workspace: AdminWorkspace): boolean {
  return getPublishReadiness(workspace).every((check) => check.ready);
}
