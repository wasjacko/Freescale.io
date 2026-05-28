"use client";

import { Icon } from "@/components/icons/Icon";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { ViewId } from "@/lib/types";

type MobileNavItem = {
  id: ViewId;
  label: string;
  icon: string;
  count?: number;
};

export function MobileBottomNav() {
  const { view, setView, setActiveConv } = useApp();
  const { conversations, tasks } = useData();

  const unreadCount = conversations.filter((conversation) => conversation.unread).length;
  const openTaskCount = tasks.filter((task) => task.status !== "done").length;
  const items: MobileNavItem[] = [
    { id: "today", label: "Aujourd'hui", icon: "i-spark" },
    { id: "inbox", label: "Inbox", icon: "i-inbox", count: unreadCount },
    { id: "tasks", label: "Taches", icon: "i-task", count: openTaskCount },
    { id: "calendar", label: "Agenda", icon: "i-cal" },
    { id: "more", label: "Plus", icon: "i-more" },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigation principale mobile">
      {items.map((item) => {
        const active = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-bottom-nav-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (item.id === "more") setView("more");
              else setView(item.id);
              if (item.id === "inbox") setActiveConv("");
            }}
          >
            <span className="mobile-bottom-nav-icon">
              <Icon name={item.icon} />
              {item.count != null && item.count > 0 && (
                <span className="mobile-bottom-nav-count">{item.count}</span>
              )}
            </span>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
