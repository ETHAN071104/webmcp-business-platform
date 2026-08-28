import { createSupabaseBookingRepository } from "@/features/bookings/supabase-repository";
import { createSupabaseBusinessRuntimeRepository } from "@/features/businesses/supabase-repository";
import { executeBusinessAgentTool } from "@/features/webmcp/server-adapters";
import { WEBMCP_TOOL_DEFINITIONS } from "@/features/webmcp/tool-definitions";
import type { WebMCPToolName } from "@/features/webmcp/types";

type Context = { params: Promise<{ slug: string; tool: string }> };

function isToolName(value: string): value is WebMCPToolName {
  return Object.hasOwn(WEBMCP_TOOL_DEFINITIONS, value);
}

export async function POST(request: Request, { params }: Context) {
  const { slug, tool } = await params;
  if (!isToolName(tool)) {
    return Response.json({ success: false, error: "tool_not_found", message: "Unknown business tool." }, { status: 404 });
  }

  let input: unknown;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) throw new Error("invalid content type");
    input = await request.json();
  } catch {
    return Response.json({ success: false, error: "invalid_input", message: "Send a JSON object as the tool input." }, { status: 400 });
  }

  const result = await executeBusinessAgentTool(
    {
      businesses: createSupabaseBusinessRuntimeRepository(),
      bookings: createSupabaseBookingRepository(),
    },
    slug,
    tool,
    input,
  );
  return Response.json(result, { status: result.success ? 200 : 400 });
}
