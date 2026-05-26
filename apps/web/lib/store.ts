"use client";

import type { ViewId } from "@/lib/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  view: ViewId;
  activeConvId: string;
  sidebarCollapsed: boolean;
  setView: (v: ViewId) => void;
  setActiveConv: (id: string) => void;
  toggleSidebar: () => void;
};

export const useApp = create<State>()(
  persist(
    (set) => ({
      view: "today",
      activeConvId: "",
      sidebarCollapsed: false,
      setView: (view) => set({ view }),
      setActiveConv: (activeConvId) => set({ activeConvId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "fs:app",
      version: 1,
      migrate: (persistedState, version) => {
        const stored = persistedState as Partial<State>;
        if (version < 1) {
          return { ...stored, view: "today", activeConvId: "" } as State;
        }
        return stored as State;
      },
      partialize: (s) => ({
        view: s.view,
        activeConvId: s.activeConvId,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);
