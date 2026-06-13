"use client";

import { FreescaleMark } from "@/components/brand/FreescaleMark";
import type { CurrentUser } from "@/lib/auth";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import Link from "next/link";

type NavId = "today" | "inbox" | "tasks" | "calendar" | "ai-knowledge";

type NavItem = {
  id: NavId;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "today", label: "Tâches" },
  { id: "inbox", label: "Inbox" },
  { id: "calendar", label: "Calendar" },
  { id: "ai-knowledge", label: "AI Knowledge" },
];

/** Icônes outline fines et cohérentes (façon Lucide), une par section. */
function NavIcon({ id }: { id: NavId }) {
  const p = {
    className: "icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case "today":
      return (
        <svg {...p}>
          <path d="m3 8 2 2 4-4" />
          <path d="m3 17 2 2 4-4" />
          <line x1="13" y1="7" x2="21" y2="7" />
          <line x1="13" y1="17" x2="21" y2="17" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...p}>
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...p}>
          <path d="m3 8 2 2 4-4" />
          <path d="m3 17 2 2 4-4" />
          <line x1="13" y1="7" x2="21" y2="7" />
          <line x1="13" y1="17" x2="21" y2="17" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
          <line x1="16" y1="2.5" x2="16" y2="6.5" />
          <line x1="8" y1="2.5" x2="8" y2="6.5" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "ai-knowledge":
      return (
        <svg {...p}>
          <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" />
          <path d="M18.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
        </svg>
      );
  }
}

/**
 * Sidebar — navigation pleine hauteur : logo en haut, sections, et footer
 * « Aide & support » en bas (façon maquette).
 */
export function Sidebar({ user }: { user: CurrentUser | null }) {
  const { view, setView, setActiveConv, toggleSidebar } = useApp();
  const data = useData();
  const conversations = data.conversations ?? [];
  const tasks = data.tasks ?? [];

  const initials =
    user?.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  // Real counts derived from the live DB
  const counts: Record<NavId, number | null> = {
    today: tasks.filter((t) => t.status !== "done").length,
    inbox: conversations.filter((c) => c.unread).length,
    tasks: tasks.filter((t) => t.status !== "done").length,
    calendar: null,
    "ai-knowledge": null,
  };

  return (
    <aside className="sidebar">
      {/* Double-clic sur le bord droit = replier/déplier la sidebar. */}
      <div className="sidebar-edge" onDoubleClick={toggleSidebar} aria-hidden />
      <button
        type="button"
        className="sidebar-brand"
        onClick={() => setView("today")}
        aria-label="Accueil — Tâches"
      >
        <FreescaleMark size={22} className="sidebar-brand-mark" />
        <span className="sidebar-brand-word">Freescale</span>
      </button>

      <nav className="nav-section">
        {NAV_ITEMS.map((item) => {
          const count = counts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${view === item.id ? "active" : ""}`}
              aria-label={item.label}
              onClick={() => {
                setView(item.id);
                if (item.id === "inbox") setActiveConv("");
              }}
            >
              <span className="nav-left">
                <NavIcon id={item.id} />
                <span className="nav-text">{item.label}</span>
              </span>
              {count != null && count > 0 && (
                <span
                  className="count"
                  onClick={(e) => {
                    if (item.id !== "inbox") return;
                    e.stopPropagation();
                    const first = conversations.find((c) => c.unread);
                    setView("inbox");
                    if (first) setActiveConv(first.id);
                  }}
                  onKeyDown={(e) => {
                    if (item.id !== "inbox" || (e.key !== "Enter" && e.key !== " ")) return;
                    e.stopPropagation();
                    const first = conversations.find((c) => c.unread);
                    setView("inbox");
                    if (first) setActiveConv(first.id);
                  }}
                  role={item.id === "inbox" ? "button" : undefined}
                  tabIndex={item.id === "inbox" ? 0 : undefined}
                  title={item.id === "inbox" ? "Ouvrir la première non-lue" : undefined}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <Link href="/app/settings/profile" className="sidebar-account">
          <span className="sidebar-account-av">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" />
            ) : (
              initials
            )}
          </span>
          <span className="sidebar-account-name">{user?.name ?? "Compte"}</span>
        </Link>
      </div>
    </aside>
  );
}
