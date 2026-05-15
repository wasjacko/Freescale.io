"use client";

import { useApp } from "@/lib/store";
import { Sprite } from "@/components/icons/Sprite";
import { Sidebar } from "@/components/Sidebar";
import { Inbox } from "@/components/Inbox";
import { Thread } from "@/components/Thread";
import { MuePanel } from "@/components/MuePanel";
import { TasksView } from "@/components/TasksView";
import { CalendarView } from "@/components/CalendarView";
import { AIKnowledgeView } from "@/components/AIKnowledgeView";

export function AppShell() {
  const { view, sidebarCollapsed } = useApp();

  const appClasses = [
    "app",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    `view-${view === "ai-knowledge" ? "ai" : view}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Sprite />
      <div className={appClasses}>
        <Sidebar />
        <div className="workspace">
          <div className="conv-shell">
            <Inbox />
            <Thread />
          </div>
          <TasksView />
          <CalendarView />
          <AIKnowledgeView />
          <MuePanel />
        </div>
      </div>
    </>
  );
}
