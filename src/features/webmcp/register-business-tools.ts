import { callBusinessAgentTool } from "@/features/webmcp/tool-adapters";
import type { WebMCPToolMetadata } from "@/features/webmcp/tool-definitions";
import type { WebMCPDocument, WebMCPModelContext, WebMCPTool } from "@/features/webmcp/types";

export type WebMCPRegistration = {
  names: string[];
  ready: Promise<void>;
  dispose(): void;
};

const activeRegistrations = new WeakMap<WebMCPModelContext, WebMCPRegistration>();

export function getWebMCPModelContext(source: Document): WebMCPModelContext | null {
  const context = (source as WebMCPDocument).modelContext;
  return context?.registerTool ? context : null;
}

export function registerBusinessTools(
  modelContext: WebMCPModelContext,
  businessSlug: string,
  definitions: WebMCPToolMetadata[],
): WebMCPRegistration {
  activeRegistrations.get(modelContext)?.dispose();

  const controller = new AbortController();
  const tools: WebMCPTool[] = definitions.map((definition) => ({
    name: definition.name,
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    annotations: definition.readOnly ? { readOnlyHint: true } : undefined,
    execute: (input, options) => callBusinessAgentTool(businessSlug, definition.name, input, options?.signal),
  }));

  const ready = Promise.all(
    tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal })),
  ).then(() => undefined).catch((error: unknown) => {
    if (!controller.signal.aborted) {
      controller.abort();
      throw error;
    }
  });

  const registration: WebMCPRegistration = {
    names: tools.map((tool) => tool.name),
    ready,
    dispose() {
      if (!controller.signal.aborted) controller.abort();
      if (activeRegistrations.get(modelContext) === registration) activeRegistrations.delete(modelContext);
    },
  };
  activeRegistrations.set(modelContext, registration);
  return registration;
}
