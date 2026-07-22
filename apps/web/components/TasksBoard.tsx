"use client";

// Freescale V2 — Vue Tâches façon tableau (inspiré Monday, pas une copie).
// Groupes colorés par statut + colonnes + cellules colorées (priorité / statut).
// Données mock via useData (mutations locales). Wording/style Freescale.

import { Avatar } from "@/components/ui/Avatar";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { Task } from "@/lib/types";
import { type CSSProperties, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type GroupKey = "to-scope" | "todo" | "in-progress" | "awaiting-reply" | "done";
type PriorityKey = Task["priority"];
const GROUPS: { key: GroupKey; label: string; accent: string; match: Task["status"][] }[] = [
  { key: "to-scope", label: "À cadrer", accent: "#8b5cf6", match: ["to-scope"] },
  { key: "todo", label: "À faire", accent: "#4f6cf7", match: ["todo"] },
  { key: "in-progress", label: "En cours", accent: "#d97706", match: ["in-progress"] },
  {
    key: "awaiting-reply",
    label: "En attente client",
    accent: "#0891b2",
    match: ["awaiting-reply"],
  },
  { key: "done", label: "Terminé", accent: "#16a34a", match: ["done"] },
];
const PRIORITY_GROUPS: { key: PriorityKey; label: string; hint: string }[] = [
  { key: "high", label: "Haute", hint: "Ce qui ne peut pas attendre" },
  { key: "medium", label: "Moyenne", hint: "À garder dans le rythme" },
  { key: "low", label: "Basse", hint: "Pas de précipitation" },
];

function dueMeta(iso: string | null | undefined, fallback: string) {
  if (!iso) return { label: fallback, tone: "normal" as const };
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return { label: fallback, tone: "normal" as const };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `En retard · ${-diff} j`, tone: "overdue" as const };
  if (diff === 0) return { label: "Aujourd'hui", tone: "today" as const };
  if (diff === 1) return { label: "Demain", tone: "normal" as const };
  return {
    label: due.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    tone: "normal" as const,
  };
}

export function TasksBoard() {
  const { tasks, conversations, setTaskStatus, addTask, patchTask, removeTask } = useData();
  const { setView, setActiveConv, mueHighlighted } = useApp();
  const [collapsed, setCollapsed] = useState<Set<GroupKey>>(() => new Set());
  // Bascule Tableau ↔ Kanban.
  const [boardView, setBoardView] = useState<"table" | "kanban" | "calendar">("table");
  // Tâches dépliées : affichent le message lié juste en dessous.
  const [expanded] = useState<Set<string>>(() => new Set());

  // Ajout d'une tâche : une LIGNE inline apparaît en bas du groupe ciblé
  // (plus de composer flottant en haut). `addingIn` = clé du groupe en cours
  // d'ajout, ou null. La ligne apparaît avec la lueur de transfert.
  const [addingIn, setAddingIn] = useState<GroupKey | null>(null);
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityKey>("medium");
  const [mobileCollapsed, setMobileCollapsed] = useState<Set<PriorityKey>>(() => new Set());
  const [newTitle, setNewTitle] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (addingIn) requestAnimationFrame(() => newInputRef.current?.focus());
  }, [addingIn]);

  const closeComposer = () => {
    setAddingIn(null);
    setNewTitle("");
  };
  const openComposer = (status: GroupKey, priority: PriorityKey = "medium") => {
    setAddingIn(status);
    setNewTaskPriority(priority);
    setNewTitle("");
  };
  const createTask = () => {
    const title = newTitle.trim();
    if (!title || !addingIn) return;
    addTask({
      id: `new-${Date.now()}`,
      title,
      priority: newTaskPriority,
      dueLabel: "",
      status: addingIn,
      avatar: { kind: "initials", text: "" },
      channel: "gmail",
      sortableIndex: Date.now(),
      conversationId: null,
      fromAI: false,
      createdAtIso: new Date().toISOString(),
    });
    setNewTitle("");
    // On garde la ligne d'ajout ouverte pour enchaîner — on refocus le champ.
    requestAnimationFrame(() => newInputRef.current?.focus());
  };

  // Lueur de « transfert » : quand une tâche apparaît (ajoutée depuis le
  // panneau Mue), sa ligne s'illumine brièvement puis s'estompe.
  const [justAdded, setJustAdded] = useState<Set<string>>(() => new Set());
  const knownIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(tasks.map((t) => t.id));
    if (knownIds.current.size > 0) {
      const fresh = [...current].filter((id) => !knownIds.current.has(id));
      if (fresh.length > 0) {
        setJustAdded((prev) => {
          const n = new Set(prev);
          for (const id of fresh) n.add(id);
          return n;
        });
        window.setTimeout(() => {
          setJustAdded((prev) => {
            const n = new Set(prev);
            for (const id of fresh) n.delete(id);
            return n;
          });
        }, 2600);
      }
    }
    knownIds.current = current;
  }, [tasks]);

  const topTasks = tasks.filter((t) => !t.parentTaskId);
  // Tri + filtre (barre d'outils).
  const [sortKey, setSortKey] = useState<"default" | "due" | "created" | "title">("default");
  const [filterSource, setFilterSource] = useState<"all" | "ai" | "manual">("all");
  const [sortMenu, setSortMenu] = useState(false);
  const [filterMenu, setFilterMenu] = useState(false);
  const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);
  const displayed = topTasks
    .filter((t) => (filterSource === "all" ? true : filterSource === "ai" ? !!t.fromAI : !t.fromAI))
    .slice()
    .sort((a, b) => {
      if (sortKey === "due") return ms(a.dueAtIso) - ms(b.dueAtIso);
      if (sortKey === "created") return ms(b.createdAtIso) - ms(a.createdAtIso);
      if (sortKey === "title") return a.title.localeCompare(b.title);
      // Défaut = liste priorisée : priorité (haute→basse) puis échéance la + proche.
      const rank = { high: 0, medium: 1, low: 2 } as const;
      const pr = rank[a.priority] - rank[b.priority];
      if (pr !== 0) return pr;
      return (
        (ms(a.dueAtIso) || Number.POSITIVE_INFINITY) - (ms(b.dueAtIso) || Number.POSITIVE_INFINITY)
      );
    });
  const clientConvsOf = (t: Task) =>
    (t.clientConvIds?.length ? t.clientConvIds : t.conversationId ? [t.conversationId] : [])
      .map((id) => conversations.find((c) => c.id === id))
      .filter(Boolean) as typeof conversations;
  const clientNameOf = (t: Task) =>
    t.conversationId ? (conversations.find((c) => c.id === t.conversationId)?.name ?? "—") : "—";
  const subProgressOf = (t: Task) => {
    const subs = tasks.filter((x) => x.parentTaskId === t.id);
    if (subs.length === 0) return null;
    return `${subs.filter((s) => s.status === "done").length}/${subs.length}`;
  };

  const toggleCollapse = (k: GroupKey) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const toggleMobilePriority = (priority: PriorityKey) =>
    setMobileCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) next.delete(priority);
      else next.add(priority);
      return next;
    });

  const openTask = (t: Task) => {
    if (!t.conversationId) return;
    setView("inbox");
    setActiveConv(t.conversationId);
  };

  // Édition inline d'une date (échéance / création) : clic sur la cellule.
  const [editCell, setEditCell] = useState<{ id: string; field: "due" | "created" } | null>(null);
  // Menu d'édition de la priorité (clic sur la cellule Priorité).
  // On garde la position du bouton pour rendre le popover via portal
  // (sinon l'overflow:hidden des rangées coupe le menu).
  const [prioMenu, setPrioMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const openPrioMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (prioMenu?.id === id) {
      setPrioMenu(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    setPrioMenu({ id, x: r.left + r.width / 2, y: r.bottom + 4 });
  };
  // Télécommande : popover qui s'ouvre au clic sur la case d'une tâche.
  // Permet d'agir sur la tâche (changer le statut, ouvrir le fil, dupliquer,
  // supprimer) — la case N'est PAS une simple validation.
  const [actMenu, setActMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  // Menu d'édition du statut (clic sur la pill Statut).
  const [statusMenu, setStatusMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const openStatusMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (statusMenu?.id === id) {
      setStatusMenu(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    setStatusMenu({ id, x: r.left + r.width / 2, y: r.bottom + 4 });
  };
  // Menu d'édition des clients liés (multi-sélection, popover via portal).
  const [clientMenu, setClientMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const openClientMenu = (id: string, e: React.MouseEvent<HTMLElement>) => {
    if (clientMenu?.id === id) {
      setClientMenu(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    setClientMenu({ id, x: r.left + r.width / 2, y: r.bottom + 4 });
  };
  // Toggle l'appartenance d'un client (conversationId) à la tâche.
  const toggleTaskClient = (t: Task, convId: string) => {
    const current = t.clientConvIds?.length
      ? t.clientConvIds
      : t.conversationId
        ? [t.conversationId]
        : [];
    const next = current.includes(convId)
      ? current.filter((id) => id !== convId)
      : [...current, convId];
    patchTask(t.id, { clientConvIds: next.length ? next : null });
  };
  const toDateInput = (iso: string | null | undefined) =>
    iso && !Number.isNaN(new Date(iso).getTime()) ? new Date(iso).toISOString().slice(0, 10) : "";
  const commitDate = (id: string, field: "due" | "created", value: string) => {
    const iso = value ? new Date(`${value}T12:00:00`).toISOString() : null;
    patchTask(id, field === "due" ? { dueAtIso: iso } : { createdAtIso: iso });
    setEditCell(null);
  };

  // Glisser-déposer : déplacer une tâche vers un autre statut.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<GroupKey | null>(null);
  const onDrop = (status: Task["status"]) => {
    if (dragId) setTaskStatus(dragId, status);
    setDragId(null);
    setDragOver(null);
  };

  return (
    <section className="today-view tboard" aria-label="Tâches">
      <div className="tboard-toolbar">
        <div className="tboard-viewswitch" role="tablist" aria-label="Affichage">
          <button
            type="button"
            role="tab"
            aria-selected={boardView === "table"}
            className={`tboard-vbtn ${boardView === "table" ? "is-on" : ""}`}
            onClick={() => setBoardView("table")}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Tableau
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={boardView === "kanban"}
            className={`tboard-vbtn ${boardView === "kanban" ? "is-on" : ""}`}
            onClick={() => setBoardView("kanban")}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="4" width="5" height="16" rx="1" />
              <rect x="10" y="4" width="5" height="10" rx="1" />
              <rect x="17" y="4" width="4" height="13" rx="1" />
            </svg>
            Kanban
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={boardView === "calendar"}
            className={`tboard-vbtn ${boardView === "calendar" ? "is-on" : ""}`}
            onClick={() => setBoardView("calendar")}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Calendrier
          </button>
        </div>
        <div className="tboard-tools">
          <div className="tboard-toolwrap">
            <button
              type="button"
              className={`tboard-tool tboard-tool--ghost tboard-tool--icon ${filterSource !== "all" ? "is-active" : ""}`}
              aria-label="Filtrer"
              aria-expanded={filterMenu}
              onClick={() => {
                setSortMenu(false);
                setFilterMenu((v) => !v);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {filterSource !== "all" && <span className="tboard-tool-dot" aria-hidden />}
            </button>
            {filterMenu && (
              <>
                <button
                  type="button"
                  className="tboard-menu-scrim"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setFilterMenu(false)}
                />
                <div className="tboard-menu" role="menu">
                  <div className="tboard-menu-label">Source</div>
                  {(
                    [
                      ["all", "Toutes"],
                      ["ai", "IA"],
                      ["manual", "Manuel"],
                    ] as const
                  ).map(([k, lbl]) => (
                    <button
                      key={k}
                      type="button"
                      className={`tboard-menu-item ${filterSource === k ? "is-active" : ""}`}
                      onClick={() => {
                        setFilterSource(k);
                        setFilterMenu(false);
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="tboard-toolwrap">
            <button
              type="button"
              className={`tboard-tool tboard-tool--ghost tboard-tool--icon ${sortKey !== "default" ? "is-active" : ""}`}
              aria-label="Trier"
              aria-expanded={sortMenu}
              onClick={() => {
                setFilterMenu(false);
                setSortMenu((v) => !v);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" />
              </svg>
              {sortKey !== "default" && <span className="tboard-tool-dot" aria-hidden />}
            </button>
            {sortMenu && (
              <>
                <button
                  type="button"
                  className="tboard-menu-scrim"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setSortMenu(false)}
                />
                <div className="tboard-menu" role="menu">
                  <div className="tboard-menu-label">Trier par</div>
                  {(
                    [
                      ["default", "Priorité"],
                      ["due", "Échéance"],
                      ["title", "Titre (A-Z)"],
                    ] as const
                  ).map(([k, lbl]) => (
                    <button
                      key={k}
                      type="button"
                      className={`tboard-menu-item ${sortKey === k ? "is-active" : ""}`}
                      onClick={() => {
                        setSortKey(k);
                        setSortMenu(false);
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="tboard-tool tboard-tool--new"
            onClick={() => (addingIn ? closeComposer() : openComposer("todo"))}
            aria-expanded={addingIn != null}
          >
            + <span className="tboard-new-text">Nouvelle tâche</span>
          </button>
        </div>
      </div>

      <div className="tboard-mobile" aria-label="Tâches classées par priorité">
        <header className="tboard-mobile-intro">
          <span className="tboard-mobile-kicker">Aujourd'hui</span>
          <h1>Mes tâches</h1>
          <p>Avancez sur l'essentiel, une priorité à la fois.</p>
        </header>

        <div className="tboard-mobile-priorities">
          {PRIORITY_GROUPS.map((priorityGroup) => {
            const rows = displayed.filter(
              (task) => task.priority === priorityGroup.key && task.status !== "done"
            );
            const isCollapsed = mobileCollapsed.has(priorityGroup.key);
            const isAdding = addingIn === "todo" && newTaskPriority === priorityGroup.key;

            return (
              <section
                key={priorityGroup.key}
                className={`tboard-mobile-priority tboard-mobile-priority--${priorityGroup.key}`}
              >
                <div className="tboard-mobile-priority-head">
                  <button
                    type="button"
                    className="tboard-mobile-priority-pill"
                    onClick={() => toggleMobilePriority(priorityGroup.key)}
                    aria-expanded={!isCollapsed}
                  >
                    <span className="tboard-mobile-priority-mark" aria-hidden />
                    <span>{priorityGroup.label}</span>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  </button>
                  <span className="tboard-mobile-priority-count">{rows.length}</span>
                  <button
                    type="button"
                    className="tboard-mobile-plus"
                    onClick={() => openComposer("todo", priorityGroup.key)}
                    aria-label={`Ajouter une tâche de priorité ${priorityGroup.label.toLowerCase()}`}
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>

                <div className={`tboard-mobile-priority-body ${isCollapsed ? "" : "is-open"}`}>
                  <div className="tboard-mobile-priority-inner">
                    <div className="tboard-mobile-task-list">
                      {rows.map((task) => {
                        const due = dueMeta(task.dueAtIso, task.dueLabel);
                        const client = clientConvsOf(task)[0];
                        return (
                          <article className="tboard-mobile-task" key={task.id}>
                            <button
                              type="button"
                              className="tboard-mobile-check"
                              onClick={() => setTaskStatus(task.id, "done")}
                              aria-label={`Marquer « ${task.title} » comme terminée`}
                            >
                              <span />
                            </button>
                            <button
                              type="button"
                              className="tboard-mobile-task-content"
                              onClick={() => openTask(task)}
                            >
                              <strong>{task.title}</strong>
                              <span className="tboard-mobile-task-meta">
                                {client?.name && <span>{client.name}</span>}
                                {(task.dueAtIso || task.dueLabel) && (
                                  <span className={`is-${due.tone}`}>{due.label}</span>
                                )}
                              </span>
                            </button>
                            <button
                              type="button"
                              className={`tboard-mobile-status tboard-mobile-status--${task.status}`}
                              onClick={(event) => openStatusMenu(task.id, event)}
                              aria-label={`Changer le statut de « ${task.title} »`}
                            >
                              <span />
                            </button>
                          </article>
                        );
                      })}

                      {isAdding ? (
                        <div className="tboard-mobile-add is-editing">
                          <input
                            ref={newInputRef}
                            type="text"
                            placeholder="Nom de la nouvelle tâche…"
                            value={newTitle}
                            onChange={(event) => setNewTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") createTask();
                              if (event.key === "Escape") closeComposer();
                            }}
                            onBlur={() => {
                              if (!newTitle.trim()) closeComposer();
                            }}
                            aria-label="Nom de la nouvelle tâche"
                          />
                          <button type="button" onClick={createTask} aria-label="Ajouter">
                            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                              <path d="m6 12 4 4 8-9" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="tboard-mobile-add"
                          onClick={() => openComposer("todo", priorityGroup.key)}
                        >
                          <span>
                            {rows.length === 0 ? priorityGroup.hint : "Ajouter à cette priorité"}
                          </span>
                          <span className="tboard-mobile-add-icon" aria-hidden>
                            <svg viewBox="0 0 24 24" width="22" height="22">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {boardView === "table" && (
        <>
          {GROUPS.map((g) => {
            const rows = displayed.filter((t) => g.match.includes(t.status));
            if (g.key === "done" && rows.length === 0) return null;
            const isCol = collapsed.has(g.key);
            return (
              <section
                key={g.key}
                className={`tboard-group ${dragOver === g.key ? "is-dragover" : ""}`}
                style={{ "--g": g.accent } as CSSProperties}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOver !== g.key) setDragOver(g.key);
                }}
                onDrop={() => onDrop(g.key)}
              >
                <div className="tboard-group-header-row">
                  <button
                    type="button"
                    className="tboard-group-pill"
                    onClick={() => toggleCollapse(g.key)}
                    aria-expanded={!isCol}
                    style={{ background: `color-mix(in srgb, var(--g) 25%, #fff)` }}
                  >
                    {g.key === "to-scope" && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                      >
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    )}
                    {g.key === "todo" && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    )}
                    {g.key === "in-progress" && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12 A 9 9 0 0 0 21 12 Z" fill="currentColor" />
                      </svg>
                    )}
                    {g.key === "awaiting-reply" && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                      </svg>
                    )}
                    {g.key === "done" && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
                        <path d="M8 12l3 3 5-5" stroke="#fff" />
                      </svg>
                    )}
                    <span className="tboard-group-name">{g.label}</span>
                  </button>
                  <span className="tboard-group-count">{rows.length}</span>
                  <button
                    type="button"
                    className="tboard-group-add"
                    onClick={() => openComposer(g.key)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>

                <div className={`tboard-group-wrap ${isCol ? "" : "is-open"}`}>
                  <div className="tboard-group-inner">
                    <div className="tboard-table">
                      {rows.length === 0 && addingIn !== g.key ? (
                        <div className="tboard-empty">Rien ici pour l'instant.</div>
                      ) : (
                        rows.map((t) => {
                          const due = dueMeta(t.dueAtIso, t.dueLabel);
                          const sub = subProgressOf(t);
                          // Clients de la tâche (un ou plusieurs → avatars empilés).
                          const clientConvs = (
                            t.clientConvIds?.length
                              ? t.clientConvIds
                              : t.conversationId
                                ? [t.conversationId]
                                : []
                          )
                            .map((id) => conversations.find((c) => c.id === id))
                            .filter(Boolean) as typeof conversations;
                          const isOpen = expanded.has(t.id);
                          return (
                            <Fragment key={t.id}>
                              <div
                                draggable
                                onDragStart={() => setDragId(t.id)}
                                onDragEnd={() => {
                                  setDragId(null);
                                  setDragOver(null);
                                }}
                                className={`tboard-row ${justAdded.has(t.id) ? "is-new" : ""} ${
                                  isOpen ? "is-open" : ""
                                } ${dragId === t.id ? "is-dragging" : ""}`}
                              >
                                <div className="tboard-row-main">
                                  <div className="tboard-cell tboard-task">
                                    <button
                                      type="button"
                                      className="tboard-task-btn"
                                      onClick={() => openTask(t)}
                                    >
                                      <span className="tboard-task-title">{t.title}</span>
                                      {sub && <span className="tboard-sub">{sub}</span>}
                                    </button>
                                    {t.status === "awaiting-reply" && t.conversationId && (
                                      <button
                                        type="button"
                                        className="tboard-relance"
                                        onClick={() => openTask(t)}
                                      >
                                        Relancer
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="tboard-row-meta">
                                  <button
                                    type="button"
                                    className="tboard-cell tboard-client tboard-client-btn"
                                    title={
                                      clientConvs.map((c) => c.name).join(", ") ||
                                      "Aucun client — clique pour en ajouter"
                                    }
                                    aria-haspopup="menu"
                                    aria-expanded={clientMenu?.id === t.id}
                                    onClick={(e) => openClientMenu(t.id, e)}
                                  >
                                    {clientConvs.length > 0 ? (
                                      <span className="tboard-client-stack">
                                        {clientConvs.slice(0, 3).map((c) => (
                                          <Avatar
                                            key={c.id}
                                            avatar={{ ...c.avatar, alt: c.name }}
                                            size={28}
                                          />
                                        ))}
                                        {clientConvs.length > 3 && (
                                          <span className="tboard-client-more">
                                            +{clientConvs.length - 3}
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="tboard-client-none" aria-label="Sans client">
                                        —
                                      </span>
                                    )}
                                  </button>

                                  <span className="tboard-cell tboard-status">
                                    <button
                                      type="button"
                                      className={`tstatus tstatus--${t.status}`}
                                      aria-haspopup="menu"
                                      aria-expanded={statusMenu?.id === t.id}
                                      onClick={(e) => openStatusMenu(t.id, e)}
                                    >
                                      <span className="tstatus-dot" />
                                      {t.status === "to-scope"
                                        ? "À cadrer"
                                        : t.status === "todo"
                                          ? "À faire"
                                          : t.status === "in-progress"
                                            ? "En cours"
                                            : t.status === "awaiting-reply"
                                              ? "En attente"
                                              : "Terminé"}
                                    </button>
                                  </span>

                                  <span
                                    className={`tboard-cell tboard-due tboard-due--${due.tone}`}
                                  >
                                    {editCell?.id === t.id && editCell.field === "due" ? (
                                      <input
                                        type="date"
                                        className="tboard-dateedit"
                                        // biome-ignore lint/a11y/noAutofocus: édition inline ouverte à la demande
                                        autoFocus
                                        defaultValue={toDateInput(t.dueAtIso)}
                                        onBlur={(e) => commitDate(t.id, "due", e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            commitDate(t.id, "due", e.currentTarget.value);
                                          if (e.key === "Escape") setEditCell(null);
                                        }}
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        className="tboard-cellbtn"
                                        onClick={() => setEditCell({ id: t.id, field: "due" })}
                                      >
                                        {t.dueAtIso || t.dueLabel ? (
                                          due.label
                                        ) : (
                                          <span className="tboard-cell-add">+ Définir</span>
                                        )}
                                      </button>
                                    )}
                                  </span>

                                  <span className="tboard-cell tboard-prio">
                                    <button
                                      type="button"
                                      className={`tprio tprio--${t.priority} tprio-btn`}
                                      onClick={(e) => openPrioMenu(t.id, e)}
                                      aria-haspopup="menu"
                                      aria-expanded={prioMenu?.id === t.id}
                                    >
                                      <span className="tprio-dot" />
                                      {t.priority === "high"
                                        ? "Haute"
                                        : t.priority === "low"
                                          ? "Basse"
                                          : "Moyenne"}
                                    </button>
                                  </span>

                                  <span className="tboard-cell tboard-source">
                                    {t.fromAI ? (
                                      <span className="tsource tsource--ai">
                                        <svg
                                          viewBox="0 0 24 24"
                                          width={12}
                                          height={12}
                                          fill="currentColor"
                                          stroke="none"
                                          aria-hidden
                                        >
                                          <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
                                        </svg>
                                        IA
                                      </span>
                                    ) : (
                                      <span className="tsource tsource--manual">Manuel</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </Fragment>
                          );
                        })
                      )}

                      {addingIn === g.key && (
                        <div className="tboard-row tboard-row--add">
                          <input
                            ref={newInputRef}
                            type="text"
                            className="tboard-add-inline-input"
                            placeholder={`Ajouter une tâche à « ${g.label} »…`}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") createTask();
                              if (e.key === "Escape") closeComposer();
                            }}
                            onBlur={() => {
                              if (!newTitle.trim()) closeComposer();
                            }}
                            aria-label={`Titre de la nouvelle tâche (${g.label})`}
                          />
                          <span className="tboard-add-inline-hint">Entrée pour ajouter · Échap pour annuler</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </>
      )}

      {boardView === "kanban" && (
        <div className="tboard-kanban">
          {GROUPS.map((g) => {
            const rows = displayed.filter((t) => g.match.includes(t.status));
            return (
              <div key={g.key} className="kcol" style={{ "--g": g.accent } as CSSProperties}>
                <div
                  className="kcol-head"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="kcol-dot" />
                    <span className="kcol-name">{g.label}</span>
                    <span className="kcol-count">{rows.length}</span>
                  </div>
                  <button
                    type="button"
                    className="kcol-add-btn"
                    onClick={() => openComposer(g.key)}
                    aria-label="Ajouter une tâche"
                    title="Ajouter une tâche"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
                <div
                  className={`kcol-body ${dragOver === g.key ? "is-dragover" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== g.key) setDragOver(g.key);
                  }}
                  onDrop={() => onDrop(g.key)}
                >
                  {rows.map((t) => {
                    const due = dueMeta(t.dueAtIso, t.dueLabel);
                    const sub = subProgressOf(t);
                    const clientConvs = clientConvsOf(t);
                    const linkedConv = t.conversationId
                      ? (conversations.find((c) => c.id === t.conversationId) ?? null)
                      : null;
                    return (
                      // Div + role="button" plutôt que <button> : la carte contient
                      // un vrai <button> (statut) et un <button> ne peut pas être
                      // descendant d'un autre <button> (erreur d'hydration React).
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOver(null);
                        }}
                        className={`kcard ${justAdded.has(t.id) ? "is-new" : ""} ${
                          dragId === t.id ? "is-dragging" : ""
                        } ${mueHighlighted === `task:${t.id}` ? "has-ai-highlighted" : ""}`}
                        onClick={() => openTask(t)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openTask(t);
                          }
                        }}
                      >
                        <span className="kcard-top">
                          <span className="kcard-title">{t.title}</span>
                          {t.fromAI ? (
                            <span className="tsource tsource--ai kcard-src">
                              <svg
                                viewBox="0 0 24 24"
                                width={11}
                                height={11}
                                fill="currentColor"
                                stroke="none"
                                aria-hidden
                              >
                                <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
                              </svg>
                              IA
                            </span>
                          ) : (
                            <span className="tsource tsource--manual kcard-src">Manuel</span>
                          )}
                        </span>
                        {t.coverImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="kcard-cover" src={t.coverImage} alt="" />
                        )}
                        <span className="kcard-foot">
                          <button
                            type="button"
                            className={`kcard-status-btn tstatus tstatus--${t.status}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusMenu(t.id, e);
                            }}
                          >
                            <span className="tstatus-dot" />
                            {t.status === "to-scope"
                              ? "À cadrer"
                              : t.status === "todo"
                                ? "À faire"
                                : t.status === "in-progress"
                                  ? "En cours"
                                  : t.status === "awaiting-reply"
                                    ? "En attente"
                                    : "Terminé"}
                          </button>
                          <span className="tboard-client-stack">
                            {clientConvs.length > 0 ? (
                              clientConvs
                                .slice(0, 3)
                                .map((c) => (
                                  <Avatar
                                    key={c.id}
                                    avatar={{ ...c.avatar, alt: c.name }}
                                    size={22}
                                  />
                                ))
                            ) : (
                              <Avatar avatar={{ ...t.avatar, alt: clientNameOf(t) }} size={22} />
                            )}
                          </span>
                          <span className="kcard-spacer" />
                          {sub && <span className="kcard-sub">{sub}</span>}
                          {linkedConv && (
                            <svg
                              className="kcard-msg"
                              viewBox="0 0 24 24"
                              width={14}
                              height={14}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          )}
                          <span className={`kcard-due tboard-due--${due.tone}`}>{due.label}</span>
                        </span>
                      </div>
                    );
                  })}
                  {rows.length === 0 && addingIn !== g.key && (
                    <div className="kcol-empty">Rien ici</div>
                  )}
                  {addingIn === g.key && (
                    <div className="kcard kcard--add">
                      <input
                        ref={newInputRef}
                        type="text"
                        className="tboard-add-inline-input"
                        placeholder="Nouvelle tâche…"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createTask();
                          if (e.key === "Escape") closeComposer();
                        }}
                        onBlur={() => {
                          if (!newTitle.trim()) closeComposer();
                        }}
                        aria-label={`Titre de la nouvelle tâche (${g.label})`}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {boardView === "calendar" && <TasksCalendarView displayed={displayed} openTask={openTask} />}
      {clientMenu &&
        typeof document !== "undefined" &&
        (() => {
          const t = displayed.find((x) => x.id === clientMenu.id);
          if (!t) return null;
          // Liste « clients » dispo = 1 entrée par clientId (ou par id de conv).
          const seen = new Map<string, (typeof conversations)[number]>();
          for (const c of conversations) {
            const key = c.clientId ?? c.id;
            if (!seen.has(key)) seen.set(key, c);
          }
          const all = [...seen.values()];
          const current = new Set(
            t.clientConvIds?.length ? t.clientConvIds : t.conversationId ? [t.conversationId] : []
          );
          const W = 240;
          const H = Math.min(8 + all.length * 40 + 12, 320);
          const left = Math.max(8, Math.min(window.innerWidth - W - 8, clientMenu.x - W / 2));
          const top = Math.min(window.innerHeight - H - 8, clientMenu.y);
          return createPortal(
            <>
              <button
                type="button"
                className="tprio-scrim"
                aria-label="Fermer"
                onClick={() => setClientMenu(null)}
              />
              <div
                className="tclient-menu"
                role="menu"
                style={{ position: "fixed", left, top, width: W, maxHeight: H }}
              >
                <div className="tclient-menu-head">Clients liés</div>
                {all.length === 0 && (
                  <p className="tclient-empty">Aucun client connecté pour l'instant.</p>
                )}
                {all.map((c) => {
                  const on = current.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`tclient-opt ${on ? "is-on" : ""}`}
                      onClick={() => toggleTaskClient(t, c.id)}
                    >
                      <Avatar avatar={{ ...c.avatar, alt: c.name }} size={24} />
                      <span className="tclient-opt-name">{c.name}</span>
                      <span className={`tclient-check ${on ? "is-on" : ""}`} aria-hidden>
                        {on && (
                          <svg
                            viewBox="0 0 24 24"
                            width={11}
                            height={11}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>,
            document.body
          );
        })()}
      {prioMenu &&
        typeof document !== "undefined" &&
        (() => {
          const t = displayed.find((x) => x.id === prioMenu.id);
          if (!t) return null;
          // Position : on centre sous le bouton et on clamp dans la fenêtre.
          const W = 144;
          const H = 132;
          const left = Math.max(8, Math.min(window.innerWidth - W - 8, prioMenu.x - W / 2));
          const top = Math.min(window.innerHeight - H - 8, prioMenu.y);
          return createPortal(
            <>
              <button
                type="button"
                className="tprio-scrim"
                aria-label="Fermer"
                onClick={() => setPrioMenu(null)}
              />
              <div
                className="tprio-menu"
                role="menu"
                style={{ position: "fixed", left, top, transform: "none" }}
              >
                {(
                  [
                    ["high", "Haute"],
                    ["medium", "Moyenne"],
                    ["low", "Basse"],
                  ] as const
                ).map(([p, label]) => (
                  <button
                    key={p}
                    type="button"
                    className={`tprio-opt tprio--${p} ${t.priority === p ? "is-active" : ""}`}
                    onClick={() => {
                      patchTask(t.id, { priority: p });
                      setPrioMenu(null);
                    }}
                  >
                    <span className="tprio-dot" />
                    {label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          );
        })()}

      {/* Télécommande de la tâche (clic sur la case) */}
      {actMenu &&
        typeof document !== "undefined" &&
        (() => {
          const t = displayed.find((x) => x.id === actMenu.id);
          if (!t) return null;
          const W = 200;
          const H = 280;
          const left = Math.max(8, Math.min(window.innerWidth - W - 8, actMenu.x));
          const top = Math.min(window.innerHeight - H - 8, actMenu.y);
          const STATUSES: { k: Task["status"]; lbl: string }[] = [
            { k: "to-scope", lbl: "À cadrer" },
            { k: "todo", lbl: "À faire" },
            { k: "in-progress", lbl: "En cours" },
            { k: "awaiting-reply", lbl: "En attente" },
            { k: "done", lbl: "Terminé" },
          ];
          return createPortal(
            <>
              <button
                type="button"
                className="tprio-scrim"
                aria-label="Fermer"
                onClick={() => setActMenu(null)}
              />
              <div
                className="tact-menu"
                role="menu"
                style={{ position: "fixed", left, top, width: W }}
              >
                <div className="tact-menu-label">Changer le statut</div>
                {STATUSES.map((s) => (
                  <button
                    key={s.k}
                    type="button"
                    className={`tact-opt tact-opt--status tstatus--${s.k} ${t.status === s.k ? "is-active" : ""}`}
                    onClick={() => {
                      setTaskStatus(t.id, s.k);
                      setActMenu(null);
                    }}
                  >
                    <span className="tstatus-dot" />
                    {s.lbl}
                  </button>
                ))}
                <div className="tact-sep" />
                {t.conversationId && (
                  <button
                    type="button"
                    className="tact-opt"
                    onClick={() => {
                      openTask(t);
                      setActMenu(null);
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={14}
                      height={14}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Ouvrir le fil
                  </button>
                )}
                <button
                  type="button"
                  className="tact-opt"
                  onClick={() => {
                    addTask({
                      ...t,
                      id: `dup-${Date.now()}`,
                      title: `${t.title} (copie)`,
                      sortableIndex: Date.now(),
                    });
                    setActMenu(null);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={14}
                    height={14}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="9" y="9" width="12" height="12" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Dupliquer
                </button>
                <button
                  type="button"
                  className="tact-opt tact-opt--danger"
                  onClick={() => {
                    removeTask(t.id);
                    setActMenu(null);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={14}
                    height={14}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                  Supprimer
                </button>
              </div>
            </>,
            document.body
          );
        })()}

      {/* Menu Statut (clic sur la pill Statut) */}
      {statusMenu &&
        typeof document !== "undefined" &&
        (() => {
          const t = displayed.find((x) => x.id === statusMenu.id);
          if (!t) return null;
          const W = 160;
          const H = 200;
          const left = Math.max(8, Math.min(window.innerWidth - W - 8, statusMenu.x - W / 2));
          const top = Math.min(window.innerHeight - H - 8, statusMenu.y);
          const STATUSES: { k: Task["status"]; lbl: string }[] = [
            { k: "to-scope", lbl: "À cadrer" },
            { k: "todo", lbl: "À faire" },
            { k: "in-progress", lbl: "En cours" },
            { k: "awaiting-reply", lbl: "En attente" },
            { k: "done", lbl: "Terminé" },
          ];
          return createPortal(
            <>
              <button
                type="button"
                className="tprio-scrim"
                aria-label="Fermer"
                onClick={() => setStatusMenu(null)}
              />
              <div
                className="tact-menu"
                role="menu"
                style={{ position: "fixed", left, top, width: W }}
              >
                {STATUSES.map((s) => (
                  <button
                    key={s.k}
                    type="button"
                    className={`tact-opt tact-opt--status tstatus--${s.k} ${t.status === s.k ? "is-active" : ""}`}
                    onClick={() => {
                      setTaskStatus(t.id, s.k);
                      setStatusMenu(null);
                    }}
                  >
                    <span className="tstatus-dot" />
                    {s.lbl}
                  </button>
                ))}
              </div>
            </>,
            document.body
          );
        })()}
    </section>
  );
}

interface TasksCalendarViewProps {
  displayed: Task[];
  openTask: (t: Task) => void;
}

function tcalMondayOf(offset: number) {
  const now = new Date();
  const back = (now.getDay() + 6) % 7; // jours depuis lundi
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back + offset * 7);
}

interface WeekDayInfo {
  name: string;
  date: Date;
  dateString: string;
  label: string;
  isToday: boolean;
}

function buildTcalWeekDays(offset: number): WeekDayInfo[] {
  const monday = tcalMondayOf(offset * 4);
  const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const days: WeekDayInfo[] = [];
  for (let w = 0; w < 4; w++) {
    for (let d = 0; d < 7; d++) {
      const dateObj = new Date(monday);
      dateObj.setDate(monday.getDate() + w * 7 + d);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const date = String(dateObj.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${date}`;
      days.push({
        name: weekdays[d] ?? "",
        date: dateObj,
        dateString,
        label: dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        isToday: dateObj.toDateString() === new Date().toDateString(),
      });
    }
  }
  return days;
}

export function TasksCalendarView({ displayed, openTask }: TasksCalendarViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => buildTcalWeekDays(weekOffset), [weekOffset]);

  const rangeLabel = useMemo(() => {
    const mon = days[0]?.date ?? new Date();
    const sun = days[27]?.date ?? new Date();
    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
    return `${fmt(mon)} – ${fmt(sun)}, ${sun.getFullYear()}`;
  }, [days]);

  // Group tasks by due date
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of displayed) {
      if (t.dueAtIso) {
        const dateStr = t.dueAtIso.slice(0, 10);
        const existing = map.get(dateStr) ?? [];
        existing.push(t);
        map.set(dateStr, existing);
      }
    }
    return map;
  }, [displayed]);

  // Tasks with no due date
  const noDueTasks = useMemo(() => {
    return displayed.filter((t) => !t.dueAtIso);
  }, [displayed]);

  return (
    <div className="tboard-calview">
      <header className="tcal-header">
        <div className="tcal-nav">
          <button type="button" className="tcal-btn" onClick={() => setWeekOffset(0)}>
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            className="tcal-nav-arrow"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="Mois précédent"
          >
            ‹
          </button>
          <span className="tcal-range">{rangeLabel}</span>
          <button
            type="button"
            className="tcal-nav-arrow"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label="Mois suivant"
          >
            ›
          </button>
        </div>
      </header>

      <div className="tcal-grid">
        {/* En-têtes fixes des jours de la semaine */}
        {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((name) => (
          <div key={name} className="tcal-weekday-header">
            {name}
          </div>
        ))}

        {/* Jours du calendrier (4 semaines = 28 cases) */}
        {days.map((day: WeekDayInfo) => {
          const dayTasks = tasksByDay.get(day.dateString) ?? [];
          return (
            <div key={day.dateString} className={`tcal-col ${day.isToday ? "is-today" : ""}`}>
              <div className="tcal-col-head">
                <span className="tcal-day-num">{day.label}</span>
                {dayTasks.length > 0 && <span className="tcal-day-count">{dayTasks.length}</span>}
              </div>
              <div className="tcal-col-body">
                {dayTasks.map((t: Task) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tcal-card ${t.status === "done" ? "is-done" : ""}`}
                    onClick={() => openTask(t)}
                  >
                    <span className="tcal-card-title">{t.title}</span>
                    <div className="tcal-card-meta">
                      <span className={`tcal-prio-dot prio-${t.priority}`} />
                      <span className="tcal-status-lbl">
                        {t.status === "to-scope"
                          ? "À cadrer"
                          : t.status === "todo"
                            ? "À faire"
                            : t.status === "in-progress"
                              ? "En cours"
                              : t.status === "awaiting-reply"
                                ? "En entente"
                                : "Terminé"}
                      </span>
                    </div>
                  </button>
                ))}
                {dayTasks.length === 0 && <div className="tcal-empty-day">Aucune tâche</div>}
              </div>
            </div>
          );
        })}

        {/* Colonne Sans échéance */}
        <div className="tcal-col tcal-col--nodue">
          <div className="tcal-col-head">
            <span className="tcal-day-name">Sans échéance</span>
            {noDueTasks.length > 0 && <span className="tcal-day-count">{noDueTasks.length}</span>}
          </div>
          <div className="tcal-col-body">
            {noDueTasks.map((t: Task) => (
              <button
                key={t.id}
                type="button"
                className={`tcal-card ${t.status === "done" ? "is-done" : ""}`}
                onClick={() => openTask(t)}
              >
                <span className="tcal-card-title">{t.title}</span>
                <div className="tcal-card-meta">
                  <span className={`tcal-prio-dot prio-${t.priority}`} />
                  <span className="tcal-status-lbl">
                    {t.status === "to-scope"
                      ? "À cadrer"
                      : t.status === "todo"
                        ? "À faire"
                        : t.status === "in-progress"
                          ? "En cours"
                          : t.status === "awaiting-reply"
                            ? "En attente"
                            : "Terminé"}
                  </span>
                </div>
              </button>
            ))}
            {noDueTasks.length === 0 && <div className="tcal-empty-day">Aucune tâche</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
