"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { Task } from "@/lib/types";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const STATUS_LABEL: Record<Task["status"], string> = {
  "to-scope": "À cadrer",
  todo: "TO DO",
  "in-progress": "EN COURS",
  "awaiting-reply": "EN ATTENTE",
  done: "TERMINÉ",
};
const STATUS_CLS: Record<Task["status"], string> = {
  "to-scope": "scope",
  todo: "todo",
  "in-progress": "progress",
  "awaiting-reply": "waiting",
  done: "done",
};
const PRIO_LABEL: Record<Task["priority"], string> = {
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

/**
 * TaskDetailModal — vue détaillée d'une tâche (façon fiche ClickUp), ouverte
 * quand on clique la « chose créée » par Mue dans le chat. 100% UI mock.
 */
export function TaskDetailModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks, setTaskStatus } = useData();
  const { setView, setActiveConv, setMueOpen, mueOpen } = useApp();
  const task = tasks.find((t) => t.id === taskId) ?? null;

  // Portal vers <body> : la modal vit AU-DESSUS de toute la page (zone
  // principale), pas à l'intérieur du panneau Mue.
  const [mounted, setMounted] = useState(false);
  // Réserve la largeur RÉELLE du panneau Mue à droite (mesurée sur l'élément,
  // car le portal sort de .app et n'hérite pas de --mue-panel-w).
  const [rightInset, setRightInset] = useState(0);
  useEffect(() => {
    setMounted(true);
    const cop = document.querySelector(".copilot");
    if (mueOpen && cop) {
      const r = cop.getBoundingClientRect();
      setRightInset(Math.max(0, window.innerWidth - r.left + 8));
    } else {
      setRightInset(0);
    }
  }, [mueOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!task || !mounted) return null;

  const done = task.status === "done";
  const openInTasks = () => {
    setView("today");
    setMueOpen(false);
    onClose();
  };
  const openThread = () => {
    if (!task.conversationId) return;
    setActiveConv(task.conversationId);
    setView("inbox");
    setMueOpen(false);
    onClose();
  };

  return createPortal(
    <div
      className="tdm-overlay"
      style={{ right: rightInset }}
      role="dialog"
      aria-modal="true"
      aria-label={`Tâche ${task.title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      tabIndex={-1}
    >
      <div className="tdm-sheet">
        <header className="tdm-head">
          <span className="tdm-list">
            <svg
              viewBox="0 0 24 24"
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
            Liste personnelle
          </span>
          <button type="button" className="tdm-close" aria-label="Fermer" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="tdm-body">
          <h1 className="tdm-title">{task.title}</h1>

          <div className="tdm-rows">
            <div className="tdm-row">
              <span className="tdm-key">Statut</span>
              <span className={`tdm-status tdm-status--${STATUS_CLS[task.status]}`}>
                {STATUS_LABEL[task.status]}
              </span>
            </div>
            <div className="tdm-row">
              <span className="tdm-key">Échéance</span>
              <span className="tdm-val">{task.dueLabel || "—"}</span>
            </div>
            <div className="tdm-row">
              <span className="tdm-key">Priorité</span>
              <span className={`tdm-prio tdm-prio--${task.priority}`}>
                {PRIO_LABEL[task.priority]}
              </span>
            </div>
            <div className="tdm-row">
              <span className="tdm-key">Source</span>
              <span className="tdm-val">{task.fromAI ? "✦ Créée par Mue" : "Manuelle"}</span>
            </div>
            <div className="tdm-row">
              <span className="tdm-key">Client</span>
              <span className="tdm-val tdm-client">
                {task.conversationId ? (
                  <>
                    <Avatar avatar={{ ...task.avatar, alt: "" }} size={18} />
                    Lié au fil
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>

          <p className="tdm-desc">Ajoute une description…</p>
        </div>

        <footer className="tdm-foot">
          <button
            type="button"
            className="tdm-btn tdm-btn--ghost"
            onClick={() => setTaskStatus(task.id, done ? "todo" : "done")}
          >
            {done ? "Rouvrir" : "Marquer terminé"}
          </button>
          {task.conversationId && (
            <button type="button" className="tdm-btn tdm-btn--ghost" onClick={openThread}>
              Ouvrir le fil
            </button>
          )}
          <button type="button" className="tdm-btn tdm-btn--primary" onClick={openInTasks}>
            Voir dans Tâches
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
