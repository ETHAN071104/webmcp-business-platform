import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { createSupabaseAdminRepository } from "@/features/admin/supabase-repository";

export const dynamic = "force-dynamic";

export default async function BusinessAdminLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const workspace = await createSupabaseAdminRepository().getWorkspace(businessId);
  if (!workspace) notFound();
  return <AdminShell business={workspace.business}>{children}</AdminShell>;
}
