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
  /** Thème de l'interface : « system » suit l'OS, « light » force le clair. */
  theme: "system" | "light";
  setTheme: (t: "system" | "light") => void;
  // Filtres/tri de l'Inbox — remontés au store pour que la barre d'outils
  // (pleine largeur, au-dessus des deux colonnes) et la liste les partagent.
  inboxSort: InboxSort;
  /** Canaux sélectionnés (multi). Vide = tous les canaux. */
  inboxChannels: string[];
  /** Étiquettes sélectionnées (multi). Vide = toutes. */
  inboxLabels: string[];
  inboxCategory: string;
  inboxUnreadOnly: boolean;
  inboxSearch: string;
  setInboxSearch: (q: string) => void;
  /** Vue « balle dans ton camp » : tout / à répondre / en attente / terminé. */
  inboxBucket: "all" | "to-reply" | "waiting" | "done";
  setInboxBucket: (b: "all" | "to-reply" | "waiting" | "done") => void;
  /** Mode d'affichage de l'inbox : canaux email (Gmail/Outlook…) vs chat
   *  (WhatsApp/Instagram/Slack…). Sépare les deux mondes + leurs outils. */
  inboxMode: "email" | "message";
  setInboxMode: (m: "email" | "message") => void;
  /** Écran de confirmation des clients après connexion d'un canal (mock). */
  clientConfirm: { open: boolean; channel: string };
  openClientConfirm: (channel: string) => void;
  closeClientConfirm: () => void;
  /** Écran « Ce que Freescale voit » (transparence des données ingérées). */
  dataViewOpen: boolean;
  setDataViewOpen: (open: boolean) => void;
  /** Revue des tâches détectées par Mue (garder / ignorer). */
  aiReviewOpen: boolean;
  setAiReviewOpen: (open: boolean) => void;
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
  muePendingAction: string | null;
  setMuePendingAction: (action: string | null) => void;
  setMueView: (v: MueView) => void;
  setSuggestTasksOpen: (open: boolean) => void;
  setInboxSort: (s: InboxSort) => void;
  /** Bascule un canal dans la sélection (ajoute/retire). */
  toggleInboxChannel: (kind: string) => void;
  /** Bascule une étiquette dans la sélection. */
  toggleInboxLabel: (tag: string) => void;
  setInboxCategory: (c: string) => void;
  setInboxUnreadOnly: (v: boolean) => void;
  /** Réinitialise tous les filtres de l'inbox (statut, canaux, labels, non-lus). */
  resetInboxFilters: () => void;
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
      inboxChannels: [],
      inboxLabels: [],
      inboxCategory: "all",
      inboxUnreadOnly: false,
      inboxSearch: "",
      setInboxSearch: (inboxSearch) => set({ inboxSearch }),
      inboxBucket: "all",
      setInboxBucket: (inboxBucket) => set({ inboxBucket }),
      inboxMode: "email",
      setInboxMode: (inboxMode) => set({ inboxMode }),
      theme: "light",
      setTheme: (theme) => set({ theme }),
      clientConfirm: { open: false, channel: "gmail" },
      openClientConfirm: (channel) => set({ clientConfirm: { open: true, channel } }),
      closeClientConfirm: () =>
        set((s) => ({ clientConfirm: { ...s.clientConfirm, open: false } })),
      dataViewOpen: false,
      setDataViewOpen: (dataViewOpen) => set({ dataViewOpen }),
      aiReviewOpen: false,
      setAiReviewOpen: (aiReviewOpen) => set({ aiReviewOpen }),
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
      muePendingAction: null,
      setMuePendingAction: (muePendingAction) => set({ muePendingAction }),
      setMueView: (mueView) => set({ mueView }),
      setSuggestTasksOpen: (suggestTasksOpen) => set({ suggestTasksOpen }),
      setInboxSort: (inboxSort) => set({ inboxSort }),
      toggleInboxChannel: (kind) =>
        set((s) => ({
          inboxChannels: s.inboxChannels.includes(kind)
            ? s.inboxChannels.filter((k) => k !== kind)
            : [...s.inboxChannels, kind],
        })),
      toggleInboxLabel: (tag) =>
        set((s) => ({
          inboxLabels: s.inboxLabels.includes(tag)
            ? s.inboxLabels.filter((t) => t !== tag)
            : [...s.inboxLabels, tag],
        })),
      setInboxCategory: (inboxCategory) => set({ inboxCategory }),
      setInboxUnreadOnly: (inboxUnreadOnly) => set({ inboxUnreadOnly }),
      resetInboxFilters: () =>
        set({ inboxBucket: "all", inboxChannels: [], inboxLabels: [], inboxUnreadOnly: false }),
    }),
    {
      name: "fs:app",
      version: 10,
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
        if (version < 8) {
          // Le thème par défaut suit l'OS.
          if (!(next as Partial<State>).theme) {
            next = { ...next, theme: "system" };
          }
        }
        if (version < 9) {
          // L'option « dark » forcée a été retirée. On rebascule en « system »
          // — ceux qui veulent du sombre l'auront via leur OS.
          if ((next as { theme?: string }).theme === "dark") {
            next = { ...next, theme: "system" };
          }
        }
        if (version < 10) {
          // Mode clair par défaut partout : on retire « system » (qui suivait
          // l'OS) et on force « light » sauf si l'utilisateur a explicitement
          // choisi « dark » (qui n'est plus exposé mais on respecte si présent).
          const cur = (next as { theme?: string }).theme;
          if (cur !== "dark") {
            next = { ...next, theme: "light" };
          }
        }
        return next as State;
      },
      partialize: (s) => ({
        view: s.view,
        activeConvId: s.activeConvId,
        sidebarCollapsed: s.sidebarCollapsed,
        mueOpen: s.mueOpen,
        inboxFolders: s.inboxFolders,
        theme: s.theme,
      }),
    }
  )
);
