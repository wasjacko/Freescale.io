"use client";

import { QuickTaskCapture } from "@/components/QuickTaskCapture";
import { TodayBriefCard } from "@/components/TodayBriefCard";
import { Icon } from "@/components/icons/Icon";
import {
  type DailyBriefing,
  type DailyBriefingItem,
  createTaskFromBrief,
  dailyBriefing,
} from "@/lib/actions/mue";
import type { CurrentUser } from "@/lib/auth";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import { getTodayTaskSections } from "@/lib/today";
import type { Task } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type BriefState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; data: DailyBriefing }
  | { kind: "error" };

function dateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date());
}

function priorityLabel(priority: DailyBriefingItem["priority"]) {
  if (priority === "high") return "Prioritaire";
  if (priority === "low") return "À surveiller";
  return "À traiter";
}

function formatDue(due: string | null) {
  if (!due) return null;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return due;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}

function taskStatusLabel(task: Task) {
  if (task.priority === "high") return "Urgent";
  if (task.isToday) return "Aujourd'hui";
  return task.dueLabel;
}

export function TodayView({ user }: { user: CurrentUser | null }) {
  const router = useRouter();
  const push = useToast((state) => state.push);
  const { conversations, tasks, channels, activeWorkspaceId, toggleTask } = useData();
  const { setActiveConv, setView } = useApp();
  const [brief, setBrief] = useState<BriefState>({ kind: "idle" });
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [createdIds, setCreatedIds] = useState<Set<string>>(new Set());
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const cacheKey = useMemo(
    () => `fs:today-brief:${activeWorkspaceId ?? "personal"}:${dateKey()}`,
    [activeWorkspaceId]
  );

  const loadBrief = useCallback(
    async (fresh = false) => {
      if (!fresh) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setBrief({ kind: "result", data: JSON.parse(cached) as DailyBriefing });
            return;
          }
        } catch {}
      }

      setBrief({ kind: "loading" });
      try {
        const result = await dailyBriefing();
        if (!result.briefing || result.error) {
          setBrief({ kind: "error" });
          return;
        }
        setBrief({ kind: "result", data: result.briefing });
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result.briefing));
        } catch {}
      } catch {
        setBrief({ kind: "error" });
      }
    },
    [cacheKey]
  );

  const openConversation = (conversationId: string) => {
    setActiveConv(conversationId);
    setView("inbox");
  };

  const handleCreateTask = async (item: DailyBriefingItem) => {
    if (creatingId || createdIds.has(item.conversationId)) return;
    setCreatingId(item.conversationId);
    try {
      const result = await createTaskFromBrief({
        conversationId: item.conversationId,
        title: item.title,
        description: item.why,
        priority: item.priority,
        due: item.due,
      });
      if (!result.ok) {
        push({ kind: "error", text: result.error ?? "Création impossible." });
        return;
      }
      setCreatedIds((current) => new Set(current).add(item.conversationId));
      push({ kind: "info", text: "Tâche ajoutée à votre liste.", duration: 2400 });
      router.refresh();
    } catch {
      push({ kind: "error", text: "Création impossible." });
    } finally {
      setCreatingId(null);
    }
  };

  const completeTask = async (taskId: string) => {
    if (completingTaskId) return;
    setCompletingTaskId(taskId);
    const result = await toggleTask(taskId, true);
    setCompletingTaskId(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Mise à jour impossible." });
    }
  };

  const sections = getTodayTaskSections(tasks, { nowLimit: 4, laterLimit: 3 });
  const hasChannels = channels.length > 0;
  const items = brief.kind === "result" ? brief.data.items : [];
  const unreadCount = conversations.filter((conversation) => conversation.unread).length;
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const briefState =
    !hasChannels && brief.kind === "idle"
      ? "no-channel"
      : brief.kind === "loading"
        ? "loading"
        : brief.kind === "error"
          ? "error"
          : brief.kind === "result"
            ? "result"
            : "idle";

  return (
    <section className="today-view today-view-direction-c" aria-label="Aujourd'hui">
      <header className="today-hero">
        <div className="today-date">
          <Icon name="i-spark" />
          <span>{user?.firstName ? `Bonjour ${user.firstName}` : "Aujourd'hui"}</span>
          <span aria-hidden="true">·</span>
          <time>{dateLabel}</time>
        </div>
      </header>

      <TodayBriefCard
        state={briefState}
        data={brief.kind === "result" ? brief.data : null}
        hasChannels={hasChannels}
        onRequest={() => void loadBrief(true)}
        onConnectChannel={() => setView("inbox")}
      />

      <div className="today-grid">
        <div className="today-main-stack">
          <QuickTaskCapture />

          <main className="today-priorities" aria-live="polite">
            <div className="today-section-head">
              <h2>À faire maintenant</h2>
              <span>{sections.now.length}</span>
            </div>
            {sections.now.length === 0 ? (
              <div className="today-empty">
                <strong>Votre journée est dégagée.</strong>
                <p>Ajoutez une tâche ou collectez des actions depuis vos conversations avec Mue.</p>
                <button type="button" onClick={() => setView("tasks")}>
                  Ouvrir mes tâches
                </button>
              </div>
            ) : (
              <div className="today-task-list">
                {sections.now.map((task) => (
                  <article key={task.id} className={`today-task-row is-${task.priority}`}>
                    <button
                      type="button"
                      className={`task-check ${task.isDone ? "is-done" : ""}`}
                      aria-label="Marquer la tâche terminée"
                      onClick={() => void completeTask(task.id)}
                      disabled={completingTaskId === task.id}
                    />
                    <div>
                      <h3>{task.title}</h3>
                      <p>{taskStatusLabel(task)}</p>
                    </div>
                    {task.priority === "high" && (
                      <span className="today-task-priority">Urgent</span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </main>

          <section className="today-later" aria-label="À traiter ensuite">
            <div className="today-section-head">
              <h2>Ensuite</h2>
              <span>{sections.later.length}</span>
            </div>
            {sections.later.length > 0 ? (
              <div className="today-task-list is-compact">
                {sections.later.map((task) => (
                  <article key={task.id} className={`today-task-row is-${task.priority}`}>
                    <button
                      type="button"
                      className="task-check"
                      aria-label="Marquer la tâche terminée"
                      onClick={() => void completeTask(task.id)}
                      disabled={completingTaskId === task.id}
                    />
                    <div>
                      <h3>{task.title}</h3>
                      <p>{task.dueLabel}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="today-muted">Aucune autre tâche ouverte.</p>
            )}
          </section>

          {brief.kind === "result" && items.length > 0 && (
            <section className="today-mue-suggestions" aria-label="Suggestions Mue">
              <div className="today-section-head">
                <h2>Suggestions Mue</h2>
                <span>{items.length}</span>
              </div>
              {items.map((item) => {
                const due = formatDue(item.due);
                const created = createdIds.has(item.conversationId);
                return (
                  <article key={item.conversationId} className={`today-item is-${item.priority}`}>
                    <div className="today-item-main">
                      <div className="today-item-meta">
                        <span className="today-priority">{priorityLabel(item.priority)}</span>
                        <span>{item.contactName}</span>
                        {due && <time>Échéance {due}</time>}
                      </div>
                      <h3>{item.title}</h3>
                      {item.why && <p>{item.why}</p>}
                    </div>
                    <div className="today-item-actions">
                      <button
                        type="button"
                        className="today-open"
                        onClick={() => openConversation(item.conversationId)}
                      >
                        Ouvrir
                      </button>
                      <button
                        type="button"
                        className={`today-create ${created ? "is-done" : ""}`}
                        onClick={() => void handleCreateTask(item)}
                        disabled={creatingId === item.conversationId || created}
                      >
                        {created
                          ? "Tâche créée"
                          : creatingId === item.conversationId
                            ? "Création..."
                            : "Créer tâche"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>

        <aside className="today-summary" aria-label="Repères du jour">
          <h2>Repères du jour</h2>
          <dl>
            <div>
              <dt>Messages non lus</dt>
              <dd>{unreadCount}</dd>
            </div>
            <div>
              <dt>Tâches ouvertes</dt>
              <dd>{sections.openCount}</dd>
            </div>
            <div>
              <dt>Conversations</dt>
              <dd>{conversations.length}</dd>
            </div>
          </dl>
          <div className="today-links">
            <button type="button" onClick={() => setView("inbox")}>
              <Icon name="i-inbox" />
              Voir toute l'inbox
            </button>
            <button type="button" onClick={() => setView("tasks")}>
              <Icon name="i-task" />
              Ouvrir mes tâches
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
