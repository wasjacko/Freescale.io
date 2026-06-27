"use client";

import { type ContextAction, ContextMenu } from "@/components/ContextMenu";
import { NoChannelsHero } from "@/components/NoChannelsHero";
import { ChannelLogo } from "@/components/icons/Icon";
import { InitialSyncIndicator } from "@/components/onboarding/InitialSyncIndicator";
import { Avatar } from "@/components/ui/Avatar";
import { channelProviderLabel, isEmailLikeChannel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
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
  // « / » = recherche locale éphémère (filtre par nom, Esc pour fermer).
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase() ?? "";
      const inField = tag === "input" || tag === "textarea";
      if (e.key === "/" && !inField) {
        e.preventDefault();
        setSearchOpen(true);
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
      {/* Plus de titre « Inbox » ni de bouton ici — le nouveau message vit dans
          la barre d'outils. La recherche (« / ») s'affiche au-dessus de la liste. */}
      {searchOpen && (
        <header className="panel-head">
          <input
            ref={searchRef}
            className="ibx-search"
            placeholder="Filtrer…"
            value={inboxSearch}
            onChange={(e) => setInboxSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setInboxSearch("");
                setSearchOpen(false);
              }
            }}
            onBlur={() => {
              if (!inboxSearch) setSearchOpen(false);
            }}
          />
        </header>
      )}

      <div className="conv-list" id="conv-list">
        {filteredConvs.length === 0 && showSkeletons && (
          <>
            {/* First-sync banner: friendly, honest status. Surfaces ONLY
                during the very first sync (when the inbox is empty AND
                sync is in flight). On subsequent refreshes the existing
                spinning refresh button in the header is enough. */}
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
                  {trulyEmpty ? "Aucune conversation" : "Aucun résultat"}
                </p>
              </div>
            );
          })()}
        {(() => {
          // Groupement par ÉTAT DE LECTURE : « Non lus » d'abord, puis
          // « Déjà ouverts ». On réordonne pour que chaque groupe soit
          // contigu (non-lus en tête), en gardant le tri courant à l'intérieur.
          let lastSection = "";
          const orderedRows = [...clientRows].sort((a, b) => {
            const ua = isUnread(a.rep.id, a.rep.unread) ? 0 : 1;
            const ub = isUnread(b.rep.id, b.rep.unread) ? 0 : 1;
            return ua - ub;
          });
          return orderedRows.map(({ rep: c }) => {
            const isActive = c.id === activeConvId;
            const unread = isUnread(c.id, c.unread);
            const ball = archived.has(c.id) ? null : ballInCourt(c) ? "toreply" : "waiting";
            const waitDays =
              ball === "waiting" && c.lastOutboundAt
                ? Math.floor((Date.now() - new Date(c.lastOutboundAt).getTime()) / 86400000)
                : 0;
            const section = unread ? "Non lus" : "Déjà ouverts";
            const showSection = section !== lastSection;
            if (showSection) lastSection = section;
            return (
              <Fragment key={c.clientId ?? c.id}>
                {showSection && <div className="conv-section">{section}</div>}
                <button
                  type="button"
                  className={`conv ${isActive ? "active" : ""} ${unread ? "is-unread" : ""} ${ball ? `conv--${ball}` : ""}`}
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
                      <span className="conv-name">{c.name}</span>
                      <span className="conv-meta">
                        {unread && <span className="conv-dot" aria-hidden />}
                        <span className={`conv-when ${unread ? "is-unread" : ""}`}>
                          {relAge(c.lastAtIso)}
                        </span>
                      </span>
                    </span>
                    <span className="conv-preview">{c.preview || "…"}</span>
                    {waitDays >= 2 && (
                      <span className="conv-relance">
                        ⏳ En attente {waitDays} j · <b>Relancer</b>
                      </span>
                    )}
                  </span>
                  {/* Indicateur multi-canaux retiré : on garde uniquement le
                      logo du canal sur lequel arrive le message courant
                      (sur l'avatar, .conv-channel). La fiche client liste
                      tous les canaux du contact pour ceux qui veulent. */}
                </button>
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
