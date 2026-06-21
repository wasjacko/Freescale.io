"use client";

import type { ViewId } from "@/lib/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type InboxSort = "date" | "unread" | "starred";
/** Mode du panneau Mue sans fil ouvert : 2 choix de base, ou le plan priorisé. */
type MueView = "choices" | "plan";

/** Dossier de conversations (UI/mock) : rangement custom dans l'Inbox. */
export type InboxFolder = { id: string; name: string; convIds: string[] };

const DEFAULT_FOLDERS: InboxFolder[] = [
  { id: "f-prospects", name: "Prospects", convIds: ["c7", "c11"] },
  { id: "f-encours", name: "En cours", convIds: ["c1", "c2", "c9"] },
  { id: "f-facturer", name: "À facturer", convIds: ["c3", "c8"] },
];

type State = {
  view: ViewId;
  activeConvId: string;
  /** Fiche client ouverte dans la vue Clients ("" = grille). */
  activeClientId: string;
  sidebarCollapsed: boolean;
  mueOpen: boolean;
  mueView: MueView;
  suggestTasksOpen: boolean;
  // Filtres/tri de l'Inbox — remontés au store pour que la barre d'outils
  // (pleine largeur, au-dessus des deux colonnes) et la liste les partagent.
  inboxSort: InboxSort;
  inboxChannel: string;
  inboxCategory: string;
  inboxUnreadOnly: boolean;
  inboxSearch: string;
  setInboxSearch: (q: string) => void;
  /** Vue « balle dans ton camp » : tout / à répondre / en attente / terminé. */
  inboxBucket: "all" | "to-reply" | "waiting" | "done";
  setInboxBucket: (b: "all" | "to-reply" | "waiting" | "done") => void;
  /** Écran de confirmation des clients après connexion d'un canal (mock). */
  clientConfirm: { open: boolean; channel: string };
  openClientConfirm: (channel: string) => void;
  closeClientConfirm: () => void;
  /** Écran « Ce que Freescale voit » (transparence des données ingérées). */
  dataViewOpen: boolean;
  setDataViewOpen: (open: boolean) => void;
  // Dossiers de conversations (UI/mock).
  inboxFolders: InboxFolder[];
  activeFolderId: string | null;
  setActiveFolder: (id: string | null) => void;
  addFolder: (name: string) => void;
  setView: (v: ViewId) => void;
  setActiveConv: (id: string) => void;
  setActiveClientId: (id: string) => void;
  toggleSidebar: () => void;
  setMueOpen: (open: boolean) => void;
  setMueView: (v: MueView) => void;
  setSuggestTasksOpen: (open: boolean) => void;
  setInboxSort: (s: InboxSort) => void;
  setInboxChannel: (c: string) => void;
  setInboxCategory: (c: string) => void;
  setInboxUnreadOnly: (v: boolean) => void;
};

export const useApp = create<State>()(
  persist(
    (set) => ({
      view: "inbox",
      activeConvId: "",
      activeClientId: "",
      sidebarCollapsed: false,
      mueOpen: false,
      mueView: "choices",
      suggestTasksOpen: false,
      inboxSort: "date",
      inboxChannel: "all",
      inboxCategory: "all",
      inboxUnreadOnly: false,
      inboxSearch: "",
      setInboxSearch: (inboxSearch) => set({ inboxSearch }),
      inboxBucket: "all",
      setInboxBucket: (inboxBucket) => set({ inboxBucket }),
      clientConfirm: { open: false, channel: "gmail" },
      openClientConfirm: (channel) => set({ clientConfirm: { open: true, channel } }),
      closeClientConfirm: () => set((s) => ({ clientConfirm: { ...s.clientConfirm, open: false } })),
      dataViewOpen: false,
      setDataViewOpen: (dataViewOpen) => set({ dataViewOpen }),
      inboxFolders: DEFAULT_FOLDERS,
      activeFolderId: null,
      setActiveFolder: (activeFolderId) => set({ activeFolderId }),
      addFolder: (name) =>
        set((s) => ({
          inboxFolders: [
            ...s.inboxFolders,
            { id: `f-${Date.now()}`, name: name.trim() || "Nouveau dossier", convIds: [] },
          ],
        })),
      setView: (view) => set({ view }),
      setActiveConv: (activeConvId) => set({ activeConvId }),
      setActiveClientId: (activeClientId) => set({ activeClientId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMueOpen: (mueOpen) => set({ mueOpen }),
      setMueView: (mueView) => set({ mueView }),
      setSuggestTasksOpen: (suggestTasksOpen) => set({ suggestTasksOpen }),
      setInboxSort: (inboxSort) => set({ inboxSort }),
      setInboxChannel: (inboxChannel) => set({ inboxChannel }),
      setInboxCategory: (inboxCategory) => set({ inboxCategory }),
      setInboxUnreadOnly: (inboxUnreadOnly) => set({ inboxUnreadOnly }),
    }),
    {
      name: "fs:app",
      version: 7,
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
        if (version < 6) {
          // Inbox devient la page d'accueil par défaut.
          next = { ...next, view: "inbox" };
        }
        if (version < 7) {
          // Dossiers de conversations : on (re)sème les défauts.
          next = { ...next, inboxFolders: DEFAULT_FOLDERS, activeFolderId: null };
        }
        return next as State;
      },
      partialize: (s) => ({
        view: s.view,
        activeConvId: s.activeConvId,
        sidebarCollapsed: s.sidebarCollapsed,
        mueOpen: s.mueOpen,
        inboxFolders: s.inboxFolders,
      }),
    }
  )
);
