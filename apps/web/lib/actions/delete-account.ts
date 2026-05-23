"use server";

import { getRequiredSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * GDPR-compliant account deletion (right to be forgotten).
 *
 * Calls the public.delete_user() Postgres RPC, which is SECURITY
 * DEFINER and removes the caller's auth.users row. That delete
 * cascades through profiles → workspaces → channel_accounts /
 * conversations / messages / contacts / tasks / events / etc., so
 * every piece of user-owned data — INCLUDING encrypted Gmail
 * tokens at rest — is purged in one transaction.
 *
 * After the RPC succeeds we aggressively clear the sb-* cookies on
 * the way out (same belt-and-suspenders treatment as /auth/sign-out)
 * so the next page-load is anonymous and the user can never
 * accidentally land back on a stale session.
 */
export async function deleteMyAccount(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Trigger the cascading delete. If this returns OK, the auth.users
  // row is gone and the current session token is now invalid.
  const { error } = await supabase.rpc("delete_user");
  if (error) return { ok: false, error: error.message };

  // Belt-and-suspenders: explicitly purge every sb-* cookie from the
  // response so the client can't keep using a stale (now-invalid)
  // token. Same pattern as /auth/sign-out, copied here because the
  // server-action path uses cookies() directly.
  try {
    const cookieStore = await cookies();
    for (const c of cookieStore.getAll()) {
      if (c.name.startsWith("sb-")) {
        cookieStore.delete(c.name);
      }
    }
  } catch {
    // Server-action context — cookies() in a "use server" call has
    // narrower abilities than a route handler. If it throws we still
    // succeed; the user will be signed out on the next request when
    // the API rejects the now-invalid token.
  }

  return { ok: true, error: null };
}

/**
 * Convenience: builds a fresh Supabase client (NOT the cached
 * createClient one) for environments where we need to verify the
 * RPC succeeded without re-using the cached session. Kept exported
 * so the settings page can do a post-delete sanity check.
 */
export async function verifyAccountGone(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabaseUrl = getRequiredSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  type CookieSetOptions = NonNullable<Parameters<typeof cookieStore.set>[2]>;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options as CookieSetOptions);
          }
        } catch {
          /* noop */
        }
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  return !data.user;
}
