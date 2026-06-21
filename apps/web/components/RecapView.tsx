"use client";

// Freescale V2 — Page « Cette semaine » (bilan).
// PAS de vanity metrics (« X brouillons proposés », « X messages triés ») :
// uniquement des FAITS ACTIONNABLES dérivés des vraies données — ce qui
// demande ton attention maintenant.

import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";

export function RecapView() {
  const { conversations, tasks } = useData();
  const { setView, setActiveConv, setInboxBucket } = useApp();
  const now = Date.now();
  const ms = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

  // Clients dont la balle est dans MON camp (distincts).
  const toReply = new Set(
    conversations
      .filter((c) => ms(c.lastInboundAt) > ms(c.lastOutboundAt))
      .map((c) => c.clientId ?? c.id)
  ).size;
  // Relances à faire : en attente d'eux depuis ≥ 2 jours.
  const relances = new Set(
    conversations
      .filter(
        (c) =>
          ms(c.lastOutboundAt) > ms(c.lastInboundAt) && (now - ms(c.lastOutboundAt)) / 86400000 >= 2
      )
      .map((c) => c.clientId ?? c.id)
  ).size;
  const open = tasks.filter((t) => !t.parentTaskId && t.status !== "done");
  const overdue = open.filter((t) => t.dueAtIso && ms(t.dueAtIso) < now).length;

  const openInbox = (bucket: "to-reply" | "waiting") => {
    setView("inbox");
    setActiveConv("");
    setInboxBucket(bucket);
  };

  const kpis = [
    {
      key: "reply",
      val: toReply,
      label: "clients attendent ta réponse",
      tone: "alert" as const,
      onClick: () => openInbox("to-reply"),
    },
    {
      key: "relance",
      val: relances,
      label: "relances à faire (sans réponse ≥ 2 j)",
      tone: "warn" as const,
      onClick: () => openInbox("waiting"),
    },
    {
      key: "open",
      val: open.length,
      label: "tâches en cours",
      tone: "neutral" as const,
      onClick: () => setView("today"),
    },
    {
      key: "overdue",
      val: overdue,
      label: "tâches en retard",
      tone: overdue > 0 ? ("alert" as const) : ("neutral" as const),
      onClick: () => setView("today"),
    },
  ];

  return (
    <section className="recap-view" aria-label="Bilan de la semaine">
      <header className="recap-head">
        <p className="recap-sub">Ce qui demande ton attention maintenant.</p>
      </header>

      <div className="recap-section">
        <h2 className="recap-section-title">À traiter</h2>
        <div className="recap-kpis">
          {kpis.map((k) => (
            <button
              key={k.key}
              type="button"
              className={`recap-kpi recap-kpi--${k.tone}`}
              onClick={k.onClick}
            >
              <span className="recap-kpi-val">{k.val}</span>
              <span className="recap-kpi-label">{k.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
