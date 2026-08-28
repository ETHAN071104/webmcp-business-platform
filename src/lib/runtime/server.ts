import "server-only";

import { cache } from "react";

import { createSupabaseBusinessRuntimeRepository } from "@/features/businesses/supabase-repository";
import { loadPublishedBusinessRuntimeBySlug } from "@/lib/runtime/load-runtime";
import type { BusinessRuntime } from "@/types/business";

export const getPublishedBusinessRuntimeBySlug = cache(async function getPublishedBusinessRuntimeBySlug(
  slug: string,
): Promise<BusinessRuntime | null> {
  const repository = createSupabaseBusinessRuntimeRepository();
  return loadPublishedBusinessRuntimeBySlug(repository, slug);
});
