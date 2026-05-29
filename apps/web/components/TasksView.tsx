"use client";

import { EditTaskModal } from "@/components/EditTaskModal";
import { NewTaskModal } from "@/components/NewTaskModal";
import { ChannelLogo, Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { createTask, reorderTasks } from "@/lib/actions/inbox";
import { dailyBriefing } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { Task } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

const EMPTY_COPY: Record<string, { title: string; description: string; cta: string }> = {
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

type SuggestedTask = {
  conversationId: string;
  title: string;
  why: string;
  priority: "high" | "medium" | "low";
  due: string | null;
};

export function TasksView() {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const { tasks, toggleTask } = useData();
  const [activeTab, setActiveTab] = useState<string>("todo");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [analyzing, startAnalyzing] = useTransition();
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [creatingSuggestionId, setCreatingSuggestionId] = useState<string | null>(null);

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
          push({ kind: "error", text: `Mue : ${res.error ?? "impossible"}`, duration: 4000 });
          return;
        }
        if (res.briefing.items.length === 0) {
          setSuggestedTasks([]);
          push({ text: res.briefing.headline ?? "Rien d'actionnable détecté." });
          return;
        }
        setSuggestedTasks(res.briefing.items);
        push({
          text: `${res.briefing.items.length} suggestion${
            res.briefing.items.length > 1 ? "s" : ""
          } à confirmer.`,
          duration: 2800,
        });
      } catch (err) {
        push({
          kind: "error",
          text: err instanceof Error ? err.message : "Analyse impossible.",
          duration: 4000,
        });
      }
    });
  };

  const createSuggestedTask = async (item: SuggestedTask) => {
    if (creatingSuggestionId) return;
    setCreatingSuggestionId(item.conversationId);
    const result = await createTask({
      title: item.title,
      description: item.why,
      priority: item.priority,
      conversationId: item.conversationId,
      due: item.due,
    });
    setCreatingSuggestionId(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Création impossible." });
      return;
    }
    setSuggestedTasks((current) =>
      current.filter((suggestion) => suggestion.conversationId !== item.conversationId)
    );
    push({ kind: "info", text: "Tâche créée.", duration: 2200 });
    router.refresh();
  };

  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    "awaiting-reply": tasks.filter((t) => t.status === "awaiting-reply").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  // Build the tree of rows to render in the active tab. Two sources of
  // top-level rows:
  //
  //   1. Top-level tasks whose own status matches the active tab — these
  //      render normally (draggable, clickable check, normal opacity).
  //   2. Top-level tasks whose own status DOESN'T match BUT who have at
  //      least one subtask in the active tab. We surface these as
  //      "context-only" parents (faded, non-draggable, check disabled)
  //      so the matching subtask never appears orphaned from its parent.
  //      Audit #9 — the previous version dropped subtasks entirely
  //      whenever their parent was in a different tab.
  //
  // For drag-reorder we only consider real (non-context) top-level rows;
  // the optimistic `orderOverride` (if set) replaces the server-supplied
  // sortable_index for those.
  const grouped = useMemo(() => {
    const inTab = tasks.filter((t) => t.status === activeTab);
    const byId = new Map(tasks.map((t) => [t.id, t]));

    // Direct match: top-level tasks already in this tab.
    const directTopLevel = inTab.filter((t) => !t.parentTaskId);
    const directIds = new Set(directTopLevel.map((t) => t.id));

    // Context parents: subtasks in this tab whose parent is top-level
    // but lives in a different tab. We pull the parent in as a faded
    // context row so the subtask isn't shown floating without its
    // hierarchy.
    const contextParents: Task[] = [];
    const seenCtx = new Set<string>();
    for (const t of inTab) {
      if (!t.parentTaskId) continue;
      if (directIds.has(t.parentTaskId)) continue;
      if (seenCtx.has(t.parentTaskId)) continue;
      const parent = byId.get(t.parentTaskId);
      // Only surface as context if the parent itself is top-level
      // (one-level subtask model — we don't render grandchildren).
      if (parent && !parent.parentTaskId) {
        contextParents.push(parent);
        seenCtx.add(parent.id);
      }
    }

    const allTopLevel = [...directTopLevel, ...contextParents];

    // Sort by the same rank function. Context parents fall in
    // naturally with the rest based on their sortable_index — they
    // don't bunch up at top or bottom.
    const sorted = allTopLevel.sort((a, b) => {
      const ax = orderOverride?.[a.id] ?? a.sortableIndex ?? 0;
      const bx = orderOverride?.[b.id] ?? b.sortableIndex ?? 0;
      return ax - bx;
    });

    return sorted.map((parent) => {
      const childrenOfParent = inTab.filter((t) => t.parentTaskId === parent.id);
      childrenOfParent.sort((a, b) => (a.sortableIndex ?? 0) - (b.sortableIndex ?? 0));
      // A parent is "context-only" when its own status doesn't match
      // the active tab — we only included it to host its in-tab subtask.
      const isContextOnly = parent.status !== activeTab;
      return { parent, children: childrenOfParent, isContextOnly };
    });
  }, [tasks, activeTab, orderOverride]);

  const toggleCheck = async (id: string, currentlyDone: boolean) => {
    const result = await toggleTask(id, !currentlyDone);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Mise à jour impossible." });
    }
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

  // -- Reorder logic (top-level only) -----------------------------------
  //
  // Shared by BOTH the HTML5 drag-and-drop path (mouse on desktop) and
  // the Pointer/touch path (mobile fallback). Computes a new sequence
  // by moving sourceId to just before targetId, persists it optimistically,
  // and sends reorderTasks() to the server. Returns silently on a no-op.

  const commitReorder = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const seq = grouped.map((g) => g.parent.id);
    const without = seq.filter((id) => id !== sourceId);
    const insertAt = without.indexOf(targetId);
    if (insertAt === -1) return;
    const next = [...without.slice(0, insertAt), sourceId, ...without.slice(insertAt)];
    const override: Record<string, number> = {};
    next.forEach((id, idx) => {
      override[id] = idx;
    });
    setOrderOverride(override);
    const res = await reorderTasks(next);
    if (!res.ok) {
      push({ kind: "error", text: res.error ?? "Réorganisation impossible." });
      setOrderOverride(null);
      return;
    }
    setTimeout(() => setOrderOverride(null), 1500);
  };

  // -- HTML5 drag-and-drop (mouse/keyboard, desktop) --------------------

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
    if (!dragId) {
      setDragOverId(null);
      return;
    }
    const sourceId = dragId;
    setDragId(null);
    setDragOverId(null);
    await commitReorder(sourceId, targetId);
  };
  const onDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  // -- Pointer/touch fallback (iOS / Android) ---------------------------
  //
  // HTML5 dragstart is dead on iOS Safari and most Android browsers, so
  // we add a parallel Pointer-events path on the drag handle itself.
  // We only engage it for pointerType === "touch" — mouse / pen users
  // keep the native HTML5 path with its OS-level drag image + auto-scroll.

  const touchPointerIdRef = useRef<number | null>(null);

  const onHandlePointerDown = (e: React.PointerEvent, id: string) => {
    if (e.pointerType !== "touch") return; // Mouse / pen → let HTML5 drag run.
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    touchPointerIdRef.current = e.pointerId;
    setDragId(id);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== touchPointerIdRef.current) return;
    if (!dragId) return;
    // Walk up from the element under the touch point to find the nearest
    // task row, so the drop target snaps row-by-row regardless of where
    // the user's finger landed within a row.
    const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const groupEl = under?.closest("[data-task-id]") as HTMLElement | null;
    const targetId = groupEl?.getAttribute("data-task-id") ?? null;
    if (targetId && targetId !== dragId) {
      setDragOverId(targetId);
    } else if (!targetId) {
      setDragOverId(null);
    }
  };

  const onHandlePointerUp = async (e: React.PointerEvent) => {
    if (e.pointerId !== touchPointerIdRef.current) return;
    touchPointerIdRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    const sourceId = dragId;
    const targetId = dragOverId;
    setDragId(null);
    setDragOverId(null);
    if (sourceId && targetId) await commitReorder(sourceId, targetId);
  };

  const onHandlePointerCancel = () => {
    touchPointerIdRef.current = null;
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <section className="tasks-view" aria-label="Tasks">
      <header className="tasks-head">
        <h1>Tasks</h1>
        <button className="btn-new-task" type="button" onClick={() => setNewTaskOpen(true)}>
          <Icon name="i-plus" />
          Nouvelle tâche
        </button>
      </header>

      <div className="scan-banner">
        <span className="scan-icon">
          <Icon name="i-spark" />
        </span>
        <span className="scan-text">
          {analyzing
            ? "Mue analyse vos conversations…"
            : "Laissez Mue détecter les actions dans vos mails"}
        </span>
        <button className="btn-analyze" type="button" onClick={handleAnalyze} disabled={analyzing}>
          <Icon name="i-spark" className="scan-spark icon" />
          {analyzing ? "Analyse…" : "Analyser avec Mue"}
        </button>
      </div>

      {suggestedTasks.length > 0 && (
        <div className="task-mue-suggestions" aria-label="Suggestions Mue">
          {suggestedTasks.map((item) => (
            <article key={item.conversationId} className="task-mue-suggestion">
              <div>
                <strong>{item.title}</strong>
                <p>{item.why}</p>
              </div>
              <button
                type="button"
                onClick={() => void createSuggestedTask(item)}
                disabled={creatingSuggestionId === item.conversationId}
              >
                {creatingSuggestionId === item.conversationId ? "Création" : "Créer cette tâche"}
              </button>
            </article>
          ))}
        </div>
      )}

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

        {grouped.map(({ parent, children, isContextOnly }) => {
          const isDone = !!parent.isDone;
          const isDragging = dragId === parent.id;
          const isDropTarget = dragOverId === parent.id;
          return (
            <li
              key={parent.id}
              data-task-id={parent.id}
              className={`task-group ${isDropTarget ? "is-drop-target" : ""} ${
                isContextOnly ? "is-context-only" : ""
              }`}
            >
              <div
                className={`task-item ${isDone ? "is-done" : ""} ${
                  isDragging ? "is-dragging" : ""
                } ${isContextOnly ? "is-parent-context" : ""}`}
                // Context-only parents (own status differs from active
                // tab) are NOT draggable — drag-reorder only applies to
                // tasks that actually belong to this tab.
                {...(!isContextOnly && {
                  draggable: true,
                  onDragStart: (e: React.DragEvent) => onDragStart(e, parent.id),
                  onDragOver: (e: React.DragEvent) => onDragOver(e, parent.id),
                  onDragLeave: () => onDragLeave(parent.id),
                  onDrop: (e: React.DragEvent) => onDrop(e, parent.id),
                  onDragEnd: onDragEnd,
                })}
              >
                <span
                  className="task-drag-handle"
                  title={
                    isContextOnly
                      ? "Contexte (parent dans un autre onglet)"
                      : "Glisser pour réorganiser"
                  }
                  aria-label="Glisser pour réorganiser"
                  role={isContextOnly ? "img" : "button"}
                  {...(!isContextOnly && {
                    onPointerDown: (e: React.PointerEvent) => onHandlePointerDown(e, parent.id),
                    onPointerMove: onHandlePointerMove,
                    onPointerUp: onHandlePointerUp,
                    onPointerCancel: onHandlePointerCancel,
                  })}
                >
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
                  // Context-only parent's checkbox is disabled — toggling
                  // it would move the parent into this tab silently,
                  // which is not what the user expects.
                  disabled={isContextOnly}
                  onClick={() => {
                    if (!isContextOnly) void toggleCheck(parent.id, isDone);
                  }}
                />
                <span className="task-avatar">
                  <Avatar avatar={parent.avatar} />
                  <span className="conv-badge">
                    <ChannelLogo channel={parent.channel} className="" />
                  </span>
                </span>
                <span className="task-title">
                  {parent.title}
                  {isContextOnly && (
                    <span className="task-context-badge" title={`Parent en "${parent.status}"`}>
                      {parent.status}
                    </span>
                  )}
                  {children.length > 0 && (
                    <span className="task-subcount" aria-label={`${children.length} sous-tâches`}>
                      {children.filter((c) => !c.isDone).length}/{children.length}
                    </span>
                  )}
                </span>
                <span className={`priority ${parent.priority}`}>
                  {parent.priority[0]?.toUpperCase()}
                  {parent.priority.slice(1)}
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
                      onClick={() => void toggleCheck(child.id, childDone)}
                    />
                    <span className="task-title task-subtask-title">{child.title}</span>
                    <span className={`priority ${child.priority}`}>
                      {child.priority[0]?.toUpperCase()}
                      {child.priority.slice(1)}
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
