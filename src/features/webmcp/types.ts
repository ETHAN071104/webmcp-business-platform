import type { FutureAgentToolName } from "@/features/capabilities/capabilities";

export type WebMCPToolName = FutureAgentToolName;

export type JsonSchema = Record<string, unknown>;

export type WebMCPExecuteOptions = {
  signal?: AbortSignal;
};

export type WebMCPTool = {
  name: WebMCPToolName;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute(input: Record<string, unknown>, options?: WebMCPExecuteOptions): Promise<unknown>;
};

export type WebMCPModelContext = {
  registerTool(
    tool: WebMCPTool,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
};

export type WebMCPDocument = Document & {
  modelContext?: WebMCPModelContext;
};

export type AgentToolSuccess = { success: true } & Record<string, unknown>;
export type AgentToolFailure = {
  success: false;
  error: string;
  message: string;
};
export type AgentToolResult = AgentToolSuccess | AgentToolFailure;
