import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptJSON } from "@/lib/encryption";

/**
 * Supabase OAuth callback. Handles both the basic identity exchange AND
 * the Gmail-channel bootstrap so signing in with Google = inbox ready
 * in one click, no separate "Connect Gmail" step.
 *
 * The Supabase session, after exchangeCodeForSession, carries:
 *  - provider_token         : the Google OAuth access token (1h TTL)
 *  - provider_refresh_token : the long-lived refresh token (only present
 *                             if access_type=offline + prompt=consent
 *                             were passed at sign-in time)
 *
 * We capture those, encrypt them with libsodium, and upsert a row in
 * channel_accounts. From there the existing syncGmail / live-fetch
 * paths take over and the user's inbox starts populating.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Sanitize `next`: must be a same-origin relative path that points
  // somewhere in /app. Some flows lose the query param or get it as "/"
  // (e.g. Supabase falling back to Site URL) → in those cases default
  // to /app so the user never lands on the marketing landing post-auth.
  const rawNext = searchParams.get("next") ?? "/app";
  const next =
    rawNext.startsWith("/") && rawNext !== "/" && !rawNext.startsWith("//")
      ? rawNext
      : "/app";

  if (!code) {
    return NextResponse.redirect(`${origin}/welcome?error=missing_code`);
  }

  const supabase = await createClient();
  const { data: sessionData, error: exchangeErr } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr || !sessionData.session) {
    return NextResponse.redirect(`${origin}/welcome?error=auth_callback`);
  }

  const session = sessionData.session;
  const user = session.user;
  const providerToken = session.provider_token;
  const providerRefreshToken = session.provider_refresh_token;
  const userEmail = (user.email ?? "").toLowerCase();

  // Only proceed with the Gmail bootstrap if (a) provider gave us a
  // refresh token (some re-sign-ins don't, even with prompt=consent) and
  // (b) we know the Google email. Otherwise the user is logged in but
  // the channel isn't created — they can still hit Settings → Connect
  // Gmail manually as a fallback (NoChannelsHero on /app surfaces it).
  if (!providerRefreshToken) {
    // eslint-disable-next-line no-console
    console.warn(
      `[auth/callback] no provider_refresh_token for ${userEmail || user.id}` +
        ` — user signed in but Gmail bootstrap skipped.` +
        ` Likely Google didn't re-issue a refresh token because the` +
        ` user previously authorized this app on another account.` +
        ` Fallback: Settings → Connections → Connect Gmail.`
    );
  }
  if (providerToken && providerRefreshToken && userEmail) {
    try {
      // Find the workspace this user owns. The handle_new_user trigger
      // auto-creates one on first sign-in, but it may not exist yet on
      // the very first round-trip — retry a couple of times if missing.
      let workspaceId: string | null = null;
      for (let attempt = 0; attempt < 3 && !workspaceId; attempt++) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        workspaceId = (ws?.id as string | undefined) ?? null;
        if (!workspaceId && attempt < 2) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (workspaceId) {
        const encrypted = await encryptJSON({
          access_token: providerToken,
          refresh_token: providerRefreshToken,
          // Google OAuth access tokens always expire at 3600s by default.
          // getValidAccessToken refreshes automatically on every API call
          // past the expiry — a slightly-pessimistic estimate is fine.
          expires_at: Date.now() + 55 * 60 * 1000,
          scope:
            "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send",
          token_type: "Bearer",
        });

        // Look up an existing Gmail channel for this same Google account.
        // If found, just refresh tokens; otherwise create new.
        const { data: existing } = await supabase
          .from("channel_accounts")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("kind", "gmail")
          .eq("external_id", userEmail)
          .maybeSingle();

        if (existing?.id) {
          await supabase
            .from("channel_accounts")
            .update({
              encrypted_tokens: encrypted,
              status: "active",
            })
            .eq("id", existing.id as string);
        } else {
          await supabase.from("channel_accounts").insert({
            workspace_id: workspaceId,
            kind: "gmail",
            external_id: userEmail,
            display_name:
              (user.user_metadata?.full_name as string | undefined) ?? userEmail,
            encrypted_tokens: encrypted,
            status: "active",
            connected_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Don't block sign-in if the Gmail bootstrap fails — the user is
      // authenticated, they can re-connect Gmail from Settings.
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
