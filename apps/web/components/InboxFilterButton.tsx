"use client";

// Bouton filtre (icône entonnoir) + modale de filtres — mobile.
// Remplace le tri sur mobile ET le drawer des dossiers : un seul point
// d'entrée pour filtrer la liste par vue (Principale, Favoris, Envoyés,
// Brouillons, Corbeille), par canal, ou par tag (Client, Prospect…).

import { ChannelLogo } from "@/components/icons/Icon";
import { channelProviderLabel, isEmailLikeChannel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

const VIEWS: { key: string | null; label: string; icon: React.ReactNode }[] = [
  {
    key: null,
    label: "Principale",
    icon: (
      <svg {...stroke} width={18} height={18}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
      </svg>
    ),
  },
  {
    key: "view:starred",
    label: "Favoris",
    icon: (
      <svg {...stroke} width={18} height={18}>
        <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9 12 2" />
      </svg>
    ),
  },
  {
    key: "view:sent",
    label: "Envoyés",
    icon: (
      <svg {...stroke} width={18} height={18}>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    key: "view:drafts",
    label: "Brouillons",
    icon: (
      <svg {...stroke} width={18} height={18}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    key: "view:trash",
    label: "Corbeille",
    icon: (
      <svg {...stroke} width={18} height={18}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
];

const DEFAULT_TAGS = [
  { key: "client", label: "Client", color: "#2563eb" },
  { key: "prospect", label: "Prospect", color: "#e11d48" },
  { key: "prestataire", label: "Prestataire", color: "#d97706" },
  { key: "collaborateur", label: "Équipe", color: "#16a34a" },
  { key: "other", label: "Non classé", color: "#4b5563" },
];

export function InboxFilterButton() {
  const { activeFolderId, setActiveFolder, setActiveConv, inboxMode } = useApp();
  const { conversations, archived } = useData();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [customTags, setCustomTags] = useState<{ key: string; label: string; color: string }[]>(
    DEFAULT_TAGS
  );

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("freescale_custom_tags");
    if (stored) {
      try {
        setCustomTags(JSON.parse(stored));
      } catch {
        /* garde le défaut */
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visibleConvs = conversations.filter(
    (c) => !archived.has(c.id) && isEmailLikeChannel(c.channel) === (inboxMode === "email")
  );

  const viewCount = (key: string | null) => {
    if (key == null) return visibleConvs.length;
    if (key === "view:starred") return visibleConvs.filter((c) => c.starred).length;
    if (key === "view:trash") return archived.size;
    return 0;
  };

  const uniqueChannels = Array.from(
    new Set(
      conversations
        .filter((c) => isEmailLikeChannel(c.channel) === (inboxMode === "email"))
        .map((c) => c.channel)
    )
  );

  const choose = (id: string | null) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
    setActiveFolder(id);
    setActiveConv("");
    setOpen(false);
  };

  const isActive = (key: string | null) => (activeFolderId ?? null) === (key ?? null);

  return (
    <>
      <button
        type="button"
        className="ibx-filter-btn"
        aria-label="Filtrer les conversations"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
          setOpen(true);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={17}
          height={17}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {activeFolderId != null && <span className="ibx-filter-dot" aria-hidden />}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="ibxf-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Filtres"
            onClick={() => setOpen(false)}
          >
            <div className="ibxf-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="ibxf-grip" aria-hidden />
              <div className="ibxf-head">
                <h2 className="ibxf-title">Filtrer</h2>
                <button
                  type="button"
                  className="ibxf-close"
                  aria-label="Fermer"
                  onClick={() => setOpen(false)}
                >
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
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="ibxf-scroll">
                {/* Vues */}
                {VIEWS.map((v) => {
                  const cnt = viewCount(v.key);
                  return (
                    <button
                      key={v.label}
                      type="button"
                      className={`ibxf-row ${isActive(v.key) ? "is-active" : ""}`}
                      onClick={() => choose(v.key)}
                    >
                      <span className="ibxf-row-ico">{v.icon}</span>
                      <span className="ibxf-row-label">{v.label}</span>
                      {cnt > 0 && <span className="ibxf-row-count">{cnt}</span>}
                      {isActive(v.key) && <span className="ibxf-row-check" aria-hidden>✓</span>}
                    </button>
                  );
                })}

                {/* Canaux */}
                {uniqueChannels.length > 0 && (
                  <>
                    <div className="ibxf-sep" />
                    {uniqueChannels.map((chan) => {
                      const key = `chan:${chan}`;
                      const count = conversations.filter(
                        (c) => c.channel === chan && !archived.has(c.id)
                      ).length;
                      return (
                        <button
                          key={chan}
                          type="button"
                          className={`ibxf-row ${isActive(key) ? "is-active" : ""}`}
                          onClick={() => choose(key)}
                        >
                          <span className="ibxf-row-ico">
                            <ChannelLogo channel={chan} className="ibxf-row-logo" />
                          </span>
                          <span className="ibxf-row-label">{channelProviderLabel(chan)}</span>
                          {count > 0 && <span className="ibxf-row-count">{count}</span>}
                          {isActive(key) && <span className="ibxf-row-check" aria-hidden>✓</span>}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Tags */}
                <div className="ibxf-sep" />
                {customTags.map((tag) => {
                  const key = `cat:${tag.key}`;
                  const count = visibleConvs.filter(
                    (c) => (c.category || "other") === tag.key
                  ).length;
                  return (
                    <button
                      key={tag.key}
                      type="button"
                      className={`ibxf-row ${isActive(key) ? "is-active" : ""}`}
                      onClick={() => choose(key)}
                    >
                      <span className="ibxf-row-dot" style={{ background: tag.color }} />
                      <span className="ibxf-row-label">{tag.label}</span>
                      {count > 0 && <span className="ibxf-row-count">{count}</span>}
                      {isActive(key) && <span className="ibxf-row-check" aria-hidden>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
