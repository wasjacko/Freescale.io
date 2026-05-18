"use client";

import { useToast, type ToastKind } from "@/lib/hooks/useToast";

const KIND_ICON: Record<ToastKind, string> = {
  info: "•",
  success: "✓",
  warning: "!",
  error: "✕",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toast-container" id="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => {
        const kind: ToastKind = t.kind ?? "info";
        return (
          <div
            key={t.id}
            className={`toast toast-${kind}`}
            role={kind === "error" ? "alert" : "status"}
          >
            <span className="toast-icon" aria-hidden>
              {KIND_ICON[kind]}
            </span>
            <span className="toast-body">{t.text}</span>
            {t.action && (
              <button
                className="toast-action"
                type="button"
                onClick={() => {
                  t.action?.fn();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => dismiss(t.id)}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
