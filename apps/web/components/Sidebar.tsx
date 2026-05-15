"use client";

import { useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/hooks/useToast";
import type { CurrentUser } from "@/lib/auth";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { ChannelPicker } from "@/components/ChannelPicker";

type NavItem = {
  id: "inbox" | "tasks" | "calendar" | "ai-knowledge";
  label: string;
  icon: string;
  count?: number;
  beta?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "inbox", label: "Inbox", icon: "i-inbox", count: 12 },
  { id: "tasks", label: "Tasks", icon: "i-task", count: 8 },
  { id: "calendar", label: "Calendar", icon: "i-cal" },
  { id: "ai-knowledge", label: "AI Knowledge", icon: "i-spark", beta: true },
];

const DEFAULT_CHANNELS = [
  { id: "gmail", label: "Gmail", count: 12 },
  { id: "instagram", label: "Instagram", count: 6 },
  { id: "whatsapp", label: "WhatsApp", count: 2 },
  { id: "slack", label: "Slack", count: 3 },
  { id: "discord", label: "Discord", count: 1 },
];

export function Sidebar({ user }: { user: CurrentUser | null }) {
  const { view, setView, toggleSidebar } = useApp();
  const push = useToast((s) => s.push);
  const [extraChannels, setExtraChannels] = useState<Array<{ id: string; label: string }>>([]);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const connectedIds = new Set<string>([
    ...DEFAULT_CHANNELS.map((c) => c.id),
    ...extraChannels.map((c) => c.id),
  ]);

  const handleConnect = (id: string, name: string) => {
    setExtraChannels((prev) => [...prev, { id, label: name }]);
    push({ text: `✓ ${name} connected` });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-name">freescale</span>
        <span className="brand-dot" />
        <button
          className="sidebar-toggle"
          type="button"
          aria-label="Toggle sidebar"
          data-tip="Collapse sidebar"
          data-tip-side="right"
          onClick={toggleSidebar}
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      <nav className="nav-section">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${view === item.id ? "active" : ""}`}
            onClick={() => setView(item.id)}
          >
            <span className="nav-left">
              <Icon name={item.icon} />
              <span className="nav-text">
                {item.label}
                {item.beta && <span className="nav-beta">Beta</span>}
              </span>
            </span>
            {item.count != null && <span className="count">{item.count}</span>}
          </button>
        ))}
      </nav>

      <nav className="nav-section" id="channels-section">
        <div className="nav-section-head">
          <div className="nav-label">Channels</div>
          <button
            ref={addBtnRef}
            className="add-channel-btn"
            type="button"
            aria-label="Add channel"
            data-tip="Add channel"
            data-tip-side="right"
            onClick={(e) => {
              e.stopPropagation();
              setPickerAnchor(pickerAnchor ? null : addBtnRef.current);
            }}
          >
            <Icon name="i-plus" />
          </button>
        </div>
        {DEFAULT_CHANNELS.map((ch) => (
          <button key={ch.id} type="button" className="nav-item">
            <span className="nav-left">
              <ChannelLogo channel={ch.id} />
              <span className="nav-text">{ch.label}</span>
            </span>
            <span className="count">{ch.count}</span>
          </button>
        ))}
        {extraChannels.map((ch) => (
          <button key={ch.id} type="button" className="nav-item">
            <span className="nav-left">
              <ChannelLogo channel={ch.id} />
              <span className="nav-text">{ch.label}</span>
            </span>
            <span className="count">·</span>
          </button>
        ))}
      </nav>

      <div className="account" ref={accountRef} style={{ position: "relative" }}>
        <span className="avatar">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" />
          ) : (
            user?.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() ?? "?"
          )}
        </span>
        <div className="account-info">
          <div className="account-name">{user?.firstName ?? "Guest"}</div>
          <div className="account-role">{user?.email ?? "Not signed in"}</div>
        </div>
        <button
          className="settings-btn"
          type="button"
          aria-label="Account menu"
          data-tip="Account"
          onClick={() => setAccountMenuOpen((v) => !v)}
        >
          <Icon name="i-settings" />
        </button>

        {accountMenuOpen && (
          <div
            className="ctx-menu"
            style={{ position: "absolute", left: 8, bottom: 64, width: 220 }}
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <button
              className="ctx-item"
              type="button"
              onClick={() => {
                setAccountMenuOpen(false);
                push({ text: "Settings — coming soon ⚙" });
              }}
            >
              <Icon name="i-settings" /> Settings
            </button>
            <div className="ctx-divider" />
            <form action="/auth/sign-out" method="post" style={{ margin: 0 }}>
              <button className="ctx-item is-danger" type="submit" style={{ width: "100%" }}>
                <Icon name="i-arrow-up" /> Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      {pickerAnchor && (
        <ChannelPicker
          anchor={pickerAnchor}
          connectedIds={connectedIds}
          onClose={() => setPickerAnchor(null)}
          onConnect={handleConnect}
        />
      )}
    </aside>
  );
}
