"use client";

import { FreescaleMark } from "@/components/brand/FreescaleMark";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";

type NavId =
  | "today"
  | "inbox"
  | "tasks"
  | "calendar"
  | "ai-knowledge"
  | "clients"
  | "recap"
  | "mue";

type NavItem = {
  id: NavId;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "inbox", label: "Inbox" },
  { id: "today", label: "Tâches" },
  { id: "clients", label: "Santé client" },
  { id: "calendar", label: "Calendar" },
  { id: "ai-knowledge", label: "Mue" },
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
    case "clients":
      return (
        <svg {...p}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "mue":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.5" y2="16.5" />
          <path d="M11 7.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
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
    case "recap":
      return (
        <svg {...p}>
          <line x1="4" y1="20" x2="20" y2="20" />
          <rect x="5" y="11" width="3.5" height="6" rx="1" />
          <rect x="10.25" y="7" width="3.5" height="10" rx="1" />
          <rect x="15.5" y="13" width="3.5" height="4" rx="1" />
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
export function Sidebar() {
  const { view, setView, setActiveConv, toggleSidebar } = useApp();
  const data = useData();
  const conversations = data.conversations ?? [];
  const tasks = data.tasks ?? [];

  // Real counts derived from the live DB
  const counts: Record<NavId, number | null> = {
    today: tasks.filter((t) => t.status !== "done").length,
    inbox: conversations.filter((c) => c.unread).length,
    tasks: tasks.filter((t) => t.status !== "done").length,
    clients: null,
    mue: null,
    calendar: null,
    recap: null,
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
        <FreescaleMark size={26} className="sidebar-brand-mark" />
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
              <span className="nav-ico">
                <NavIcon id={item.id} />
                {count != null && count > 0 && <span className="nav-badge">{count}</span>}
              </span>
              <span className="nav-text">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
