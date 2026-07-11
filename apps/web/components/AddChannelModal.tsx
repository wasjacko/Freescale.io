"use client";

import { ChannelLogo } from "@/components/icons/Icon";
import { CHANNEL_PROVIDER_REGISTRY } from "@/lib/channels/registry";
import { useApp } from "@/lib/store";
import { useEffect } from "react";

const PROVIDERS = CHANNEL_PROVIDER_REGISTRY.filter((provider) =>
  ["gmail", "outlook", "slack", "instagram", "whatsapp", "linkedin", "discord"].includes(
    provider.kind
  )
);

export function AddChannelModal({
  open,
  onClose,
  connectedKinds,
}: {
  open: boolean;
  onClose: () => void;
  connectedKinds: Set<string>;
}) {
  const openClientConfirm = useApp((s) => s.openClientConfirm);

  // Esc to close while open (pas de verrouillage du scroll : c'est une
  // fenêtre flottante ancrée au bouton, pas une modale plein écran).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="add-channel-backdrop"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        className="add-channel-sheet"
        role="dialog"
        aria-modal="false"
        aria-label="Ajouter un canal"
      >
        <header className="add-channel-head">
          <div>
            <h2>Ajouter un canal</h2>
            <p>Branchez une plateforme pour la centraliser dans votre inbox.</p>
          </div>
          <button type="button" className="add-channel-close" aria-label="Fermer" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
                  <ChannelLogo channel={p.kind} />
                </span>
                <span className="add-channel-name">
                  {p.label}
                  <span className="add-channel-cap">
                    {["gmail", "outlook"].includes(p.kind)
                      ? "Historique + nouveaux"
                      : "Nouveaux messages"}
                  </span>
                </span>
                {isConnected ? (
                  <span className="add-channel-tag is-connected">Connecté</span>
                ) : (
                  <button
                    type="button"
                    className="add-channel-cta"
                    onClick={() => {
                      onClose();
                      openClientConfirm(p.kind);
                    }}
                  >
                    Connecter
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
