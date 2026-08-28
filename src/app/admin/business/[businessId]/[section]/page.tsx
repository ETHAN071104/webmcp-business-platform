import { notFound } from "next/navigation";

import { AdminConsole } from "@/components/admin/admin-console";
import { isAdminSection } from "@/features/admin/types";
import { createSupabaseAdminRepository } from "@/features/admin/supabase-repository";

export const dynamic = "force-dynamic";

export default async function AdminSectionPage({ params }: { params: Promise<{ businessId: string; section: string }> }) {
  const { businessId, section } = await params;
  if (!isAdminSection(section)) notFound();
  const workspace = await createSupabaseAdminRepository().getWorkspace(businessId);
  if (!workspace) notFound();
  return <AdminConsole initialWorkspace={workspace} section={section} />;
}
