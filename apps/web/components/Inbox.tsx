"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { CONVERSATIONS } from "@/lib/data/conversations";
import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";

const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  earlier: "Earlier",
};

export function Inbox() {
  const { activeConvId, setActiveConv } = useApp();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const handleSelect = (id: string) => {
    setActiveConv(id);
    setReadIds((prev) => new Set(prev).add(id));
  };

  // Group conversations by their `group` property
  const groups: Record<string, typeof CONVERSATIONS> = {
    today: [],
    yesterday: [],
    "this-week": [],
    earlier: [],
  };
  for (const c of CONVERSATIONS) {
    groups[c.group]?.push(c);
  }

  return (
    <section className="inbox">
      <header className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">Inbox</h2>
          <span className="panel-count">{CONVERSATIONS.length} conversations</span>
          <button className="filter-btn" type="button" aria-label="Filter">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      <div className="conv-list" id="conv-list">
        {Object.entries(groups).map(([group, items]) =>
          items.length === 0 ? null : (
            <div key={group}>
              <div className="day-label">{GROUP_LABELS[group]}</div>
              {items.map((c) => {
                const isActive = c.id === activeConvId;
                const isUnread = c.unread && !readIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`conv ${isActive ? "active" : ""}`}
                    onClick={() => handleSelect(c.id)}
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
                        <span className="conv-preview">{c.preview}</span>
                        {isUnread && <span className="unread" />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>
    </section>
  );
}
