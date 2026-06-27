"use client";

import { NewMessageModal } from "@/components/NewMessageModal";
import { isEmailLikeChannel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { useState } from "react";

/**
 * InboxToolbar — barre fine au-dessus des deux colonnes : bascule Email /
 * Messages (avec badges non-lus) à gauche, « Nouveau message » à droite.
 * Le tri vit désormais à côté de la recherche (InboxSortButton) ; les filtres
 * ont été retirés. L'état vit dans le store (`useApp`).
 */
export function InboxToolbar() {
  const { channels, conversations, archived } = useData();
  // Non-lus par monde (email vs chat) — badge sur chaque onglet du toggle.
  const emailUnread = conversations.filter(
    (c) => c.unread && !archived.has(c.id) && isEmailLikeChannel(c.channel)
  ).length;
  const messageUnread = conversations.filter(
    (c) => c.unread && !archived.has(c.id) && !isEmailLikeChannel(c.channel)
  ).length;
  const { setActiveConv, inboxMode, setInboxMode } = useApp();
  const [composeOpen, setComposeOpen] = useState(false);

  // Pas de barre tant qu'aucun canal n'est connecté (l'inbox montre le hero).
  if (channels.length === 0) return null;

  return (
    <div className="ibx-toolbar-wrap">
      <div className="ibx-toolbar-bar">
        {/* 2 catégories principales : Email vs Messages (chat). Restructure
            l'affichage en filtrant les canaux du monde actif. */}
        <div className="cal-viewtoggle ibx-modeswitch" role="tablist" aria-label="Type de messagerie">
          <button
            type="button"
            role="tab"
            aria-selected={inboxMode === "email"}
            className={`cal-viewtoggle__btn ${inboxMode === "email" ? "is-active" : ""}`}
            onClick={() => {
              setInboxMode("email");
              setActiveConv("");
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            Email
            {emailUnread > 0 && <span className="ibx-mode-badge">{emailUnread}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inboxMode === "message"}
            className={`cal-viewtoggle__btn ${inboxMode === "message" ? "is-active" : ""}`}
            onClick={() => {
              setInboxMode("message");
              setActiveConv("");
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 11.5a8.4 8.4 0 0 1-9.3 8.4L3 21l1.1-3.7A8.4 8.4 0 1 1 21 11.5z" />
            </svg>
            Messages
            {messageUnread > 0 && <span className="ibx-mode-badge">{messageUnread}</span>}
          </button>
        </div>

        {/* Compose — libellé adapté au mode (Email vs Message), poussé à droite. */}
        <button
          type="button"
          className="ibx-tool ibx-tool-new"
          title={inboxMode === "email" ? "Nouvel email" : "Nouveau message"}
          onClick={() => setComposeOpen(true)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ibx-tool-ic"
            aria-hidden
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
          </svg>
          {inboxMode === "email" ? "Nouvel email" : "Nouveau message"}
        </button>

        {composeOpen && (
          <NewMessageModal
            open={composeOpen}
            onClose={() => setComposeOpen(false)}
            onCreated={(convId) => setActiveConv(convId)}
          />
        )}
      </div>
    </div>
  );
}
