import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRequiredSupabaseEnv } from "./env";

type CookieTuple = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client.
 * Use in Server Components, Route Handlers, Server Actions, middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();
  type CookieSetOptions = NonNullable<Parameters<typeof cookieStore.set>[2]>;

  return createServerClient(
    getRequiredSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieTuple[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options as CookieSetOptions);
            }
          } catch {
            // setAll called from a Server Component — safe to ignore if
            // a middleware refreshes sessions.
          }
        },
      },
    }
  );
}
