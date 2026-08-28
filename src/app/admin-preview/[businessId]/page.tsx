import { notFound } from "next/navigation";

import { ServiceBusinessTemplate } from "@/components/business/service-business-template";
import { createSupabaseAdminRepository } from "@/features/admin/supabase-repository";

export const dynamic = "force-dynamic";

export default async function AdminWebsitePreview({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const workspace = await createSupabaseAdminRepository().getWorkspace(businessId);
  if (!workspace) notFound();
  return <ServiceBusinessTemplate runtime={workspace.previewRuntime} />;
}
