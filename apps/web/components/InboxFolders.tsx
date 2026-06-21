"use client";

import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { useState } from "react";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// Vues rapides (façon client mail). key null = Inbox (tout).
const VIEWS: { key: string | null; label: string; icon: React.ReactNode }[] = [
  {
    key: null,
    label: "Inbox",
    icon: (
      <svg {...stroke}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
      </svg>
    ),
  },
  {
    key: "view:starred",
    label: "Favoris",
    icon: (
      <svg {...stroke}>
        <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9 12 2" />
      </svg>
    ),
  },
  {
    key: "view:snoozed",
    label: "Reportés",
    icon: (
      <svg {...stroke}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: "view:sent",
    label: "Envoyés",
    icon: (
      <svg {...stroke}>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    key: "view:drafts",
    label: "Brouillons",
    icon: (
      <svg {...stroke}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    key: "view:trash",
    label: "Corbeille",
    icon: (
      <svg {...stroke}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
];

// Palette de couleurs pour les labels (par ordre d'apparition des tags).
const LABEL_COLORS = ["#e94f8a", "#4f6cf7", "#16a34a", "#d97706", "#8b5cf6", "#0891b2"];

/**
 * InboxFolders — colonne gauche de l'Inbox : vues rapides (Inbox/Favoris/…),
 * Dossiers (rangement custom), et Labels (tags des conversations). UI/mock.
 */
export function InboxFolders() {
  const { inboxFolders, activeFolderId, setActiveFolder, setActiveConv } = useApp();
  const addFolder = useApp((s) => s.addFolder);
  const { conversations } = useData();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [othersOpen, setOthersOpen] = useState(false);

  const open = (id: string | null) => {
    setActiveFolder(id);
    setActiveConv("");
  };

  const submit = () => {
    if (newName.trim()) addFolder(newName);
    setNewName("");
    setAdding(false);
  };

  // Compteurs dérivés des conversations.
  const counts: Record<string, number> = {
    inbox: conversations.length,
    "view:starred": conversations.filter((c) => c.starred).length,
    "view:snoozed": conversations.filter((c) => c.snoozedUntilIso).length,
  };

  // Labels = tags uniques des conversations, avec compteur + couleur.
  const tagCount = new Map<string, number>();
  for (const c of conversations) {
    for (const t of c.tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const labels = [...tagCount.entries()].map(([tag, n], i) => ({
    tag,
    n,
    color: LABEL_COLORS[i % LABEL_COLORS.length],
  }));

  return (
    <aside className="ibx-folders" aria-label="Navigation Inbox">
      {/* Vues rapides */}
      {VIEWS.map((v) => {
        const cnt = v.key == null ? counts.inbox : counts[v.key];
        return (
          <button
            key={v.label}
            type="button"
            className={`ibx-folder ${activeFolderId === (v.key ?? null) ? "active" : ""}`}
            onClick={() => open(v.key ?? null)}
          >
            <span className="ibx-folder-ic">{v.icon}</span>
            <span className="ibx-folder-name">{v.label}</span>
            {cnt != null && cnt > 0 && <span className="ibx-folder-count">{cnt}</span>}
          </button>
        );
      })}

      <div className="ibx-folders-sep" />

      {/* Dossiers */}
      <div className="ibx-folders-head">
        <span>Dossiers</span>
        <button
          type="button"
          className="ibx-folders-add"
          aria-label="Nouveau dossier"
          onClick={() => setAdding(true)}
        >
          +
        </button>
      </div>
      {inboxFolders.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`ibx-folder ${activeFolderId === f.id ? "active" : ""}`}
          title={f.name}
          onClick={() => open(f.id)}
        >
          <svg className="ibx-folder-ic" {...stroke}>
            <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.2h7a1.5 1.5 0 0 1 1.5 1.5v7.3A1.5 1.5 0 0 1 17.5 18h-13A1.5 1.5 0 0 1 3 16.5z" />
          </svg>
          <span className="ibx-folder-name">{f.name}</span>
          {f.convIds.length > 0 && <span className="ibx-folder-count">{f.convIds.length}</span>}
        </button>
      ))}
      {adding && (
        <input
          type="text"
          className="ibx-folder-input"
          placeholder="Nom du dossier…"
          value={newName}
          // biome-ignore lint/a11y/noAutofocus: champ inline ouvert à la demande
          autoFocus
          onChange={(e) => setNewName(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setNewName("");
              setAdding(false);
            }
          }}
        />
      )}

      {labels.length > 0 && (
        <>
          <div className="ibx-folders-sep" />
          <div className="ibx-folders-head">
            <span>Labels</span>
          </div>
          {labels.map((l) => (
            <button
              key={l.tag}
              type="button"
              className={`ibx-folder ${activeFolderId === `label:${l.tag}` ? "active" : ""}`}
              onClick={() => open(`label:${l.tag}`)}
            >
              <span className="ibx-label-dot" style={{ background: l.color }} />
              <span className="ibx-folder-name ibx-label-name">{l.tag}</span>
              <span className="ibx-folder-count">{l.n}</span>
            </button>
          ))}
        </>
      )}

      {/* Zone « Autres » repliée — non-clients (promos, notifs). */}
      <div className="ibx-folders-sep" />
      <button
        type="button"
        className="ibx-folder ibx-folder-others"
        onClick={() => setOthersOpen((v) => !v)}
        aria-expanded={othersOpen}
      >
        <svg
          className={`ibx-folder-ic ibx-others-chevron ${othersOpen ? "is-open" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
        <span className="ibx-folder-name">Autres</span>
      </button>
      {othersOpen &&
        (
          [
            ["cat:promo", "Promotions"],
            ["cat:notif", "Notifications"],
            ["cat:other", "Non classés"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`ibx-folder ibx-folder-sub ${activeFolderId === key ? "active" : ""}`}
            onClick={() => open(key)}
          >
            <span className="ibx-folder-name">{label}</span>
          </button>
        ))}
    </aside>
  );
}
