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
  const [storedUserId, storedState, popupFlag] = stored.split(".");
  if (storedUserId !== user.id || storedState !== state) {
    return NextResponse.redirect(new URL("/app/settings/connections?error=state_mismatch", request.url));
  }
  const isPopup = popupFlag === "1";

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
    // emails instead of an empty shell. We DON'T swallow errors silently
    // anymore — anything that goes wrong is persisted on the channel row
    // so the SyncErrorBanner / Connections page can surface it instead
    // of leaving the user with a blank inbox and no clue why.
    let synced = 0;
    let syncErrorForRedirect: string | null = null;
    if (account?.id) {
      const acctId = account.id as string;
      try {
        const report = await syncGmail(acctId);
        synced = report.newMessages;
        // Sync ran but didn't recover any new messages: either the inbox is
        // truly empty OR thread.get failed on every one of them. We store a
        // friendly note so the user sees "connected, 0 messages — try Sync"
        // rather than a silent empty inbox.
        if (report.errors.length > 0) {
          const firstErr = report.errors[0] ?? "Sync partielle";
          syncErrorForRedirect = firstErr.slice(0, 200);
          await supabase
            .from("channel_accounts")
            .update({
              last_sync_error: `Sync initiale : ${firstErr.slice(0, 500)} (${report.errors.length} au total)`,
              last_sync_error_at: new Date().toISOString(),
            })
            .eq("id", acctId);
        } else if (synced === 0 && report.fetched === 0) {
          await supabase
            .from("channel_accounts")
            .update({
              last_sync_error: "Sync initiale : aucun mail récupéré depuis Gmail (inbox vide ou label INBOX absent).",
              last_sync_error_at: new Date().toISOString(),
            })
            .eq("id", acctId);
          syncErrorForRedirect = "no_messages_found";
        } else {
          // Clear any prior error since the sync clearly recovered.
          await supabase
            .from("channel_accounts")
            .update({
              last_sync_error: null,
              last_sync_error_at: null,
            })
            .eq("id", acctId);
        }
      } catch (syncErr) {
        const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
        console.error("Initial Gmail sync failed:", syncErr);
        syncErrorForRedirect = msg.slice(0, 200);
        await supabase
          .from("channel_accounts")
          .update({
            last_sync_error: `Sync initiale échouée : ${msg.slice(0, 500)}`,
            last_sync_error_at: new Date().toISOString(),
          })
          .eq("id", acctId);
      }
    }

    if (isPopup) {
      const html = renderPopupClose({
        type: "gmail_connected",
        email: tokens.email,
        synced,
        syncError: syncErrorForRedirect,
      });
      const res = new NextResponse(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      res.cookies.delete("fs_gmail_oauth");
      return res;
    }

    const params = new URLSearchParams({
      connected: "gmail",
      email: tokens.email,
      synced: String(synced),
    });
    if (syncErrorForRedirect) params.set("sync_error", syncErrorForRedirect);
    const res = NextResponse.redirect(new URL(`/app?${params}`, request.url));
    res.cookies.delete("fs_gmail_oauth");
    return res;
  } catch (err) {
    console.error("Gmail OAuth callback failed:", err);
    const msg = err instanceof Error ? err.message : "unknown_error";
    if (isPopup) {
      const html = renderPopupClose({ type: "gmail_error", error: msg });
      const res = new NextResponse(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      res.cookies.delete("fs_gmail_oauth");
      return res;
    }
    const res = NextResponse.redirect(
      new URL(`/app/settings/connections?error=${encodeURIComponent(msg)}`, request.url)
    );
    res.cookies.delete("fs_gmail_oauth");
    return res;
  }
}

/**
 * Tiny HTML rendered in the OAuth popup window — postMessages the parent
 * window so the SaaS can show a toast / refresh data, then closes itself.
 * The parent must verify event.origin matches its own origin before trusting
 * event.data.
 */
function renderPopupClose(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Connexion Gmail</title>
  <style>
    html, body { margin: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #FBFAFF; color: #0F172A; }
    .wrap { height: 100%; display: grid; place-items: center; padding: 24px; text-align: center; }
    h1 { font-size: 16px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.01em; }
    p { font-size: 13px; color: #5B6475; margin: 0; }
    .dot { width: 10px; height: 10px; border-radius: 999px; background: #5B6CFF; margin: 0 auto 14px; box-shadow: 0 0 0 6px rgba(91, 108, 255, 0.18); }
  </style>
</head>
<body>
  <div class="wrap">
    <div>
      <div class="dot" aria-hidden></div>
      <h1>Connexion terminée</h1>
      <p>Cette fenêtre se ferme automatiquement.</p>
    </div>
  </div>
  <script>
    (function () {
      var payload = ${json};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, window.location.origin);
        }
      } catch (e) {}
      setTimeout(function () { window.close(); }, 120);
    })();
  </script>
</body>
</html>`;
}
