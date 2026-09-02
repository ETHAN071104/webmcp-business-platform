import { callBusinessAgentTool } from "@/features/webmcp/tool-adapters";
import type { WebMCPToolMetadata } from "@/features/webmcp/tool-definitions";
import type { WebMCPDocument, WebMCPModelContext, WebMCPTool } from "@/features/webmcp/types";
import { emitWebMCPDiagnostics } from "@/features/webmcp/diagnostics";

export type WebMCPRegistration = {
  names: string[];
  ready: Promise<void>;
  dispose(): void;
};

type ActiveRegistration = {
  key: string;
  registration: WebMCPRegistration;
};

const activeRegistrations = new WeakMap<WebMCPModelContext, ActiveRegistration>();

const DEFAULT_MODEL_CONTEXT_RETRY_DELAYS = [50, 100, 250, 500, 1_000, 2_000] as const;

export type WebMCPModelContextWaitOptions = {
  signal?: AbortSignal;
  retryDelaysMs?: readonly number[];
};

function debugWebMCP(message: string, details?: Record<string, unknown>): void {
  if (typeof console === "undefined") return;
  if (details) {
    console.debug(`[WebMCP] ${message}`, details);
  } else {
    console.debug(`[WebMCP] ${message}`);
  }
}

function formatRegistrationError(error: unknown): string {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown registration error";
  return message.slice(0, 240);
}

export function getWebMCPModelContext(source: Document): WebMCPModelContext | null {
  const context = (source as WebMCPDocument).modelContext;
  return context?.registerTool ? context : null;
}

export function waitForWebMCPModelContext(
  source: Document,
  options: WebMCPModelContextWaitOptions = {},
): Promise<WebMCPModelContext | null> {
  const retryDelays = options.retryDelaysMs ?? DEFAULT_MODEL_CONTEXT_RETRY_DELAYS;

  return new Promise((resolve) => {
    let settled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryIndex = 0;

    const finish = (context: WebMCPModelContext | null) => {
      if (settled) return;
      settled = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      options.signal?.removeEventListener("abort", onAbort);
      resolve(context);
    };

    const onAbort = () => finish(null);

    const check = () => {
      if (options.signal?.aborted) {
        finish(null);
        return;
      }

      const context = getWebMCPModelContext(source);
      if (context) {
        emitWebMCPDiagnostics({ type: "model_context", status: "detected" });
        finish(context);
        return;
      }

      if (retryIndex === 0) {
        debugWebMCP("modelContext not detected; retrying");
        emitWebMCPDiagnostics({ type: "model_context", status: "missing" });
      }

      if (retryIndex >= retryDelays.length) {
        debugWebMCP("modelContext unavailable after bounded readiness retries");
        emitWebMCPDiagnostics({ type: "model_context", status: "unavailable" });
        finish(null);
        return;
      }

      retryTimer = setTimeout(check, retryDelays[retryIndex]);
      retryIndex += 1;
    };

    if (options.signal?.aborted) {
      finish(null);
      return;
    }

    options.signal?.addEventListener("abort", onAbort, { once: true });
    check();
  });
}

export function registerBusinessTools(
  modelContext: WebMCPModelContext,
  businessSlug: string,
  definitions: WebMCPToolMetadata[],
): WebMCPRegistration {
  const names = definitions.map((definition) => definition.name);
  const key = `${businessSlug}\u0000${names.join("\u0000")}`;
  const active = activeRegistrations.get(modelContext);
  if (active?.key === key) return active.registration;
  active?.registration.dispose();

  const controller = new AbortController();
  const tools: WebMCPTool[] = definitions.map((definition) => ({
    name: definition.name,
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    annotations: definition.readOnly ? { readOnlyHint: true } : undefined,
    execute: (input, options) => callBusinessAgentTool(businessSlug, definition.name, input, options?.signal),
  }));

  debugWebMCP("registration started", { businessSlug, toolCount: tools.length });
  emitWebMCPDiagnostics({ type: "registration_started", businessSlug, expectedToolCount: tools.length });

  let registration: WebMCPRegistration | null = null;
  const ready = Promise.all(
    tools.map(async (tool) => {
      try {
        await modelContext.registerTool(tool, { signal: controller.signal });
        if (!controller.signal.aborted) {
          debugWebMCP("tool registered", { name: tool.name });
          emitWebMCPDiagnostics({ type: "tool_registered", name: tool.name });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const formattedError = formatRegistrationError(error);
          console.warn("[WebMCP] tool registration failed", { name: tool.name, error: formattedError });
          emitWebMCPDiagnostics({ type: "tool_registration_failed", name: tool.name, error: formattedError });
        }
        throw error;
      }
    }),
  ).then(() => undefined).catch((error: unknown) => {
    if (!controller.signal.aborted) {
      controller.abort();
      if (registration && activeRegistrations.get(modelContext)?.registration === registration) {
        activeRegistrations.delete(modelContext);
      }
      throw error;
    }
  });

  registration = {
    names,
    ready,
    dispose() {
      if (controller.signal.aborted) return;
      controller.abort();
      debugWebMCP("cleanup/unregistration", { businessSlug, toolCount: tools.length });
      emitWebMCPDiagnostics({ type: "cleanup", businessSlug, toolCount: tools.length });
      if (activeRegistrations.get(modelContext)?.registration === registration) activeRegistrations.delete(modelContext);
    },
  };
  activeRegistrations.set(modelContext, { key, registration });
  return registration;
}
