import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredEnvironmentValue(name: string, fallbackName?: string): string {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);

  if (!value) {
    throw new Error(
      `Missing ${name}${fallbackName ? ` (or ${fallbackName})` : ""}. ` +
        "Copy .env.example to .env.local and add your Supabase project values.",
    );
  }

  return value;
}

export function createPublicSupabaseClient(): SupabaseClient {
  const url = requiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = requiredEnvironmentValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createServiceRoleSupabaseClient(): SupabaseClient {
  const url = requiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = requiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
