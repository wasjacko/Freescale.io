"use client";

import { isEmailLikeChannel, channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { ChannelLogo } from "@/components/icons/Icon";

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
    label: "Principale",
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
  const { inboxFolders, activeFolderId, setActiveFolder, setActiveConv, inboxMode } = useApp();
  const { conversations, archived } = useData();
  const [othersOpen, setOthersOpen] = useState(false);

  const open = (id: string | null) => {
    setActiveFolder(id);
    setActiveConv("");
  };

  // Conversations visibles côté liste : on filtre par mode (Email vs Messages)
  // et on retire les archivées — c'est ce que l'utilisateur voit réellement,
  // donc les compteurs doivent correspondre à ce périmètre (pas au total mock).
  const visibleConvs = conversations.filter(
    (c) => !archived.has(c.id) && isEmailLikeChannel(c.channel) === (inboxMode === "email")
  );
  const visibleIds = new Set(visibleConvs.map((c) => c.id));

  // Compteurs dérivés des conversations VISIBLES — toujours cohérents avec
  // la liste affichée à droite. Sent/Brouillons/Corbeille restent à 0 tant
  // qu'on n'a pas câblé ces vraies sources.
  const counts: Record<string, number> = {
    inbox: visibleConvs.length,
    "view:starred": visibleConvs.filter((c) => c.starred).length,
    "view:snoozed": visibleConvs.filter((c) => c.snoozedUntilIso).length,
    "view:sent": 0,
    "view:drafts": 0,
    "view:trash": archived.size,
  };



  return (
    <aside className="ibx-folders" aria-label="Navigation Inbox">
      {/* Vues rapides */}
      {(inboxMode === "email"
        ? VIEWS
        : VIEWS.filter((v) => v.key === null || v.key === "view:starred")
      ).map((v) => {
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

      {/* Canaux dynamiques (email ou message selon le mode) */}
      {Array.from(
        new Set(
          conversations
            .filter((c) => isEmailLikeChannel(c.channel) === (inboxMode === "email"))
            .map((c) => c.channel)
        )
      ).map((chan) => {
        const count = conversations.filter(
          (c) => c.channel === chan && !archived.has(c.id)
        ).length;
        const label = channelProviderLabel(chan);
        return (
          <button
            key={chan}
            type="button"
            className={`ibx-folder ${activeFolderId === `chan:${chan}` ? "active" : ""}`}
            onClick={() => open(`chan:${chan}`)}
          >
            <span
              className="ibx-folder-ic"
              style={{
                width: 17,
                height: 17,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChannelLogo channel={chan} />
            </span>
            <span className="ibx-folder-name">{label}</span>
            {count > 0 && <span className="ibx-folder-count">{count}</span>}
          </button>
        );
      })}


      {(
        [
          ["cat:client", "Client", "#2563eb"], // Strong Blue
          ["cat:prospect", "Prospect", "#e11d48"], // Strong Rose/Red
          ["cat:prestataire", "Prestataire", "#d97706"], // Strong Amber/Orange
          ["cat:collaborateur", "Équipe", "#16a34a"], // Strong Green
          ["cat:other", "Non classé", "#4b5563"], // Strong Gray
        ] as const
      ).map(([key, label, color]) => {
        const count = visibleConvs.filter(c => `cat:${c.category ?? "other"}` === key).length;
        if (count === 0) return null;
        return (
          <button
            key={key}
            type="button"
            className={`ibx-folder ${activeFolderId === key ? "active" : ""}`}
            onClick={() => open(key)}
          >
            <span className="ibx-label-dot" style={{ background: color }} />
            <span className="ibx-folder-name ibx-label-name">{label}</span>
            <span className="ibx-folder-count">{count}</span>
          </button>
        );
      })}
    </aside>
  );
}
