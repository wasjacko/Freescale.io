import { encryptJSON } from "@/lib/encryption";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

type AuthSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function maybeCreateStripeCustomer({
  supabase,
  user,
}: {
  supabase: AuthSupabaseClient;
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> };
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !user.email) return;

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.stripe_customer_id) return;
      if (profile) {
        const stripe = new Stripe(secretKey);
        const customerParams: Stripe.CustomerCreateParams = {
          email: (profile.email as string | null) ?? user.email,
          metadata: { user_id: user.id },
        };
        const name =
          (profile.full_name as string | null) ??
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined);
        if (name) customerParams.name = name;

        const customer = await stripe.customers.create(customerParams);
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customer.id })
          .eq("id", user.id);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch {
    // Never block auth on Stripe. Checkout can lazily create a customer later.
  }
}

/**
 * Supabase OAuth callback. Handles both the basic identity exchange AND
 * the Gmail-channel bootstrap so signing in with Google = inbox ready
 * in one click, no separate "Connect Gmail" step.
 *
 * The Supabase session, after exchangeCodeForSession, carries:
 *  - provider_token         : the Google OAuth access token (1h TTL)
 *  - provider_refresh_token : the long-lived refresh token (returned on
 *                             initial offline authorization, or when the
 *                             user explicitly reconnects Gmail)
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
    rawNext.startsWith("/") && rawNext !== "/" && !rawNext.startsWith("//") ? rawNext : "/app";

  if (!code) return NextResponse.redirect(`${origin}/app?auth_error=missing_code`);

  const supabase = await createClient();
  const { data: sessionData, error: exchangeErr } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr || !sessionData.session) {
    return NextResponse.redirect(`${origin}/app?auth_error=auth_callback`);
  }

  const session = sessionData.session;
  const user = session.user;
  const providerToken = session.provider_token;
  const providerRefreshToken = session.provider_refresh_token;
  const userEmail = (user.email ?? "").toLowerCase();

  await maybeCreateStripeCustomer({ supabase, user });

  // Only proceed with the Gmail bootstrap if (a) provider gave us a
  // refresh token (routine re-sign-ins normally do not issue a new one) and
  // (b) we know the Google email. Otherwise the user is logged in but
  // the channel isn't created — they can still hit Settings → Connect
  // Gmail manually as a fallback (NoChannelsHero on /app surfaces it).
  if (!providerRefreshToken) {
    // eslint-disable-next-line no-console
    console.warn(
      `[auth/callback] no provider_refresh_token for ${userEmail || user.id} — user signed in but Gmail bootstrap skipped. Likely Google didn't re-issue a refresh token because the user previously authorized this app on another account. Fallback: Settings → Connections → Connect Gmail.`
    );
  }
  if (providerToken && providerRefreshToken && userEmail) {
    try {
      // Find the workspace this user owns. The handle_new_user trigger
      // auto-creates one on first sign-in, but it may not exist yet on
      // the very first round-trip — retry a couple of times if missing.
      let workspaceId: string | null = null;
      for (let attempt = 0; attempt < 3 && !workspaceId; attempt++) {
        workspaceId = await getActiveWorkspaceId(supabase, user.id);
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
            display_name: (user.user_metadata?.full_name as string | undefined) ?? userEmail,
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
