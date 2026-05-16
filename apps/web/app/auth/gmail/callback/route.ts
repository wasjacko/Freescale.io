import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptJSON } from "@/lib/encryption";
import { exchangeGmailCode } from "@/lib/gmail";
import { syncGmail } from "@/lib/actions/connections";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/app/settings/connections?error=${encodeURIComponent(error)}`, request.url)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/app/settings/connections?error=missing_code", request.url));
  }

  // CSRF check via cookie
  const stored = request.cookies.get("fs_gmail_oauth")?.value;
  if (!stored) {
    return NextResponse.redirect(new URL("/app/settings/connections?error=state_lost", request.url));
  }
  const [storedUserId, storedState] = stored.split(".");
  if (storedUserId !== user.id || storedState !== state) {
    return NextResponse.redirect(new URL("/app/settings/connections?error=state_mismatch", request.url));
  }

  try {
    const tokens = await exchangeGmailCode(code);
    const encrypted = await encryptJSON({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      scope: tokens.scope,
      token_type: tokens.token_type,
    });

    // Find the user's workspace (first one they own — single-workspace MVP)
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!workspace?.id) {
      return NextResponse.redirect(
        new URL("/app/settings/connections?error=no_workspace", request.url)
      );
    }

    // Upsert channel account
    const { data: account } = await supabase
      .from("channel_accounts")
      .upsert(
        {
          workspace_id: workspace.id,
          kind: "gmail",
          external_id: tokens.email,
          display_name: tokens.email,
          encrypted_tokens: encrypted,
          status: "active",
          connected_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,kind,external_id" }
      )
      .select("id")
      .single();

    // Auto-sync the inbox right after connecting so the user lands on real
    // emails instead of an empty shell. Capped at 50 messages — feels instant,
    // gives Mue real context.
    let synced = 0;
    if (account?.id) {
      try {
        const report = await syncGmail(account.id as string);
        synced = report.newMessages;
      } catch (syncErr) {
        console.error("Initial Gmail sync failed:", syncErr);
        // Don't block the redirect — the user can re-sync manually if needed.
      }
    }

    const res = NextResponse.redirect(
      new URL(
        `/app?connected=gmail&email=${encodeURIComponent(tokens.email)}&synced=${synced}`,
        request.url
      )
    );
    res.cookies.delete("fs_gmail_oauth");
    return res;
  } catch (err) {
    console.error("Gmail OAuth callback failed:", err);
    const msg = err instanceof Error ? err.message : "unknown_error";
    const res = NextResponse.redirect(
      new URL(`/app/settings/connections?error=${encodeURIComponent(msg)}`, request.url)
    );
    res.cookies.delete("fs_gmail_oauth");
    return res;
  }
}
