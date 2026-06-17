"use client";

import { AIKnowledgeView } from "@/components/AIKnowledgeView";
import { AutoSync } from "@/components/AutoSync";
import { CalendarView } from "@/components/CalendarView";
import { ClientsView } from "@/components/ClientsView";
import { CommandPalette } from "@/components/CommandPalette";
import { FlashFromUrl } from "@/components/FlashFromUrl";
import { Inbox } from "@/components/Inbox";
import { InboxToolbar } from "@/components/InboxToolbar";
import { MuePanel } from "@/components/MuePanel";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { Sidebar } from "@/components/Sidebar";
import { Thread } from "@/components/Thread";
import { TodayView } from "@/components/TodayView";
import { TopBar } from "@/components/TopBar";
import { Sprite } from "@/components/icons/Sprite";
import { OnboardingChips } from "@/components/onboarding/OnboardingChips";
import { Toaster } from "@/components/ui/Toaster";
import { createTask } from "@/lib/actions/inbox";
import type { CurrentUser } from "@/lib/auth";
import { useData } from "@/lib/contexts/DataContext";
import { toast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import { Suspense, useEffect, useRef, useState } from "react";

export function AppShell({
  user,
}: {
  user: CurrentUser | null;
}) {
  const {
    view,
    setView,
    sidebarCollapsed,
    setActiveConv,
    activeConvId,
    toggleSidebar,
    mueOpen,
    setMueOpen,
  } = useApp();
  const { conversations, channels, archive, unarchive, addTask } = useData();
  // Soft profiling: show only when user hasn't been profiled AND has at
  // least one channel connected (so they've actually seen their inbox
  // = first value already delivered). Audit-aligned.
  const showOnboardingChips = !!user && user.onboardedAt === null && channels.length > 0;
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Accord clavier « G puis T/I » (navigation façon Linear).
  const chordRef = useRef<number>(0);

  // Close Mue panel by default on mobile/tablet viewports upon initial mount
  useEffect(() => {
    if (window.innerWidth < 1100) {
      setMueOpen(false);
    }
  }, [setMueOpen]);

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

      // ⌘K / Ctrl+K — recherche / palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
        return;
      }

      // ⌘J / Ctrl+J — ouvrir / fermer Mue (le copilote)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setMueOpen(!mueOpen);
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

      // Esc closes any panel — Mue compris (toujours « remonter d'un niveau »).
      if (e.key === "Escape") {
        if (cmdkOpen) setCmdkOpen(false);
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (mueOpen) setMueOpen(false);
        return;
      }

      // Accords « G puis T / G puis I » — navigation sans souris.
      if (!inField && e.key.toLowerCase() === "g") {
        chordRef.current = Date.now();
        return;
      }
      if (!inField && Date.now() - chordRef.current < 1000) {
        if (e.key.toLowerCase() === "t") {
          e.preventDefault();
          chordRef.current = 0;
          setView("today");
          return;
        }
        if (e.key.toLowerCase() === "i") {
          e.preventDefault();
          chordRef.current = 0;
          setView("inbox");
          setActiveConv("");
          return;
        }
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

      // E / e — archive current conversation (only when on inbox + not in field)
      if (!inField && e.key.toLowerCase() === "e" && activeConvId && view === "inbox") {
        e.preventDefault();
        const convId = activeConvId;
        // Flow de triage : on passe directement à la conversation suivante.
        const ordered = [...conversations].sort(
          (a, b) => new Date(b.lastAtIso).getTime() - new Date(a.lastAtIso).getTime()
        );
        const idxNow = ordered.findIndex((c) => c.id === convId);
        const next = ordered.find((c, i) => i > idxNow && c.id !== convId);
        archive(convId);
        setActiveConv(next ? next.id : "");
        toast.success("Conversation archivée", {
          action: {
            label: "Annuler",
            fn: () => {
              unarchive(convId);
              setActiveConv(convId);
            },
          },
        });
        return;
      }

      // R — répondre : focus le composer (Mue y a déjà pré-rempli un brouillon)
      if (!inField && e.key.toLowerCase() === "r" && activeConvId && view === "inbox") {
        e.preventDefault();
        (document.querySelector(".email-composer-body") as HTMLTextAreaElement | null)?.focus();
        return;
      }

      // T — transformer la conversation active en tâche
      if (!inField && e.key.toLowerCase() === "t" && activeConvId && view === "inbox") {
        e.preventDefault();
        const conv = conversations.find((c) => c.id === activeConvId);
        if (conv) {
          const title = `Répondre à ${conv.name}`;
          addTask({
            id: `kbd-${conv.id}-${Date.now()}`,
            title,
            priority: "medium",
            dueLabel: "À faire",
            status: "todo",
            avatar: conv.avatar,
            channel: conv.channel,
            sortableIndex: Date.now(),
          });
          void createTask({ title, conversationId: conv.id, priority: "medium" });
          toast.success("Tâche créée");
        }
        return;
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    view,
    activeConvId,
    cmdkOpen,
    shortcutsOpen,
    setActiveConv,
    toggleSidebar,
    conversations,
    archive,
    unarchive,
    addTask,
    mueOpen,
    setMueOpen,
    setView,
  ]);

  const appClasses = [
    "app",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    mueOpen ? "mue-open" : "",
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
      {mueOpen && (
        <button
          type="button"
          tabIndex={-1}
          className="mue-backdrop"
          onClick={() => setMueOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={appClasses} data-active-conv={activeConvId ? "1" : "0"}>
        <TopBar />
        <Sidebar user={user} />
        <div className="workspace">
          {/* Bandeaux du haut masqués pour l'instant (reconnexion canal + essai).
              Réactiver : décommenter ci-dessous. */}
          {/* <SyncErrorBanner channels={channels} /> */}
          {/* <TrialBanner /> */}
          <TodayView user={user} />
          {/* Inbox en 3 panneaux (façon maquette) : la LISTE reste toujours
              visible à gauche, le FIL au centre. Sous 768px on bascule
              liste↔fil (cf. media query). Thread gère lui-même son état vide. */}
          <div className="conv-shell">
            {showOnboardingChips && view === "inbox" && (
              <OnboardingChips
                initialRole={user?.profileRole}
                initialObjective={user?.profileObjective}
                initialUsageMode={user?.profileUsageMode}
              />
            )}
            {/* Barre d'outils pleine largeur, au-dessus des deux colonnes. */}
            <InboxToolbar />
            <div className="conv-shell-body conv-shell-split">
              <Inbox currentUserId={user?.id ?? null} />
              <Thread currentUser={user ? { name: user.name, avatarUrl: user.avatarUrl } : null} />
            </div>
          </div>
          <CalendarView />
          <AIKnowledgeView />
          {/* Phase 2 — Hub Client/Projet (pilier Centraliser). */}
          <ClientsView />
        </div>
        {/* Mue — rail compagnon repliable, 3e colonne de .app : même
            endroit sur toutes les vues (Aujourd'hui / Inbox / Fil…).
            Le lanceur vit dans le bouton « Agent » de la topbar. */}
        <MuePanel />
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
