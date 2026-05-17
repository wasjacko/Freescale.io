"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChannelLogo } from "@/components/icons/Icon";
import { disconnectChannel } from "@/lib/actions/connections";

type Account = {
  id: string;
  kind: "gmail" | "instagram" | "whatsapp" | "slack" | "discord" | string;
  external_id: string;
  display_name: string | null;
  status: string;
  last_synced_at: string | null;
  connected_at: string;
};

const PROVIDERS = [
  { kind: "gmail" as const, label: "Gmail", ready: true, startPath: "/auth/gmail/start" },
  { kind: "slack" as const, label: "Slack", ready: false, startPath: null },
  { kind: "instagram" as const, label: "Instagram DMs", ready: false, startPath: null },
  { kind: "whatsapp" as const, label: "WhatsApp", ready: false, startPath: null },
  { kind: "discord" as const, label: "Discord", ready: false, startPath: null },
];

function formatWhen(iso: string | null): string {
  if (!iso) return "jamais";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ConnectionsList({
  accounts,
  flash,
}: {
  accounts: Account[];
  flash: { kind: "ok" | "err"; text: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(flash);

  // Listen for OAuth popup messages from /auth/gmail/callback. On success we
  // route the user straight into the inbox — FlashFromUrl over there will fire
  // the confirmation toast so it survives the navigation.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | { type: "gmail_connected"; email: string; synced: number }
        | { type: "gmail_error"; error: string }
        | null;
      if (!data) return;
      if (data.type === "gmail_connected") {
        setConnecting(null);
        const url = `/app?connected=gmail&email=${encodeURIComponent(
          data.email
        )}&synced=${data.synced}`;
        router.push(url as never);
      } else if (data.type === "gmail_error") {
        setConnecting(null);
        setToast({ kind: "err", text: `Connexion impossible : ${data.error}` });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  const openConnectPopup = (kind: string, path: string) => {
    setConnecting(kind);
    setToast(null);
    const w = 560;
    const h = 720;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      `${path}?popup=1`,
      "freescale_oauth",
      `width=${w},height=${h},left=${left},top=${top},popup=yes`
    );
    if (!popup) {
      setConnecting(null);
      setToast({
        kind: "err",
        text: "Impossible d'ouvrir la fenêtre. Autorisez les pop-ups pour freescale.site.",
      });
      return;
    }
    // Poll for the popup being closed without a message (user closed it
    // manually) so we don't stay stuck on "Connexion…"
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setConnecting((c) => (c === kind ? null : c));
      }
    }, 600);
  };

  const handleDisconnect = (accountId: string, label: string) => {
    if (!confirm(`Déconnecter ${label} ? Les emails déjà synchronisés restent.`)) return;
    startTransition(async () => {
      await disconnectChannel(accountId);
      setToast({ kind: "ok", text: `${label} déconnecté.` });
    });
  };

  const gmailConnected = accounts.find(
    (a) => a.kind === "gmail" && a.status === "active"
  );

  return (
    <div className="settings-section">
      <header className="settings-head">
        <h1>Connexions</h1>
        <p>Branchez vos canaux pour que Freescale rassemble tous vos messages en un seul endroit.</p>
      </header>

      {toast && (
        <div className={`settings-toast ${toast.kind === "ok" ? "is-ok" : "is-err"}`} style={{ width: "fit-content" }}>
          {toast.text}
        </div>
      )}

      {/* Connected accounts */}
      {accounts.filter((a) => a.status === "active").length > 0 && (
        <div className="settings-card">
          {accounts
            .filter((a) => a.status === "active")
            .map((account, idx, arr) => (
              <div key={account.id}>
                <div className="settings-row">
                  <div className="settings-row-label" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 10, background: "rgba(15, 23, 42, 0.04)" }}>
                      <ChannelLogo channel={account.kind as never} />
                    </span>
                    <div>
                      <h3>{account.display_name ?? account.external_id}</h3>
                      <p>Sync : {formatWhen(account.last_synced_at)}</p>
                    </div>
                  </div>
                  <div className="settings-row-control" style={{ justifyContent: "flex-end", width: "100%" }}>
                    <span className="onb-option-tag is-ready" style={{ alignSelf: "center" }}>
                      Sync auto
                    </span>
                    <button
                      type="button"
                      className="set-btn set-btn-quiet"
                      onClick={() => handleDisconnect(account.id, account.display_name ?? account.external_id)}
                      disabled={pending}
                    >
                      Déconnecter
                    </button>
                  </div>
                </div>
                {idx < arr.length - 1 && <div className="settings-divider" />}
              </div>
            ))}
        </div>
      )}

      {/* Available providers */}
      <header className="settings-head">
        <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>
          Ajouter un canal
        </h2>
      </header>

      <div className="settings-card">
        {PROVIDERS.map((p, idx) => {
          const isConnected = p.kind === "gmail" && !!gmailConnected;
          return (
            <div key={p.kind}>
              <div className="settings-row">
                <div className="settings-row-label" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 10, background: "rgba(15, 23, 42, 0.04)" }}>
                    <ChannelLogo channel={p.kind as never} />
                  </span>
                  <div>
                    <h3>{p.label}</h3>
                    <p>{p.ready ? "Disponible" : "Bientôt"}</p>
                  </div>
                </div>
                <div className="settings-row-control" style={{ justifyContent: "flex-end", width: "100%" }}>
                  {p.ready && p.startPath ? (
                    isConnected ? (
                      <span className="onb-option-tag is-ready" style={{ alignSelf: "center" }}>
                        Connecté
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="set-btn set-btn-primary"
                        onClick={() => openConnectPopup(p.kind, p.startPath!)}
                        disabled={connecting === p.kind}
                      >
                        {connecting === p.kind ? "Connexion…" : `Connecter ${p.label}`}
                      </button>
                    )
                  ) : (
                    <button type="button" className="set-btn" disabled>
                      Bientôt
                    </button>
                  )}
                </div>
              </div>
              {idx < PROVIDERS.length - 1 && <div className="settings-divider" />}
            </div>
          );
        })}
      </div>

    </div>
  );
}
