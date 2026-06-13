"use client";

import type { ViewId } from "@/lib/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type InboxSort = "date" | "unread" | "starred";

type State = {
  view: ViewId;
  activeConvId: string;
  sidebarCollapsed: boolean;
  mueOpen: boolean;
  suggestTasksOpen: boolean;
  // Filtres/tri de l'Inbox — remontés au store pour que la barre d'outils
  // (pleine largeur, au-dessus des deux colonnes) et la liste les partagent.
  inboxSort: InboxSort;
  inboxChannel: string;
  inboxCategory: string;
  inboxUnreadOnly: boolean;
  setView: (v: ViewId) => void;
  setActiveConv: (id: string) => void;
  toggleSidebar: () => void;
  setMueOpen: (open: boolean) => void;
  setSuggestTasksOpen: (open: boolean) => void;
  setInboxSort: (s: InboxSort) => void;
  setInboxChannel: (c: string) => void;
  setInboxCategory: (c: string) => void;
  setInboxUnreadOnly: (v: boolean) => void;
};

export const useApp = create<State>()(
  persist(
    (set) => ({
      view: "today",
      activeConvId: "",
      sidebarCollapsed: false,
      mueOpen: false,
      suggestTasksOpen: false,
      inboxSort: "date",
      inboxChannel: "all",
      inboxCategory: "all",
      inboxUnreadOnly: false,
      setView: (view) => set({ view }),
      setActiveConv: (activeConvId) => set({ activeConvId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMueOpen: (mueOpen) => set({ mueOpen }),
      setSuggestTasksOpen: (suggestTasksOpen) => set({ suggestTasksOpen }),
      setInboxSort: (inboxSort) => set({ inboxSort }),
      setInboxChannel: (inboxChannel) => set({ inboxChannel }),
      setInboxCategory: (inboxCategory) => set({ inboxCategory }),
      setInboxUnreadOnly: (inboxUnreadOnly) => set({ inboxUnreadOnly }),
    }),
    {
      name: "fs:app",
      version: 5,
      migrate: (persistedState, version) => {
        const stored = persistedState as Partial<State>;
        let next = stored;
        if (version < 1) {
          next = { ...next, view: "today", activeConvId: "" };
        }
        if (version < 2) {
          // Le panneau Mue démarre replié par défaut.
          next = { ...next, mueOpen: false };
        }
        if (version < 3) {
          // Sidebar en icônes seules par défaut (refonte façon dashboard).
          next = { ...next, sidebarCollapsed: true };
        }
        if (version < 4) {
          // Sidebar déplié (logo + labels) façon maquette.
          next = { ...next, sidebarCollapsed: false };
        }
        if (version < 5) {
          // Page Tâches retirée — la gestion vit dans « Cette semaine ».
          if ((next as Partial<State>).view === "tasks") next = { ...next, view: "today" };
        }
        return next as State;
      },
      partialize: (s) => ({
        view: s.view,
        activeConvId: s.activeConvId,
        sidebarCollapsed: s.sidebarCollapsed,
        mueOpen: s.mueOpen,
      }),
    }
  )
);
