import { syncOutlook } from "@/lib/actions/connections";
import { encryptJSON } from "@/lib/encryption";
import { exchangeOutlookCode } from "@/lib/outlook";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", request.url));

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
    return NextResponse.redirect(
      new URL("/app/settings/connections?error=missing_code", request.url)
    );
  }

  const stored = request.cookies.get("fs_outlook_oauth")?.value;
  if (!stored) {
    return NextResponse.redirect(
      new URL("/app/settings/connections?error=state_lost", request.url)
    );
  }
  const [storedUserId, storedState, popupFlag] = stored.split(".");
  if (storedUserId !== user.id || storedState !== state) {
    return NextResponse.redirect(
      new URL("/app/settings/connections?error=state_mismatch", request.url)
    );
  }
  const isPopup = popupFlag === "1";

  try {
    const tokens = await exchangeOutlookCode(code);
    const encrypted = await encryptJSON({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      scope: tokens.scope,
      token_type: tokens.token_type,
    });

    const workspaceId = await getActiveWorkspaceId(supabase, user.id);
    if (!workspaceId) {
      return NextResponse.redirect(
        new URL("/app/settings/connections?error=no_workspace", request.url)
      );
    }

    const { data: account, error: upsertErr } = await supabase
      .from("channel_accounts")
      .upsert(
        {
          workspace_id: workspaceId,
          kind: "outlook",
          external_id: tokens.email,
          display_name: tokens.displayName || tokens.email,
          encrypted_tokens: encrypted,
          status: "active",
          connected_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,kind,external_id" }
      )
      .select("id")
      .single();

    if (upsertErr || !account?.id) {
      const reason = upsertErr?.message ?? "Le row channel_accounts n'a pas été créé.";
      if (isPopup) {
        const html = renderPopupClose({ type: "outlook_error", error: reason });
        const res = new NextResponse(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
        res.cookies.delete("fs_outlook_oauth");
        return res;
      }
      const res = NextResponse.redirect(
        new URL(
          `/app/settings/connections?error=${encodeURIComponent(`channel_upsert: ${reason}`)}`,
          request.url
        )
      );
      res.cookies.delete("fs_outlook_oauth");
      return res;
    }

    let synced = 0;
    let syncErrorForRedirect: string | null = null;
    try {
      const report = await syncOutlook(account.id as string);
      synced = report.newMessages;
      if (report.errors.length > 0) {
        syncErrorForRedirect = (report.errors[0] ?? "Sync partielle").slice(0, 200);
      }
    } catch (syncErr) {
      syncErrorForRedirect =
        syncErr instanceof Error ? syncErr.message.slice(0, 200) : String(syncErr).slice(0, 200);
    }

    if (isPopup) {
      const html = renderPopupClose({
        type: "outlook_connected",
        email: tokens.email,
        synced,
        syncError: syncErrorForRedirect,
      });
      const res = new NextResponse(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      res.cookies.delete("fs_outlook_oauth");
      return res;
    }

    const params = new URLSearchParams({
      connected: "outlook",
      email: tokens.email,
      synced: String(synced),
    });
    if (syncErrorForRedirect) params.set("sync_error", syncErrorForRedirect);
    const res = NextResponse.redirect(new URL(`/app?${params}`, request.url));
    res.cookies.delete("fs_outlook_oauth");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    if (isPopup) {
      const html = renderPopupClose({ type: "outlook_error", error: msg });
      const res = new NextResponse(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      res.cookies.delete("fs_outlook_oauth");
      return res;
    }
    const res = NextResponse.redirect(
      new URL(`/app/settings/connections?error=${encodeURIComponent(msg)}`, request.url)
    );
    res.cookies.delete("fs_outlook_oauth");
    return res;
  }
}

function renderPopupClose(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Connexion Outlook</title>
  <style>
    html, body { margin: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #FBFAFF; color: #0F172A; }
    .wrap { height: 100%; display: grid; place-items: center; padding: 24px; text-align: center; }
    h1 { font-size: 16px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.01em; }
    p { font-size: 13px; color: #5B6475; margin: 0; }
    .dot { width: 10px; height: 10px; border-radius: 999px; background: #0078D4; margin: 0 auto 14px; box-shadow: 0 0 0 6px rgba(0, 120, 212, 0.18); }
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
