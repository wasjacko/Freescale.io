"use client";

import { useToast } from "@/lib/hooks/useToast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toast-container" id="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
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
        </div>
      ))}
    </div>
  );
}
