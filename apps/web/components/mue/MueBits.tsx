"use client";

// Primitives réutilisables du panneau agentique Mue (PRD §2.B).
// Extraites de MuePanel pour que les flows suivants (document, agenda…)
// les réemploient au lieu de dupliquer le JSX inline.

import type { Priority } from "@/lib/types";
import { useEffect, useState } from "react";

// Cache module-level des refs déjà « révélées » (skeleton → pillule finale joué).
// Au re-render (scroll, autre message…), une pillule déjà résolue apparaît
// d'un coup, pas de réanimation. Vit pendant tout le mount de la page.
const REVEALED_REFS = new Set<string>();

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
  revealId,
  fresh,
  onOpen,
}: {
  title: string;
  badge?: string | undefined;
  meta?: string | undefined;
  entity?: "task" | "conversation" | "client" | "event" | "document" | undefined;
  revealId?: string | undefined;
  /** True juste après création → joue une animation de lueur one-shot. */
  fresh?: boolean | undefined;
  onOpen: () => void;
}) {
  // Skeleton pastel ~750 ms avant d'afficher l'objet finalisé — donne le
  // sentiment que Mue est en train de créer l'asset en temps réel.
  const cacheKey = revealId ?? title;
  const alreadyRevealed = REVEALED_REFS.has(cacheKey);
  const [ready, setReady] = useState(alreadyRevealed);
  useEffect(() => {
    if (alreadyRevealed) return;
    const t = setTimeout(() => {
      REVEALED_REFS.add(cacheKey);
      setReady(true);
    }, 1600);
    return () => clearTimeout(t);
  }, [cacheKey, alreadyRevealed]);

  if (!ready) {
    // Skeleton calé sur la pillule .mue2-ref (mode sans meta) ou sur la
    // carte large .mue2-objcard (mode avec meta) — même métrique pour
    // éviter le saut de layout au morph.
    if (meta) {
      return (
        <span className="mue2-objcard mue2-objcard--skeleton" aria-busy="true" aria-label="…">
          <span className="mue2-objcard-ic mue2-skel-block" aria-hidden />
          <span className="mue2-objcard-main">
            <span className="mue2-skel-line mue2-skel-line--title" aria-hidden />
            <span className="mue2-skel-line mue2-skel-line--meta" aria-hidden />
          </span>
          <span className="mue2-skel-badge" aria-hidden />
        </span>
      );
    }
    return (
      <span className="mue2-ref mue2-ref--skeleton" aria-busy="true" aria-label="…">
        <span className="mue2-ref-dot mue2-skel-dot" aria-hidden />
        <span className="mue2-skel-line mue2-skel-line--ref" aria-hidden />
        <span className="mue2-skel-badge" aria-hidden />
      </span>
    );
  }

  if (meta) {
    return (
      <button
        type="button"
        className={`mue2-objcard${fresh ? " is-fresh" : ""}`}
        onClick={onOpen}
        title="Ouvrir dans le canvas"
      >
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
    <button
      type="button"
      className={`mue2-ref${fresh ? " is-fresh" : ""}`}
      onClick={onOpen}
      title="Ouvrir la fiche"
    >
      <span className="mue2-ref-dot" aria-hidden />
      {title}
      {badge ? <span className="mue2-ref-badge">{badge}</span> : null}
    </button>
  );
}

/** Ligne d'une preview de tâche : skeleton pastel staggered (apparition en
 *  cascade) puis morph vers la ligne réelle (icône + titre + meta + priorité).
 *  Donne le sentiment que Mue compose la liste en temps réel. */
export function MuePrevRow({
  children,
  revealId,
  index = 0,
}: {
  children: React.ReactNode;
  revealId: string;
  index?: number;
}) {
  const alreadyRevealed = REVEALED_REFS.has(revealId);
  const [ready, setReady] = useState(alreadyRevealed);
  useEffect(() => {
    if (alreadyRevealed) return;
    // Délai = 600ms de base + 220ms par ligne → effet de composition
    // en cascade (chaque tâche apparaît juste après la précédente).
    const t = setTimeout(
      () => {
        REVEALED_REFS.add(revealId);
        setReady(true);
      },
      600 + index * 220
    );
    return () => clearTimeout(t);
  }, [revealId, index, alreadyRevealed]);
  if (!ready) {
    return (
      <div className="mue2-prev-row mue2-prev-row--skeleton" aria-busy="true" aria-label="…">
        <span className="mue2-prev-ic mue2-skel-block" aria-hidden />
        <span className="mue2-prev-main">
          <span className="mue2-skel-line mue2-skel-line--title" aria-hidden />
          <span className="mue2-skel-line mue2-skel-line--meta" aria-hidden />
        </span>
        <span className="mue2-skel-badge" aria-hidden />
      </div>
    );
  }
  return <div className="mue2-prev-row">{children}</div>;
}

/** Lien objet INLINE (dans la prose) — nom + badge, cliquable. */
export function MueInlineRef({
  label,
  badge,
  entity,
  revealId,
  onOpen,
}: {
  label: string;
  badge?: string | undefined;
  entity?: "task" | "conversation" | "client" | "event" | "document" | undefined;
  // Identifiant stable de l'objet — sert au cache module-level pour ne pas
  // re-jouer le skeleton si la pillule a déjà été révélée une fois.
  revealId?: string | undefined;
  onOpen: () => void;
}) {
  const cacheKey = revealId ?? label;
  const alreadyRevealed = REVEALED_REFS.has(cacheKey);
  const [ready, setReady] = useState(alreadyRevealed);
  useEffect(() => {
    if (alreadyRevealed) return;
    // Skeleton pastel pendant ~750 ms — donne le sentiment que l'IA est en
    // train de finaliser l'objet, puis morphe vers la pillule complète.
    const t = setTimeout(() => {
      REVEALED_REFS.add(cacheKey);
      setReady(true);
    }, 1600);
    return () => clearTimeout(t);
  }, [cacheKey, alreadyRevealed]);

  if (!ready) {
    // Skeleton inline (shimmer pastel) — emprunte la métrique de la pillule
    // finale pour éviter un saut de layout au moment du morph.
    return (
      <span className="mue2-inlineref mue2-inlineref--skeleton" aria-busy="true" aria-label="…">
        <span className="mue2-inlineref-ic mue2-inlineref-ic--ghost" aria-hidden />
        <span className="mue2-inlineref-label mue2-inlineref-label--ghost" aria-hidden />
        <span className="mue2-inlineref-badge mue2-inlineref-badge--ghost" aria-hidden />
      </span>
    );
  }

  return (
    <button type="button" className="mue2-inlineref" onClick={onOpen} title="Ouvrir">
      {entity ? (
        <span className="mue2-inlineref-ic" aria-hidden>
          {ENTITY_ICON[entity]}
        </span>
      ) : null}
      <span className="mue2-inlineref-label">{label}</span>
      {badge ? <span className="mue2-inlineref-badge">{badge}</span> : null}
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
