"use client";

import { useState } from "react";
import { TASKS } from "@/lib/data/tasks";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";

const TAB_STATUSES = [
  { id: "todo", label: "To do" },
  { id: "in-progress", label: "In progress" },
  { id: "awaiting-reply", label: "Awaiting reply" },
  { id: "done", label: "Done" },
] as const;

export function TasksView() {
  const [activeTab, setActiveTab] = useState<string>("todo");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const counts = {
    todo: TASKS.filter((t) => t.status === "todo").length,
    "in-progress": 2,
    "awaiting-reply": 2,
    done: 12,
  };

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="tasks-view" aria-label="Tasks">
      <header className="tasks-head">
        <h1>Tasks</h1>
        <button className="btn-new-task" type="button">
          <Icon name="i-plus" />
          New task
        </button>
      </header>

      <div className="scan-banner">
        <span className="scan-icon"><Icon name="i-spark" /></span>
        <span className="scan-text">Scan and analyze new messages</span>
        <button className="btn-analyze" type="button">
          <Icon name="i-spark" className="scan-spark icon" />
          Analyze now
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
        {TASKS.map((task) => {
          const isDone = checkedIds.has(task.id);
          return (
            <li key={task.id} className={`task-item ${isDone ? "is-done" : ""}`}>
              <button
                className={`task-check ${isDone ? "is-done" : ""}`}
                type="button"
                aria-label="Mark done"
                onClick={() => toggleCheck(task.id)}
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
              <button className="task-expand" type="button" aria-label="Expand">
                <Icon name="i-chevron-down" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
