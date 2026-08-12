"use client";

import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Quick-create modal triggered by the "+ New task" button in TasksView.
 * Minimal fields by design — title required, priority + due date
 * optional. Anything else (conversation link, description, assignee…)
 * is handled either inline in TasksView later or via Mue's automated
 * task suggestions.
 */
export function NewTaskModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { createTask } = useData();
  const push = useToast((s) => s.push);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [due, setDue] = useState("");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setPriority("medium");
    setDue("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await createTask({
        title: trimmed,
        priority,
        due: due || null,
      });
      if (!res.ok) {
        push({ text: `Erreur : ${res.error}`, duration: 4000 });
        return;
      }
      push({ text: "Tâche créée.", duration: 2200 });
      reset();
      onClose();
      if (!res.taskId?.startsWith("local-")) router.refresh();
    });
  };

  if (!open) return null;

  return (
    <div
      className="new-task-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-task-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !pending) onClose();
      }}
      tabIndex={-1}
    >
      <form className="new-task-modal" onSubmit={handleSubmit}>
        <header className="new-task-head">
          <h2 id="new-task-title">Nouvelle tâche</h2>
          <button
            type="button"
            className="new-task-close"
            onClick={onClose}
            disabled={pending}
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        <label className="new-task-label">
          <span>Titre</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Envoyer le devis à…"
            required
            maxLength={200}
            disabled={pending}
          />
        </label>

        <div className="new-task-row">
          <div className="new-task-col">
            <span className="new-task-col-label">Priorité</span>
            <div className="new-task-priority">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`new-task-prio-chip is-${p} ${priority === p ? "is-active" : ""}`}
                  onClick={() => setPriority(p)}
                  disabled={pending}
                >
                  <span className="new-task-prio-dot" />
                  {p === "low" ? "Basse" : p === "high" ? "Haute" : "Moyenne"}
                </button>
              ))}
            </div>
          </div>
          <div className="new-task-col">
            <span className="new-task-col-label">Échéance</span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              disabled={pending}
              className="new-task-date"
            />
          </div>
        </div>

        <footer className="new-task-actions">
          <button type="button" className="new-task-cancel" onClick={onClose} disabled={pending}>
            Annuler
          </button>
          <button type="submit" className="new-task-submit" disabled={pending || !title.trim()}>
            {pending ? "Création…" : "Créer la tâche"}
          </button>
        </footer>
      </form>
    </div>
  );
}
