"use client";

import { AddChannelModal } from "@/components/AddChannelModal";
import { NewMessageModal } from "@/components/NewMessageModal";
import { channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { useState } from "react";

const SORTS: { key: "date" | "unread" | "starred"; label: string }[] = [
  { key: "date", label: "Récents" },
  { key: "unread", label: "Non lus" },
  { key: "starred", label: "Étoilés" },
];

// Statut « balle dans le camp » (ex-onglets), maintenant dans le Filtre.
const BUCKETS: { key: "all" | "to-reply" | "waiting" | "done"; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "to-reply", label: "À répondre" },
  { key: "waiting", label: "En attente" },
  { key: "done", label: "Terminé" },
];

/**
 * InboxToolbar — barre d'outils pleine largeur au-dessus des deux colonnes
 * (liste + fil). Non lus · Tri · Canal · Filtrer. L'état vit dans le store
 * (`useApp`) pour être partagé avec la liste de conversations.
 */
export function InboxToolbar() {
  const { channels } = useData();
  const {
    inboxSort,
    inboxChannel,
    inboxBucket,
    inboxSearch,
    setInboxSort,
    setInboxChannel,
    setInboxBucket,
    setInboxSearch,
    setActiveConv,
  } = useApp();
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [addChannelOpen, setAddChannelOpen] = useState(false);

  // Pas de barre tant qu'aucun canal n'est connecté (l'inbox montre le hero).
  if (channels.length === 0) return null;

  // Filtre canal : uniquement les canaux RÉELLEMENT connectés (+ « Tous »).
  const connectedKinds = new Set(channels.map((c) => c.kind));
  const channelOptions = [
    { key: "all", label: "Tous les canaux" },
    ...[...connectedKinds].map((kind) => ({ key: kind, label: channelProviderLabel(kind) })),
  ];

  const sortLabel =
    inboxSort === "unread" ? "Non lus" : inboxSort === "starred" ? "Étoilés" : "Récents";
  // Le bouton Filtre signale visuellement qu'un filtre (statut ou canal) est posé.
  const filterActive = inboxBucket !== "all" || inboxChannel !== "all";

  return (
    <div className="ibx-toolbar-bar">
      <div className="ibx-tool-wrap">
        <button
          type="button"
          className={`ibx-tool ${sortMenuOpen ? "is-open" : ""}`}
          aria-expanded={sortMenuOpen}
          onClick={() => {
            setFilterMenuOpen(false);
            setSortMenuOpen((v) => !v);
          }}
        >
          <svg
            className="ibx-tool-ic"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M7 4v16M7 4 4 7M7 4l3 3" />
            <path d="M17 20V4M17 20l3-3M17 20l-3-3" />
          </svg>
          Tri : {sortLabel}
          <span className="ibx-tool-caret" aria-hidden>
            ▾
          </span>
        </button>
        {sortMenuOpen && (
          <>
            <button
              type="button"
              className="ibx-tool-scrim"
              aria-label="Fermer"
              onClick={() => setSortMenuOpen(false)}
            />
            <div className="ibx-tool-menu" role="menu">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`ibx-tool-item ${inboxSort === s.key ? "is-active" : ""}`}
                  onClick={() => {
                    setInboxSort(s.key);
                    setSortMenuOpen(false);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ibx-tool-wrap">
        <button
          type="button"
          className={`ibx-tool ${filterMenuOpen ? "is-open" : ""} ${filterActive ? "is-active" : ""}`}
          aria-expanded={filterMenuOpen}
          onClick={() => {
            setSortMenuOpen(false);
            setFilterMenuOpen((v) => !v);
          }}
        >
          <svg
            className="ibx-tool-ic"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtre
          {filterActive && <span className="ibx-tool-dot" aria-hidden />}
          <span className="ibx-tool-caret" aria-hidden>
            ▾
          </span>
        </button>
        {filterMenuOpen && (
          <>
            <button
              type="button"
              className="ibx-tool-scrim"
              aria-label="Fermer"
              onClick={() => setFilterMenuOpen(false)}
            />
            <div className="ibx-tool-menu ibx-tool-menu--filter" role="menu">
              <div className="ibx-tool-menu-label">Statut</div>
              {BUCKETS.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  className={`ibx-tool-item ${inboxBucket === b.key ? "is-active" : ""}`}
                  onClick={() => setInboxBucket(b.key)}
                >
                  {b.label}
                </button>
              ))}
              <div className="ibx-tool-sep" />
              <div className="ibx-tool-menu-label">Canal</div>
              {channelOptions.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`ibx-tool-item ${inboxChannel === c.key ? "is-active" : ""}`}
                  onClick={() => setInboxChannel(c.key)}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                className="ibx-tool-item ibx-tool-item--add"
                onClick={() => {
                  setFilterMenuOpen(false);
                  setAddChannelOpen(true);
                }}
              >
                <span className="ibx-tool-plus" aria-hidden>
                  +
                </span>
                Ajouter un canal
              </button>
              {filterActive && (
                <>
                  <div className="ibx-tool-sep" />
                  <button
                    type="button"
                    className="ibx-tool-item ibx-tool-item--reset"
                    onClick={() => {
                      setInboxBucket("all");
                      setInboxChannel("all");
                    }}
                  >
                    Réinitialiser les filtres
                  </button>
                </>
              )}
            </div>
          </>
        )}
        <AddChannelModal
          open={addChannelOpen}
          onClose={() => setAddChannelOpen(false)}
          connectedKinds={connectedKinds}
        />
      </div>

      <div className="ibx-search-wrap">
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ibx-search-ic"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="ibx-search-input"
          placeholder="Rechercher…"
          value={inboxSearch}
          onChange={(e) => setInboxSearch(e.target.value)}
          aria-label="Rechercher dans l'inbox"
        />
        {inboxSearch && (
          <button
            type="button"
            className="ibx-search-clear"
            aria-label="Effacer"
            onClick={() => setInboxSearch("")}
          >
            ✕
          </button>
        )}
      </div>

      {/* Nouveau message — à l'opposé des filtres (poussé tout à droite). */}
      <button
        type="button"
        className="ibx-tool ibx-tool-new"
        title="Nouveau message"
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
        Nouveau message
      </button>

      {composeOpen && (
        <NewMessageModal
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          onCreated={(convId) => setActiveConv(convId)}
        />
      )}
    </div>
  );
}
