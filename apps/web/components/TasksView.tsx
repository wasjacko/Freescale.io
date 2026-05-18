"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { NewTaskModal } from "@/components/NewTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { dailyBriefing } from "@/lib/actions/mue";
import { createTask, reorderTasks } from "@/lib/actions/inbox";
import type { Task } from "@/lib/types";

const EMPTY_COPY: Record<
  string,
  { title: string; description: string; cta: string }
> = {
  todo: {
    title: "Aucune tâche à faire",
    description: "Tu peux en créer une manuellement ou laisser Mue scanner tes mails.",
    cta: "Nouvelle tâche",
  },
  "in-progress": {
    title: "Rien en cours",
    description: "Marque une tâche en progression pour la voir ici.",
    cta: "Nouvelle tâche",
  },
  "awaiting-reply": {
    title: "Personne ne te bloque",
    description: "Les tâches en attente d'une réponse de quelqu'un apparaissent ici.",
    cta: "Nouvelle tâche",
  },
  done: {
    title: "Rien de terminé pour l'instant",
    description: "Les tâches que tu marques comme faites apparaissent ici.",
    cta: "Nouvelle tâche",
  },
};

const TAB_STATUSES = [
  { id: "todo", label: "To do" },
  { id: "in-progress", label: "In progress" },
  { id: "awaiting-reply", label: "Awaiting reply" },
  { id: "done", label: "Done" },
] as const;

export function TasksView() {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const { tasks, toggleTask } = useData();
  const [activeTab, setActiveTab] = useState<string>("todo");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [analyzing, startAnalyzing] = useTransition();

  // Inline subtask creation — when subtaskFor === parentId, a small input
  // appears under that parent row. Closes on blur or Enter (creates) /
  // Escape (cancels).
  const [subtaskFor, setSubtaskFor] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [creatingSubtask, setCreatingSubtask] = useState(false);

  // Drag-and-drop: only top-level tasks (no parent) participate, so the
  // reorder semantics stay clean. Subtasks follow their parent.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // Optimistic order overlay: when the user drops, we update this map
  // immediately and ALSO send the server action; the server payload
  // re-syncs once router.refresh() fires.
  const [orderOverride, setOrderOverride] = useState<Record<string, number> | null>(null);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);

  const handleAnalyze = () => {
    startAnalyzing(async () => {
      try {
        const res = await dailyBriefing();
        if (res.error || !res.briefing) {
          push({ text: `Mue : ${res.error ?? "impossible"}`, duration: 4000 });
          return;
        }
        if (res.briefing.items.length === 0) {
          push({ text: res.briefing.headline ?? "Rien d'actionnable détecté." });
          return;
        }
        let created = 0;
        for (const item of res.briefing.items) {
          const r = await createTask({
            title: item.title,
            description: item.why,
            priority: item.priority,
            conversationId: item.conversationId,
            due: item.due,
          });
          if (r.ok) created += 1;
        }
        push({
          text: `Mue a créé ${created} tâche${created > 1 ? "s" : ""}.`,
          duration: 2800,
        });
        router.refresh();
      } catch (err) {
        push({
          text: err instanceof Error ? err.message : "Analyse impossible.",
          duration: 4000,
        });
      }
    });
  };

  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    "awaiting-reply": tasks.filter((t) => t.status === "awaiting-reply").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  // Build the tree: top-level tasks (no parent) at root, with each top-level
  // task having its children attached in their natural order. Children of
  // top-level tasks for the OTHER statuses are intentionally hidden — only
  // children matching the active tab show under their visible parent.
  //
  // For drag-reorder we only consider top-level rows; the optimistic
  // `orderOverride` (if set) replaces the server-supplied sortable_index.
  const grouped = useMemo(() => {
    const inTab = tasks.filter((t) => t.status === activeTab);
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const topLevel = inTab.filter((t) => !t.parentTaskId);
    // Sort: optimistic override > sortable_index > insertion order.
    const sorted = [...topLevel].sort((a, b) => {
      const ax = orderOverride?.[a.id] ?? a.sortableIndex ?? 0;
      const bx = orderOverride?.[b.id] ?? b.sortableIndex ?? 0;
      return ax - bx;
    });
    // For each top-level, collect children present in the same tab.
    return sorted.map((parent) => {
      const childrenOfParent = inTab.filter(
        (t) => t.parentTaskId === parent.id && byId.has(parent.id)
      );
      childrenOfParent.sort(
        (a, b) => (a.sortableIndex ?? 0) - (b.sortableIndex ?? 0)
      );
      return { parent, children: childrenOfParent };
    });
  }, [tasks, activeTab, orderOverride]);

  const toggleCheck = (id: string, currentlyDone: boolean) => {
    void toggleTask(id, !currentlyDone);
  };

  const openSubtask = (parentId: string) => {
    setSubtaskFor(parentId);
    setSubtaskTitle("");
  };

  const commitSubtask = async (parentId: string) => {
    const title = subtaskTitle.trim();
    if (!title) {
      setSubtaskFor(null);
      setSubtaskTitle("");
      return;
    }
    setCreatingSubtask(true);
    try {
      const res = await createTask({
        title,
        parentTaskId: parentId,
        priority: "medium",
      });
      if (res.ok) {
        push({ kind: "info", text: "Sous-tâche ajoutée" });
        router.refresh();
        setSubtaskFor(null);
        setSubtaskTitle("");
      } else {
        push({ kind: "error", text: res.error ?? "Création impossible" });
      }
    } finally {
      setCreatingSubtask(false);
    }
  };

  // -- Drag handlers (top-level only) -----------------------------------

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    // Hide the default browser ghost — our own row's opacity-0.5 styling
    // is enough of an affordance and reads cleaner.
    if (dragGhostRef.current) {
      e.dataTransfer.setDragImage(dragGhostRef.current, 0, 0);
    }
  };
  const onDragOver = (e: React.DragEvent, id: string) => {
    if (!dragId || dragId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };
  const onDragLeave = (id: string) => {
    setDragOverId((curr) => (curr === id ? null : curr));
  };
  const onDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    // Compute the new order: take the current top-level sequence and
    // move dragId to just before targetId. Single pass, O(n).
    const seq = grouped.map((g) => g.parent.id);
    const without = seq.filter((id) => id !== dragId);
    const insertAt = without.indexOf(targetId);
    if (insertAt === -1) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const next = [...without.slice(0, insertAt), dragId, ...without.slice(insertAt)];
    // Optimistic override so the UI rearranges before the server confirms.
    const override: Record<string, number> = {};
    next.forEach((id, idx) => (override[id] = idx));
    setOrderOverride(override);
    setDragId(null);
    setDragOverId(null);
    const res = await reorderTasks(next);
    if (!res.ok) {
      push({ kind: "error", text: res.error ?? "Réorganisation impossible." });
      setOrderOverride(null);
      return;
    }
    // The server-issued revalidatePath refreshes the page payload; clear
    // the override once that lands (or after a short delay as a fallback).
    setTimeout(() => setOrderOverride(null), 1500);
  };
  const onDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <section className="tasks-view" aria-label="Tasks">
      <header className="tasks-head">
        <h1>Tasks</h1>
        <button
          className="btn-new-task"
          type="button"
          onClick={() => setNewTaskOpen(true)}
        >
          <Icon name="i-plus" />
          Nouvelle tâche
        </button>
      </header>

      <div className="scan-banner">
        <span className="scan-icon"><Icon name="i-spark" /></span>
        <span className="scan-text">
          {analyzing
            ? "Mue analyse vos conversations…"
            : "Laissez Mue détecter les actions dans vos mails"}
        </span>
        <button
          className="btn-analyze"
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          <Icon name="i-spark" className="scan-spark icon" />
          {analyzing ? "Analyse…" : "Analyser avec Mue"}
        </button>
      </div>

      <div className="task-tabs">
        {TAB_STATUSES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`task-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} <span className="tab-num">{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      {/* Invisible 1x1 element used as the drag-image so the browser ghost
          doesn't show — we render our own visual feedback. */}
      <div
        ref={dragGhostRef}
        style={{ position: "absolute", top: -1000, width: 1, height: 1, opacity: 0 }}
        aria-hidden
      />

      <ul className="task-list">
        {grouped.length === 0 && (
          <li className="task-empty-wrap">
            <EmptyState
              icon={activeTab === "done" ? "i-check" : "i-task"}
              title={EMPTY_COPY[activeTab]?.title ?? "Aucune tâche"}
              description={EMPTY_COPY[activeTab]?.description}
              cta={{
                label: EMPTY_COPY[activeTab]?.cta ?? "Nouvelle tâche",
                onClick: () => setNewTaskOpen(true),
              }}
            />
          </li>
        )}

        {grouped.map(({ parent, children }) => {
          const isDone = !!parent.isDone;
          const isDragging = dragId === parent.id;
          const isDropTarget = dragOverId === parent.id;
          return (
            <li
              key={parent.id}
              className={`task-group ${isDropTarget ? "is-drop-target" : ""}`}
            >
              <div
                className={`task-item ${isDone ? "is-done" : ""} ${
                  isDragging ? "is-dragging" : ""
                }`}
                draggable
                onDragStart={(e) => onDragStart(e, parent.id)}
                onDragOver={(e) => onDragOver(e, parent.id)}
                onDragLeave={() => onDragLeave(parent.id)}
                onDrop={(e) => onDrop(e, parent.id)}
                onDragEnd={onDragEnd}
              >
                <span className="task-drag-handle" aria-hidden title="Glisser pour réorganiser">
                  <svg viewBox="0 0 8 14" width="8" height="14" fill="currentColor">
                    <circle cx="2" cy="2" r="1.2" />
                    <circle cx="6" cy="2" r="1.2" />
                    <circle cx="2" cy="7" r="1.2" />
                    <circle cx="6" cy="7" r="1.2" />
                    <circle cx="2" cy="12" r="1.2" />
                    <circle cx="6" cy="12" r="1.2" />
                  </svg>
                </span>
                <button
                  className={`task-check ${isDone ? "is-done" : ""}`}
                  type="button"
                  aria-label="Mark done"
                  onClick={() => toggleCheck(parent.id, isDone)}
                />
                <span className="task-avatar">
                  <Avatar avatar={parent.avatar} />
                  <span className="conv-badge"><ChannelLogo channel={parent.channel} className="" /></span>
                </span>
                <span className="task-title">
                  {parent.title}
                  {children.length > 0 && (
                    <span className="task-subcount" aria-label={`${children.length} sous-tâches`}>
                      {children.filter((c) => !c.isDone).length}/{children.length}
                    </span>
                  )}
                </span>
                <span className={`priority ${parent.priority}`}>
                  {parent.priority[0]?.toUpperCase()}{parent.priority.slice(1)}
                </span>
                <span className={`task-due ${parent.isToday ? "is-today" : ""}`}>
                  {parent.dueLabel}
                </span>
                <button
                  className="task-add-sub"
                  type="button"
                  aria-label="Ajouter une sous-tâche"
                  title="Sous-tâche"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSubtask(parent.id);
                  }}
                >
                  <Icon name="i-plus" />
                </button>
                <button
                  className="task-expand"
                  type="button"
                  aria-label="Modifier"
                  onClick={() => setEditingTask(parent)}
                >
                  <Icon name="i-chevron-down" />
                </button>
              </div>

              {/* Children (subtasks) render indented under their parent.
                  Not draggable — they always follow their parent. */}
              {children.map((child) => {
                const childDone = !!child.isDone;
                return (
                  <div
                    key={child.id}
                    className={`task-item is-subtask ${childDone ? "is-done" : ""}`}
                  >
                    <span className="task-subtask-tee" aria-hidden />
                    <button
                      className={`task-check ${childDone ? "is-done" : ""}`}
                      type="button"
                      aria-label="Mark done"
                      onClick={() => toggleCheck(child.id, childDone)}
                    />
                    <span className="task-title task-subtask-title">{child.title}</span>
                    <span className={`priority ${child.priority}`}>
                      {child.priority[0]?.toUpperCase()}{child.priority.slice(1)}
                    </span>
                    <span className={`task-due ${child.isToday ? "is-today" : ""}`}>
                      {child.dueLabel}
                    </span>
                    <button
                      className="task-expand"
                      type="button"
                      aria-label="Modifier"
                      onClick={() => setEditingTask(child)}
                    >
                      <Icon name="i-chevron-down" />
                    </button>
                  </div>
                );
              })}

              {subtaskFor === parent.id && (
                <div className="task-item is-subtask is-subtask-input">
                  <span className="task-subtask-tee" aria-hidden />
                  <input
                    type="text"
                    className="task-subtask-input-field"
                    placeholder="Sous-tâche…"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void commitSubtask(parent.id);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setSubtaskFor(null);
                        setSubtaskTitle("");
                      }
                    }}
                    onBlur={() => {
                      // Use a tiny delay so Enter-then-blur doesn't double-fire.
                      setTimeout(() => {
                        if (subtaskFor === parent.id) {
                          if (subtaskTitle.trim()) void commitSubtask(parent.id);
                          else setSubtaskFor(null);
                        }
                      }, 100);
                    }}
                    autoFocus
                    disabled={creatingSubtask}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </section>
  );
}
