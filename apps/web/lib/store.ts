"use client";

import type { ViewId } from "@/lib/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const VALID_VIEWS = new Set<ViewId>([
  "today",
  "inbox",
  "tasks",
  "calendar",
  "ai-knowledge",
  "more",
]);

function normalizeView(view: unknown): ViewId {
  return typeof view === "string" && VALID_VIEWS.has(view as ViewId) ? (view as ViewId) : "today";
}

function normalizePersistedState(persistedState: unknown, currentState: State): State {
  const stored = persistedState as Partial<State> | undefined;
  return {
    ...currentState,
    ...stored,
    view: normalizeView(stored?.view),
    activeConvId: stored?.activeConvId ?? "",
  };
}

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
        return {
          ...stored,
          view: normalizeView(stored.view),
          activeConvId: stored.activeConvId ?? "",
        } as State;
      },
      merge: (persistedState, currentState) => {
        return normalizePersistedState(persistedState, currentState);
      },
      partialize: (s) => ({
        view: s.view,
        activeConvId: s.activeConvId,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);
