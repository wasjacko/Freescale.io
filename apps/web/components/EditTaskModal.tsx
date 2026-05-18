"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";
import { updateTask, deleteTask } from "@/lib/actions/inbox";
import type { Task } from "@/lib/types";

/**
 * Edit-task modal — opened from the task list "expand" chevron. Lets
 * the user rename, repriority, reschedule, and delete a task.
 *
 * Edits are committed on form submit; delete fires its own confirm
 * step so it can't be triggered by an accidental keyboard press.
 */
export function EditTaskModal({
  task,
  open,
  onClose,
}: {
  task: Task;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<"high" | "medium" | "low">(
    task.priority
  );
  // Convert "Due tomorrow" / "Due Sat" labels back to nothing — we don't
  // have the raw timestamp in the Task shape (adapter only kept the
  // label). For now require the user to re-pick a date if they want one.
  const [due, setDue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setPriority(task.priority);
      setDue("");
      setConfirmDelete(false);
    }
  }, [open, task.id, task.title, task.priority]);

  if (!open) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await updateTask(task.id, {
        title: trimmed,
        priority,
        // Only send `due` if the user actually changed it (non-empty)
        ...(due ? { due } : {}),
      });
      if (!res.ok) {
        push({ kind: "error", text: `Erreur : ${res.error}` });
        return;
      }
      push({ kind: "success", text: "Tâche mise à jour." });
      onClose();
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (!res.ok) {
        push({ kind: "error", text: `Erreur : ${res.error}` });
        return;
      }
      push({ kind: "success", text: "Tâche supprimée." });
      onClose();
      router.refresh();
    });
  };

  return (
    <div
      className="new-task-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <form className="new-task-modal" onSubmit={handleSave}>
        <header className="new-task-head">
          <h2 id="edit-task-title">Modifier la tâche</h2>
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
            required
            maxLength={200}
            disabled={pending}
            autoFocus
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
            <span className="new-task-col-label">Nouvelle échéance</span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              disabled={pending}
              className="new-task-date"
              placeholder={task.dueLabel}
            />
          </div>
        </div>

        <footer className="new-task-actions edit-task-actions">
          <button
            type="button"
            className={`new-task-cancel edit-task-delete ${confirmDelete ? "is-armed" : ""}`}
            onClick={handleDelete}
            disabled={pending}
          >
            {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
          </button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="new-task-cancel"
            onClick={onClose}
            disabled={pending}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="new-task-submit"
            disabled={pending || !title.trim()}
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </footer>
      </form>
    </div>
  );
}
