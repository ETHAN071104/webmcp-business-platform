import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServiceBusinessTemplate } from "@/components/business/service-business-template";
import { getEnabledAgentToolNames } from "@/features/capabilities/capabilities";
import { WebMCPBusinessProvider } from "@/features/webmcp/webmcp-business-provider";
import { getPublishedBusinessRuntimeBySlug } from "@/lib/runtime/server";

export const dynamic = "force-dynamic";

type BusinessPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BusinessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const runtime = await getPublishedBusinessRuntimeBySlug(slug);

  if (!runtime) return {};

  return {
    title: runtime.business.name,
    description: runtime.business.description,
  };
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { slug } = await params;
  const runtime = await getPublishedBusinessRuntimeBySlug(slug);

  if (!runtime) notFound();

  return (
    <>
      <WebMCPBusinessProvider
        businessSlug={runtime.business.slug}
        agentToolProjection={getEnabledAgentToolNames(runtime.capabilities)}
      />
      <ServiceBusinessTemplate runtime={runtime} />
    </>
  );
}
