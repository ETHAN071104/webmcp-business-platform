import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { mutateAdminWorkspace } from "@/features/admin/operations";
import { createSupabaseAdminRepository } from "@/features/admin/supabase-repository";

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    const command = await request.json();
    const workspace = await mutateAdminWorkspace(createSupabaseAdminRepository(), businessId, command);
    if (!workspace) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    revalidatePath(`/admin/business/${businessId}`);
    revalidatePath(`/admin-preview/${businessId}`);
    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save changes." }, { status: 400 });
  }
}
