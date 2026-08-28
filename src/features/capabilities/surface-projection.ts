import {
  CAPABILITIES,
  CAPABILITY_DEFINITIONS,
  getAgentCapabilityPreview,
  getMissingCapabilityRequirements,
  getOperationDefinition,
  isCapabilityEffective,
  type BackendOperationName,
  type Capability,
  type CapabilityState,
  type FutureAgentToolName,
} from "@/features/capabilities/capabilities";
import {
  getAllWebMCPToolDefinitions,
  WEBMCP_TOOL_DEFINITIONS,
} from "@/features/webmcp/tool-definitions";

const CAPABILITY_LABELS: Record<Capability, string> = {
  services: "Services",
  staff: "Staff",
  booking: "Booking",
  faq: "FAQs",
  gallery: "Gallery",
  reviews: "Reviews",
};

// These are presentation labels only. Availability and dependencies always come
// from CAPABILITY_DEFINITIONS and the canonical effective-state helpers.
const HUMAN_SURFACE_LABELS: Record<Capability, readonly string[]> = {
  services: ["Services section", "Service pricing", "Service details"],
  staff: ["Staff section"],
  booking: ["Booking CTA", "Booking page", "My Booking"],
  faq: ["FAQ section"],
  gallery: ["Gallery section"],
  reviews: ["Reviews section"],
};

export type SurfaceOperation = {
  name: BackendOperationName;
  enabled: boolean;
  requirements: Capability[];
};

export type SurfaceTool = {
  name: FutureAgentToolName;
  title: string;
  description: string;
  readOnly: boolean;
  group: "Discover" | "Booking";
  enabled: boolean;
  requirements: Capability[];
};

export type CapabilitySurface = {
  id: Capability;
  label: string;
  configured: boolean;
  effective: boolean;
  requirements: readonly Capability[];
  missingRequirements: Capability[];
  humanItems: readonly string[];
  backendOperations: SurfaceOperation[];
  agentTools: SurfaceTool[];
};

export type AgentSurfaceProjection = {
  capabilities: CapabilitySurface[];
  tools: SurfaceTool[];
  toolGroups: Array<{ group: "Discover" | "Booking"; tools: SurfaceTool[] }>;
  enabledToolNames: FutureAgentToolName[];
};

export function getAgentSurfaceProjection(capabilities: CapabilityState): AgentSurfaceProjection {
  const previewGroups = getAgentCapabilityPreview(capabilities);
  const enabledToolNames = previewGroups
    .flatMap((group) => group.tools)
    .filter((tool) => tool.enabled)
    .map((tool) => tool.name);
  const enabledTools = new Set(enabledToolNames);
  const groupByTool = new Map(
    previewGroups.flatMap((group) => group.tools.map((tool) => [tool.name, group.group] as const)),
  );

  const tools = getAllWebMCPToolDefinitions().map((definition): SurfaceTool => {
    const requirements = definition.name === "get_business_info"
      ? []
      : [...getOperationDefinition(definition.name as BackendOperationName).requiredCapabilities];
    return {
      ...definition,
      group: groupByTool.get(definition.name) ?? "Discover",
      enabled: enabledTools.has(definition.name),
      requirements,
    };
  });

  const capabilitiesProjection = CAPABILITIES.map((capability): CapabilitySurface => {
    const operationNames = Object.keys(CAPABILITY_DEFINITIONS[capability].operations) as BackendOperationName[];
    const backendOperations = operationNames.map((name) => {
      const definition = getOperationDefinition(name);
      return {
        name,
        enabled: definition.requiredCapabilities.every((requirement) => capabilities[requirement]),
        requirements: [...definition.requiredCapabilities],
      };
    });
    return {
      id: capability,
      label: CAPABILITY_LABELS[capability],
      configured: capabilities[capability],
      effective: isCapabilityEffective(capabilities, capability),
      requirements: CAPABILITY_DEFINITIONS[capability].websiteRequirements,
      missingRequirements: getMissingCapabilityRequirements(capabilities, capability),
      humanItems: HUMAN_SURFACE_LABELS[capability],
      backendOperations,
      agentTools: tools.filter((tool) => operationNames.includes(tool.name as BackendOperationName)),
    };
  });

  return {
    capabilities: capabilitiesProjection,
    tools,
    toolGroups: (["Discover", "Booking"] as const).map((group) => ({
      group,
      tools: tools.filter((tool) => tool.group === group),
    })),
    enabledToolNames,
  };
}

export function isPhase4WebMCPTool(name: string): name is FutureAgentToolName {
  return name in WEBMCP_TOOL_DEFINITIONS;
}
