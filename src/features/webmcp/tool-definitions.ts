import {
  getEnabledAgentToolNames,
  type CapabilityState,
} from "@/features/capabilities/capabilities";
import { WEBMCP_INPUT_SCHEMAS } from "@/features/webmcp/schemas";
import type { WebMCPToolName } from "@/features/webmcp/types";

export type WebMCPToolMetadata = {
  name: WebMCPToolName;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
};

const metadata = (
  name: WebMCPToolName,
  title: string,
  description: string,
  readOnly: boolean,
): WebMCPToolMetadata => ({ name, title, description, inputSchema: WEBMCP_INPUT_SCHEMAS[name], readOnly });

export const WEBMCP_TOOL_DEFINITIONS: Record<WebMCPToolName, WebMCPToolMetadata> = {
  get_business_info: metadata("get_business_info", "Get business information", "Return safe public contact, location, description, and timezone details for this business.", true),
  list_services: metadata("list_services", "List services", "List active services offered by this business, optionally filtered by category or maximum price.", true),
  get_service_details: metadata("get_service_details", "Get service details", "Return the public price, duration, and description for one service offered by this business.", true),
  recommend_service: metadata("recommend_service", "Recommend a service", "Deterministically recommend the best matching service for an occasion, preference, budget, and optional appointment constraints.", true),
  list_staff: metadata("list_staff", "List staff", "List active team members, optionally limited to people eligible to perform a specific service.", true),
  get_available_slots: metadata("get_available_slots", "Find available appointment times", "Find available appointment times for a service on a given date, optionally after a time or with a specific staff member.", true),
  create_booking: metadata("create_booking", "Create booking", "Create and confirm a real appointment in this business's booking system. This changes business state.", false),
  update_booking: metadata("update_booking", "Update booking", "Reschedule a verified customer booking to a new date, time, or eligible staff member. This changes business state.", false),
  cancel_booking: metadata("cancel_booking", "Cancel booking", "Cancel a verified customer booking and release its appointment slot. This changes business state.", false),
};

export function getAllWebMCPToolDefinitions(): WebMCPToolMetadata[] {
  return Object.values(WEBMCP_TOOL_DEFINITIONS);
}

export function getWebMCPToolDefinitions(capabilities: CapabilityState): WebMCPToolMetadata[] {
  return getEnabledAgentToolNames(capabilities).map((name) => WEBMCP_TOOL_DEFINITIONS[name]);
}
