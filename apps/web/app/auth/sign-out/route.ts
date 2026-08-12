import { getRequiredSupabaseEnv } from "@/lib/supabase/env";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Sign-out endpoint. Must aggressively clear the Supabase auth cookies
 * AND any client-side hints — when we used the default
 * `supabase.auth.signOut()` + NextResponse.redirect pattern, the cookies
 * set via cookies() weren't always attached to the explicit redirect
 * response, leaving the next page-load still authenticated as the
 * "signed-out" user. That's how stale sessions leaked across account
 * switches.
 *
 * Belt-and-suspenders here:
 *  1. Call supabase.auth.signOut() so the server invalidates the session.
 *  2. Walk every cookie that starts with `sb-` and explicitly delete it
 *     on the outgoing redirect response.
 *  3. Redirect to /app so Freescale stays app-only after the session is
 *     cleared.
 */
async function handleSignOut(request: NextRequest) {
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
          /* RSC context — ignore */
        }
      },
    },
  });
  // Server-side session invalidation
  try {
    await supabase.auth.signOut();
  } catch {
    // Network blip — fall through to local cookie purge regardless.
  }

  const response = NextResponse.redirect(new URL("/app", request.url), { status: 303 });

  // Hard-delete every sb-* cookie on the response. This is the fix for the
  // "I signed out but still see the old account" bug.
  const all = cookieStore.getAll();
  for (const c of all) {
    if (c.name.startsWith("sb-")) {
      response.cookies.delete(c.name);
      // Also set an expired cookie as belt-and-suspenders for browsers
      // that ignore plain delete in this Next.js version.
      response.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    }
  }

  return response;
}

export async function POST(request: NextRequest) {
  return handleSignOut(request);
}

export async function GET(request: NextRequest) {
  return handleSignOut(request);
}
