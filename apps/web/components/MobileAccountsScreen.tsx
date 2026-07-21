"use client";

// Écran plein-page (portail) — style Beeper : liste des « boîtes » du user.
// - Toutes les convs (tous canaux, toutes catégories)
// - Une carte par canal connecté (avec compteur non-lus)
// - CTA « Ajouter un canal » (ouvre la modale existante)
// - Bouton « Paramètres » en bas
//
// Rendu via createPortal sur document.body pour passer devant tout (topbar,
// bottom-nav) et permettre un vrai plein-écran mobile.

import { AddChannelModal } from "@/components/AddChannelModal";
import { ChannelLogo } from "@/components/icons/Icon";
import { CHANNEL_PROVIDER_REGISTRY, channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  onClose: () => void;
};

export function MobileAccountsScreen({ onClose }: Props) {
  const { channels, conversations, archived } = useData();
  const { setActiveFolder, setActiveConv, setView } = useApp();
  const [mounted, setMounted] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Empêche le scroll de la page derrière l'écran.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const totalUnread = conversations.filter((c) => c.unread && !archived.has(c.id)).length;
  const connectedKinds = new Set(channels.map((c) => c.kind));
  const providers = CHANNEL_PROVIDER_REGISTRY.filter((p) => connectedKinds.has(p.kind));

  const chooseAll = () => {
    setActiveFolder(null);
    setActiveConv("");
    onClose();
  };

  const chooseChannel = (kind: string) => {
    setActiveFolder(`chan:${kind}`);
    setActiveConv("");
    onClose();
  };

  const openSettings = () => {
    setView("today");
    onClose();
    // Route vers réglages si dispo — à défaut, ferme.
    setTimeout(() => {
      const settings = document.querySelector<HTMLElement>("[data-open-settings]");
      settings?.click();
    }, 30);
  };

  return createPortal(
    <>
      <div className="mas-root" role="dialog" aria-modal="true" aria-label="Comptes">
        <div className="mas-topbar">
          <button
            type="button"
            className="mas-close"
            aria-label="Fermer"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              width={22}
              height={22}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mas-scroll">
          <h1 className="mas-title">Comptes</h1>

          <div className="mas-card">
            <button type="button" className="mas-row" onClick={chooseAll}>
              <span className="mas-row-ico mas-row-ico--all">
                <svg
                  viewBox="0 0 24 24"
                  width={22}
                  height={22}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                  <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
                </svg>
              </span>
              <span className="mas-row-label">Toutes les convs</span>
              {totalUnread > 0 && <span className="mas-row-badge">{totalUnread}</span>}
              <svg
                className="mas-row-caret"
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>

            {providers.map((p) => {
              const unread = conversations.filter(
                (c) => c.channel === p.kind && c.unread && !archived.has(c.id)
              ).length;
              const label = channelProviderLabel(p.kind);
              return (
                <div key={p.kind} className="mas-row-wrap">
                  <div className="mas-row-sep" />
                  <button
                    type="button"
                    className="mas-row"
                    onClick={() => chooseChannel(p.kind)}
                  >
                    <span className="mas-row-ico">
                      <ChannelLogo channel={p.kind} className="mas-row-logo" />
                    </span>
                    <span className="mas-row-label">{label}</span>
                    {unread > 0 && <span className="mas-row-badge">{unread}</span>}
                    <svg
                      className="mas-row-caret"
                      viewBox="0 0 24 24"
                      width={16}
                      height={16}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </button>
                </div>
              );
            })}

            <div className="mas-row-sep" />
            <button
              type="button"
              className="mas-row mas-row--add"
              onClick={() => setAddOpen(true)}
            >
              <span className="mas-row-ico mas-row-ico--add">
                <svg
                  viewBox="0 0 24 24"
                  width={20}
                  height={20}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </span>
              <span className="mas-row-label mas-row-label--add">Ajouter un canal</span>
            </button>
          </div>

          <div className="mas-footer">
            <button type="button" className="mas-settings" onClick={openSettings}>
              <svg
                viewBox="0 0 24 24"
                width={20}
                height={20}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Paramètres</span>
            </button>
          </div>
        </div>
      </div>

      <AddChannelModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        connectedKinds={connectedKinds}
      />
    </>,
    document.body
  );
}
