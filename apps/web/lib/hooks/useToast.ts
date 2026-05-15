"use client";

import { create } from "zustand";

export type Toast = {
  id: string;
  text: string;
  action?: { label: string; fn: () => void };
  duration?: number;
};

type State = {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
};

export const useToast = create<State>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }));
    const dur = toast.duration ?? 4000;
    setTimeout(() => get().dismiss(id), dur);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Helper for non-component callers
export const toast = (text: string, opts?: Partial<Omit<Toast, "id" | "text">>) => {
  useToast.getState().push({ text, ...opts });
};
