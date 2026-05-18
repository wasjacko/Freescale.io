"use client";

import { create } from "zustand";

export type ToastKind = "info" | "success" | "warning" | "error";

export type Toast = {
  id: string;
  text: string;
  kind?: ToastKind;
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
    // Errors stick longer so the user has time to read them.
    const defaultDuration = toast.kind === "error" ? 6000 : 4000;
    const dur = toast.duration ?? defaultDuration;
    setTimeout(() => get().dismiss(id), dur);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience helpers — usage: toast.success("Saved"), toast.error("Failed")
export const toast = Object.assign(
  (text: string, opts?: Partial<Omit<Toast, "id" | "text">>) => {
    useToast.getState().push({ text, ...opts });
  },
  {
    info: (text: string, opts?: Partial<Omit<Toast, "id" | "text" | "kind">>) =>
      useToast.getState().push({ text, kind: "info", ...opts }),
    success: (text: string, opts?: Partial<Omit<Toast, "id" | "text" | "kind">>) =>
      useToast.getState().push({ text, kind: "success", ...opts }),
    warning: (text: string, opts?: Partial<Omit<Toast, "id" | "text" | "kind">>) =>
      useToast.getState().push({ text, kind: "warning", ...opts }),
    error: (text: string, opts?: Partial<Omit<Toast, "id" | "text" | "kind">>) =>
      useToast.getState().push({ text, kind: "error", ...opts }),
  }
);
