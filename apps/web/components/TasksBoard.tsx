"use client";

// Freescale V2 — Vue Tâches façon tableau (inspiré Monday, pas une copie).
// Groupes colorés par statut + colonnes + cellules colorées (priorité / statut).
// Données mock via useData (mutations locales). Wording/style Freescale.

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { Task } from "@/lib/types";
import { type CSSProperties, Fragment, useEffect, useRef, useState } from "react";

type GroupKey = "to-scope" | "todo" | "in-progress" | "awaiting-reply" | "done";
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

/** Libellé court de date de création (ex : « 12 juin »). */
function createdLabel(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

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
  const { tasks, conversations, setTaskStatus, addTask, patchTask } = useData();
  const { setView, setActiveConv } = useApp();
  const [collapsed, setCollapsed] = useState<Set<GroupKey>>(() => new Set());
  // Bascule Tableau ↔ Kanban.
  const [boardView, setBoardView] = useState<"table" | "kanban">("table");
  // Tâches dépliées : affichent le message lié juste en dessous.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Composer « Nouvelle tâche » — ajout local (mock), la ligne apparaît avec
  // la lueur de transfert (même mécanique que l'ajout depuis Mue).
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState<GroupKey>("todo");
  const newInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) requestAnimationFrame(() => newInputRef.current?.focus());
  }, [adding]);

  const closeComposer = () => {
    setAdding(false);
    setNewTitle("");
  };
  const createTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    addTask({
      id: `new-${Date.now()}`,
      title,
      priority: "medium",
      dueLabel: "",
      status: newStatus,
      avatar: { kind: "initials", text: "" },
      channel: "gmail",
      sortableIndex: Date.now(),
      conversationId: null,
      fromAI: false,
      createdAtIso: new Date().toISOString(),
    });
    setNewTitle("");
    // On garde le composer ouvert pour enchaîner — on refocus le champ.
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
    .filter((t) =>
      filterSource === "all" ? true : filterSource === "ai" ? !!t.fromAI : !t.fromAI
    )
    .slice()
    .sort((a, b) => {
      if (sortKey === "due") return ms(a.dueAtIso) - ms(b.dueAtIso);
      if (sortKey === "created") return ms(b.createdAtIso) - ms(a.createdAtIso);
      if (sortKey === "title") return a.title.localeCompare(b.title);
      return (a.sortableIndex ?? 0) - (b.sortableIndex ?? 0);
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

  const openTask = (t: Task) => {
    if (!t.conversationId) return;
    setView("inbox");
    setActiveConv(t.conversationId);
  };

  // Édition inline d'une date (échéance / création) : clic sur la cellule.
  const [editCell, setEditCell] = useState<{ id: string; field: "due" | "created" } | null>(null);
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
                      ["default", "Par défaut"],
                      ["due", "Échéance"],
                      ["created", "Date de création"],
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
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
          >
            + Nouvelle tâche
          </button>
        </div>
      </div>

      {adding && (
        <div className="tboard-add">
          <input
            ref={newInputRef}
            type="text"
            className="tboard-add-input"
            placeholder="Titre de la tâche…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createTask();
              if (e.key === "Escape") closeComposer();
            }}
            aria-label="Titre de la nouvelle tâche"
          />
          <select
            className="tboard-add-status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as GroupKey)}
            aria-label="Statut de la tâche"
          >
            {GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="tboard-add-btn"
            onClick={createTask}
            disabled={!newTitle.trim()}
          >
            Ajouter
          </button>
          <button
            type="button"
            className="tboard-add-cancel"
            onClick={closeComposer}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      {boardView === "table" && (
        <>
          {/* En-tête de colonnes unique (en haut, collant) — plus de répétition par statut. */}
          <div className="tboard-headbar">
            <div className="tboard-row tboard-row--head">
              <span className="tboard-head-task">Tâche</span>
              <span>Client</span>
              <span>Échéance</span>
              <span>Créée le</span>
              <span>Source</span>
            </div>
          </div>

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
                <button
                  type="button"
                  className="tboard-group-head"
                  onClick={() => toggleCollapse(g.key)}
                  aria-expanded={!isCol}
                >
                  <svg
                    className={`tboard-chevron ${isCol ? "is-col" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span className="tboard-group-name">{g.label}</span>
                  <span className="tboard-group-count">{rows.length}</span>
                </button>

                <div className={`tboard-group-wrap ${isCol ? "" : "is-open"}`}>
                  <div className="tboard-group-inner">
                    <div className="tboard-table">
                      {rows.length === 0 ? (
                        <div className="tboard-empty">Rien ici pour l'instant.</div>
                      ) : (
                        rows.map((t) => {
                          const due = dueMeta(t.dueAtIso, t.dueLabel);
                          const sub = subProgressOf(t);
                          const linkedConv = t.conversationId
                            ? (conversations.find((c) => c.id === t.conversationId) ?? null)
                            : null;
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
                                <span className="tboard-cell tboard-check">
                                  <button
                                    type="button"
                                    className={`tcheck ${t.status === "done" ? "is-done" : ""}`}
                                    aria-label={t.status === "done" ? "Rouvrir" : "Marquer terminé"}
                                    onClick={() =>
                                      setTaskStatus(t.id, t.status === "done" ? "todo" : "done")
                                    }
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width={12}
                                      height={12}
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={3}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </button>
                                </span>

                                <div className="tboard-cell tboard-task">
                                  <button
                                    type="button"
                                    className="tboard-task-btn"
                                    onClick={() => openTask(t)}
                                  >
                                    <span className="tboard-task-title">{t.title}</span>
                                    {sub && <span className="tboard-sub">{sub}</span>}
                                  </button>
                                  {linkedConv ? (
                                    <button
                                      type="button"
                                      className={`tlink ${isOpen ? "is-open" : ""}`}
                                      aria-label="Voir le message lié"
                                      aria-expanded={isOpen}
                                      onClick={() => toggleExpand(t.id)}
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        width={16}
                                        height={16}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={1.8}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden
                                      >
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                      </svg>
                                      <span className="tlink-badge">1</span>
                                    </button>
                                  ) : (
                                    <span className="tlink tlink--none" title="Aucun message lié">
                                      <svg
                                        viewBox="0 0 24 24"
                                        width={16}
                                        height={16}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={1.8}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden
                                      >
                                        <circle cx="12" cy="12" r="9" />
                                        <line x1="12" y1="8" x2="12" y2="16" />
                                        <line x1="8" y1="12" x2="16" y2="12" />
                                      </svg>
                                    </span>
                                  )}
                                </div>

                                <span
                                  className="tboard-cell tboard-client"
                                  title={
                                    clientConvs.map((c) => c.name).join(", ") || clientNameOf(t)
                                  }
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
                                  ) : t.id.startsWith("new-") ? (
                                    <span
                                      className="tboard-client-empty"
                                      aria-label="Sans client"
                                    />
                                  ) : (
                                    <Avatar
                                      avatar={{ ...t.avatar, alt: clientNameOf(t) }}
                                      size={28}
                                    />
                                  )}
                                </span>

                                <span className={`tboard-cell tboard-due tboard-due--${due.tone}`}>
                                  {editCell?.id === t.id && editCell.field === "due" ? (
                                    <input
                                      type="date"
                                      className="tboard-dateedit"
                                      // biome-ignore lint/a11y/noAutofocus: édition inline ouverte à la demande
                                      autoFocus
                                      defaultValue={toDateInput(t.dueAtIso)}
                                      onBlur={(e) => commitDate(t.id, "due", e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") commitDate(t.id, "due", e.currentTarget.value);
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

                                <span className="tboard-cell tboard-created">
                                  {editCell?.id === t.id && editCell.field === "created" ? (
                                    <input
                                      type="date"
                                      className="tboard-dateedit"
                                      // biome-ignore lint/a11y/noAutofocus: édition inline ouverte à la demande
                                      autoFocus
                                      defaultValue={toDateInput(t.createdAtIso)}
                                      onBlur={(e) => commitDate(t.id, "created", e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          commitDate(t.id, "created", e.currentTarget.value);
                                        if (e.key === "Escape") setEditCell(null);
                                      }}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      className="tboard-cellbtn"
                                      onClick={() => setEditCell({ id: t.id, field: "created" })}
                                    >
                                      {t.createdAtIso ? (
                                        createdLabel(t.createdAtIso)
                                      ) : (
                                        <span className="tboard-cell-add">+ Définir</span>
                                      )}
                                    </button>
                                  )}
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

                              {linkedConv && (
                                <div className={`tboard-detail-wrap ${isOpen ? "is-open" : ""}`}>
                                  <div className="tboard-detail-inner">
                                    <button
                                      type="button"
                                      className="tboard-detail"
                                      onClick={() => openTask(t)}
                                      aria-label="Ouvrir le fil lié"
                                      tabIndex={isOpen ? 0 : -1}
                                    >
                                      <span className="tboard-detail-label">Message lié</span>
                                      <span className="tboard-detail-card">
                                        <Avatar
                                          avatar={{ ...linkedConv.avatar, alt: linkedConv.name }}
                                          size={26}
                                        />
                                        <span className="tboard-detail-tx">
                                          <span className="tboard-detail-top">
                                            <ChannelLogo
                                              channel={linkedConv.channel}
                                              className="tboard-detail-chan"
                                            />
                                            <b>{linkedConv.name}</b>
                                            {linkedConv.subject && (
                                              <span className="tboard-detail-subject">
                                                {linkedConv.subject}
                                              </span>
                                            )}
                                          </span>
                                          <span className="tboard-detail-preview">
                                            {linkedConv.preview}
                                          </span>
                                        </span>
                                        <span className="tboard-detail-open">Ouvrir le fil →</span>
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Fragment>
                          );
                        })
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
                <div className="kcol-head">
                  <span className="kcol-dot" />
                  <span className="kcol-name">{g.label}</span>
                  <span className="kcol-count">{rows.length}</span>
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
                      <button
                        key={t.id}
                        type="button"
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOver(null);
                        }}
                        className={`kcard ${justAdded.has(t.id) ? "is-new" : ""} ${
                          dragId === t.id ? "is-dragging" : ""
                        }`}
                        onClick={() => openTask(t)}
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
                      </button>
                    );
                  })}
                  {rows.length === 0 && <div className="kcol-empty">Rien ici</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
