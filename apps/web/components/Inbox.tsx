"use client";

import { useState, useRef, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/hooks/useToast";
import { useData } from "@/lib/contexts/DataContext";
import { ChannelLogo } from "@/components/icons/Icon";
import { NoChannelsHero } from "@/components/NoChannelsHero";
import { Avatar } from "@/components/ui/Avatar";
import { FilterMenu, type FilterMode } from "@/components/FilterMenu";
import { ContextMenu, type ContextAction } from "@/components/ContextMenu";

const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  earlier: "Earlier",
};

export function Inbox() {
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
  for (const c of filteredConvs) {
    groups[c.group]?.push(c);
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
            ref={filterBtnRef}
            className="filter-btn"
            type="button"
            aria-label="Filter"
            data-tip="Filter conversations"
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
                        <span className="conv-time">{c.time}</span>
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
