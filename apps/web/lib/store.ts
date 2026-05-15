"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ViewId } from "@/lib/types";

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
      view: "inbox",
      activeConvId: "",
      sidebarCollapsed: false,
      setView: (view) => set({ view }),
      setActiveConv: (activeConvId) => set({ activeConvId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "fs:app",
      partialize: (s) => ({
        view: s.view,
        activeConvId: s.activeConvId,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);
