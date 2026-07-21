"use client";

import { isEmailLikeChannel, channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChannelLogo } from "@/components/icons/Icon";

const PRESET_COLORS = [
  "#2563eb", // Blue
  "#e11d48", // Rose/Red
  "#d97706", // Amber/Orange
  "#16a34a", // Green
  "#8b5cf6", // Purple
  "#0891b2", // Cyan
  "#ec4899", // Pink
  "#6366f1", // Indigo
];

const DEFAULT_TAGS = [
  { key: "client", label: "Client", color: "#2563eb" },
  { key: "prospect", label: "Prospect", color: "#e11d48" },
  { key: "prestataire", label: "Prestataire", color: "#d97706" },
  { key: "collaborateur", label: "Équipe", color: "#16a34a" },
  { key: "other", label: "Non classé", color: "#4b5563" },
];

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

/**
 * InboxFolders — colonne gauche de l'Inbox : vues rapides (Inbox/Favoris/…),
 * Dossiers (rangement custom), et Labels (tags des conversations). UI/mock.
 */
export function InboxFolders() {
  const {
    activeFolderId,
    setActiveFolder,
    setActiveConv,
    inboxMode,
    inboxFoldersOpen,
    setInboxFoldersOpen,
  } = useApp();
  const { conversations, archived } = useData();

  // Sur mobile/tablette (≤1023px), le panneau devient un tiroir/bottom-sheet en
  // position: fixed. Rendu tel quel dans l'arbre, il est piégé sous le voile par
  // le conteneur de défilement iOS (.workspace) → il paraît grisé. On le sort
  // donc via un PORTAL sur document.body pour qu'il passe bien devant le voile.
  const [mounted, setMounted] = useState(false);
  const [isDrawer, setIsDrawer] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsDrawer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const [customTags, setCustomTags] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("freescale_custom_tags");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_TAGS;
  });

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

  // Sync with other components via custom event
  useEffect(() => {
    const handleUpdate = () => {
      const stored = localStorage.getItem("freescale_custom_tags");
      if (stored) {
        try {
          setCustomTags(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener("tags-updated", handleUpdate);
    return () => window.removeEventListener("tags-updated", handleUpdate);
  }, []);

  const handleAddTag = () => {
    const label = newTagName.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, "-");
    if (customTags.some((t: any) => t.key === key)) return; // duplicate

    const nextTags = [...customTags, { key, label, color: newTagColor }];
    setCustomTags(nextTags);
    localStorage.setItem("freescale_custom_tags", JSON.stringify(nextTags));
    window.dispatchEvent(new Event("tags-updated"));

    // Reset form
    setNewTagName("");
    setIsAddingTag(false);
  };

  const open = (id: string | null) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
    setActiveFolder(id);
    setActiveConv("");
    setInboxFoldersOpen(false);
  };

  // Conversations visibles côté liste : on filtre par mode (Email vs Messages)
  // et on retire les archivées — c'est ce que l'utilisateur voit réellement,
  // donc les compteurs doivent correspondre à ce périmètre (pas au total mock).
  const visibleConvs = conversations.filter(
    (c) => !archived.has(c.id) && isEmailLikeChannel(c.channel) === (inboxMode === "email")
  );

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

  const aside = (
    <aside
      className={`ibx-folders ${isDrawer && inboxFoldersOpen ? "is-open" : ""}`}
      aria-label="Navigation Inbox"
    >
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

      {/* Canaux Section */}
      {(() => {
        const uniqueChannels = Array.from(
          new Set(
            conversations
              .filter((c) => isEmailLikeChannel(c.channel) === (inboxMode === "email"))
              .map((c) => c.channel)
          )
        );
        if (uniqueChannels.length === 0) return null;
        return (
          <>
            <div className="ibx-folders-sep" />
            {uniqueChannels.map((chan) => {
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
          </>
        );
      })()}

      {/* Tags Section */}
      <div className="ibx-folders-sep" />

      {customTags.map((tag: any) => {
        const key = `cat:${tag.key}`;
        const count = visibleConvs.filter((c) => (c.category || "other") === tag.key).length;
        return (
          <button
            key={tag.key}
            type="button"
            className={`ibx-folder ${activeFolderId === key ? "active" : ""}`}
            onClick={() => open(key)}
          >
            <span className="ibx-label-dot" style={{ background: tag.color }} />
            <span className="ibx-folder-name ibx-label-name">{tag.label}</span>
            <span className="ibx-folder-count">{count}</span>
          </button>
        );
      })}

      {/* Add tag form */}
      {!isAddingTag ? (
        <button
          type="button"
          className="ibx-folder"
          onClick={() => setIsAddingTag(true)}
          style={{ color: "#4f6cf7", fontWeight: 600, marginTop: 4 }}
        >
          <span
            className="ibx-folder-ic"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            +
          </span>
          <span className="ibx-folder-name">Nouveau tag</span>
        </button>
      ) : (
        <form
          className="ibx-add-tag-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTag();
          }}
        >
          <input
            type="text"
            className="ibx-add-tag-input"
            placeholder="Nom du tag..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsAddingTag(false);
                setNewTagName("");
              }
            }}
            autoFocus
          />
          <div className="ibx-add-tag-colors">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`ibx-color-dot ${newTagColor === color ? "is-selected" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(5);
                  }
                  setNewTagColor(color);
                }}
                title={color}
              />
            ))}
          </div>
          <div className="ibx-add-tag-actions">
            <button type="submit" className="ibx-add-tag-submit" disabled={!newTagName.trim()}>
              Ajouter
            </button>
            <button
              type="button"
              className="ibx-add-tag-cancel"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(5);
                }
                setIsAddingTag(false);
                setNewTagName("");
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </aside>
  );

  // Mode tiroir (mobile/tablette) : on porte le panneau sur <body> pour qu'il
  // sorte du conteneur de défilement iOS et passe devant le voile (rendu, lui,
  // à la racine par AppShell). Desktop : rendu inline comme colonne de gauche.
  if (mounted && isDrawer) {
    return createPortal(aside, document.body);
  }
  return aside;
}
