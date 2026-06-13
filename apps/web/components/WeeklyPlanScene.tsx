"use client";

import { MueAvatar } from "@/components/MueAvatar";
import { Avatar } from "@/components/ui/Avatar";
import { useData } from "@/lib/contexts/DataContext";
import { useEffect, useMemo, useState } from "react";

const CHANNEL_LABEL: Record<string, string> = {
  gmail: "Email",
  outlook: "Outlook",
  slack: "Slack",
  teams: "Teams",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

const PRIO_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function firstNameOf(name: string): string {
  return name.split(/\s+/).filter(Boolean)[0] ?? name;
}

type Phase = "boot" | "reading" | "building" | "ready" | "done";

const SESSION_KEY = "fs-weekplan-done";

export function WeeklyPlanScene() {
  const { conversations, tasks, toggleTask } = useData();

  const clients = useMemo(
    () => conversations.filter((c) => c.category === "client"),
    [conversations]
  );

  // Les tâches « du plan » : top-level, non terminées, reliées à leur client
  // (via initiales d'avatar) et priorisées par Mue.
  const planItems = useMemo(() => {
    const list = tasks.filter((t) => !t.parentTaskId && t.status !== "done");
    return list
      .map((task) => {
        const av = task.avatar;
        const client =
          av.kind === "initials" ? clients.find((c) => initialsOf(c.name) === av.text) : undefined;
        return { task, client };
      })
      .sort((a, b) => (PRIO_RANK[a.task.priority] ?? 9) - (PRIO_RANK[b.task.priority] ?? 9));
  }, [tasks, clients]);

  const readingLines = useMemo(
    () =>
      clients.length > 0
        ? clients.map((c) => `J'analyse ${c.name}…`)
        : ["Je parcours tes conversations…"],
    [clients]
  );

  const [phase, setPhase] = useState<Phase>("boot");
  const [revealed, setRevealed] = useState(0);
  const [readIdx, setReadIdx] = useState(0);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  // Décide à l'hydratation : déjà joué cette session → on montre direct le plan.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (sessionStorage.getItem(SESSION_KEY) === "1" || reduce) {
      setPhase("done");
    } else {
      setPhase("reading");
    }
  }, []);

  // Phase « lecture » — Mue parcourt les conversations.
  useEffect(() => {
    if (phase !== "reading") return;
    const cyc = setInterval(
      () => setReadIdx((i) => (i + 1) % Math.max(1, readingLines.length)),
      460
    );
    const t = setTimeout(() => {
      clearInterval(cyc);
      setPhase("building");
    }, 1900);
    return () => {
      clearInterval(cyc);
      clearTimeout(t);
    };
  }, [phase, readingLines.length]);

  // Phase « construction » — les tâches se matérialisent une par une.
  useEffect(() => {
    if (phase !== "building") return;
    if (revealed >= planItems.length) {
      const t = setTimeout(() => setPhase("ready"), 480);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealed((n) => n + 1), 340);
    return () => clearTimeout(t);
  }, [phase, revealed, planItems.length]);

  const accept = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setPhase("done");
  };

  const replay = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIgnored(new Set());
    setRevealed(0);
    setReadIdx(0);
    setPhase("reading");
  };

  const visibleItems = planItems.filter((p) => !ignored.has(p.task.id));
  const highCount = visibleItems.filter((p) => p.task.priority === "high").length;

  if (phase === "boot") {
    return <section className="weekplan weekplan-boot" aria-label="Plan de la semaine" />;
  }

  // ── Phase lecture ──────────────────────────────────────────────
  if (phase === "reading") {
    return (
      <section className="weekplan weekplan-scene" aria-label="Mue prépare ta semaine">
        <div className="weekplan-orb is-thinking">
          <MueAvatar />
        </div>
        <div className="weekplan-scene-text">
          <h2 className="weekplan-scene-title">Mue prépare ta semaine</h2>
          <p className="weekplan-reading-line" key={readIdx}>
            {readingLines[readIdx]}
          </p>
        </div>
        <div className="weekplan-skel" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  // ── Phases construction + prêt ─────────────────────────────────
  if (phase === "building" || phase === "ready") {
    const shown = phase === "building" ? visibleItems.slice(0, revealed) : visibleItems;
    return (
      <section className="weekplan weekplan-scene" aria-label="Mue crée tes tâches">
        <div className="weekplan-scene-head">
          <div className="weekplan-orb is-building">
            <MueAvatar />
          </div>
          <div className="weekplan-scene-text">
            <h2 className="weekplan-scene-title">
              {phase === "building"
                ? "Mue crée tes tâches…"
                : `${visibleItems.length} tâche${visibleItems.length > 1 ? "s" : ""} prête${
                    visibleItems.length > 1 ? "s" : ""
                  }`}
            </h2>
            <p className="weekplan-scene-sub">
              {phase === "building"
                ? "Extraites de tes conversations, datées et priorisées."
                : `Priorisées par Mue${highCount > 0 ? ` · ${highCount} prioritaire${highCount > 1 ? "s" : ""}` : ""}.`}
            </p>
          </div>
        </div>

        <ul className="weekplan-tasks">
          {shown.map((item, i) => (
            <li
              key={item.task.id}
              className="weekplan-task"
              style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
            >
              <span className={`weekplan-prio prio-${item.task.priority}`} aria-hidden />
              <div className="weekplan-task-main">
                <strong className="weekplan-task-title">{item.task.title}</strong>
                <div className="weekplan-task-meta">
                  {item.client ? (
                    <span className="weekplan-task-src">
                      <Avatar avatar={item.client.avatar} />
                      {item.client.name} ·{" "}
                      {CHANNEL_LABEL[item.client.channel] ?? item.client.channel}
                    </span>
                  ) : (
                    <span className="weekplan-task-src">Tâche</span>
                  )}
                  <span className="weekplan-task-due">{item.task.dueLabel}</span>
                </div>
                {item.client && (
                  <span className="weekplan-task-trace">
                    ↳ depuis le message de {firstNameOf(item.client.name)}
                  </span>
                )}
              </div>
              {phase === "ready" && (
                <button
                  type="button"
                  className="weekplan-ignore"
                  aria-label={`Ignorer « ${item.task.title} »`}
                  onClick={() => setIgnored((prev) => new Set(prev).add(item.task.id))}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>

        {phase === "ready" && (
          <div className="weekplan-cta-row">
            <button type="button" className="weekplan-accept" onClick={accept}>
              Tout accepter
            </button>
            <span className="weekplan-cta-hint">Survole une tâche pour l'ignorer.</span>
          </div>
        )}
      </section>
    );
  }

  // ── Phase « plan » (résultat persistant + gestion continue) ────
  return (
    <section className="weekplan weekplan-plan" aria-label="Le plan de Mue cette semaine">
      <div className="weekplan-plan-head">
        <h2 className="weekplan-plan-title">Le plan de Mue · cette semaine</h2>
        <span className="weekplan-live" title="Mue surveille tes conversations en continu">
          <span className="weekplan-live-dot" />
          Mue surveille · live
        </span>
      </div>

      {visibleItems.length === 0 ? (
        <p className="weekplan-empty">Tu es à jour 🎉 — Mue a tout classé, rien ne t'attend.</p>
      ) : (
        <ul className="weekplan-plan-list">
          {visibleItems.map((item) => (
            <li key={item.task.id} className="weekplan-plan-item">
              <button
                type="button"
                className="weekplan-check"
                aria-label={`Marquer « ${item.task.title} » comme fait`}
                onClick={() => toggleTask(item.task.id, true)}
              />
              <div className="weekplan-plan-main">
                <span className="weekplan-plan-name">{item.task.title}</span>
                {item.client && (
                  <span className="weekplan-plan-src">
                    {item.client.name} · {CHANNEL_LABEL[item.client.channel] ?? item.client.channel}
                  </span>
                )}
              </div>
              <span className={`weekplan-prio prio-${item.task.priority}`} aria-hidden />
              <span className="weekplan-plan-due">{item.task.dueLabel}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="weekplan-replay" onClick={replay}>
        Rejouer la préparation de Mue
      </button>
    </section>
  );
}
