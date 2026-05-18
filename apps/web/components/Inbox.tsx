"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/hooks/useToast";
import { useData } from "@/lib/contexts/DataContext";
import { ChannelLogo } from "@/components/icons/Icon";
import { NoChannelsHero } from "@/components/NoChannelsHero";
import { autoSyncStaleChannels } from "@/lib/actions/auto-sync";
import { classifyAllUncategorized } from "@/lib/actions/triage";
import { bulkConversationAction } from "@/lib/actions/conversation-flags";
import { Avatar } from "@/components/ui/Avatar";
import { FilterMenu, type FilterMode } from "@/components/FilterMenu";
import { ContextMenu, type ContextAction } from "@/components/ContextMenu";
import { snoozeTargets } from "@/lib/snooze-targets";
import { InitialSyncIndicator } from "@/components/onboarding/InitialSyncIndicator";
import { useRouter as useRouterBulk } from "next/navigation";
import type { ConversationCategory } from "@/lib/types";

const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  earlier: "Earlier",
};

/**
 * Format the ISO timestamp in the user's BROWSER local time (e.g., Paris
 * CEST) rather than the server UTC. Same-day → HH:MM, yesterday → "Yesterday",
 * within a week → weekday short, otherwise short date.
 */
function formatLocalTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yest.getFullYear() &&
    date.getMonth() === yest.getMonth() &&
    date.getDate() === yest.getDate()
  ) {
    return "Yesterday";
  }
  const diffDays = (now.getTime() - date.getTime()) / 86400000;
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Compute the inbox group ("today", "yesterday", "this-week", "earlier")
 * in the BROWSER's local timezone rather than the server's UTC. Critical
 * for users outside UTC: an email received at 00:15 Paris time is 22:15
 * UTC the previous day, and the server would otherwise bucket it as
 * "yesterday" when from the user's perspective it just arrived today.
 */
function clientGroupFor(iso: string): "today" | "yesterday" | "this-week" | "earlier" {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) return "today";
  const startOfYest = new Date(startOfToday);
  startOfYest.setDate(startOfToday.getDate() - 1);
  if (date >= startOfYest) return "yesterday";
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 7);
  if (date >= startOfWeek) return "this-week";
  return "earlier";
}

type CategoryTab = "client" | "promo" | "notif" | "other";

const TAB_LABELS: Record<CategoryTab, string> = {
  client: "Clients",
  promo: "Promos",
  notif: "Notifs",
  other: "Autres",
};

export function Inbox() {
  const router = useRouter();
  const { activeConvId, setActiveConv } = useApp();
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
  } = useData();
  const push = useToast((s) => s.push);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [extraUnread, setExtraUnread] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterMode>("all");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; convId: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<CategoryTab>("client");
  const [triaging, setTriaging] = useState(false);
  // null = no tag filter. When set, only conversations whose .tags array
  // contains this exact tag are shown.
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  // Bulk-select mode: when ≥1 conv is checked, the panel header swaps
  // into a "X sélectionnée(s)" toolbar with Archive / Mark / Star / Snooze.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulkRouter = useRouterBulk();

  const toggleBulk = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearBulk = () => setSelected(new Set());

  // Snooze sub-menu anchored to the bulk toolbar — opens on click,
  // closes on outside-click / Escape (handled by useEffect below).
  const [bulkSnoozeOpen, setBulkSnoozeOpen] = useState(false);
  const bulkSnoozeBtnRef = useRef<HTMLButtonElement>(null);

  const runBulk = async (
    action: "archive" | "mark-read" | "mark-unread" | "star" | "unstar" | "snooze",
    snoozeUntilIso?: string | null
  ) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    clearBulk();
    const res = await bulkConversationAction(ids, action, snoozeUntilIso ?? null);
    if (res.ok) {
      push({
        kind: "info",
        text: `${res.count} conversation${res.count > 1 ? "s" : ""} mises à jour.`,
      });
      bulkRouter.refresh();
    } else {
      push({ kind: "error", text: `Erreur : ${res.error}` });
    }
  };

  // Outside-click + Escape close the bulk snooze dropdown.
  useEffect(() => {
    if (!bulkSnoozeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBulkSnoozeOpen(false);
    };
    const onDocClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".bulk-snooze-wrap")) return;
      setBulkSnoozeOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
      clearTimeout(t);
    };
  }, [bulkSnoozeOpen]);

  const handleTriage = async () => {
    if (triaging) return;
    setTriaging(true);
    try {
      const report = await classifyAllUncategorized();
      router.refresh();
      if (report.classified > 0) {
        push({ text: `Mue a trié ${report.classified} conversation${report.classified > 1 ? "s" : ""}` });
      } else if (report.errors.length > 0) {
        push({ text: `Erreur Mue : ${report.errors[0]?.slice(0, 80)}` });
      } else {
        push({ text: "Tout est déjà trié." });
      }
    } catch (err) {
      push({ text: err instanceof Error ? err.message : "Triage impossible." });
    } finally {
      setTriaging(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // Force-sync regardless of staleness
      const report = await autoSyncStaleChannels(0);
      router.refresh();
      if (report.newMessages > 0) {
        push({ text: `${report.newMessages} nouveau message${report.newMessages > 1 ? "s" : ""}`, duration: 2400 });
      } else {
        push({ text: "Inbox à jour", duration: 1800 });
      }
    } catch {
      push({ text: "Sync impossible — réessayez.", duration: 3000 });
    } finally {
      setRefreshing(false);
    }
  };

  const isUnread = (id: string, baseUnread?: boolean) => {
    if (extraUnread.has(id)) return true;
    if (readIds.has(id)) return false;
    return !!baseUnread;
  };

  const handleSelect = (id: string) => {
    setActiveConv(id);
    setReadIds((prev) => new Set(prev).add(id));
    void markRead(id);
  };

  const onContextAction = (convId: string, action: ContextAction) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;

    // The "snooze" action carries a payload, so check for the object form first.
    if (typeof action === "object" && action.kind === "snooze") {
      void snooze(convId, action.untilIso);
      push({
        kind: "info",
        text: action.untilIso ? `Snoozed: ${action.label}` : "Snooze annulé",
      });
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

  // Per-tab counts (computed across all non-archived convs, ignoring the
  // active read/mentions filter — tabs always show their full bucket).
  const tabCounts = useMemo(() => {
    const counts: Record<CategoryTab, number> & { unclassified: number } = {
      client: 0,
      promo: 0,
      notif: 0,
      other: 0,
      unclassified: 0,
    };
    for (const c of conversations) {
      if (archived.has(c.id)) continue;
      if (c.category === "client") counts.client += 1;
      else if (c.category === "promo") counts.promo += 1;
      else if (c.category === "notif") counts.notif += 1;
      else if (c.category === "other") counts.other += 1;
      else counts.unclassified += 1;
    }
    return counts;
  }, [conversations, archived]);

  const filteredConvs = useMemo(() => {
    return conversations.filter((c) => {
      if (archived.has(c.id)) return false;
      // Tab filter — pin to the bucket the user selected. Unclassified
      // conversations show under whichever tab the user is on (so they
      // never "disappear" until Mue has had a chance to classify them).
      const category: ConversationCategory = c.category ?? null;
      if (category && category !== tab) return false;
      if (filter === "unread" && !isUnread(c.id, c.unread)) return false;
      if (filter === "mentions") return false;
      // Tag filter — applies on top of everything else. Hidden when null.
      if (tagFilter && !(c.tags ?? []).includes(tagFilter)) return false;
      return true;
    });
  }, [conversations, archived, filter, extraUnread, readIds, tab, tagFilter]);

  // Distinct tag list (sorted by frequency desc, then alpha) across all
  // non-archived convs. Used to populate the tag filter row in the panel
  // header — only shows when ≥1 tag actually exists, so an empty workspace
  // never sees this row.
  const tagOptions = useMemo(() => {
    const freq = new Map<string, number>();
    for (const c of conversations) {
      if (archived.has(c.id)) continue;
      for (const t of c.tags ?? []) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [conversations, archived]);

  const groups: Record<string, typeof conversations> = {
    today: [],
    yesterday: [],
    "this-week": [],
    earlier: [],
  };
  // Use the browser-local group (not the server's), so 00:15 Paris time
  // mail doesn't slip into "yesterday" because the server is on UTC.
  for (const c of filteredConvs) {
    groups[clientGroupFor(c.lastAtIso)]?.push(c);
  }

  const counts = {
    all: conversations.filter((c) => !archived.has(c.id)).length,
    unread: conversations.filter((c) => !archived.has(c.id) && isUnread(c.id, c.unread)).length,
    mentions: 0,
  };

  // Nothing connected yet → show the hero instead of an empty conversation
  // list. This is the single most important CTA for a fresh workspace.
  if (channels.length === 0) {
    return (
      <section className="inbox">
        <NoChannelsHero />
      </section>
    );
  }

  const bulkActive = selected.size > 0;

  return (
    <section className="inbox">
      <header className={`panel-head ${bulkActive ? "is-bulk" : ""}`}>
        {bulkActive && (
          <div className="bulk-bar" role="toolbar" aria-label="Actions groupées">
            <button
              type="button"
              className="bulk-clear"
              onClick={clearBulk}
              aria-label="Désélectionner"
            >
              ✕
            </button>
            <span className="bulk-count">{selected.size} sélectionnée{selected.size > 1 ? "s" : ""}</span>
            <span className="bulk-spacer" />
            <button type="button" className="bulk-btn" onClick={() => runBulk("mark-read")} data-tip="Marquer lu">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </button>
            <button type="button" className="bulk-btn" onClick={() => runBulk("star")} data-tip="Étoiler">
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </button>
            <div className="bulk-snooze-wrap">
              <button
                ref={bulkSnoozeBtnRef}
                type="button"
                className="bulk-btn"
                onClick={() => setBulkSnoozeOpen((v) => !v)}
                data-tip="Snooze"
                aria-expanded={bulkSnoozeOpen}
                aria-haspopup="menu"
              >
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
              {bulkSnoozeOpen && (
                <div className="bulk-snooze-menu" role="menu">
                  {snoozeTargets().map((t) => (
                    <button
                      key={t.iso}
                      type="button"
                      className="bulk-snooze-item"
                      role="menuitem"
                      onClick={() => {
                        setBulkSnoozeOpen(false);
                        void runBulk("snooze", t.iso);
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="bulk-btn bulk-btn-danger" onClick={() => runBulk("archive")} data-tip="Archiver">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
            </button>
          </div>
        )}
        <div className="panel-title-row" style={bulkActive ? { display: "none" } : undefined}>
          <h2 className="panel-title">Inbox</h2>
          <span className="panel-count">{tabCounts[tab]} {TAB_LABELS[tab].toLowerCase()}</span>
          <button
            className="filter-btn"
            type="button"
            aria-label="Trier avec Mue"
            data-tip="Mue trie tes mails par catégorie"
            onClick={handleTriage}
            disabled={triaging}
            style={triaging ? { opacity: 0.5 } : undefined}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            className="filter-btn"
            type="button"
            aria-label="Rafraîchir"
            data-tip="Rafraîchir"
            onClick={handleRefresh}
            disabled={refreshing}
            style={refreshing ? { opacity: 0.5 } : undefined}
          >
            <svg className={`icon ${refreshing ? "is-spinning" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            ref={filterBtnRef}
            className="filter-btn"
            type="button"
            aria-label="Filtrer"
            data-tip="Filtrer"
            onClick={() => setFilterAnchor(filterBtnRef.current)}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
          </button>
        </div>
        <div className="inbox-tabs" role="tablist">
          {(["client", "promo", "notif", "other"] as CategoryTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`inbox-tab ${tab === t ? "is-active" : ""}`}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
              {tabCounts[t] > 0 && <span className="inbox-tab-count">{tabCounts[t]}</span>}
            </button>
          ))}
          {tabCounts.unclassified > 0 && (
            <span className="inbox-tab-pending" title="Non triés par Mue — clique sur l'étoile pour lancer le tri">
              · {tabCounts.unclassified} à trier
            </span>
          )}
        </div>

        {tagOptions.length > 0 && (
          <div className="tag-filter-row" role="group" aria-label="Filtrer par tag">
            <button
              type="button"
              className={`tag-filter-chip ${tagFilter === null ? "is-active" : ""}`}
              onClick={() => setTagFilter(null)}
            >
              Tous
            </button>
            {tagOptions.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                className={`tag-filter-chip ${tagFilter === tag ? "is-active" : ""}`}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                title={`${count} conversation${count > 1 ? "s" : ""}`}
              >
                {tag}
                <span className="tag-filter-count">{count}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="conv-list" id="conv-list">
        {filteredConvs.length === 0 && isSyncing && (
          <>
            {/* First-sync banner: friendly, honest status. Surfaces ONLY
                during the very first sync (when the inbox is empty AND
                sync is in flight). On subsequent refreshes the existing
                spinning refresh button in the header is enough. */}
            <InitialSyncIndicator />
            <div className="conv-skel-list" aria-busy="true" aria-label="Chargement des conversations">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="conv-skel">
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
        {filteredConvs.length === 0 && !isSyncing && (
          <div className="empty-state is-visible">
            <div className="empty-orb" />
            <div className="empty-title">Inbox zero 🎉</div>
            <div className="empty-text">Aucune conversation pour ce filtre. Essayez-en un autre, ou prenez une pause.</div>
          </div>
        )}
        {Object.entries(groups).map(([group, items]) =>
          items.length === 0 ? null : (
            <div key={group}>
              <div className="day-label">{GROUP_LABELS[group]}</div>
              {items.map((c) => {
                const isActive = c.id === activeConvId;
                const unread = isUnread(c.id, c.unread);
                const isSel = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`conv ${isActive ? "active" : ""} ${isSel ? "is-selected" : ""}`}
                    onClick={(e) => {
                      // Shift / cmd click → toggle bulk selection without opening.
                      // Bulk mode is also active when ≥1 conv is already selected.
                      if (e.shiftKey || e.metaKey || e.ctrlKey || bulkActive) {
                        e.preventDefault();
                        toggleBulk(c.id);
                        return;
                      }
                      handleSelect(c.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCtx({ x: e.clientX, y: e.clientY, convId: c.id });
                    }}
                  >
                    <span
                      className="conv-avatar"
                      onClick={(e) => {
                        // Click on the avatar = toggle selection (don't open).
                        e.stopPropagation();
                        toggleBulk(c.id);
                      }}
                      role="checkbox"
                      aria-checked={isSel}
                    >
                      {isSel ? (
                        <span className="conv-check" aria-hidden>✓</span>
                      ) : (
                        <Avatar avatar={c.avatar} />
                      )}
                      <span className="conv-badge">
                        <ChannelLogo channel={c.channel} className="" />
                      </span>
                    </span>
                    <span className="conv-main">
                      <span className="conv-top">
                        <span className="conv-name">{c.name}</span>
                        <span className="conv-time">{formatLocalTime(c.lastAtIso)}</span>
                      </span>
                      <span className="conv-bottom">
                        <span className="conv-preview">
                          {c.starred && <span className="conv-star" aria-label="Étoile">★</span>}
                          {c.preview}
                        </span>
                        {unread && <span className="unread" />}
                      </span>
                      {(c.tags?.length ?? 0) > 0 && (
                        <span className="conv-tags" aria-hidden>
                          {(c.tags ?? []).slice(0, 3).map((t) => (
                            <span key={t} className="conv-tag-pill">{t}</span>
                          ))}
                          {(c.tags?.length ?? 0) > 3 && (
                            <span className="conv-tag-pill conv-tag-more">
                              +{(c.tags?.length ?? 0) - 3}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>

      {filterAnchor && (
        <FilterMenu
          anchor={filterAnchor}
          current={filter}
          onSelect={setFilter}
          onClose={() => setFilterAnchor(null)}
          counts={counts}
        />
      )}

      {ctx && (() => {
        const ctxConv = conversations.find((c) => c.id === ctx.convId);
        return (
          <ContextMenu
            x={ctx.x}
            y={ctx.y}
            isUnread={isUnread(ctx.convId, ctxConv?.unread)}
            isStarred={!!ctxConv?.starred}
            isSnoozed={!!ctxConv?.snoozedUntilIso}
            onClose={() => setCtx(null)}
            onAction={(action) => onContextAction(ctx.convId, action)}
          />
        );
      })()}
    </section>
  );
}
