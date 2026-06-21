"use client";

// Freescale V2 · Phase 1 — « Ton plan du jour » (pilier PRIORISER).
// 100% UI : actions mock triées par urgence simulée, interactions locales
// (cocher → la carte sort de la liste), CTA qui ouvre la conversation.

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MOCK_ACTIONS } from "@/lib/mock-v2";
import { useApp } from "@/lib/store";
import type { ActionItem, ActionReason } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

// Ordre d'affichage SIMULÉ : en retard > en attente > aujourd'hui > relance.
const REASON_ORDER: Record<ActionReason, number> = {
  late: 0,
  awaiting: 1,
  "due-today": 2,
  "follow-up": 3,
};

// Lignes « fantômes » pendant que Mue priorise (skeleton pastel).
const SKELETONS = [0, 1, 2];

export function DayPlan() {
  const { setView, setActiveConv } = useApp();
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());

  // Court temps de « priorisation » : on montre des squelettes pastel le temps
  // que Mue ordonne les actions, puis le vrai plan apparaît à leur place.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 1900);
    return () => window.clearTimeout(t);
  }, []);

  const actions = useMemo(
    () =>
      [...MOCK_ACTIONS]
        .filter((a) => !doneIds.has(a.id))
        .sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason]),
    [doneIds]
  );
  const remaining = actions.length;

  const open = (a: ActionItem) => {
    if (!a.conversationId) return;
    setView("inbox");
    setActiveConv(a.conversationId);
  };
  const complete = (id: string) => setDoneIds((prev) => new Set(prev).add(id));

  return (
    <section className="day-plan" aria-label="Ton plan du jour">
      <header className="day-plan__head">
        <div>
          <h2 className="day-plan__title">Ton plan du jour</h2>
          <p className="day-plan__sub">
            {loading ? (
              <>
                <span className="day-plan__spark" aria-hidden>
                  ✦
                </span>{" "}
                Mue priorise tes tâches…
              </>
            ) : remaining > 0 ? (
              <>
                <span className="day-plan__spark" aria-hidden>
                  ✦
                </span>{" "}
                Mue a priorisé <b>{remaining}</b> {remaining > 1 ? "actions" : "action"} ce matin
              </>
            ) : (
              "Tout est traité — belle journée 🎉"
            )}
          </p>
        </div>
      </header>

      {loading ? (
        <ul className="day-plan__list" aria-hidden>
          {SKELETONS.map((i) => (
            <li key={i} className="skel-row" style={{ animationDelay: `${i * 110}ms` }}>
              <span className="skel-dot skel-dot--lg" />
              <span className="skel-row-body">
                <span className="skel-bar skel-bar--lg" />
                <span className="skel-bar skel-bar--sm" />
              </span>
              <span className="skel-bar skel-bar--btn" />
            </li>
          ))}
        </ul>
      ) : remaining === 0 ? (
        <div className="day-plan__empty">
          <span className="day-plan__empty-mark" aria-hidden>
            ✓
          </span>
          <p>Plus rien d'urgent. Profites-en pour avancer sur ton vrai métier.</p>
        </div>
      ) : (
        <ul className="day-plan__list">
          {actions.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              onOpen={() => open(a)}
              onDone={() => complete(a.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ActionCard({
  action,
  onOpen,
  onDone,
}: {
  action: ActionItem;
  onOpen: () => void;
  onDone: () => void;
}) {
  return (
    <li className={`action-card action-card--${action.reason}`}>
      <button
        type="button"
        className="action-card__check"
        onClick={onDone}
        aria-label="Marquer comme fait"
        title="Marquer comme fait"
      >
        <svg
          viewBox="0 0 24 24"
          width={13}
          height={13}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>

      <span className="action-card__av">
        <Avatar avatar={{ ...action.avatar, alt: action.clientName }} size={34} />
        <ChannelLogo channel={action.channel} className="action-card__chan" />
      </span>

      <button type="button" className="action-card__body" onClick={onOpen}>
        <span className="action-card__title">{action.title}</span>
        <span className="action-card__meta">
          <span className="action-card__client">{action.clientName}</span>
          <span className="action-card__reason">{action.reasonLabel}</span>
          {action.dueLabel && <span className="action-card__due">· {action.dueLabel}</span>}
        </span>
      </button>

      <button type="button" className="action-card__cta" onClick={onOpen}>
        Ouvrir
      </button>
    </li>
  );
}
