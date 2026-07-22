"use client";

import { AiTasksReviewModal } from "@/components/AiTasksReviewModal";
import { AutoSync } from "@/components/AutoSync";
import { CalendarView } from "@/components/CalendarView";
import { ClientConfirmModal } from "@/components/ClientConfirmModal";
import { ClientsView } from "@/components/ClientsView";
import { CommandPalette } from "@/components/CommandPalette";
import { DataVisibilityModal } from "@/components/DataVisibilityModal";
import { FlashFromUrl } from "@/components/FlashFromUrl";
import { Inbox } from "@/components/Inbox";
import { InboxFolders } from "@/components/InboxFolders";
import { InboxToolbar } from "@/components/InboxToolbar";
import { MueAvatar } from "@/components/MueAvatar";
import { MueFullView } from "@/components/MueFullView";
import { MuePanel } from "@/components/MuePanel";
import { MobileSiteReload } from "@/components/MobileSiteReload";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { Sidebar, NavIcon } from "@/components/Sidebar";
import { TasksBoard } from "@/components/TasksBoard";
import { Thread } from "@/components/Thread";
import { TopBar } from "@/components/TopBar";
import { TasksView } from "@/components/TasksView";
import { Sprite } from "@/components/icons/Sprite";
import { OnboardingChips } from "@/components/onboarding/OnboardingChips";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
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
    theme,
    inboxMode,
    tasksModalOpen,
    setTasksModalOpen,
    inboxFoldersOpen,
    setInboxFoldersOpen,
  } = useApp();
  const { conversations, channels, archive, unarchive, addTask } = useData();
  const [forceOnboarding, setForceOnboarding] = useState(false);
  useEffect(() => {
    setForceOnboarding(localStorage.getItem("freescale_debug_force_onboarding") === "true");
    const handleSync = () => {
      setForceOnboarding(localStorage.getItem("freescale_debug_force_onboarding") === "true");
    };
    window.addEventListener("onboarding-toggle", handleSync);
    return () => window.removeEventListener("onboarding-toggle", handleSync);
  }, []);

  const [isOnboarded, setIsOnboarded] = useState(user?.onboardedAt !== null);

  const showOnboardingChips =
    forceOnboarding || (!!user && user.onboardedAt === null && channels.length > 0);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Block body scroll when sidebar is open on mobile
  useEffect(() => {
    if (!sidebarCollapsed && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarCollapsed, isMobile]);
  // Accord clavier « G puis T/I » (navigation façon Linear).
  const chordRef = useRef<number>(0);

  // Close Mue panel and sidebar drawer by default on mobile/tablet viewports upon initial mount
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setMueOpen(false);
      const isCollapsed = useApp.getState().sidebarCollapsed;
      if (!isCollapsed) {
        useApp.getState().toggleSidebar();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Thème : « system » suit prefers-color-scheme et réagit aux changements OS.
  // « light »/« dark » forcent. On bascule data-theme sur <html> pour activer
  // les ~477 règles [data-theme="dark"] dormantes.
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const effective = theme === "system" ? (mql.matches ? "dark" : "light") : theme;
      root.dataset.theme = effective;
      root.style.colorScheme = effective;
    };
    apply();
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
    return undefined;
  }, [theme]);

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

  // L'ancienne page "recap" (Analytics) a fusionné dans "Santé client" (clients).
  // Si le store Zustand persisté pointe encore vers recap, on rebascule.
  useEffect(() => {
    if (view === "recap") setView("clients");
  }, [view, setView]);

  // Map vue → suffixe de classe CSS. "ai-knowledge" → "ai", "recap" → "clients"
  // (vues fusionnées).
  const viewSuffix = view === "ai-knowledge" ? "ai" : view === "recap" ? "clients" : view;
  const appClasses = [
    "app",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    mueOpen ? "mue-open" : "",
    inboxFoldersOpen ? "ibx-folders-open" : "",
    `view-${viewSuffix}`,
  ]
    .filter(Boolean)
    .join(" ");

  if (user && !isOnboarded) {
    return (
      <OnboardingFlow
        firstName={user.firstName}
        onFinish={async (answers) => {
          const { saveOnboardingAnswers, dismissOnboarding } = await import(
            "@/lib/actions/onboarding"
          );
          if (answers) {
            await saveOnboardingAnswers({
              role: answers.role,
              objective: answers.objective,
            });
          } else {
            await dismissOnboarding();
          }
          setIsOnboarded(true);
        }}
      />
    );
  }

  return (
    <>
      <a href="#thread-content" className="skip-link">
        Skip to content
      </a>
      <Sprite />
      {/* OfflineIndicator masqué — bannière dev qui s'affichait en mode mock. */}
      {mueOpen && (
        <button
          type="button"
          tabIndex={-1}
          className="mue-backdrop"
          onClick={() => setMueOpen(false)}
          aria-hidden="true"
        />
      )}
      {inboxFoldersOpen && view === "inbox" && (
        <button
          type="button"
          tabIndex={-1}
          className="ibx-folders-backdrop"
          onClick={() => setInboxFoldersOpen(false)}
          aria-hidden="true"
        />
      )}
      {isMobile && (
        <button
          type="button"
          tabIndex={-1}
          className={`sidebar-mobile-backdrop ${!sidebarCollapsed ? "is-open" : ""}`}
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      <div className={appClasses} data-active-conv={activeConvId ? "1" : "0"}>
        <TopBar user={user} />
        <Sidebar user={user} />
        <div className="workspace">
          {/* Bandeaux du haut masqués pour l'instant (reconnexion canal + essai).
              Réactiver : décommenter ci-dessous. */}
          {/* <SyncErrorBanner channels={channels} /> */}
          {/* <TrialBanner /> */}
          <TasksBoard />
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
            {/* Barre d'outils tout en haut, pleine largeur — AU-DESSUS de la
                colonne dossiers (Inbox/Favoris…) et de la liste. */}
            <InboxToolbar />
            <div className="conv-shell-row">
              {/* Colonne dossiers — sous la barre, à l'extrême gauche. */}
              <InboxFolders />
              <div className="conv-shell-main">
                <div
                  className={`conv-shell-body conv-shell-split inbox-mode-${inboxMode} ${activeConvId ? "has-active-conv" : "no-active-conv"}`}
                >
                  <Inbox currentUserId={user?.id ?? null} />
                  <Thread
                    currentUser={user ? { name: user.name, avatarUrl: user.avatarUrl } : null}
                  />
                </div>
              </div>
            </div>
          </div>
          <CalendarView />
          <MueFullView />
          {/* Phase 2 — Hub Client/Projet (pilier Centraliser). */}
          <ClientsView />
          {/* Mue — rail compagnon repliable, 3e colonne de .app : même
              endroit sur toutes les vues (Aujourd'hui / Inbox / Fil…).
              Le lanceur vit dans le bouton « Agent » de la topbar. */}
          <MuePanel userName={user?.name ?? null} />
        </div>
      </div>
      {/* Hors de .app pour rester fixe au viewport même lorsque le contenu
          suit le geste d'actualisation. */}
      <BottomNav />

      <ClientConfirmModal />
      <DataVisibilityModal />
      <AiTasksReviewModal />
      {tasksModalOpen && (
        <div
          className={`ccm-overlay ${mueOpen ? "mue-panel-open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Liste des tâches"
        >
          <button type="button" className="ccm-backdrop" onClick={() => setTasksModalOpen(false)} />
          <div className="ccm-sheet" style={{ maxWidth: 840, width: "90%", padding: "28px 32px" }}>
            <header className="ccm-head" style={{ marginBottom: 20 }}>
              <div>
                <h2 className="ccm-title" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                  Liste des tâches
                </h2>
                <p className="ccm-sub" style={{ opacity: 0.7, fontSize: "0.875rem" }}>
                  Tâches actuellement enregistrées dans Freescale.
                </p>
              </div>
              <button
                type="button"
                className="ccm-close"
                onClick={() => setTasksModalOpen(false)}
                style={{ fontSize: "1.1rem" }}
              >
                ✕
              </button>
            </header>
            <div style={{ overflowY: "auto", maxHeight: "65vh" }}>
              <TasksView isModal={true} />
            </div>
          </div>
        </div>
      )}
      <Toaster />
      <Suspense>
        <FlashFromUrl />
      </Suspense>
      <AutoSync />
      <MobileSiteReload />
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

function BottomNav() {
  const { view, setView, setActiveConv } = useApp();
  const data = useData();
  const conversations = data.conversations ?? [];
  const tasks = data.tasks ?? [];

  const counts: Record<string, number | null> = {
    today: tasks.filter((t) => t.status !== "done").length,
    inbox: conversations.filter((c) => c.unread).length,
    clients: null,
    "ai-knowledge": null,
  };

  // Items de la pilule (le contenu) — Mue vit à part dans son cercle mascotte.
  const items = [
    { id: "inbox" as const, label: "Inbox" },
    { id: "today" as const, label: "Tâches" },
    { id: "clients" as const, label: "Clients" },
  ];
  const mueActive = view === "ai-knowledge";
  // Index de l'item actif dans la pilule (−1 si on est sur Mue) → pilote la
  // position de la bulle grise glissante.
  const activeIndex = items.findIndex((i) => i.id === view);

  const tap = (id: (typeof items)[number]["id"] | "ai-knowledge") => {
    setView(id);
    if (id === "inbox") setActiveConv("");
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <div className="bottom-nav">
      {/* Pilule blanche : icônes de contenu, la bulle grise glisse d'un item
          à l'autre. --active-index pilote sa position ; is-empty la masque
          quand aucun item de la pilule n'est actif (vue Mue). */}
      <nav
        className={`bottom-nav-pill ${activeIndex < 0 ? "is-empty" : ""}`}
        style={{ "--active-index": Math.max(0, activeIndex) } as React.CSSProperties}
        aria-label="Navigation"
      >
        <span className="bottom-nav-indicator" aria-hidden />
        {items.map((item) => {
          const count = counts[item.id];
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`bottom-nav-item ${isActive ? "is-active" : ""}`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => tap(item.id)}
            >
              <span className="bottom-nav-ico-wrap">
                <NavIcon id={item.id} />
                {count != null && count > 0 && <span className="bottom-nav-badge">{count}</span>}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Cercle mascotte Mue, séparé à droite. */}
      <button
        type="button"
        className={`bottom-nav-mue ${mueActive ? "is-active" : ""}`}
        aria-label="Mue"
        aria-current={mueActive ? "page" : undefined}
        onClick={() => tap("ai-knowledge")}
      >
        <MueAvatar className="bottom-nav-mue-face" ariaLabel="Mue" />
      </button>
    </div>
  );
}
