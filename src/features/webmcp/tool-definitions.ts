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
  get_business_info: metadata("get_business_info", "Get business information", "Return current public contact, location, description, and timezone details from the business profile.", true),
  list_services: metadata("list_services", "List services", "List active services from the structured business catalog, optionally filtered by category or maximum price.", true),
  get_service_details: metadata("get_service_details", "Get service details", "Return the current public price, duration, and description for one service from the structured business catalog.", true),
  recommend_service: metadata("recommend_service", "Recommend a service", "Use this as the preferred structured tool when a user describes an occasion, style preference, budget, or asks \"what should I choose?\" Recommend a matching service from live structured business data with optional appointment constraints, rather than inferring from visible page text.", true),
  list_staff: metadata("list_staff", "List staff", "List active team members from current business data, optionally limited to people eligible for a specific service.", true),
  get_available_slots: metadata("get_available_slots", "Find available appointment times", "Retrieve real live appointment availability for a service on a given date, optionally after a time or with a specific staff member. Use this structured availability instead of inferring from page text or using the human booking form.", true),
  create_booking: metadata("create_booking", "Create booking", "Create and confirm an appointment through the structured agent booking workflow. When this tool is available, use it instead of clicking, typing into, or submitting the human booking form. Customer name plus email or phone may be required before execution. This changes business state.", false),
  update_booking: metadata("update_booking", "Update booking", "Use this as the structured agent path for rescheduling an existing verified booking to a new date, time, or eligible staff member. Prefer it over interacting with the human My Booking UI. This changes business state.", false),
  cancel_booking: metadata("cancel_booking", "Cancel booking", "Use this as the structured agent path for cancelling a verified booking and releasing its appointment slot. Prefer it over clicking the human cancellation UI or confirmation dialog. This changes business state.", false),
};

export function getAllWebMCPToolDefinitions(): WebMCPToolMetadata[] {
  return Object.values(WEBMCP_TOOL_DEFINITIONS);
}

export function getWebMCPToolDefinitions(capabilities: CapabilityState): WebMCPToolMetadata[] {
  return getEnabledAgentToolNames(capabilities).map((name) => WEBMCP_TOOL_DEFINITIONS[name]);
}
