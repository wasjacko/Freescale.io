"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { snoozeTargets } from "@/lib/snooze-targets";

export type ContextAction =
  | "open"
  | "mark-read"
  | "mark-unread"
  | "star"
  | "unstar"
  | "archive"
  | { kind: "snooze"; untilIso: string | null; label: string }
  | { kind: "set-category"; category: "client" | "promo" | "notif" | "other" | null };

type Props = {
  x: number;
  y: number;
  isUnread: boolean;
  isStarred?: boolean;
  isSnoozed?: boolean;
  /** Current category if set — used to render a check mark next to the active option. */
  currentCategory?: "client" | "promo" | "notif" | "other" | null;
  onClose: () => void;
  onAction: (action: ContextAction) => void;
};

const CATEGORY_OPTIONS: ReadonlyArray<{
  id: "client" | "promo" | "notif" | "other";
  label: string;
  emoji: string;
}> = [
  { id: "client", label: "Client", emoji: "👤" },
  { id: "promo", label: "Promo", emoji: "🏷" },
  { id: "notif", label: "Notification", emoji: "🔔" },
  { id: "other", label: "Autre", emoji: "📂" },
];

export function ContextMenu({
  x,
  y,
  isUnread,
  isStarred,
  isSnoozed,
  currentCategory,
  onClose,
  onAction,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
    el.style.top = `${Math.min(y, window.innerHeight - 280)}px`;
  }, [x, y]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    setTimeout(() => {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ctx-menu">
      <button className="ctx-item" type="button" onClick={() => { onAction("open"); onClose(); }}>
        <Icon name="i-inbox" /> Ouvrir
      </button>
      <button
        className="ctx-item"
        type="button"
        onClick={() => { onAction(isUnread ? "mark-read" : "mark-unread"); onClose(); }}
      >
        <Icon name="i-check" /> {isUnread ? "Marquer comme lu" : "Marquer comme non lu"}
      </button>
      <button
        className="ctx-item"
        type="button"
        onClick={() => { onAction(isStarred ? "unstar" : "star"); onClose(); }}
      >
        <Icon name="i-star" /> {isStarred ? "Retirer l'étoile" : "Étoile"}
      </button>
      <button
        className="ctx-item ctx-item-expand"
        type="button"
        onClick={() => setSnoozeOpen((v) => !v)}
        aria-expanded={snoozeOpen}
      >
        <Icon name="i-clock" /> Snooze
        <span className="ctx-item-chevron" aria-hidden>{snoozeOpen ? "▴" : "▸"}</span>
      </button>
      {snoozeOpen && (
        <div className="ctx-submenu">
          {snoozeTargets().map((t) => (
            <button
              key={t.iso}
              className="ctx-item ctx-item-sub"
              type="button"
              onClick={() => {
                onAction({ kind: "snooze", untilIso: t.iso, label: t.label });
                onClose();
              }}
            >
              {t.label}
            </button>
          ))}
          {isSnoozed && (
            <button
              className="ctx-item ctx-item-sub"
              type="button"
              onClick={() => {
                onAction({ kind: "snooze", untilIso: null, label: "Annulé" });
                onClose();
              }}
            >
              Annuler le snooze
            </button>
          )}
        </div>
      )}
      <button
        className="ctx-item ctx-item-expand"
        type="button"
        onClick={() => setCategoryOpen((v) => !v)}
        aria-expanded={categoryOpen}
      >
        <Icon name="i-tag" /> Catégorie
        {currentCategory && (
          <span className="ctx-item-current" aria-hidden>
            {CATEGORY_OPTIONS.find((c) => c.id === currentCategory)?.emoji}
          </span>
        )}
        <span className="ctx-item-chevron" aria-hidden>{categoryOpen ? "▴" : "▸"}</span>
      </button>
      {categoryOpen && (
        <div className="ctx-submenu">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.id}
              className={`ctx-item ctx-item-sub ${currentCategory === c.id ? "is-current" : ""}`}
              type="button"
              onClick={() => {
                onAction({ kind: "set-category", category: c.id });
                onClose();
              }}
            >
              <span aria-hidden style={{ marginRight: 8 }}>{c.emoji}</span>
              {c.label}
              {currentCategory === c.id && <span style={{ marginLeft: "auto" }}>✓</span>}
            </button>
          ))}
          {currentCategory && (
            <button
              className="ctx-item ctx-item-sub"
              type="button"
              onClick={() => {
                onAction({ kind: "set-category", category: null });
                onClose();
              }}
            >
              Réinitialiser (laisser Mue trier)
            </button>
          )}
        </div>
      )}
      <div className="ctx-divider" />
      <button className="ctx-item is-danger" type="button" onClick={() => { onAction("archive"); onClose(); }}>
        <Icon name="i-folder" /> Archiver
      </button>
    </div>
  );
}
