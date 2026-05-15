"use client";

import { useApp } from "@/lib/store";
import { Icon, ChannelLogo } from "@/components/icons/Icon";

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

const CHANNELS = [
  { id: "gmail", label: "Gmail", count: 12 },
  { id: "instagram", label: "Instagram", count: 6 },
  { id: "whatsapp", label: "WhatsApp", count: 2 },
  { id: "slack", label: "Slack", count: 3 },
  { id: "discord", label: "Discord", count: 1 },
] as const;

export function Sidebar() {
  const { view, setView, toggleSidebar } = useApp();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-name">freescale</span>
        <span className="brand-dot" />
        <button
          className="sidebar-toggle"
          type="button"
          aria-label="Toggle sidebar"
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
          <button className="add-channel-btn" type="button" aria-label="Add channel">
            <Icon name="i-plus" />
          </button>
        </div>
        {CHANNELS.map((ch) => (
          <button key={ch.id} type="button" className="nav-item">
            <span className="nav-left">
              <ChannelLogo channel={ch.id} />
              <span className="nav-text">{ch.label}</span>
            </span>
            <span className="count">{ch.count}</span>
          </button>
        ))}
      </nav>

      <div className="account">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="avatar">
          <img src="https://i.pravatar.cc/120?img=68" alt="Alexandre" />
        </span>
        <div className="account-info">
          <div className="account-name">Alexandre</div>
          <div className="account-role">Freelance Designer</div>
        </div>
        <button className="settings-btn" type="button" aria-label="Settings">
          <Icon name="i-settings" />
        </button>
      </div>
    </aside>
  );
}
