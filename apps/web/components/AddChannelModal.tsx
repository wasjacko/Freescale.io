"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChannelLogo } from "@/components/icons/Icon";
import { useToast } from "@/lib/hooks/useToast";

type Provider = {
  kind: "gmail" | "outlook" | "instagram" | "whatsapp" | "slack" | "discord" | "x" | "linkedin";
  label: string;
  startPath: string | null;
  ready: boolean;
};

const PROVIDERS: Provider[] = [
  { kind: "gmail", label: "Gmail", startPath: "/auth/gmail/start", ready: true },
  { kind: "outlook", label: "Outlook", startPath: null, ready: false },
  { kind: "slack", label: "Slack", startPath: null, ready: false },
  { kind: "instagram", label: "Instagram DMs", startPath: null, ready: false },
  { kind: "whatsapp", label: "WhatsApp", startPath: null, ready: false },
  { kind: "discord", label: "Discord", startPath: null, ready: false },
];

export function AddChannelModal({
  open,
  onClose,
  connectedKinds,
}: {
  open: boolean;
  onClose: () => void;
  connectedKinds: Set<string>;
}) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Lock body scroll + Esc to close while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Listen for OAuth popup messages — same protocol as the settings page
  useEffect(() => {
    if (!open) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | { type: "gmail_connected"; email: string; synced: number }
        | { type: "gmail_error"; error: string }
        | null;
      if (!data) return;
      setConnecting(null);
      if (data.type === "gmail_connected") {
        push({
          text: `Gmail connecté (${data.email})${
            data.synced > 0 ? ` · ${data.synced} message${data.synced > 1 ? "s" : ""}` : ""
          }`,
          duration: 4000,
        });
        onClose();
        router.refresh();
      } else if (data.type === "gmail_error") {
        push({ text: `Connexion impossible : ${data.error}`, duration: 5000 });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, push, onClose, router]);

  if (!open) return null;

  const openOAuthPopup = (kind: string, path: string) => {
    setConnecting(kind);
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
      push({
        text: "Autorisez les pop-ups pour connecter un canal.",
        duration: 4000,
      });
      return;
    }
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setConnecting((c) => (c === kind ? null : c));
      }
    }, 600);
  };

  return (
    <div
      className="add-channel-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Connecter un canal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="add-channel-sheet">
        <header className="add-channel-head">
          <div>
            <h2>Connecter un canal</h2>
            <p>Branchez une plateforme pour la centraliser dans votre inbox.</p>
          </div>
          <button
            type="button"
            className="add-channel-close"
            aria-label="Fermer"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <ul className="add-channel-list">
          {PROVIDERS.map((p) => {
            const isConnected = connectedKinds.has(p.kind);
            return (
              <li key={p.kind} className="add-channel-row">
                <span className="add-channel-logo">
                  <ChannelLogo channel={p.kind as never} />
                </span>
                <span className="add-channel-name">{p.label}</span>
                {isConnected ? (
                  <span className="add-channel-tag is-connected">Connecté</span>
                ) : p.ready && p.startPath ? (
                  <button
                    type="button"
                    className="add-channel-cta"
                    onClick={() => openOAuthPopup(p.kind, p.startPath!)}
                    disabled={connecting === p.kind}
                  >
                    {connecting === p.kind ? "Connexion…" : "Connecter"}
                  </button>
                ) : (
                  <span className="add-channel-tag">Bientôt</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
