import type { BusinessRuntime } from "@/types/business";

export const CAPABILITIES = [
  "services",
  "staff",
  "booking",
  "faq",
  "gallery",
  "reviews",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type CapabilityState = Record<Capability, boolean>;
export type CapabilityWebsiteSection = "services" | "staff" | "booking" | "faq" | "gallery" | "reviews";
export type AgentToolGroup = "Discover" | "Booking";

type OperationDefinition = {
  requiredCapabilities: readonly Capability[];
  agentGroup: AgentToolGroup | null;
};

export const CAPABILITY_DEFINITIONS = {
  services: {
    websiteSections: ["services"],
    websiteRequirements: ["services"],
    operations: {
      list_services: { requiredCapabilities: ["services"], agentGroup: "Discover" },
      get_service_details: { requiredCapabilities: ["services"], agentGroup: "Discover" },
      recommend_service: { requiredCapabilities: ["services"], agentGroup: "Discover" },
    },
  },
  staff: {
    websiteSections: ["staff"],
    websiteRequirements: ["staff"],
    operations: {
      list_staff: { requiredCapabilities: ["staff"], agentGroup: "Discover" },
    },
  },
  booking: {
    websiteSections: ["booking"],
    websiteRequirements: ["booking", "services", "staff"],
    operations: {
      get_available_slots: { requiredCapabilities: ["booking", "services", "staff"], agentGroup: "Booking" },
      create_booking: { requiredCapabilities: ["booking", "services", "staff"], agentGroup: "Booking" },
      update_booking: { requiredCapabilities: ["booking", "services", "staff"], agentGroup: "Booking" },
      cancel_booking: { requiredCapabilities: ["booking"], agentGroup: "Booking" },
      get_booking: { requiredCapabilities: ["booking"], agentGroup: null },
      get_reschedule_slots: { requiredCapabilities: ["booking", "services", "staff"], agentGroup: null },
    },
  },
  faq: {
    websiteSections: ["faq"],
    websiteRequirements: ["faq"],
    operations: {},
  },
  gallery: {
    websiteSections: ["gallery"],
    websiteRequirements: ["gallery"],
    operations: {},
  },
  reviews: {
    websiteSections: ["reviews"],
    websiteRequirements: ["reviews"],
    operations: {},
  },
} as const satisfies Record<Capability, {
  websiteSections: readonly CapabilityWebsiteSection[];
  websiteRequirements: readonly Capability[];
  operations: Record<string, OperationDefinition>;
}>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
type CapabilityOperationMaps = (typeof CAPABILITY_DEFINITIONS)[Capability]["operations"];
export type BackendOperationName = KeysOfUnion<CapabilityOperationMaps>;
export type FutureAgentToolName = Exclude<BackendOperationName, "get_booking" | "get_reschedule_slots"> | "get_business_info";

const BASELINE_AGENT_TOOLS = [
  { name: "get_business_info" as const, group: "Discover" as const },
];

function operationEntries(): Array<[BackendOperationName, OperationDefinition]> {
  return CAPABILITIES.flatMap((capability) =>
    Object.entries(CAPABILITY_DEFINITIONS[capability].operations) as Array<[BackendOperationName, OperationDefinition]>,
  );
}

export function getOperationDefinition(operation: BackendOperationName): OperationDefinition {
  const definition = operationEntries().find(([name]) => name === operation)?.[1];
  if (!definition) throw new Error(`Unknown backend operation: ${operation}`);
  return definition;
}

export function canUseOperation(
  capabilities: CapabilityState,
  operation: BackendOperationName,
): boolean {
  return getOperationDefinition(operation).requiredCapabilities.every((capability) => capabilities[capability]);
}

export function getMissingOperationCapabilities(
  capabilities: CapabilityState,
  operation: BackendOperationName,
): Capability[] {
  return getOperationDefinition(operation).requiredCapabilities.filter((capability) => !capabilities[capability]);
}

export function getMissingCapabilityRequirements(
  capabilities: CapabilityState,
  capability: Capability,
): Capability[] {
  return CAPABILITY_DEFINITIONS[capability].websiteRequirements.filter(
    (requirement) => !capabilities[requirement],
  );
}

export function isCapabilityEffective(
  capabilities: CapabilityState,
  capability: Capability,
): boolean {
  return getMissingCapabilityRequirements(capabilities, capability).length === 0;
}

export function canRenderCapabilitySection(
  capabilities: CapabilityState,
  section: CapabilityWebsiteSection,
): boolean {
  const owner = CAPABILITIES.find((capability) => CAPABILITY_DEFINITIONS[capability].websiteSections.includes(section as never));
  if (!owner) return false;
  return isCapabilityEffective(capabilities, owner);
}

export function getEnabledAgentToolNames(capabilities: CapabilityState): FutureAgentToolName[] {
  const enabledOperations = operationEntries().flatMap(([name, definition]) =>
    definition.agentGroup && canUseOperation(capabilities, name) ? [name as FutureAgentToolName] : [],
  );
  return [...BASELINE_AGENT_TOOLS.map((tool) => tool.name), ...enabledOperations];
}

export type AgentCapabilityPreviewGroup = {
  group: AgentToolGroup;
  tools: Array<{ name: FutureAgentToolName; enabled: boolean }>;
};

export function getAgentCapabilityPreview(capabilities: CapabilityState): AgentCapabilityPreviewGroup[] {
  const tools = [
    ...BASELINE_AGENT_TOOLS.map((tool) => ({ ...tool, enabled: true })),
    ...operationEntries().flatMap(([name, definition]) => definition.agentGroup ? [{
      name: name as FutureAgentToolName,
      group: definition.agentGroup,
      enabled: canUseOperation(capabilities, name),
    }] : []),
  ];
  return (["Discover", "Booking"] as const).map((group) => ({
    group,
    tools: tools.filter((tool) => tool.group === group).map(({ name, enabled }) => ({ name, enabled })),
  }));
}

export function hasCapability(
  runtime: Pick<BusinessRuntime, "capabilities">,
  capability: Capability,
): boolean {
  return runtime.capabilities[capability];
}

export class CapabilityDisabledError extends Error {
  readonly code = "capability_not_enabled";

  constructor(
    readonly businessId: string,
    readonly capability: Capability,
  ) {
    super(`Capability "${capability}" is disabled for business ${businessId}.`);
    this.name = "CapabilityDisabledError";
  }
}

export class CapabilityOperationDisabledError extends Error {
  readonly code = "capability_not_enabled";

  constructor(
    readonly businessId: string,
    readonly operation: BackendOperationName,
    readonly missingCapabilities: Capability[],
  ) {
    super(`Operation "${operation}" is unavailable because required business capabilities are disabled.`);
    this.name = "CapabilityOperationDisabledError";
  }
}
