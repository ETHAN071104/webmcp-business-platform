import type { AgentToolFailure, AgentToolResult, WebMCPToolName } from "@/features/webmcp/types";

const transportFailure = (message: string): AgentToolFailure => ({
  success: false,
  error: "transport_error",
  message,
});

export async function callBusinessAgentTool(
  businessSlug: string,
  toolName: WebMCPToolName,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<AgentToolResult> {
  try {
    const response = await fetch(
      `/api/business/${encodeURIComponent(businessSlug)}/agent/tools/${encodeURIComponent(toolName)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        credentials: "same-origin",
        signal,
      },
    );
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("success" in result)) {
      return transportFailure("The business returned an invalid tool response.");
    }
    return result as AgentToolResult;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return transportFailure("The business tool could not reach the booking service. Please try again.");
  }
}
