"use client";

import { Suspense, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/contexts/DataContext";
import type { CurrentUser } from "@/lib/auth";
import { Sprite } from "@/components/icons/Sprite";
import { Sidebar } from "@/components/Sidebar";
import { Inbox } from "@/components/Inbox";
import { Thread } from "@/components/Thread";
import { MuePanel } from "@/components/MuePanel";
import { TasksView } from "@/components/TasksView";
import { CalendarView } from "@/components/CalendarView";
import { AIKnowledgeView } from "@/components/AIKnowledgeView";
import { Toaster } from "@/components/ui/Toaster";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { FlashFromUrl } from "@/components/FlashFromUrl";
import { AutoSync } from "@/components/AutoSync";
import { OnboardingChips } from "@/components/onboarding/OnboardingChips";
import { FirstActionBanner } from "@/components/onboarding/FirstActionBanner";
import { SyncErrorBanner } from "@/components/SyncErrorBanner";

export function AppShell({
  user,
  initialActiveConvId,
}: {
  user: CurrentUser | null;
  initialActiveConvId: string;
}) {
  const { view, sidebarCollapsed, setActiveConv, activeConvId, toggleSidebar } = useApp();
  const { conversations, channels } = useData();
  // Soft profiling: show only when user hasn't been profiled AND has at
  // least one channel connected (so they've actually seen their inbox
  // = first value already delivered). Audit-aligned.
  const showOnboardingChips =
    !!user && user.onboardedAt === null && channels.length > 0;
  // First-action card: shown AFTER profiling is done (or skipped), and
  // only when the user has both channels and conversations — at that
  // point they've truly seen first value and we can offer guided next
  // steps. Hidden as soon as the user opens any conversation (the
  // banner has served its intro purpose; reading a mail shouldn't
  // happen with a big onboarding card eating half the column).
  // Per-browser dismiss via localStorage handled inside the card.
  const showFirstAction =
    !!user &&
    user.onboardedAt !== null &&
    channels.length > 0 &&
    conversations.length > 0 &&
    !activeConvId;
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Bootstrap the active conversation if none is selected (or persisted id is stale)
  useEffect(() => {
    const exists = conversations.some((c) => c.id === activeConvId);
    if (!exists && initialActiveConvId) {
      setActiveConv(initialActiveConvId);
    }
  }, [activeConvId, conversations, initialActiveConvId, setActiveConv]);

  // OS class for keyboard hints
  useEffect(() => {
    document.documentElement.classList.add(
      /Mac|iPhone|iPad/.test(navigator.platform) ? "os-mac" : "os-pc"
    );
  }, []);

  // Document title with unread count
  useEffect(() => {
    const update = () => {
      const dots = document.querySelectorAll(".unread").length;
      const base = "Freescale — Client Communications OS";
      document.title = dots > 0 ? `(${dots}) ${base}` : base;
    };
    update();
    const interval = setInterval(update, 1500);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase() ?? "";
      const inField =
        tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable;

      // ⌘K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
        return;
      }

      // ⌘\ toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // ?  open shortcuts
      if (e.key === "?" && !inField) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // Esc closes any panel
      if (e.key === "Escape") {
        if (cmdkOpen) setCmdkOpen(false);
        if (shortcutsOpen) setShortcutsOpen(false);
        return;
      }

      // J / K — next / prev conversation (only when on inbox + not in field)
      if (!inField && (e.key === "j" || e.key === "k") && view === "inbox") {
        e.preventDefault();
        const visibleConvs = Array.from(
          document.querySelectorAll<HTMLButtonElement>(".conv-list .conv")
        );
        if (!visibleConvs.length) return;
        const ids = visibleConvs
          .map((el) => {
            const name = el.querySelector(".conv-name")?.textContent?.trim() ?? "";
            return conversations.find((c) => c.name === name)?.id;
          })
          .filter((id): id is string => Boolean(id));
        const idx = ids.indexOf(activeConvId);
        let next = e.key === "j" ? idx + 1 : idx - 1;
        if (next < 0) next = ids.length - 1;
        if (next >= ids.length) next = 0;
        const nextId = ids[next];
        if (nextId) {
          setActiveConv(nextId);
          visibleConvs[next]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, activeConvId, cmdkOpen, shortcutsOpen, setActiveConv, toggleSidebar, conversations]);

  const appClasses = [
    "app",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    `view-${view === "ai-knowledge" ? "ai" : view}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <a href="#thread-content" className="skip-link">
        Skip to content
      </a>
      <Sprite />
      <div className={appClasses}>
        <Sidebar user={user} />
        <div className="workspace">
          <SyncErrorBanner channels={channels} />
          <div className="conv-shell">
            {showOnboardingChips && view === "inbox" && (
              <OnboardingChips
                initialRole={user?.profileRole}
                initialObjective={user?.profileObjective}
                initialUsageMode={user?.profileUsageMode}
              />
            )}
            {showFirstAction && view === "inbox" && !showOnboardingChips && (
              <FirstActionBanner
                firstName={user?.firstName ?? "vous"}
                conversationCount={conversations.length}
              />
            )}
            <Inbox />
            <Thread />
          </div>
          <TasksView />
          <CalendarView />
          <AIKnowledgeView />
          <MuePanel user={user} />
        </div>
      </div>

      <Toaster />
      <Suspense>
        <FlashFromUrl />
      </Suspense>
      <AutoSync />
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Token smoke test — invisible probe to verify @theme → Tailwind utilities */}
      <div className="fixed inset-x-0 bottom-0 h-0 opacity-0 pointer-events-none bg-accent text-canvas rounded-xl shadow-soft font-sans" aria-hidden />
    </>
  );
}
