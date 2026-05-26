"use client";

import { AddChannelModal } from "@/components/AddChannelModal";
import { ChannelLogo, Icon } from "@/components/icons/Icon";
import { switchWorkspace } from "@/lib/actions/collaboration";
import type { CurrentUser } from "@/lib/auth";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

type NavItem = {
  id: "today" | "inbox" | "tasks" | "calendar" | "ai-knowledge";
  label: string;
  icon: string;
  beta?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "today", label: "Aujourd'hui", icon: "i-spark" },
  { id: "inbox", label: "Inbox", icon: "i-inbox" },
  { id: "tasks", label: "Tasks", icon: "i-task" },
  { id: "calendar", label: "Calendar", icon: "i-cal" },
  { id: "ai-knowledge", label: "AI Knowledge", icon: "i-book", beta: true },
];

export function Sidebar({ user }: { user: CurrentUser | null }) {
  const { view, setView, toggleSidebar, setActiveConv } = useApp();
  const data = useData();
  const router = useRouter();
  const conversations = data.conversations ?? [];
  const tasks = data.tasks ?? [];
  const channels = data.channels ?? [];
  const workspaces = data.workspaces ?? [];
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const connectedKinds = useMemo(() => new Set(channels.map((c) => c.kind)), [channels]);
  const canConnect = data.canConnectChannels;

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === data.activeWorkspaceId || switchingWorkspace) return;
    setSwitchingWorkspace(true);
    const result = await switchWorkspace({ workspaceId });
    if (result.ok) {
      setActiveConv("");
      router.refresh();
    }
    setSwitchingWorkspace(false);
  };

  // Real counts derived from the live DB
  const counts: Record<NavItem["id"], number | null> = {
    today: null,
    inbox: conversations.filter((c) => c.unread).length,
    tasks: tasks.filter((t) => t.status !== "done").length,
    calendar: null,
    "ai-knowledge": null,
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
          <svg
            className="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      <div className="workspace-switcher">
        <select
          value={data.activeWorkspaceId ?? ""}
          onChange={(event) => void handleWorkspaceSwitch(event.target.value)}
          disabled={switchingWorkspace || workspaces.length <= 1}
          aria-label="Changer de workspace"
        >
          {workspaces.length === 0 ? (
            <option value="">Personal</option>
          ) : (
            workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))
          )}
        </select>
        <Link href="/app/settings/team" aria-label="Gérer l'équipe">
          <Icon name="i-user" />
        </Link>
      </div>

      <nav className="nav-section">
        {NAV_ITEMS.map((item) => {
          const count = counts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => {
                setView(item.id);
                // Clicking "Inbox" always returns to the conv-list view —
                // even if a thread is currently open. Without this the
                // data-active-conv="1" CSS keeps the thread mounted and
                // the inbox panel stays hidden.
                if (item.id === "inbox") setActiveConv("");
              }}
            >
              <span className="nav-left">
                <Icon name={item.icon} />
                <span className="nav-text">
                  {item.label}
                  {item.beta && <span className="nav-beta">Beta</span>}
                </span>
              </span>
              {count != null && count > 0 && <span className="count">{count}</span>}
            </button>
          );
        })}
      </nav>

      <nav className="nav-section" id="channels-section">
        <div className="nav-section-head">
          <div className="nav-label">Channels</div>
          <button
            type="button"
            className="add-channel-btn"
            aria-label="Connecter un canal"
            data-tip="Connecter un canal"
            data-tip-side="right"
            onClick={() => {
              if (canConnect) setAddChannelOpen(true);
            }}
            disabled={!canConnect}
          >
            <Icon name="i-plus" />
          </button>
        </div>
        {channels.length === 0 ? (
          <button
            type="button"
            className="nav-item"
            style={{ opacity: 0.78 }}
            onClick={() => {
              if (canConnect) setAddChannelOpen(true);
            }}
            disabled={!canConnect}
          >
            <span className="nav-left">
              <Icon name="i-plus" />
              <span className="nav-text">Connecter un canal</span>
            </span>
          </button>
        ) : (
          channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className="nav-item"
              onClick={() => {
                setView("inbox");
                // Same back-to-list semantics as the Inbox nav item — a
                // channel click means "show me this channel's mails".
                setActiveConv("");
              }}
            >
              <span className="nav-left">
                <ChannelLogo channel={ch.kind} />
                <span className="nav-text">{ch.displayName}</span>
              </span>
              {ch.unreadCount > 0 ? (
                <span className="count">{ch.unreadCount}</span>
              ) : ch.conversationCount > 0 ? (
                <span className="count" style={{ opacity: 0.5 }}>
                  {ch.conversationCount}
                </span>
              ) : null}
            </button>
          ))
        )}
      </nav>

      <div className="account" ref={accountRef} style={{ position: "relative" }}>
        <span className="avatar">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" />
          ) : (
            (user?.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() ?? "?")
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
            <Link
              href="/app/settings/profile"
              className="ctx-item"
              onClick={() => setAccountMenuOpen(false)}
            >
              <Icon name="i-settings" /> Paramètres
            </Link>
            <Link
              href="/app/settings/connections"
              className="ctx-item"
              onClick={() => setAccountMenuOpen(false)}
            >
              <Icon name="i-globe" /> Connexions
            </Link>
            <Link
              href="/app/settings/team"
              className="ctx-item"
              onClick={() => setAccountMenuOpen(false)}
            >
              <Icon name="i-user" /> Équipe
            </Link>
            <div className="ctx-divider" />
            <Link href={"/sign-in?switch=1" as never} className="ctx-item">
              <Icon name="i-spark" /> Changer de compte
            </Link>
            <form action="/auth/sign-out" method="post" style={{ margin: 0 }}>
              <button className="ctx-item is-danger" type="submit" style={{ width: "100%" }}>
                <Icon name="i-arrow-up" /> Se déconnecter
              </button>
            </form>
          </div>
        )}
      </div>

      <AddChannelModal
        open={addChannelOpen}
        onClose={() => setAddChannelOpen(false)}
        connectedKinds={connectedKinds}
      />
    </aside>
  );
}
