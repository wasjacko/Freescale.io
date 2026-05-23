"use client";

import { AIKnowledgeView } from "@/components/AIKnowledgeView";
import { AutoSync } from "@/components/AutoSync";
import { CalendarView } from "@/components/CalendarView";
import { CommandPalette } from "@/components/CommandPalette";
import { FlashFromUrl } from "@/components/FlashFromUrl";
import { Inbox } from "@/components/Inbox";
import { MuePanel } from "@/components/MuePanel";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { Sidebar } from "@/components/Sidebar";
import { SyncErrorBanner } from "@/components/SyncErrorBanner";
import { TasksView } from "@/components/TasksView";
import { Thread } from "@/components/Thread";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { Sprite } from "@/components/icons/Sprite";
import { OnboardingChips } from "@/components/onboarding/OnboardingChips";
import { Toaster } from "@/components/ui/Toaster";
import type { CurrentUser } from "@/lib/auth";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { Suspense, useEffect, useRef, useState } from "react";

export function AppShell({
  user,
}: {
  user: CurrentUser | null;
}) {
  const { view, sidebarCollapsed, setActiveConv, activeConvId, toggleSidebar } = useApp();
  const { conversations, channels } = useData();
  // Soft profiling: show only when user hasn't been profiled AND has at
  // least one channel connected (so they've actually seen their inbox
  // = first value already delivered). Audit-aligned.
  const showOnboardingChips = !!user && user.onboardedAt === null && channels.length > 0;
  // (FirstActionBanner condition moved into MuePanel — the welcome card
  // now lives inside the agent side panel rather than the inbox column,
  // so the inbox stays focused on the conversation list. MuePanel
  // recomputes the same gating internally.)
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Bootstrap the active conversation ONLY when the persisted id is stale
  // (refers to a conv that no longer exists). We deliberately do NOT
  // auto-select a conv when activeConvId is "" — empty means the user
  // wants to see the list (back arrow, sidebar Inbox click, fresh start).
  // Auto-selecting there would create a flicker and undo the back nav.
  const didStaleCleanupRef = useRef(false);
  useEffect(() => {
    if (didStaleCleanupRef.current) return;
    if (activeConvId === "") {
      // User wants the list view — respect it, mark as handled.
      didStaleCleanupRef.current = true;
      return;
    }
    const exists = conversations.some((c) => c.id === activeConvId);
    if (!exists) {
      // Stale id from a previous session — clear it so the list shows.
      setActiveConv("");
    }
    didStaleCleanupRef.current = true;
  }, [activeConvId, conversations, setActiveConv]);

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
      <OfflineIndicator />
      <div className={appClasses} data-active-conv={activeConvId ? "1" : "0"}>
        <Sidebar user={user} />
        <div className="workspace">
          <SyncErrorBanner channels={channels} />
          <TrialBanner />
          <div className="conv-shell">
            {showOnboardingChips && view === "inbox" && (
              <OnboardingChips
                initialRole={user?.profileRole}
                initialObjective={user?.profileObjective}
                initialUsageMode={user?.profileUsageMode}
              />
            )}
            {/* FirstActionBanner moved into MuePanel (agent side panel) —
                it greets the user inside Mue's own surface so the inbox
                stays focused on the conversation list. */}
            {/* Conditional render (not CSS toggle) — guarantees the
                Thread DOM is fully unmounted when no conv is selected,
                so the user can't possibly see thread content after
                clicking the back arrow or sidebar Inbox. */}
            {activeConvId ? <Thread /> : <Inbox currentUserId={user?.id ?? null} />}
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
      <div
        className="fixed inset-x-0 bottom-0 h-0 opacity-0 pointer-events-none bg-accent text-canvas rounded-xl shadow-soft font-sans"
        aria-hidden
      />
    </>
  );
}
