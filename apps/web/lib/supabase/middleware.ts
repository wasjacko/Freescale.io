import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

type CookieTuple = { name: string; value: string; options?: CookieOptions };

/**
 * Middleware-side Supabase client — refreshes the session cookie and
 * exposes the current user. Called from `middleware.ts`.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Graceful degradation: if Supabase isn't configured yet (or still has the
  // placeholder values), skip the auth gate entirely so the app remains usable.
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes("placeholder") ||
    supabaseAnonKey.includes("placeholder")
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieTuple[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        type ResponseCookieOptions = NonNullable<
          Parameters<typeof supabaseResponse.cookies.set>[2]
        >;
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options as ResponseCookieOptions);
        }
      },
    },
  });

  await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isLegacyAuthScreen =
    pathname === "/welcome" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/forgot-password" ||
    pathname === "/auth/reset-password";

  // App-only mode: the product is the entry point. Keep the middleware's
  // Supabase cookie refresh, but never block the SaaS behind the old welcome
  // or auth pages.
  if (pathname === "/" || isLegacyAuthScreen) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
