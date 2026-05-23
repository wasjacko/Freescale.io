"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getRequiredSupabaseEnv } from "./env";

/**
 * Browser-side Supabase client.
 * Use in client components, hooks, event handlers.
 */
export function createClient() {
  return createBrowserClient(
    getRequiredSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
