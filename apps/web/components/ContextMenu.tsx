"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";

export type ContextAction =
  | "open"
  | "mark-read"
  | "mark-unread"
  | "star"
  | "unstar"
  | "archive"
  | { kind: "snooze"; untilIso: string | null; label: string };

type Props = {
  x: number;
  y: number;
  isUnread: boolean;
  isStarred?: boolean;
  isSnoozed?: boolean;
  onClose: () => void;
  onAction: (action: ContextAction) => void;
};

/**
 * Compute snooze targets in the user's local timezone.
 *   • "Plus tard aujourd'hui" → 3h from now
 *   • "Ce soir"               → today 19:00 (or tomorrow if already past)
 *   • "Demain"                → tomorrow 08:00
 *   • "Cette semaine"         → next Monday 08:00
 *   • "La semaine prochaine"  → Monday +7d 08:00
 */
function snoozeTargets(): Array<{ label: string; iso: string }> {
  const now = new Date();
  const targets: Array<{ label: string; iso: string }> = [];

  const laterToday = new Date(now);
  laterToday.setHours(now.getHours() + 3, 0, 0, 0);
  targets.push({ label: "Plus tard aujourd'hui (3h)", iso: laterToday.toISOString() });

  const tonight = new Date(now);
  tonight.setHours(19, 0, 0, 0);
  if (tonight <= now) tonight.setDate(tonight.getDate() + 1);
  targets.push({ label: "Ce soir (19h)", iso: tonight.toISOString() });

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  targets.push({ label: "Demain matin (8h)", iso: tomorrow.toISOString() });

  // Next Monday 08:00 (this week's upcoming Monday, or +7 if today is Mon)
  const nextMon = new Date(now);
  const daysUntilMon = (1 + 7 - nextMon.getDay()) % 7 || 7;
  nextMon.setDate(now.getDate() + daysUntilMon);
  nextMon.setHours(8, 0, 0, 0);
  targets.push({ label: "Semaine prochaine", iso: nextMon.toISOString() });

  return targets;
}

export function ContextMenu({
  x,
  y,
  isUnread,
  isStarred,
  isSnoozed,
  onClose,
  onAction,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

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
      <div className="ctx-divider" />
      <button className="ctx-item is-danger" type="button" onClick={() => { onAction("archive"); onClose(); }}>
        <Icon name="i-folder" /> Archiver
      </button>
    </div>
  );
}
