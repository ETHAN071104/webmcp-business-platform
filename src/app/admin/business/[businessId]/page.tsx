import { redirect } from "next/navigation";

export default async function BusinessAdminIndex({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  redirect(`/admin/business/${businessId}/template`);
}
