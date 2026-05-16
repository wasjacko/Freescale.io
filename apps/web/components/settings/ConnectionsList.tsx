"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChannelLogo } from "@/components/icons/Icon";
import { syncGmail, disconnectChannel, type SyncReport } from "@/lib/actions/connections";

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
  const [report, setReport] = useState<SyncReport | null>(null);
  const [pending, startTransition] = useTransition();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(flash);

  // Listen for OAuth popup messages from /auth/gmail/callback
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
        const tail =
          data.synced > 0
            ? ` · ${data.synced} message${data.synced > 1 ? "s" : ""} importé${data.synced > 1 ? "s" : ""}`
            : "";
        setToast({ kind: "ok", text: `Gmail connecté (${data.email})${tail}` });
        router.refresh();
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
        text: "Impossible d'ouvrir la fenêtre. Autorisez les pop-ups pour freescale-io.vercel.app.",
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

  const handleSync = (accountId: string) => {
    setReport(null);
    setToast(null);
    startTransition(async () => {
      try {
        const r = await syncGmail(accountId);
        setReport(r);
        if (r.errors.length === 0) {
          setToast({
            kind: "ok",
            text: `${r.newMessages} nouveau(x) message(s), ${r.newConversations} nouvelle(s) conversation(s).`,
          });
        } else {
          setToast({ kind: "err", text: r.errors[0] ?? "Sync partielle" });
        }
      } catch (err) {
        setToast({
          kind: "err",
          text: err instanceof Error ? err.message : "Sync impossible.",
        });
      }
    });
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
                    <button
                      type="button"
                      className="set-btn"
                      onClick={() => handleSync(account.id)}
                      disabled={pending}
                    >
                      {pending ? "Synchronisation…" : "Synchroniser maintenant"}
                    </button>
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

      {report && report.errors.length > 0 && (
        <div className="settings-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Détails de la sync</h3>
          <ul style={{ fontSize: 12.5, color: "#5B6475", paddingLeft: 18 }}>
            {report.errors.map((e, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
