import { randomBytes } from "node:crypto";
import { currentUserCanConnectChannels } from "@/lib/actions/collaboration";
import { buildGmailAuthUrl } from "@/lib/gmail";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Kick off the Gmail OAuth flow. Requires an authenticated Supabase user;
 * we sign a short-lived state token tying the OAuth round-trip back to that
 * user so the callback can resolve it without exposing the user id in the URL.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", "/app/settings/connections");
    return NextResponse.redirect(url);
  }
  if (!(await currentUserCanConnectChannels())) {
    return NextResponse.redirect(
      new URL("/app/settings/connections?error=permission_denied", request.url)
    );
  }

  const state = randomBytes(24).toString("hex");
  const authUrl = buildGmailAuthUrl(state);
  const isPopup = request.nextUrl.searchParams.get("popup") === "1";

  const res = NextResponse.redirect(authUrl);
  // 10-minute httpOnly cookie carrying (user id, state, popup flag) so the
  // callback can validate against CSRF and know how to close the loop.
  res.cookies.set("fs_gmail_oauth", `${user.id}.${state}.${isPopup ? "1" : "0"}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
