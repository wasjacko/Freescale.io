"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { NewTaskModal } from "@/components/NewTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { dailyBriefing } from "@/lib/actions/mue";
import { createTask } from "@/lib/actions/inbox";
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

  const visible = tasks.filter((t) => t.status === activeTab);

  const toggleCheck = (id: string, currentlyDone: boolean) => {
    void toggleTask(id, !currentlyDone);
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

      <ul className="task-list">
        {visible.length === 0 && (
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
        {visible.map((task) => {
          const isDone = !!task.isDone;
          return (
            <li key={task.id} className={`task-item ${isDone ? "is-done" : ""}`}>
              <button
                className={`task-check ${isDone ? "is-done" : ""}`}
                type="button"
                aria-label="Mark done"
                onClick={() => toggleCheck(task.id, isDone)}
              />
              <span className="task-avatar">
                <Avatar avatar={task.avatar} />
                <span className="conv-badge"><ChannelLogo channel={task.channel} className="" /></span>
              </span>
              <span className="task-title">{task.title}</span>
              <span className={`priority ${task.priority}`}>
                {task.priority[0]?.toUpperCase()}{task.priority.slice(1)}
              </span>
              <span className={`task-due ${task.isToday ? "is-today" : ""}`}>{task.dueLabel}</span>
              <button
                className="task-expand"
                type="button"
                aria-label="Modifier"
                onClick={() => setEditingTask(task)}
              >
                <Icon name="i-chevron-down" />
              </button>
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
