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
const BUCKET_LABEL = Object.fromEntries(BUCKETS.map((b) => [b.key, b.label]));

/** Petite coche (case) pour les sélections multiples. */
function Check({ on }: { on: boolean }) {
  return (
    <span className={`ibx-check ${on ? "is-on" : ""}`} aria-hidden>
      {on && (
        <svg
          viewBox="0 0 24 24"
          width={11}
          height={11}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

/**
 * InboxToolbar — barre d'outils au-dessus des deux colonnes (liste + fil).
 * Tri · Filtre (statut + canaux + étiquettes + non-lus) · chips actifs ·
 * recherche · Nouveau message. L'état vit dans le store (`useApp`).
 */
export function InboxToolbar() {
  const { channels, conversations } = useData();
  const {
    inboxSort,
    inboxChannels,
    inboxLabels,
    inboxBucket,
    inboxUnreadOnly,
    inboxSearch,
    setInboxSort,
    toggleInboxChannel,
    toggleInboxLabel,
    setInboxBucket,
    setInboxUnreadOnly,
    setInboxSearch,
    resetInboxFilters,
    setActiveConv,
    inboxMode,
    setInboxMode,
  } = useApp();
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [addChannelOpen, setAddChannelOpen] = useState(false);

  // Pas de barre tant qu'aucun canal n'est connecté (l'inbox montre le hero).
  if (channels.length === 0) return null;

  // Canaux réellement connectés.
  const connectedKinds = new Set(channels.map((c) => c.kind));
  const channelList = [...connectedKinds].map((kind) => ({
    kind,
    label: channelProviderLabel(kind),
  }));
  // Étiquettes disponibles = tags présents sur les conversations.
  const tagSet = new Set<string>();
  for (const c of conversations) for (const t of c.tags ?? []) tagSet.add(t);
  const allLabels = [...tagSet];

  const sortLabel =
    inboxSort === "unread" ? "Non lus" : inboxSort === "starred" ? "Étoilés" : "Récents";

  // Chips de filtres actifs (visibles menu fermé), chacun supprimable.
  type Chip = { id: string; label: string; onRemove: () => void };
  const chips: Chip[] = [];
  if (inboxBucket !== "all")
    chips.push({
      id: `b-${inboxBucket}`,
      label: BUCKET_LABEL[inboxBucket] ?? "Statut",
      onRemove: () => setInboxBucket("all"),
    });
  for (const k of inboxChannels)
    chips.push({
      id: `c-${k}`,
      label: channelProviderLabel(k),
      onRemove: () => toggleInboxChannel(k),
    });
  for (const t of inboxLabels)
    chips.push({ id: `l-${t}`, label: t, onRemove: () => toggleInboxLabel(t) });
  if (inboxUnreadOnly)
    chips.push({ id: "unread", label: "Non lus", onRemove: () => setInboxUnreadOnly(false) });
  const activeCount = chips.length;

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
          </button>
        </div>
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
            className={`ibx-tool ${filterMenuOpen ? "is-open" : ""} ${activeCount > 0 ? "is-active" : ""}`}
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
            {activeCount > 0 && <span className="ibx-tool-badge">{activeCount}</span>}
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
                <div className="ibx-tool-menu-head">
                  <span>Filtres</span>
                  {activeCount > 0 && (
                    <button
                      type="button"
                      className="ibx-tool-clear"
                      onClick={() => resetInboxFilters()}
                    >
                      Tout effacer
                    </button>
                  )}
                </div>

                <div className="ibx-tool-menu-label">Statut</div>
                {BUCKETS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    className={`ibx-tool-item ${inboxBucket === b.key ? "is-active" : ""}`}
                    onClick={() => setInboxBucket(b.key)}
                  >
                    <span
                      className={`ibx-radio ${inboxBucket === b.key ? "is-on" : ""}`}
                      aria-hidden
                    />
                    {b.label}
                  </button>
                ))}

                <div className="ibx-tool-sep" />
                <div className="ibx-tool-menu-label">Canaux</div>
                {channelList.map((c) => (
                  <button
                    key={c.kind}
                    type="button"
                    className={`ibx-tool-item ${inboxChannels.includes(c.kind) ? "is-active" : ""}`}
                    onClick={() => toggleInboxChannel(c.kind)}
                  >
                    <Check on={inboxChannels.includes(c.kind)} />
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

                {allLabels.length > 0 && (
                  <>
                    <div className="ibx-tool-sep" />
                    <div className="ibx-tool-menu-label">Étiquettes</div>
                    {allLabels.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`ibx-tool-item ${inboxLabels.includes(t) ? "is-active" : ""}`}
                        onClick={() => toggleInboxLabel(t)}
                      >
                        <Check on={inboxLabels.includes(t)} />
                        {t}
                      </button>
                    ))}
                  </>
                )}

                <div className="ibx-tool-sep" />
                <button
                  type="button"
                  className={`ibx-tool-item ibx-tool-item--toggle ${inboxUnreadOnly ? "is-active" : ""}`}
                  onClick={() => setInboxUnreadOnly(!inboxUnreadOnly)}
                >
                  Non lus uniquement
                  <span className={`ibx-switch ${inboxUnreadOnly ? "is-on" : ""}`} aria-hidden>
                    <span className="ibx-switch-knob" />
                  </span>
                </button>
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

      {/* Rangée des filtres actifs — sous la barre, visible menu fermé. */}
      {chips.length > 0 && (
        <div className="ibx-chips-row" aria-label="Filtres actifs">
          {chips.map((chip) => (
            <span key={chip.id} className="ibx-chip">
              {chip.label}
              <button
                type="button"
                className="ibx-chip-x"
                aria-label={`Retirer le filtre ${chip.label}`}
                onClick={chip.onRemove}
              >
                ✕
              </button>
            </span>
          ))}
          <button type="button" className="ibx-chips-clear" onClick={() => resetInboxFilters()}>
            Tout effacer
          </button>
        </div>
      )}
    </div>
  );
}
