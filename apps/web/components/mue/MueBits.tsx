"use client";

// Primitives réutilisables du panneau agentique Mue (PRD §2.B).
// Extraites de MuePanel pour que les flows suivants (document, agenda…)
// les réemploient au lieu de dupliquer le JSX inline.

import type { Priority } from "@/lib/types";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  viewBox: "0 0 24 24",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

/** Badge — priorité (haute/moyenne/basse) ou statut libre (« TO DO »). */
export function MueBadge(
  props: { kind: "priority"; value: Priority } | { kind: "status"; value: string }
) {
  if (props.kind === "priority") {
    return (
      <span className={`mue2-prio mue2-prio--${props.value}`}>{PRIORITY_LABEL[props.value]}</span>
    );
  }
  return <span className="mue2-ref-badge">{props.value}</span>;
}

const ENTITY_ICON: Record<string, React.ReactNode> = {
  task: (
    <svg {...stroke} width={14} height={14}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  conversation: (
    <svg {...stroke} width={14} height={14}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9.3 8.4L3 21l1.1-3.7A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  ),
  client: (
    <svg {...stroke} width={14} height={14}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.7 3.1-6 7-6s7 2.3 7 6" />
    </svg>
  ),
  event: (
    <svg {...stroke} width={14} height={14}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  document: (
    <svg {...stroke} width={14} height={14}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  ),
};

/** Carte objet cliquable — ouvre l'objet dans le canvas sans fermer Mue.
 *  Forme « pilule » (sans meta) ou « bloc » (avec meta) selon le contexte. */
export function MueObjectCard({
  title,
  badge = "TO DO",
  meta,
  entity = "task",
  onOpen,
}: {
  title: string;
  badge?: string | undefined;
  meta?: string | undefined;
  entity?: "task" | "conversation" | "client" | "event" | "document" | undefined;
  onOpen: () => void;
}) {
  if (meta) {
    return (
      <button type="button" className="mue2-objcard" onClick={onOpen} title="Ouvrir dans le canvas">
        <span className="mue2-objcard-ic" aria-hidden>
          {ENTITY_ICON[entity] ?? ENTITY_ICON.task}
        </span>
        <span className="mue2-objcard-main">
          <span className="mue2-objcard-title">{title}</span>
          <span className="mue2-objcard-meta">{meta}</span>
        </span>
        {badge ? <span className="mue2-ref-badge">{badge}</span> : null}
      </button>
    );
  }
  return (
    <button type="button" className="mue2-ref" onClick={onOpen} title="Ouvrir la fiche">
      <span className="mue2-ref-dot" aria-hidden />
      {title}
      {badge ? <span className="mue2-ref-badge">{badge}</span> : null}
    </button>
  );
}

/** Rangée de suggestions de suite (contextuelles). */
export function MueSuggestions({
  label,
  items,
  onPick,
}: {
  label: string;
  items: string[];
  onPick: (s: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mue2-improve">
      <span className="mue2-improve-label">{label}</span>
      {items.map((s) => (
        <button key={s} type="button" className="mue2-improve-chip" onClick={() => onPick(s)}>
          <span className="mue2-improve-arrow" aria-hidden>
            ↳
          </span>
          {s}
        </button>
      ))}
    </div>
  );
}

/** Actions sur un message Mue : copier · réessayer · 👍 · 👎 (PRD §2.B). */
export function MueMsgActions({
  onCopy,
  onRetry,
  onFeedback,
}: {
  onCopy: () => void;
  onRetry?: () => void;
  onFeedback: (v: "up" | "down") => void;
}) {
  return (
    <div className="mue2-msgactions">
      <button type="button" aria-label="Copier" title="Copier" onClick={onCopy}>
        <svg {...stroke} width={14} height={14}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      </button>
      {onRetry ? (
        <button type="button" aria-label="Réessayer" title="Réessayer" onClick={onRetry}>
          <svg {...stroke} width={14} height={14}>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <polyline points="21 4 21 9 16 9" />
          </svg>
        </button>
      ) : null}
      <button type="button" aria-label="Utile" title="Utile" onClick={() => onFeedback("up")}>
        <svg {...stroke} width={14} height={14}>
          <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
          <path d="M7 11l4-7a2 2 0 0 1 2 1.5l-.7 4.5H19a2 2 0 0 1 2 2.3l-1.1 6A2 2 0 0 1 18 20H7" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Pas utile"
        title="Pas utile"
        onClick={() => onFeedback("down")}
      >
        <svg {...stroke} width={14} height={14}>
          <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1z" />
          <path d="M17 13l-4 7a2 2 0 0 1-2-1.5l.7-4.5H5a2 2 0 0 1-2-2.3l1.1-6A2 2 0 0 1 6 4h11" />
        </svg>
      </button>
    </div>
  );
}
