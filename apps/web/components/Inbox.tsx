"use client";

import { type ContextAction, ContextMenu } from "@/components/ContextMenu";
import { InboxComposeButton } from "@/components/InboxComposeButton";
import { InboxFilterButton } from "@/components/InboxFilterButton";
import { InboxSortButton } from "@/components/InboxSortButton";
import { MobileInboxHeader } from "@/components/MobileInboxHeader";
import { NoChannelsHero } from "@/components/NoChannelsHero";
import { ChannelLogo } from "@/components/icons/Icon";
import { InitialSyncIndicator } from "@/components/onboarding/InitialSyncIndicator";
import { Avatar } from "@/components/ui/Avatar";
import { channelProviderLabel, isEmailLikeChannel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { snoozeTargets } from "@/lib/snooze-targets";
import { useApp } from "@/lib/store";
import type { ChannelId } from "@/lib/types";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Âge relatif compact façon maquette : « 2h », « 23h », « 1d », « 8d ». */
function relAge(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  const h = mins / 60;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

/** Balle dans MON camp : le client a écrit en dernier → j'ai une réponse à faire. */
function ballInCourt(c: {
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
}): boolean {
  const inb = c.lastInboundAt ? new Date(c.lastInboundAt).getTime() : 0;
  const out = c.lastOutboundAt ? new Date(c.lastOutboundAt).getTime() : 0;
  return inb > out;
}

const INITIAL_SYNC_SKELETONS = [
  "sync-skeleton-1",
  "sync-skeleton-2",
  "sync-skeleton-3",
  "sync-skeleton-4",
  "sync-skeleton-5",
  "sync-skeleton-6",
  "sync-skeleton-7",
];

// Heuristique : la conversation est marquée avec une pièce jointe seulement
// quand le sujet/preview parle explicitement d'un document signé/envoyé
// (contrat, devis, facture). On évite les mentions vagues (brief, joint…)
// pour ne pas en mettre partout. Sera remplacé par un vrai compte côté
// serveur le jour où on a le champ `attachments`.
function hasAttachment(c: { preview?: string }): boolean {
  // On ne regarde QUE le preview (le dernier message) — pas le subject — pour
  // éviter de marquer une conv juste parce que le sujet historique mentionne
  // un document. Match limité à des termes très explicites.
  const haystack = (c.preview ?? "").toLowerCase();
  return /\b(contrat\s+(signé|sign\w*)|devis|facture|pièce jointe|piece jointe)\b/.test(haystack);
}

export function Inbox({ currentUserId: _currentUserId }: { currentUserId?: string | null }) {
  // Filtres/tri partagés avec la barre d'outils (InboxToolbar), via le store.
  const {
    activeConvId,
    setActiveConv,
    inboxSort: sortBy,
    inboxChannels: filterChannels,
    inboxLabels: filterLabels,
    inboxCategory: filterCategory,
    inboxSearch,
    setInboxSearch,
    inboxBucket,
    inboxUnreadOnly: unreadOnly,
    inboxFolders,
    activeFolderId,
    inboxMode,
    mueScanning,
    mueHighlighted,
    inboxFoldersOpen,
    setInboxFoldersOpen,
  } = useApp();
  const {
    conversations,
    archived,
    archive: archiveConv,
    unarchive,
    markRead,
    markUnread,
    isSyncing,
    channels,
    toggleStar,
    snooze,
    setCategory,
  } = useData();
  const push = useToast((s) => s.push);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [extraUnread, setExtraUnread] = useState<Set<string>>(new Set());
  const [ctx, setCtx] = useState<{ x: number; y: number; convId: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Swipe references tracking
  const swipeInfo = useRef<{
    startX: number;
    startY: number;
    deltaX: number;
    isSwiping: boolean;
    rowEl: HTMLElement | null;
  }>({ startX: 0, startY: 0, deltaX: 0, isSwiping: false, rowEl: null });

  const handleTouchStart = (e: React.TouchEvent, _id: string) => {
    if (window.innerWidth >= 1024) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rowEl = e.currentTarget as HTMLElement;
    swipeInfo.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      isSwiping: false,
      rowEl,
    };
    rowEl.style.transition = "none";

    // Clean up any remaining visual states from past swipes
    const parent = rowEl.parentElement;
    if (parent) {
      parent.removeAttribute("data-crossed");
      const bgEl = parent.querySelector(".conv-swipe-bg") as HTMLElement;
      const leftAct = parent.querySelector(".conv-swipe-action-left") as HTMLElement;
      const rightAct = parent.querySelector(".conv-swipe-action-right") as HTMLElement;
      if (bgEl) bgEl.style.backgroundColor = "transparent";
      if (leftAct) {
        leftAct.style.opacity = "0";
        leftAct.style.transform = "scale(0.8)";
      }
      if (bgEl && rightAct) {
        rightAct.style.opacity = "0";
        rightAct.style.transform = "scale(0.8)";
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent, _id: string) => {
    const info = swipeInfo.current;
    if (!info.rowEl) return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - info.startX;
    const deltaY = touch.clientY - info.startY;

    if (!info.isSwiping) {
      if (Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
        info.isSwiping = true;
      }
    }

    if (info.isSwiping) {
      if (e.cancelable) e.preventDefault();
      let displayX = deltaX;
      if (Math.abs(deltaX) > 140) {
        const excess = Math.abs(deltaX) - 140;
        displayX = (deltaX > 0 ? 140 : -140) + (deltaX > 0 ? 1 : -1) * (excess * 0.2);
      }
      info.deltaX = displayX;
      info.rowEl.style.transform = `translateX(${displayX}px)`;

      const parent = info.rowEl.parentElement;
      if (parent) {
        const bgEl = parent.querySelector(".conv-swipe-bg") as HTMLElement;
        const leftAct = parent.querySelector(".conv-swipe-action-left") as HTMLElement;
        const rightAct = parent.querySelector(".conv-swipe-action-right") as HTMLElement;

        if (bgEl && leftAct && rightAct) {
          if (displayX > 0) {
            bgEl.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
            bgEl.style.justifyContent = "flex-start";
            leftAct.style.opacity = Math.min(1, displayX / 60).toString();
            leftAct.style.transform = `scale(${Math.min(1.2, 0.8 + displayX / 200)})`;
            rightAct.style.opacity = "0";
          } else {
            bgEl.style.background = "linear-gradient(270deg, #10b981, #059669)";
            bgEl.style.justifyContent = "flex-end";
            rightAct.style.opacity = Math.min(1, Math.abs(displayX) / 60).toString();
            rightAct.style.transform = `scale(${Math.min(1.2, 0.8 + Math.abs(displayX) / 200)})`;
            leftAct.style.opacity = "0";
          }

          const thresholdVal = typeof window !== "undefined" && window.innerWidth < 380 ? 60 : 70;
          const crossedThreshold = Math.abs(displayX) > thresholdVal;
          const previouslyCrossed = parent.getAttribute("data-crossed") === "true";
          if (crossedThreshold !== previouslyCrossed) {
            parent.setAttribute("data-crossed", crossedThreshold ? "true" : "false");
            if (crossedThreshold && typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(12);
            }
          }
        }
      }
    }
  };

  const handleTouchEnd = (_e: React.TouchEvent, id: string) => {
    const info = swipeInfo.current;
    const rowEl = info.rowEl;
    if (!rowEl) return;

    rowEl.style.transition = "transform 250ms cubic-bezier(0.16, 1, 0.3, 1)";
    const parent = rowEl.parentElement;

    if (parent) {
      parent.removeAttribute("data-crossed");
      const bgEl = parent.querySelector(".conv-swipe-bg") as HTMLElement;
      const leftAct = parent.querySelector(".conv-swipe-action-left") as HTMLElement;
      const rightAct = parent.querySelector(".conv-swipe-action-right") as HTMLElement;

      const threshold = typeof window !== "undefined" && window.innerWidth < 380 ? 60 : 70;
      if (info.deltaX < -threshold) {
        rowEl.style.transform = "translateX(-100%)";
        setTimeout(() => {
          parent.style.height = `${parent.offsetHeight}px`;
          // Force layout reflow
          parent.offsetHeight;
          parent.style.height = "0px";
          parent.style.opacity = "0";
          parent.style.marginBottom = "0px";
          setTimeout(() => {
            onContextAction(id, "archive");
          }, 250);
        }, 150);
      } else if (info.deltaX > threshold) {
        rowEl.style.transform = "translateX(100%)";
        setTimeout(() => {
          parent.style.height = `${parent.offsetHeight}px`;
          // Force layout reflow
          parent.offsetHeight;
          parent.style.height = "0px";
          parent.style.opacity = "0";
          parent.style.marginBottom = "0px";
          setTimeout(() => {
            const targets = snoozeTargets();
            const tomorrow = targets[0];
            if (tomorrow) {
              onContextAction(id, {
                kind: "snooze",
                untilIso: tomorrow.iso,
                label: tomorrow.label,
              });
            }
          }, 250);
        }, 150);
      } else {
        rowEl.style.transform = "translateX(0)";
        if (bgEl && leftAct && rightAct) {
          bgEl.style.backgroundColor = "transparent";
          leftAct.style.opacity = "0";
          rightAct.style.opacity = "0";
          leftAct.style.transform = "scale(0.8)";
          rightAct.style.transform = "scale(0.8)";
        }
      }
    }
    swipeInfo.current = { startX: 0, startY: 0, deltaX: 0, isSwiping: false, rowEl: null };
  };

  // « / » = recherche locale éphémère (filtre par nom, Esc pour fermer).
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase() ?? "";
      const inField = tag === "input" || tag === "textarea";
      if (e.key === "/" && !inField) {
        e.preventDefault();
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isUnread = useCallback(
    (id: string, baseUnread?: boolean) => {
      if (extraUnread.has(id)) return true;
      if (readIds.has(id)) return false;
      return !!baseUnread;
    },
    [extraUnread, readIds]
  );

  const handleSelect = (id: string) => {
    setActiveConv(id);
    setReadIds((prev) => new Set(prev).add(id));
    void markRead(id);
  };

  const onContextAction = (convId: string, action: ContextAction) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;

    // Payload-carrying actions (snooze + set-category) check first.
    if (typeof action === "object" && action.kind === "snooze") {
      void snooze(convId, action.untilIso);
      push({
        kind: "info",
        text: action.untilIso ? `Snoozed: ${action.label}` : "Snooze annulé",
      });
      return;
    }
    if (typeof action === "object" && action.kind === "set-category") {
      void setCategory(convId, action.category);
      const label =
        action.category === "client"
          ? "Client"
          : action.category === "promo"
            ? "Promo"
            : action.category === "notif"
              ? "Notif"
              : action.category === "other"
                ? "Autre"
                : "à trier";
      push({ kind: "info", text: `Catégorie : ${label}` });
      return;
    }

    switch (action) {
      case "open":
        handleSelect(convId);
        break;
      case "mark-read":
        setReadIds((prev) => new Set(prev).add(convId));
        setExtraUnread((prev) => {
          const next = new Set(prev);
          next.delete(convId);
          return next;
        });
        void markRead(convId);
        push({ kind: "info", text: "Marqué comme lu" });
        break;
      case "mark-unread":
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(convId);
          return next;
        });
        setExtraUnread((prev) => new Set(prev).add(convId));
        void markUnread(convId);
        push({ kind: "info", text: "Marqué comme non lu" });
        break;
      case "star":
        void toggleStar(convId, true);
        push({ kind: "info", text: `★ ${conv.name}` });
        break;
      case "unstar":
        void toggleStar(convId, false);
        break;
      case "archive":
        archiveConv(convId);
        push({
          kind: "info",
          text: `${conv.name} archivé`,
          action: { label: "Annuler", fn: () => unarchive(convId) },
        });
        break;
    }
  };

  // Liste plate : conversations actives (ni terminées ni en pause),
  // filtrées par canal et triées selon les préférences de l'utilisateur.
  const filteredConvs = useMemo(() => {
    const now = Date.now();
    const af = activeFolderId;
    // Ensemble des conversations d'un dossier custom (si af est un id de dossier).
    const folder = af ? inboxFolders.find((f) => f.id === af) : null;
    // La vue active correspond-elle à cette conversation ?
    const matchView = (c: (typeof conversations)[number]) => {
      if (af == null) return true; // Inbox = tout
      if (af === "view:starred") return !!c.starred;
      if (af === "view:snoozed") return !!c.snoozedUntilIso;
      if (af === "view:sent" || af === "view:drafts" || af === "view:trash") return false;
      if (af.startsWith("chan:")) return c.channel === af.slice(5);
      if (af.startsWith("label:")) return (c.tags ?? []).includes(af.slice(6));
      if (af.startsWith("cat:")) return (c.category ?? "other") === af.slice(4);
      if (folder) return folder.convIds.includes(c.id);
      return true;
    };
    return conversations
      .filter((c) => {
        // Mode Email vs Message : on ne montre que les canaux du monde actif
        // (Gmail/Outlook… en Email ; WhatsApp/Slack/Insta… en Message).
        if (isEmailLikeChannel(c.channel) !== (inboxMode === "email")) return false;
        // Onglet « Terminé » = conversations archivées ; sinon on les masque.
        if (inboxBucket === "done") {
          if (!archived.has(c.id)) return false;
        } else if (archived.has(c.id)) return false;
        // Ball-in-court : à répondre (client a écrit en dernier) / en attente (moi).
        if (inboxBucket === "to-reply" && !ballInCourt(c)) return false;
        if (inboxBucket === "waiting" && ballInCourt(c)) return false;
        // On masque les reportés SAUF dans la vue « Reportés ».
        if (
          af !== "view:snoozed" &&
          c.snoozedUntilIso &&
          new Date(c.snoozedUntilIso).getTime() > now
        )
          return false;
        if (filterChannels.length > 0 && !filterChannels.includes(c.channel)) return false;
        if (filterLabels.length > 0 && !(c.tags ?? []).some((t) => filterLabels.includes(t)))
          return false;
        if (filterCategory !== "all" && (c.category ?? "other") !== filterCategory) return false;
        if (unreadOnly && !isUnread(c.id, c.unread)) return false;
        if (!matchView(c)) return false;
        return true;
      })
      .filter((c) => !inboxSearch || c.name.toLowerCase().includes(inboxSearch.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "unread") {
          const uA = isUnread(a.id, a.unread);
          const uB = isUnread(b.id, b.unread);
          if (uA && !uB) return -1;
          if (!uA && uB) return 1;
        } else if (sortBy === "starred") {
          const sA = !!a.starred;
          const sB = !!b.starred;
          if (sA && !sB) return -1;
          if (!sA && sB) return 1;
        }
        return new Date(b.lastAtIso).getTime() - new Date(a.lastAtIso).getTime();
      });
  }, [
    conversations,
    archived,
    inboxSearch,
    sortBy,
    filterChannels,
    filterLabels,
    filterCategory,
    unreadOnly,
    activeFolderId,
    inboxFolders,
    inboxBucket,
    inboxMode,
    isUnread,
  ]);

  // Fusion « 1 ligne = 1 client » : on regroupe les conversations par clientId
  // (ou par id si pas de client), en gardant la + récente comme représentante
  // et en collectant tous ses canaux. L'ordre de tri est préservé.
  const clientRows = useMemo(() => {
    const seen = new Map<
      string,
      { rep: (typeof filteredConvs)[number]; channels: Set<ChannelId> }
    >();
    const order: string[] = [];
    for (const c of filteredConvs) {
      const key = c.clientId ?? c.id;
      const g = seen.get(key);
      if (!g) {
        seen.set(key, { rep: c, channels: new Set([c.channel]) });
        order.push(key);
      } else {
        g.channels.add(c.channel);
      }
    }
    return order.map((k) => {
      const g = seen.get(k);
      if (!g) throw new Error("unreachable");
      return { rep: g.rep, channels: [...g.channels] };
    });
  }, [filteredConvs]);

  const [showSkeletons, setShowSkeletons] = useState(false);

  useEffect(() => {
    if (isSyncing && filteredConvs.length === 0) {
      const t = setTimeout(() => {
        setShowSkeletons(true);
      }, 2000);
      return () => clearTimeout(t);
    }
    setShowSkeletons(false);
  }, [isSyncing, filteredConvs.length]);

  const folderLabel = (() => {
    if (!activeFolderId) return "Principale";
    if (activeFolderId === "view:starred") return "Favoris";
    if (activeFolderId === "view:sent") return "Envoyés";
    if (activeFolderId === "view:drafts") return "Brouillons";
    if (activeFolderId === "view:trash") return "Corbeille";
    if (activeFolderId.startsWith("chan:")) {
      const parts = activeFolderId.split(":");
      return parts[1] ? parts[1].toUpperCase() : "Inbox";
    }
    if (activeFolderId.startsWith("cat:")) {
      const parts = activeFolderId.split(":");
      const catKey = parts[1] || "other";
      if (catKey === "client") return "Client";
      if (catKey === "prospect") return "Prospect";
      if (catKey === "prestataire") return "Prestataire";
      if (catKey === "collaborateur") return "Équipe";
      return "Non classé";
    }
    return "Inbox";
  })();

  // Nothing connected yet → show the hero instead of an empty conversation
  // list. This is the single most important CTA for a fresh workspace.
  if (channels.length === 0) {
    return (
      <section className="inbox">
        <NoChannelsHero />
      </section>
    );
  }

  return (
    <section className="inbox">
      {/* Header mobile — trois éléments (comptes · titre · dossiers).
          Masqué en desktop via CSS. */}
      <MobileInboxHeader folderLabel={folderLabel} />
      {/* Recherche permanente + bouton de tri (icône) en haut de la liste.
          Le pill « Principale » a migré vers le hamburger du header mobile ;
          en desktop il reste disponible via la colonne InboxFolders. */}
      <div className="ibx-search-wrap--list">
        <button
          type="button"
          className="ibx-folder-select-pill"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(8);
            }
            setInboxFoldersOpen(!inboxFoldersOpen);
          }}
          aria-label="Ouvrir le tiroir des dossiers"
          aria-haspopup="dialog"
          aria-expanded={inboxFoldersOpen}
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="ibx-folder-select-ic"
          >
            <rect x="3" y="4" width="18" height="16" rx="2.5" />
            <line x1="9" y1="4" x2="9" y2="20" />
          </svg>
          <span>{folderLabel}</span>
        </button>
        <div className="ibx-search-field">
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
            ref={searchRef}
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
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(5);
                }
                setInboxSearch("");
              }}
            >
              ✕
            </button>
          )}
        </div>
        {/* Desktop : tri. Mobile : filtre (remplace le tri + le drawer). */}
        <InboxSortButton />
        <InboxFilterButton />
        <InboxComposeButton />
      </div>

      <div className="conv-list" id="conv-list">
        {filteredConvs.length === 0 && showSkeletons && (
          <>
            {/* First-sync banner: friendly, honest status. Surfaces ONLY
                during the very first sync (when the inbox is empty AND
                sync is in flight). Subsequent synchronisations stay silent
                because AutoSync keeps the populated inbox up to date. */}
            <InitialSyncIndicator />
            <div
              className="conv-skel-list"
              aria-busy="true"
              aria-label="Chargement des conversations"
            >
              {INITIAL_SYNC_SKELETONS.map((key) => (
                <div key={key} className="conv-skel">
                  <span className="conv-skel-av" />
                  <span className="conv-skel-main">
                    <span className="conv-skel-line conv-skel-name" />
                    <span className="conv-skel-line conv-skel-preview" />
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {filteredConvs.length === 0 &&
          !isSyncing &&
          (() => {
            const trulyEmpty = conversations.filter((c) => !archived.has(c.id)).length === 0;
            const isDrafts = activeFolderId === "view:drafts";
            const isSent = activeFolderId === "view:sent";
            const isTrash = activeFolderId === "view:trash";
            const folderLabel = isDrafts
              ? "brouillon"
              : isSent
                ? "message envoyé"
                : isTrash
                  ? "message supprimé"
                  : null;

            return (
              <div className="ibx-noresult">
                <svg
                  viewBox="0 0 24 24"
                  width={26}
                  height={26}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p className="ibx-noresult-title">
                  {folderLabel
                    ? `Aucun ${folderLabel}`
                    : trulyEmpty
                      ? "Aucune conversation"
                      : "Aucun résultat"}
                </p>
              </div>
            );
          })()}
        {(() => {
          return clientRows.map(({ rep: c }) => {
            const isActive = c.id === activeConvId;
            const unread = isUnread(c.id, c.unread);
            const ball = archived.has(c.id) ? null : ballInCourt(c) ? "toreply" : "waiting";
            const waitDays =
              ball === "waiting" && c.lastOutboundAt
                ? Math.floor((Date.now() - new Date(c.lastOutboundAt).getTime()) / 86400000)
                : 0;

            const isScanning = mueScanning === "messages" && unread;
            const isHighlighted = mueHighlighted === `conv:${c.id}`;

            const convEl = (
              <button
                type="button"
                className={`conv ${isActive ? "active" : ""} ${unread ? "is-unread" : ""} ${ball ? `conv--${ball}` : ""} ${isScanning ? "has-ai-scanning" : ""} ${isHighlighted ? "has-ai-highlighted" : ""}`}
                title={
                  ball === "toreply"
                    ? "À répondre"
                    : ball === "waiting"
                      ? "En attente d'eux"
                      : undefined
                }
                onClick={() => handleSelect(c.id)}
                onDoubleClick={() => onContextAction(c.id, unread ? "mark-read" : "mark-unread")}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtx({ x: e.clientX, y: e.clientY, convId: c.id });
                }}
                onTouchStart={isMobile ? (e) => handleTouchStart(e, c.id) : undefined}
                onTouchMove={isMobile ? (e) => handleTouchMove(e, c.id) : undefined}
                onTouchEnd={isMobile ? (e) => handleTouchEnd(e, c.id) : undefined}
                style={isMobile ? { position: "relative", zIndex: 2 } : undefined}
              >
                <span className="conv-avatar">
                  <Avatar avatar={c.avatar} />
                  <span
                    className="conv-channel"
                    title={`Reçu via ${channelProviderLabel(c.channel)}`}
                  >
                    <ChannelLogo channel={c.channel} />
                  </span>
                </span>
                <span className="conv-main">
                  <span className="conv-top">
                    <span className="conv-namewrap">
                      <span className="conv-name">{c.name}</span>
                      {c.category === "client" && (
                        <span className="ibx-cat-badge badge-blue">Client</span>
                      )}
                      {c.category === "prospect" && (
                        <span className="ibx-cat-badge badge-rose">Prospect</span>
                      )}
                      {c.category === "prestataire" && (
                        <span className="ibx-cat-badge badge-amber">Prestataire</span>
                      )}
                      {c.category === "collaborateur" && (
                        <span className="ibx-cat-badge badge-green">Équipe</span>
                      )}
                      {c.starred && (
                        <svg
                          className="conv-star"
                          viewBox="0 0 24 24"
                          width={13}
                          height={13}
                          fill="currentColor"
                          stroke="none"
                          aria-label="Favori"
                        >
                          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9 6.2 20.9l1.1-6.47L2.6 9.85l6.5-.95L12 2.5z" />
                        </svg>
                      )}
                    </span>
                    <span className="conv-meta">
                      {unread && <span className="conv-dot" aria-hidden />}
                      {/* Temps relatif calculé avec Date.now() → diffère
                          forcément entre le rendu serveur et le client.
                          suppressHydrationWarning dit à React d'accepter la
                          valeur du client sans lever d'erreur d'hydratation. */}
                      <span
                        className={`conv-when ${unread ? "is-unread" : ""}`}
                        suppressHydrationWarning
                      >
                        {relAge(c.lastAtIso)}
                      </span>
                    </span>
                  </span>
                  <span className="conv-preview">{c.preview || "…"}</span>
                  {hasAttachment(c) && (
                    <span className="conv-attach" aria-label="Pièce jointe">
                      <svg
                        viewBox="0 0 24 24"
                        width={11}
                        height={11}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.9}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 1 1-2.83-2.83l8.49-8.49" />
                      </svg>
                      1 pièce jointe
                    </span>
                  )}
                  {inboxMode === "email" && waitDays >= 2 && (
                    <span className="conv-relance">
                      ⏳ En attente {waitDays} j · <b>Relancer</b>
                    </span>
                  )}
                </span>
              </button>
            );

            return (
              <Fragment key={c.clientId ?? c.id}>
                {isMobile ? (
                  <div
                    className="conv-swipe-container"
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      touchAction: "pan-y",
                      transition: "height 250ms ease, margin-bottom 250ms ease, opacity 250ms ease",
                    }}
                  >
                    {/* Arrière-plan coulissant (Swipe Background) */}
                    <div
                      className="conv-swipe-bg"
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 24px",
                        zIndex: 1,
                        color: "#ffffff",
                        transition: "background-color 200ms ease",
                      }}
                    >
                      <div
                        className="conv-swipe-action-left"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          opacity: 0,
                          transition: "opacity 150ms ease, transform 150ms ease",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span style={{ fontWeight: 600, fontSize: "13px" }}>Snoozer</span>
                      </div>
                      <div
                        className="conv-swipe-action-right"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          opacity: 0,
                          transition: "opacity 150ms ease, transform 150ms ease",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "13px" }}>Archiver</span>
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="21 8 21 21 3 21 3 8" />
                          <rect x="1" y="3" width="22" height="5" />
                          <line x1="10" y1="12" x2="14" y2="12" />
                        </svg>
                      </div>
                    </div>
                    {convEl}
                  </div>
                ) : (
                  convEl
                )}
              </Fragment>
            );
          });
        })()}
      </div>

      {ctx &&
        (() => {
          const ctxConv = conversations.find((c) => c.id === ctx.convId);
          return (
            <ContextMenu
              x={ctx.x}
              y={ctx.y}
              isUnread={isUnread(ctx.convId, ctxConv?.unread)}
              isStarred={!!ctxConv?.starred}
              isSnoozed={!!ctxConv?.snoozedUntilIso}
              currentCategory={ctxConv?.category ?? null}
              onClose={() => setCtx(null)}
              onAction={(action) => onContextAction(ctx.convId, action)}
            />
          );
        })()}
    </section>
  );
}
