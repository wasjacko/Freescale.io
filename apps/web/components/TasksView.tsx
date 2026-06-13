"use client";

import { EditTaskModal } from "@/components/EditTaskModal";
import { NewTaskModal } from "@/components/NewTaskModal";
import { ChannelLogo, Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import type { Task } from "@/lib/types";
import { isAwaitingMyReply, isFollowupDue, sortByUrgency } from "@/lib/urgency";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const CHANNEL_LABEL: Record<string, string> = {
  gmail: "Email",
  outlook: "Outlook",
  slack: "Slack",
  teams: "Teams",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

function clientInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function sinceLabel(iso?: string | null): string {
  if (!iso) return "récemment";
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return "à l'instant";
  if (h < 24) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} j`;
}

const GROUPS = [
  { id: "todo", label: "À faire", color: "#0086c0", statusLabel: "À faire" },
  { id: "in-progress", label: "Working on it", color: "#fd9a00", statusLabel: "Working on it" },
  { id: "awaiting-reply", label: "À valider", color: "#c2a400", statusLabel: "À valider" },
  { id: "done", label: "Done", color: "#00c875", statusLabel: "Done" },
];

export function TasksView() {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const { tasks, toggleTask, conversations, addTask, setTaskStatus } = useData();
  const { setSuggestTasksOpen, setActiveConv, setView, setMueOpen } = useApp();
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Collapsible state for each status group
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    todo: false,
    "in-progress": false,
    "awaiting-reply": false,
    done: true, // start done collapsed
  });

  // Inline quick-add per group
  const [quickAddGroup, setQuickAddGroup] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  // Active status dropdown taskId
  const [activeStatusMenuTaskId, setActiveStatusMenuTaskId] = useState<string | null>(null);

  const quickInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (quickAddGroup && quickInputRef.current) {
      quickInputRef.current.focus();
    }
  }, [quickAddGroup]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleQuickAddSubmit = (e: React.FormEvent, groupId: string) => {
    e.preventDefault();
    const title = quickAddTitle.trim();
    if (!title) {
      setQuickAddGroup(null);
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      priority: "medium",
      dueLabel: "Cette semaine",
      status: groupId as Task["status"],
      avatar: { kind: "initials", text: "+", bg: "#EAE6FF" },
      channel: "gmail",
      sortableIndex: Date.now(),
      fromAI: false,
      conversationId: null,
      isDone: groupId === "done",
    };

    addTask(newTask);
    push({ kind: "success", text: `Tâche ajoutée : ${title}` });
    setQuickAddTitle("");
    setQuickAddGroup(null);
  };

  // Group tasks by status
  const tasksByGroup = useMemo(() => {
    const map: Record<string, Task[]> = {
      todo: [],
      "in-progress": [],
      "awaiting-reply": [],
      done: [],
    };
    for (const t of tasks) {
      // Only top-level tasks inside groups
      if (!t.parentTaskId) {
        map[t.status]?.push(t);
      }
    }
    // Sort tasks in each group by sortableIndex
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (b.sortableIndex ?? 0) - (a.sortableIndex ?? 0));
    }
    return map;
  }, [tasks]);

  const clientForTask = (t: Task): (typeof conversations)[number] | undefined => {
    if (t.conversationId) {
      return conversations.find((c) => c.id === t.conversationId);
    }
    const av = t.avatar;
    return av.kind === "initials"
      ? conversations.find((c) => c.category === "client" && clientInitials(c.name) === av.text)
      : undefined;
  };

  const openThread = (t: Task) => {
    if (!t.conversationId) return;
    setActiveConv(t.conversationId);
    setView("inbox");
  };

  const engagements = useMemo(() => {
    const clients = sortByUrgency(conversations.filter((c) => c.category === "client"));
    return clients
      .map((conv) => {
        const initials = clientInitials(conv.name);
        const openTasks = tasks.filter(
          (t) =>
            !t.parentTaskId &&
            t.status !== "done" &&
            !t.isDone &&
            t.avatar.kind === "initials" &&
            t.avatar.text === initials
        );
        const awaiting = isAwaitingMyReply(conv);
        const relance = !awaiting && isFollowupDue(conv);
        return { conv, openTasks, awaiting, relance };
      })
      .filter((e) => e.awaiting || e.relance || e.openTasks.length > 0);
  }, [conversations, tasks]);

  return (
    <section className="tasks-view" aria-label="Tasks">
      <header className="tasks-head">
        <h1>Engagements clients</h1>
        <button className="btn-new-task" type="button" onClick={() => setNewTaskOpen(true)}>
          <Icon name="i-plus" />
          Nouvelle tâche
        </button>
      </header>

      {engagements.length > 0 && (
        <section className="engagements" aria-label="Engagements clients">
          {engagements.map(({ conv, openTasks, awaiting, relance }) => (
            <article
              key={conv.id}
              className={`engagement-card ${
                awaiting ? "eng-awaiting" : relance ? "eng-relance" : "eng-ok"
              }`}
            >
              <div className="eng-top">
                <Avatar avatar={conv.avatar} />
                <div className="eng-id">
                  <strong>{conv.name}</strong>
                  <span className="eng-chan">
                    <ChannelLogo channel={conv.channel} className="" />
                    {CHANNEL_LABEL[conv.channel] ?? conv.channel}
                  </span>
                </div>
                <span className="eng-state">
                  {awaiting
                    ? `Tu lui dois une réponse · ${sinceLabel(conv.lastInboundAt ?? conv.lastAtIso)}`
                    : relance
                      ? `Tu attends son retour · ${sinceLabel(conv.lastOutboundAt ?? conv.lastAtIso)}`
                      : "À jour"}
                </span>
              </div>

              {openTasks.length > 0 ? (
                <ul className="eng-tasks">
                  {openTasks.map((t) => (
                    <li key={t.id} className="eng-task">
                      <button
                        type="button"
                        className="eng-check"
                        onClick={() => toggleTask(t.id, true)}
                        aria-label={`Marquer « ${t.title} » comme fait`}
                      />
                      <span className="eng-task-title">{t.title}</span>
                      <span className={`eng-prio prio-${t.priority}`} aria-hidden />
                      <span className="eng-due">{t.dueLabel}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="eng-empty">Aucune tâche ouverte — juste le message à traiter.</p>
              )}

              {(awaiting || relance) && (
                <div className="eng-foot">
                  <button
                    type="button"
                    className="eng-cta"
                    onClick={() => {
                      setActiveConv(conv.id);
                      setView("inbox");
                    }}
                  >
                    {awaiting ? "Répondre" : "Relancer"} →
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      <div className="scan-banner">
        <span className="scan-icon">
          <Icon name="i-spark" />
        </span>
        <span className="scan-text">Laissez Mue repérer les actions dans vos conversations</span>
        <button
          className="btn-analyze"
          type="button"
          onClick={() => {
            setMueOpen(true);
            setSuggestTasksOpen(true);
          }}
        >
          <Icon name="i-spark" className="scan-spark icon" />
          Suggérer des tâches avec Mue
        </button>
      </div>

      <h2 className="tasks-subhead">Toutes les tâches</h2>

      <div className="monday-board">
        {GROUPS.map((group) => {
          const rows = tasksByGroup[group.id] || [];
          const isCollapsed = collapsedGroups[group.id];
          const hasRows = rows.length > 0;

          return (
            <div key={group.id} className="monday-group">
              <header
                className="monday-group-header"
                role="button"
                tabIndex={0}
                onClick={() => toggleGroupCollapse(group.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleGroupCollapse(group.id);
                  }
                }}
              >
                <span className="monday-group-toggle" style={{ color: group.color }}>
                  {isCollapsed ? "▶" : "▼"}
                </span>
                <h3 className="monday-group-title" style={{ color: group.color }}>
                  {group.label}
                </h3>
                <span className="monday-group-count">
                  {rows.length} item{rows.length !== 1 ? "s" : ""}
                </span>
              </header>

              {!isCollapsed && (
                <div className="monday-table-wrapper">
                  <div className="monday-table">
                    <div className="monday-th-row">
                      <div className="monday-cell monday-col-drag" />
                      <div className="monday-cell monday-col-check" />
                      <div className="monday-cell monday-col-title">Task name</div>
                      <div className="monday-cell monday-col-chat" />
                      <div className="monday-cell monday-col-group">Group</div>
                      <div className="monday-cell monday-col-people">People</div>
                      <div className="monday-cell monday-col-date">Date</div>
                      <div className="monday-cell monday-col-status">Status</div>
                    </div>

                    {rows.map((parent) => {
                      const client = clientForTask(parent);
                      const showChannel = !!client || !!parent.conversationId;
                      const parentDone = !!parent.isDone;
                      const subtasks = tasks.filter((sub) => sub.parentTaskId === parent.id);

                      return (
                        <div key={parent.id} className="monday-row-container">
                          <div
                            className="monday-row"
                            style={{ borderLeft: `6px solid ${group.color}` }}
                          >
                            <div className="monday-cell monday-col-drag">
                              <span className="monday-drag-handle">
                                <svg viewBox="0 0 8 14" width="8" height="14" fill="currentColor">
                                  <circle cx="2" cy="2" r="1.2" />
                                  <circle cx="6" cy="2" r="1.2" />
                                  <circle cx="2" cy="7" r="1.2" />
                                  <circle cx="6" cy="7" r="1.2" />
                                  <circle cx="2" cy="12" r="1.2" />
                                  <circle cx="6" cy="12" r="1.2" />
                                </svg>
                              </span>
                            </div>
                            <div className="monday-cell monday-col-check">
                              <button
                                type="button"
                                className={`task-check ${parentDone ? "is-done" : ""}`}
                                onClick={() => toggleTask(parent.id, parentDone)}
                              />
                            </div>
                            <div
                              className="monday-cell monday-col-title"
                              onDoubleClick={() => setEditingTask(parent)}
                            >
                              <span className="monday-title-text">{parent.title}</span>
                              {subtasks.length > 0 && (
                                <span className="monday-subcount">
                                  {subtasks.filter((s) => s.isDone).length}/{subtasks.length}
                                </span>
                              )}
                            </div>
                            <div className="monday-cell monday-col-chat">
                              {parent.conversationId && (
                                <button
                                  type="button"
                                  className="monday-chat-btn"
                                  onClick={() => openThread(parent)}
                                  title="Ouvrir le fil"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="icon"
                                  >
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  {client?.unread && <span className="chat-unread-dot" />}
                                </button>
                              )}
                            </div>
                            <div className="monday-cell monday-col-group">
                              <span
                                className="monday-group-bullet"
                                style={{ backgroundColor: group.color }}
                              />
                              <span className="monday-group-text">{group.label}</span>
                            </div>
                            <div className="monday-cell monday-col-people">
                              <div className="monday-people-wrap">
                                {client ? (
                                  <Avatar avatar={client.avatar} className="monday-av-sm" />
                                ) : (
                                  <Avatar avatar={parent.avatar} className="monday-av-sm" />
                                )}
                              </div>
                            </div>
                            <div className="monday-cell monday-col-date">{parent.dueLabel}</div>
                            <div className="monday-cell monday-col-status">
                              <button
                                type="button"
                                className="monday-status-pill"
                                style={{ backgroundColor: group.color }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStatusMenuTaskId(
                                    activeStatusMenuTaskId === parent.id ? null : parent.id
                                  );
                                }}
                              >
                                {group.statusLabel}
                              </button>

                              {activeStatusMenuTaskId === parent.id && (
                                <div className="monday-status-dropdown">
                                  {GROUPS.map((g) => (
                                    <button
                                      key={g.id}
                                      type="button"
                                      className="monday-status-option"
                                      style={{ backgroundColor: g.color }}
                                      onClick={() => {
                                        setTaskStatus(parent.id, g.id as Task["status"]);
                                        setActiveStatusMenuTaskId(null);
                                      }}
                                    >
                                      {g.statusLabel}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div
                      className="monday-add-row"
                      style={{ borderLeft: `6px solid ${group.color}` }}
                    >
                      {quickAddGroup === group.id ? (
                        <form
                          onSubmit={(e) => handleQuickAddSubmit(e, group.id)}
                          className="monday-quick-add-form"
                        >
                          <input
                            type="text"
                            className="monday-quick-input"
                            placeholder="Entrer le titre de la tâche..."
                            value={quickAddTitle}
                            onChange={(e) => setQuickAddTitle(e.target.value)}
                            onBlur={() => {
                              setTimeout(() => {
                                if (!quickAddTitle.trim()) setQuickAddGroup(null);
                              }, 150);
                            }}
                            ref={quickInputRef}
                          />
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="monday-add-btn"
                          onClick={() => {
                            setQuickAddGroup(group.id);
                            setQuickAddTitle("");
                          }}
                        >
                          + Add task
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
