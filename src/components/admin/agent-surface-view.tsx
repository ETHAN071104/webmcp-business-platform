import { Badge, Card, Heading, Text } from "@radix-ui/themes";

import type { AdminWorkspace } from "@/features/admin/types";
import {
  getAgentSurfaceProjection,
  type CapabilitySurface,
  type SurfaceTool,
} from "@/features/capabilities/surface-projection";
import type { Capability } from "@/features/capabilities/capabilities";

const CAPABILITY_LABELS: Record<Capability, string> = {
  services: "Services",
  staff: "Staff",
  booking: "Booking",
  faq: "FAQs",
  gallery: "Gallery",
  reviews: "Reviews",
};

function requirementsLabel(requirements: readonly Capability[]) {
  return requirements.length
    ? requirements.map((requirement) => CAPABILITY_LABELS[requirement]).join(" + ")
    : "Always available";
}

function StateMark({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return (
    <li data-enabled={enabled}>
      <span aria-hidden="true">{enabled ? "✓" : "○"}</span>
      <span>{children}</span>
    </li>
  );
}

function ArchitectureFlow() {
  return (
    <Card className="agent-architecture-card">
      <div className="agent-section-heading">
        <div>
          <Text size="1" color="indigo" weight="bold">ONE SOURCE OF TRUTH</Text>
          <Heading as="h3" size="4">Configure once. Serve humans and agents.</Heading>
        </div>
      </div>
      <div className="agent-architecture-flow" aria-label="Business configuration flows through the canonical capability registry to the human website, backend permissions, and WebMCP tools">
        <div className="agent-flow-node">Business configuration</div>
        <span className="agent-flow-arrow" aria-hidden="true">↓</span>
        <div className="agent-flow-node agent-flow-node-primary">Canonical capability registry</div>
        <span className="agent-flow-arrow" aria-hidden="true">↓</span>
        <div className="agent-flow-branches">
          <div className="agent-flow-node"><strong>Human Website</strong><span>Visible sections and routes</span></div>
          <div className="agent-flow-node"><strong>Backend</strong><span>Allowed domain operations</span></div>
          <div className="agent-flow-node"><strong>Agent / WebMCP</strong><span>Registered structured tools</span></div>
        </div>
        <span className="agent-flow-arrow" aria-hidden="true">↓</span>
        <div className="agent-flow-node">Shared domain and state</div>
      </div>
    </Card>
  );
}

function CapabilityConfig({ capabilities }: { capabilities: CapabilitySurface[] }) {
  return (
    <div className="agent-config-layout">
      <Card className="agent-section-card">
        <div className="agent-section-heading">
          <div><Text size="1" color="gray" weight="bold">CURRENT CONFIGURATION</Text><Heading as="h3" size="4">Business capabilities</Heading></div>
          <Badge color="indigo">{capabilities.filter((capability) => capability.effective).length} effective</Badge>
        </div>
        <div className="agent-capability-statuses">
          {capabilities.map((capability) => (
            <div key={capability.id}>
              <span>{capability.label}<code>{capability.id}</code></span>
              <div>
                <Badge color={capability.configured ? "green" : "gray"}>Configured {capability.configured ? "ON" : "OFF"}</Badge>
                {capability.configured && !capability.effective ? <Badge color="amber">Effective OFF</Badge> : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="agent-code-card">
        <Text size="1" color="gray" weight="bold">READ-ONLY BOOLEAN CONFIG</Text>
        <pre aria-label="Current boolean capability configuration"><code><span>capabilities</span> = {"{"}{"\n"}{capabilities.map((capability, index) => `  ${capability.id}: ${capability.configured}${index < capabilities.length - 1 ? "," : ""}`).join("\n")}{"\n}"}</code></pre>
        <Text as="p" size="1" color="gray">Edit these values on the Capabilities page. This panel shows the state driving both interfaces.</Text>
      </Card>
    </div>
  );
}

function CapabilityMapping({ capability }: { capability: CapabilitySurface }) {
  const inactiveReason = capability.missingRequirements.length
    ? `Requires ${requirementsLabel(capability.requirements)}. Missing ${requirementsLabel(capability.missingRequirements)}.`
    : "Disabled by business configuration.";
  return (
    <Card className="agent-mapping-card" data-effective={capability.effective}>
      <div className="agent-mapping-header">
        <div>
          <Text size="1" color="gray" weight="bold">{capability.id.toUpperCase()}</Text>
          <Heading as="h4" size="4">{capability.label}</Heading>
        </div>
        <div>
          <Badge color={capability.configured ? "green" : "gray"}>Configured {capability.configured ? "ON" : "OFF"}</Badge>
          <Badge color={capability.effective ? "green" : "amber"}>Effective {capability.effective ? "ON" : "OFF"}</Badge>
        </div>
      </div>
      {!capability.effective ? <p className="agent-dependency-note">{inactiveReason}</p> : null}
      <div className="agent-surface-columns">
        <section>
          <Text size="1" color="gray" weight="bold">HUMAN SURFACE</Text>
          <ul>{capability.humanItems.map((item) => <StateMark key={item} enabled={capability.effective}>{item}</StateMark>)}</ul>
        </section>
        <section>
          <Text size="1" color="gray" weight="bold">BACKEND</Text>
          {capability.backendOperations.length ? <ul>{capability.backendOperations.map((operation) => <StateMark key={operation.name} enabled={operation.enabled}><code>{operation.name}</code></StateMark>)}</ul> : <p className="agent-empty-mapping">No backend operation required</p>}
        </section>
        <section>
          <Text size="1" color="gray" weight="bold">AGENT SURFACE</Text>
          {capability.agentTools.length ? <ul>{capability.agentTools.map((tool) => <StateMark key={tool.name} enabled={tool.enabled}><code>{tool.name}</code></StateMark>)}</ul> : <p className="agent-empty-mapping">Website-only capability</p>}
        </section>
      </div>
    </Card>
  );
}

function BookingRegistry({ booking }: { booking: CapabilitySurface }) {
  return (
    <Card className="agent-booking-focus">
      <div className="agent-section-heading">
        <div><Text size="1" color="indigo" weight="bold">CANONICAL REGISTRY FOCUS</Text><Heading as="h3" size="5">Booking</Heading></div>
        <Badge color={booking.effective ? "green" : "amber"}>{booking.effective ? "Effective" : "Blocked by dependency"}</Badge>
      </div>
      <div className="agent-registry-grid">
        <div><span>Required capabilities</span><strong>{requirementsLabel(booking.requirements)}</strong></div>
        <div><span>Human</span><strong>{booking.humanItems.join(" / ")}</strong></div>
        <div><span>Backend</span><strong>{booking.backendOperations.map((operation) => operation.name).join(" · ")}</strong></div>
        <div><span>Agent</span><strong>{booking.agentTools.map((tool) => tool.name).join(" · ")}</strong></div>
      </div>
    </Card>
  );
}

function ToolCard({ tool }: { tool: SurfaceTool }) {
  return (
    <div className="agent-tool-card" data-enabled={tool.enabled}>
      <div className="agent-tool-card-top">
        <strong>{tool.title}</strong>
        <Badge color={!tool.enabled ? "gray" : tool.readOnly ? "blue" : "amber"}>{tool.readOnly ? "READ" : "WRITE"}</Badge>
      </div>
      <code>{tool.name}</code>
      <p>{tool.description}</p>
      <div className="agent-tool-meta"><span>Requires: {requirementsLabel(tool.requirements)}</span><span>{tool.enabled ? "Available" : "Unavailable"}</span></div>
    </div>
  );
}

function ExampleJourney({ workspace, bookingEnabled }: { workspace: AdminWorkspace; bookingEnabled: boolean }) {
  const service = workspace.services.find((item) => item.active);
  const staff = workspace.staff.find((item) => item.active);
  const start = workspace.availability.find((item) => item.active)?.startTime ?? "09:00";
  return (
    <Card className="agent-journey-card">
      <div className="agent-section-heading">
        <div><Text size="1" color="indigo" weight="bold">EXAMPLE TOOL PATH</Text><Heading as="h3" size="4">Example Agent Journey</Heading></div>
        <Badge color="gray">Visualization only</Badge>
      </div>
      <blockquote>“I need an appointment this week. What would you recommend?”</blockquote>
      {bookingEnabled ? (
        <ol>
          <li><span>1</span><div><code>recommend_service</code><p>{service ? `${service.name} · RM${service.price}` : "Matching active service"}</p></div></li>
          <li><span>2</span><div><code>get_available_slots</code><p>{staff?.name ?? "Eligible staff"} · {start}</p></div></li>
          <li><span>3</span><div><code>create_booking</code><p>Booking ready for customer confirmation</p></div></li>
        </ol>
      ) : <div className="agent-journey-unavailable"><strong>Booking path unavailable</strong><span>Enable the effective Booking capability to expose availability and booking tools.</span></div>}
      <Text as="p" size="1" color="gray">No tools are invoked on this page. Real invocation belongs to the WebMCP runtime.</Text>
    </Card>
  );
}

export function AgentSurfaceView({ workspace }: { workspace: AdminWorkspace }) {
  const projection = getAgentSurfaceProjection(workspace.capabilities);
  const booking = projection.capabilities.find((capability) => capability.id === "booking")!;
  return (
    <div className="agent-surface-view">
      <Card className="agent-surface-intro">
        <div>
          <Text size="1" color="indigo" weight="bold">AGENT VIEW</Text>
          <Heading as="h2" size="6">Agent Surface</Heading>
          <Text as="p" size="3" color="gray">A visualization of the structured WebMCP surface exposed to AI agents. It is not an interface an agent literally sees.</Text>
        </div>
        <div className="agent-surface-score"><strong>{projection.enabledToolNames.length}</strong><span>of {projection.tools.length} tools available</span></div>
      </Card>
      <ArchitectureFlow />
      <CapabilityConfig capabilities={projection.capabilities} />
      <section className="agent-view-section">
        <div className="agent-view-title"><div><Text size="1" color="gray" weight="bold">ONE MODEL, THREE SURFACES</Text><Heading as="h3" size="5">Human, backend, and agent mapping</Heading></div><Text as="p" size="2" color="gray">Disabled mappings remain visible so capability changes are immediate and obvious.</Text></div>
        <div className="agent-mapping-list">{projection.capabilities.map((capability) => <CapabilityMapping key={capability.id} capability={capability} />)}</div>
      </section>
      <BookingRegistry booking={booking} />
      <section className="agent-view-section">
        <div className="agent-view-title"><div><Text size="1" color="gray" weight="bold">PHASE 4 DEFINITIONS</Text><Heading as="h3" size="5">WebMCP tool catalogue</Heading></div><Text as="p" size="2" color="gray">Friendly labels, exact registered names, access type, and canonical requirements.</Text></div>
        {projection.toolGroups.map((group) => <div className="agent-tool-group" key={group.group}><div className="agent-tool-group-heading"><strong>{group.group}</strong><Badge color="gray">{group.tools.filter((tool) => tool.enabled).length} / {group.tools.length} available</Badge></div><div className="agent-tool-grid">{group.tools.map((tool) => <ToolCard key={tool.name} tool={tool} />)}</div></div>)}
      </section>
      <div className="agent-closing-grid">
        <ExampleJourney workspace={workspace} bookingEnabled={booking.effective} />
        <Card className="agent-difference-card">
          <Text size="1" color="indigo" weight="bold">WHAT MAKES THIS DIFFERENT</Text>
          <Heading as="h3" size="4">One capability model, not two integrations</Heading>
          <Text as="p" size="2" color="gray">Most websites and agent integrations are configured separately. Here, one merchant-owned model controls:</Text>
          <ul><li>what customers see</li><li>what backend actions are allowed</li><li>what WebMCP tools agents can access</li></ul>
        </Card>
      </div>
    </div>
  );
}
