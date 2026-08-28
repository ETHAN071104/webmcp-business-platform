"use client";

import { useEffect } from "react";

import { getWebMCPModelContext, registerBusinessTools } from "@/features/webmcp/register-business-tools";
import { WEBMCP_TOOL_DEFINITIONS } from "@/features/webmcp/tool-definitions";
import type { WebMCPToolName } from "@/features/webmcp/types";

export function WebMCPBusinessProvider({
  businessSlug,
  agentToolProjection,
}: {
  businessSlug: string;
  agentToolProjection: WebMCPToolName[];
}) {
  useEffect(() => {
    const modelContext = getWebMCPModelContext(document);
    if (!modelContext) return;

    const definitions = agentToolProjection.map((name) => WEBMCP_TOOL_DEFINITIONS[name]);
    const registration = registerBusinessTools(modelContext, businessSlug, definitions);
    void registration.ready.catch((error: unknown) => {
      if (process.env.NODE_ENV === "development") console.warn("WebMCP tool registration failed", error);
    });
    return () => registration.dispose();
  }, [businessSlug, agentToolProjection]);

  return null;
}
