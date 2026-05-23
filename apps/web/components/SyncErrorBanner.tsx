"use client";

import { Icon } from "@/components/icons/Icon";
import type { ConnectedChannel } from "@/lib/data/queries";
import { useToast } from "@/lib/hooks/useToast";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Top-of-workspace banner shown when any connected channel is in a
 * broken state (token expired, needs_reauth). Surfaces a 1-click
 * "Reconnecter" CTA that fires a popup OAuth window to refresh the
 * Gmail tokens — same pattern as the Settings → Connections page's
 * connect flow, but inline so the user doesn't have to navigate
 * away to fix it.
 */
export function SyncErrorBanner({ channels }: { channels: ConnectedChannel[] }) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [reconnecting, setReconnecting] = useState<string | null>(null);

  // Surface two distinct broken states:
  //   1. needs_reauth → token expired, user must reconnect (CTA: Reconnecter)
  //   2. status=active but last_sync_error → sync ran with errors. We
  //      show the actual error so the user knows WHY their inbox is empty
  //      instead of staring at a blank panel and assuming the app is dead.
  const needsReauth = channels.filter((c) => c.status === "needs_reauth");
  const otherErrors = channels.filter((c) => c.status !== "needs_reauth" && c.lastSyncError);
  if (needsReauth.length === 0 && otherErrors.length === 0) return null;

  // Reauth gets priority since it's actionable; "other errors" fall through.
  const broken = needsReauth.length > 0 ? needsReauth : otherErrors;
  const ch = broken.at(0);
  if (!ch) return null;
  const isReauth = needsReauth.length > 0;

  const handleReconnect = () => {
    setReconnecting(ch.id);
    // Open Gmail OAuth in a popup — mirrors AddChannelModal's flow.
    const w = 520;
    const h = 640;
    const left = (window.innerWidth - w) / 2 + window.screenX;
    const top = (window.innerHeight - h) / 2 + window.screenY;
    const popup = window.open(
      "/auth/gmail/start",
      "gmail-reconnect",
      `width=${w},height=${h},left=${left},top=${top},popup=yes`
    );
    if (!popup) {
      setReconnecting(null);
      push({
        kind: "error",
        text: "Impossible d'ouvrir la fenêtre. Autorisez les pop-ups pour freescale.site.",
      });
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; ok?: boolean; error?: string } | null;
      if (!data || data.type !== "gmail:connected") return;
      window.removeEventListener("message", onMessage);
      setReconnecting(null);
      if (data.ok) {
        push({ kind: "success", text: "Gmail reconnecté." });
        router.refresh();
      } else {
        push({ kind: "error", text: data.error ?? "Reconnexion échouée." });
      }
    };
    window.addEventListener("message", onMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener("message", onMessage);
        setReconnecting(null);
      }
    }, 600);
  };

  return (
    <div className="sync-error-banner" role="alert">
      <span className="sync-error-icon" aria-hidden>
        <Icon name="i-info" />
      </span>
      <div className="sync-error-text">
        <strong>
          {isReauth
            ? `Reconnexion ${ch.displayName} requise.`
            : `Sync ${ch.displayName} en erreur.`}
        </strong>
        <span>
          {isReauth
            ? broken.length > 1
              ? `${broken.length} connexions ont expiré. Reconnectez pour reprendre la synchronisation.`
              : "L'autorisation a expiré. Reconnectez pour reprendre la synchronisation."
            : (ch.lastSyncError ?? "Erreur inconnue — réessayez.")}
        </span>
      </div>
      <button
        type="button"
        className="sync-error-cta"
        onClick={handleReconnect}
        disabled={reconnecting !== null}
      >
        {reconnecting === ch.id ? "Reconnexion…" : isReauth ? "Reconnecter" : "Réessayer"}
      </button>
    </div>
  );
}
