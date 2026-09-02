"use client";

import { useEffect } from "react";

import { registerBusinessTools, waitForWebMCPModelContext } from "@/features/webmcp/register-business-tools";
import { WEBMCP_TOOL_DEFINITIONS } from "@/features/webmcp/tool-definitions";
import type { WebMCPToolName } from "@/features/webmcp/types";
import { WebMCPDiagnosticsPanel } from "@/features/webmcp/webmcp-diagnostics-panel";

export function WebMCPBusinessProvider({
  businessSlug,
  agentToolProjection,
}: {
  businessSlug: string;
  agentToolProjection: WebMCPToolName[];
}) {
  const toolProjectionKey = agentToolProjection.join("\u0000");

  useEffect(() => {
    let disposed = false;
    let registration: ReturnType<typeof registerBusinessTools> | null = null;
    const readinessController = new AbortController();

    const definitions = toolProjectionKey
      .split("\u0000")
      .filter(Boolean)
      .map((name) => WEBMCP_TOOL_DEFINITIONS[name as WebMCPToolName]);
    void waitForWebMCPModelContext(document, { signal: readinessController.signal }).then((modelContext) => {
      if (!modelContext || disposed) {
        if (!disposed) console.debug("[WebMCP] modelContext unavailable after bounded readiness retries", { businessSlug });
        return;
      }

      console.debug("[WebMCP] modelContext detected", { businessSlug });
      registration = registerBusinessTools(modelContext, businessSlug, definitions);
      void registration.ready.catch(() => undefined);
    });

    return () => {
      disposed = true;
      readinessController.abort();
      registration?.dispose();
    };
  }, [businessSlug, toolProjectionKey]);

  return businessSlug === "aria-hair"
    ? <WebMCPDiagnosticsPanel key={businessSlug} businessSlug={businessSlug} expectedToolCount={agentToolProjection.length} />
    : null;
}
