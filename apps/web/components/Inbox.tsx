"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/hooks/useToast";
import { useData } from "@/lib/contexts/DataContext";
import { ChannelLogo } from "@/components/icons/Icon";
import { NoChannelsHero } from "@/components/NoChannelsHero";
import { autoSyncStaleChannels } from "@/lib/actions/auto-sync";
import { Avatar } from "@/components/ui/Avatar";
import { FilterMenu, type FilterMode } from "@/components/FilterMenu";
import { ContextMenu, type ContextAction } from "@/components/ContextMenu";

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

export function Inbox() {
  const router = useRouter();
  const { activeConvId, setActiveConv } = useApp();
  const { conversations, archived, archive: archiveConv, unarchive, markRead, markUnread, isSyncing, channels } = useData();
  const push = useToast((s) => s.push);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [extraUnread, setExtraUnread] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterMode>("all");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; convId: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
        push({ text: "Marked as read" });
        break;
      case "mark-unread":
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(convId);
          return next;
        });
        setExtraUnread((prev) => new Set(prev).add(convId));
        void markUnread(convId);
        push({ text: "Marked as unread" });
        break;
      case "star":
        setStarred((prev) => {
          const next = new Set(prev);
          if (next.has(convId)) next.delete(convId);
          else next.add(convId);
          return next;
        });
        push({ text: `★ Starred ${conv.name}` });
        break;
      case "archive":
        archiveConv(convId);
        push({
          text: `${conv.name} archived`,
          action: { label: "Undo", fn: () => unarchive(convId) },
        });
        break;
    }
  };

  const filteredConvs = useMemo(() => {
    return conversations.filter((c) => {
      if (archived.has(c.id)) return false;
      if (filter === "unread") return isUnread(c.id, c.unread);
      if (filter === "mentions") return false;
      return true;
    });
  }, [conversations, archived, filter, extraUnread, readIds]);

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

  return (
    <section className="inbox">
      <header className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">Inbox</h2>
          <span className="panel-count">{counts.all} conversations</span>
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
      </header>

      <div className="conv-list" id="conv-list">
        {filteredConvs.length === 0 && isSyncing && (
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
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`conv ${isActive ? "active" : ""}`}
                    onClick={() => handleSelect(c.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCtx({ x: e.clientX, y: e.clientY, convId: c.id });
                    }}
                  >
                    <span className="conv-avatar">
                      <Avatar avatar={c.avatar} />
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
                          {starred.has(c.id) && "★ "}
                          {c.preview}
                        </span>
                        {unread && <span className="unread" />}
                      </span>
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

      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          isUnread={isUnread(ctx.convId, conversations.find((c) => c.id === ctx.convId)?.unread)}
          onClose={() => setCtx(null)}
          onAction={(action) => onContextAction(ctx.convId, action)}
        />
      )}
    </section>
  );
}
