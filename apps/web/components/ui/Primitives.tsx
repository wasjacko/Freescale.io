// Freescale V2 — briques UI réutilisables (Phase 0).
// Composants présentationnels purs (pas de state) → stylés via globals.css.

import type { IntegrationBadge, IntegrationKind, Tone } from "@/lib/types";
import type { ReactNode } from "react";

/** Pastille de statut colorée (statut projet, facture, action…). */
export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

const INTEG_META: Record<IntegrationKind, { mark: string; color: string }> = {
  github: { mark: "GH", color: "#24292f" },
  linear: { mark: "Li", color: "#5e6ad2" },
  stripe: { mark: "St", color: "#635bff" },
  notion: { mark: "No", color: "#111111" },
  figma: { mark: "Fi", color: "#a259ff" },
};

/** Chip d'intégration tech (visuel uniquement, non branché). */
export function IntegrationChip({ badge }: { badge: IntegrationBadge }) {
  const meta = INTEG_META[badge.kind];
  return (
    <span className={`integ-chip integ-chip--${badge.tone ?? "neutral"}`}>
      <span className="integ-chip__mark" style={{ backgroundColor: meta.color }}>
        {meta.mark}
      </span>
      <span className="integ-chip__label">{badge.label}</span>
    </span>
  );
}

/** Chip de source pour les réponses « Ask Mue » (« 3 messages »). */
export function SourceChip({ label, count }: { label: string; count: number }) {
  return (
    <span className="source-chip">
      <b>{count}</b> {label}
    </span>
  );
}

/** Barre de progression 0–100. */
export function ProgressBar({ value, tone = "ok" }: { value: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-bar" aria-label={`${pct}%`}>
      <span
        className={`progress-bar__fill progress-bar__fill--${tone}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Carte de section (cadre) pour les blocs du hub client. */
export function SectionCard({
  title,
  action,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  const hasHead = Boolean(title) || Boolean(action);
  return (
    <section className="section-card">
      {hasHead && (
        <header className="section-card__head">
          {title ? <h3 className="section-card__title">{title}</h3> : <span />}
          {action}
        </header>
      )}
      <div className="section-card__body">{children}</div>
    </section>
  );
}
