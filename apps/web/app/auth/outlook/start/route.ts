import { randomBytes } from "node:crypto";
import { currentUserCanConnectChannels } from "@/lib/actions/collaboration";
import { buildOutlookAuthUrl } from "@/lib/outlook";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

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
  const isPopup = request.nextUrl.searchParams.get("popup") === "1";
  const res = NextResponse.redirect(buildOutlookAuthUrl(state));
  res.cookies.set("fs_outlook_oauth", `${user.id}.${state}.${isPopup ? "1" : "0"}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
