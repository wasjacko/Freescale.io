"use client";

// Freescale V2 · Phase 1 — « Ton plan du jour » (pilier PRIORISER).
// 100% UI : actions mock triées par urgence simulée, interactions locales
// (cocher → la carte sort de la liste), CTA qui ouvre la conversation.

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Primitives";
import { MOCK_ACTIONS, MOCK_TIME_SAVED } from "@/lib/mock-v2";
import { useApp } from "@/lib/store";
import type { ActionItem, ActionReason, Tone } from "@/lib/types";
import { useMemo, useState } from "react";

// Tri d'urgence SIMULÉ : en retard > en attente > aujourd'hui > relance.
const REASON_ORDER: Record<ActionReason, number> = {
  late: 0,
  awaiting: 1,
  "due-today": 2,
  "follow-up": 3,
};
const REASON_TONE: Record<ActionReason, Tone> = {
  late: "danger",
  awaiting: "warn",
  "due-today": "info",
  "follow-up": "neutral",
};

export function DayPlan() {
  const { setView, setActiveConv } = useApp();
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());

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
            {remaining > 0 ? (
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
        <div className="day-plan__saved" title="Estimation du temps gagné cette semaine">
          <span className="day-plan__saved-val">{MOCK_TIME_SAVED.label}</span>
          <span className="day-plan__saved-label">gagnées {MOCK_TIME_SAVED.weekLabel}</span>
        </div>
      </header>

      {remaining === 0 ? (
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
        <Avatar avatar={action.avatar} size={34} />
        <ChannelLogo channel={action.channel} className="action-card__chan" />
      </span>

      <button type="button" className="action-card__body" onClick={onOpen}>
        <span className="action-card__title">{action.title}</span>
        <span className="action-card__meta">
          <span className="action-card__client">{action.clientName}</span>
          <StatusPill tone={REASON_TONE[action.reason]}>{action.reasonLabel}</StatusPill>
          {action.dueLabel && <span className="action-card__due">· {action.dueLabel}</span>}
        </span>
      </button>

      <button type="button" className="action-card__cta" onClick={onOpen}>
        Ouvrir
      </button>
    </li>
  );
}
