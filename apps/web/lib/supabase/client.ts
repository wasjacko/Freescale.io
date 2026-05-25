"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnvValue } from "./env";

/**
 * Browser-side Supabase client.
 * Use in client components, hooks, event handlers.
 */
export function createClient() {
  return createBrowserClient(
    requireSupabaseEnvValue("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireSupabaseEnvValue(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  );
}
