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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname === "/welcome" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/auth/");
  const isPublic =
    pathname === "/" ||
    pathname === "/pricing" ||
    isAuthRoute ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/preview/");

  // Authed users on /welcome → straight to /app, UNLESS they explicitly
  // came to switch accounts (?switch=1). Sign-out and account-deletion
  // flows now redirect to "/" (the marketing landing) instead of
  // /welcome, so ?signedout / ?deleted no longer need to bypass here.
  if (user && pathname === "/welcome" && !request.nextUrl.searchParams.has("switch")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // Authed user on the marketing landing → straight to /app. EXCEPT
  // when they just came back from sign-out or account deletion (the
  // session cookie should already be cleared by then; this is a
  // defense-in-depth for the edge case where the cookie purge raced
  // with the redirect). Letting these users see the landing once is
  // fine — they explicitly chose to leave.
  const hasLandingFlash =
    request.nextUrl.searchParams.has("signedout") || request.nextUrl.searchParams.has("deleted");
  if (user && pathname === "/" && !hasLandingFlash) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // Anon users on protected routes → /welcome
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
