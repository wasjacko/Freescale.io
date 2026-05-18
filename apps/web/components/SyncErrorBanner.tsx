"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";
import { Icon } from "@/components/icons/Icon";
import type { ConnectedChannel } from "@/lib/data/queries";

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

  const broken = channels.filter((c) => c.status === "needs_reauth");
  if (broken.length === 0) return null;

  const ch = broken[0]!; // surface the first one; rest get the same UX

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
        <strong>Reconnexion {ch.displayName} requise.</strong>
        <span>
          {broken.length > 1
            ? `${broken.length} connexions ont expiré. Reconnectez pour reprendre la synchronisation.`
            : "L'autorisation a expiré. Reconnectez pour reprendre la synchronisation."}
        </span>
      </div>
      <button
        type="button"
        className="sync-error-cta"
        onClick={handleReconnect}
        disabled={reconnecting !== null}
      >
        {reconnecting === ch.id ? "Reconnexion…" : "Reconnecter"}
      </button>
    </div>
  );
}
