"use client";

import { EditTaskModal } from "@/components/EditTaskModal";
import { NoChannelsHero } from "@/components/NoChannelsHero";
import { ChannelLogo, Icon } from "@/components/icons/Icon";
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
import type { Conversation, Task } from "@/lib/types";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Libellé d'échéance calculé depuis la vraie date (dueAtIso) : « En retard »
 * en rouge, « Aujourd'hui » accentué, sinon Demain / date courte. Retombe sur
 * le libellé texte historique quand la tâche n'a pas de date.
 */
function dueMeta(
  iso: string | null | undefined,
  fallback: string
): { label: string; tone: "overdue" | "today" | "normal" } {
  if (!iso) return { label: fallback, tone: "normal" };
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return { label: fallback, tone: "normal" };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86400000);
  if (diffDays < 0) return { label: `En retard · ${-diffDays} j`, tone: "overdue" };
  if (diffDays === 0) return { label: "Aujourd'hui", tone: "today" };
  if (diffDays === 1) return { label: "Demain", tone: "normal" };
  return {
    label: due.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    tone: "normal",
  };
}

// ── Colonnes de statut (À faire / En cours / Terminé) ────────────────────
type StatusGroupKey = "todo" | "in-progress" | "done";

const STATUS_GROUPS: {
  key: StatusGroupKey;
  label: string;
  /** Statut canonique appliqué quand on dépose une tâche dans cette colonne. */
  primary: Task["status"];
  /** Tous les statuts regroupés sous cette colonne. */
  match: Task["status"][];
}[] = [
  { key: "todo", label: "À faire", primary: "todo", match: ["todo"] },
  {
    key: "in-progress",
    label: "En cours",
    primary: "in-progress",
    match: ["in-progress", "awaiting-reply"],
  },
  { key: "done", label: "Terminé", primary: "done", match: ["done"] },
];

/** Colonne d'appartenance d'un statut de tâche. */
function groupKeyOf(status: Task["status"]): StatusGroupKey {
  return STATUS_GROUPS.find((g) => g.match.includes(status))?.key ?? "todo";
}

/** Statut canonique à appliquer pour une colonne donnée. */
function primaryStatusOf(key: StatusGroupKey): Task["status"] {
  return STATUS_GROUPS.find((g) => g.key === key)?.primary ?? "todo";
}

export function TodayView(_props: { user: CurrentUser | null }) {
  const {
    conversations,
    tasks,
    channels,
    addTask,
    reorderTasks,
    setTaskStatus,
    removeTask,
    patchTask,
  } = useData();
  const push = useToast((s) => s.push);
  // Navigation tâche → conversation source (« Ouvrir le fil »).
  const { view, setView, setActiveConv, setMueOpen, setSuggestTasksOpen } = useApp();

  // Complétion en douceur : la ligne reste barrée ~1,2 s avant de partir vers
  // « Terminé » (re-clic pendant la grâce = annulation immédiate).
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const graceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    const timers = graceTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
    };
  }, []);
  // Atterrissage après un drop (petit ressort sur la ligne déposée).
  const [landedId, setLandedId] = useState<string | null>(null);
  // Menu contextuel « ⋯ » ouvert sur cette tâche.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Tâches dont la checklist (sous-tâches) est dépliée.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Glisser-déposer des tâches (façon Notion) — état purement UI.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overAfter, setOverAfter] = useState(false);
  // Survol d'une colonne de statut (zone vide / en-tête) pendant un glisser.
  const [overGroup, setOverGroup] = useState<StatusGroupKey | null>(null);
  // Colonnes de statut repliées (chevron) — persistées localement (#7).
  const [collapsed, setCollapsed] = useState<Set<StatusGroupKey>>(() => {
    if (typeof window === "undefined") return new Set(["done"]);
    try {
      const raw = window.localStorage.getItem("fs:collapsed-cols");
      if (raw) return new Set(JSON.parse(raw) as StatusGroupKey[]);
    } catch {}
    return new Set(["done"]);
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("fs:collapsed-cols", JSON.stringify([...collapsed]));
    } catch {}
  }, [collapsed]);

  const clients = useMemo(
    () => conversations.filter((c) => c.category === "client"),
    [conversations]
  );
  const newClients = useMemo(() => clients.filter((c) => c.unread), [clients]);

  const [phase, setPhase] = useState<"idle" | "reading" | "done">("idle");
  // Curseur du scan visuel : quel message de l'inbox est en cours de lecture.
  const [scanIdx, setScanIdx] = useState(0);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Vrai brief Mue (dailyBriefing) — alimente la console « messages → tâches ».
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [, setBriefError] = useState<string | null>(null);
  const [briefLoaded, setBriefLoaded] = useState(false);
  // Demandes tout juste ajoutées : la ligne affiche « ✓ Ajoutée » ~1,6 s
  // avant de se retirer — le lien visuel avec la liste au-dessus.
  const [, setJustValidated] = useState<Set<string>>(new Set());
  // Horodatage de la dernière analyse (conservé pour la logique d'auto-analyse).
  const [, setLastRunAt] = useState<number | null>(null);
  // L'auto-analyse ne se déclenche qu'une fois par session de page.
  const autoRan = useRef(false);
  // Demande sélectionnée (pilotage clavier ↑↓ + 1/2/3, façon triage Linear).
  const [suggSel, setSuggSel] = useState(0);
  // Création inline minimale : un titre + Entrée. Le reste s'édite après coup.
  const [newTitle, setNewTitle] = useState("");
  // Renommage inline (double-clic sur le titre) + date inline (clic sur la date).
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [dateEditId, setDateEditId] = useState<string | null>(null);
  // ↑ dans le quick-add vide = rééditer la dernière tâche créée.
  const lastCreatedId = useRef<string | null>(null);
  // Spring-loaded : déplier une colonne repliée survolée pendant un drag.
  const springRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Glisser autorisé uniquement quand il démarre depuis la poignée : on l'arme
  // au mousedown sur le grip (le dragstart d'un <li> draggable a pour cible le
  // <li> lui-même, donc on ne peut pas le détecter via e.target).
  const gripArmed = useRef(false);
  // « Tout ajouter » survolé → surligner les demandes concernées.
  const [, setBulkHover] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const addQuickTask = () => {
    let title = newTitle.trim();
    if (!title) return;
    // Préfixes malins : « ! » = priorité haute, « @ven » (lun/mar/…/dim,
    // demain, auj) = échéance — du NLP de poche, zéro UI.
    let priority: Task["priority"] = "medium";
    if (/(^|\s)!(\s|$)/.test(title) || title.includes("!")) {
      if (title.includes("!")) priority = "high";
      title = title.replace(/!/g, "").replace(/\s+/g, " ").trim();
    }
    let dueAtIso: string | null = null;
    const dayMap: Record<string, number> = {
      dim: 0,
      lun: 1,
      mar: 2,
      mer: 3,
      jeu: 4,
      ven: 5,
      sam: 6,
    };
    const at = title.match(/@(auj|demain|lun|mar|mer|jeu|ven|sam|dim)\w*/i);
    if (at?.[1]) {
      const key = at[1].toLowerCase();
      const d = new Date();
      if (key === "demain") d.setDate(d.getDate() + 1);
      else if (key !== "auj") {
        const target = dayMap[key] ?? d.getDay();
        let delta = (target - d.getDay() + 7) % 7;
        if (delta === 0) delta = 7;
        d.setDate(d.getDate() + delta);
      }
      d.setHours(17, 0, 0, 0);
      dueAtIso = d.toISOString();
      title = title.replace(at[0], "").replace(/\s+/g, " ").trim();
    }
    if (!title) return;
    const id = `task-${Date.now()}`;
    addTask({
      id,
      title,
      priority,
      dueLabel: dueMeta(dueAtIso, "Cette semaine").label,
      status: "todo",
      avatar: { kind: "initials", text: "+", bg: "#EAE6FF" },
      channel: "gmail",
      sortableIndex: Date.now(),
      fromAI: false,
      conversationId: null,
      dueAtIso,
    });
    lastCreatedId.current = id;
    setJustAdded((prev) => new Set(prev).add(id));
    setNewTitle("");
    addInputRef.current?.focus();
  };

  // Cibles du scan : les messages que Mue lit pendant l'analyse — on VOIT
  // l'IA aller chercher dans l'inbox.
  const scanTargets = useMemo(
    () => (newClients.length > 0 ? newClients : clients).slice(0, 3),
    [newClients, clients]
  );

  // Scan séquentiel : chaque message est « lu » ~700 ms ; on bascule en
  // résultats dès que la vraie réponse de Mue (dailyBriefing) est arrivée.
  useEffect(() => {
    if (phase !== "reading") return;
    if (scanIdx < scanTargets.length) {
      const t = setTimeout(() => setScanIdx((i) => i + 1), 700);
      return () => clearTimeout(t);
    }
    if (!briefLoaded) return;
    const t = setTimeout(() => setPhase("done"), 350);
    return () => clearTimeout(t);
  }, [phase, scanIdx, scanTargets.length, briefLoaded]);

  // La main feature ne se demande pas : Mue analyse toute seule à l'arrivée
  // dès qu'il y a de nouveaux messages clients (une fois par session).
  useEffect(() => {
    if (autoRan.current || view !== "today") return;
    if (channels.length === 0 || newClients.length === 0) return;
    autoRan.current = true;
    startAnalyze();
  });

  // Tâches de premier niveau (les sous-tâches ne s'affichent pas ici).
  const visibleTasks = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

  // Tâches regroupées par colonne de statut (À faire / En cours / Terminé).
  const tasksByGroup = useMemo(() => {
    const map: Record<StatusGroupKey, Task[]> = { todo: [], "in-progress": [], done: [] };
    for (const t of visibleTasks) map[groupKeyOf(t.status)].push(t);
    return map;
  }, [visibleTasks]);

  // Déplace `sourceId` juste avant/après `targetId` dans la liste globale.
  const moveTask = (sourceId: string, targetId: string, after: boolean) => {
    if (sourceId === targetId) return;
    const ids = visibleTasks.map((t) => t.id).filter((id) => id !== sourceId);
    let idx = ids.indexOf(targetId);
    if (idx < 0) return;
    if (after) idx += 1;
    ids.splice(idx, 0, sourceId);
    reorderTasks(ids);
  };

  // Changement de statut avec toast « Annuler » — utilisé par les dépôts
  // inter-colonnes pour que chaque déplacement soit réversible en un clic.
  const changeStatusWithUndo = (source: Task, key: StatusGroupKey) => {
    const prev = source.status;
    setTaskStatus(source.id, primaryStatusOf(key));
    const label = STATUS_GROUPS.find((g) => g.key === key)?.label ?? "";
    push({
      kind: "info",
      text: `Déplacée vers « ${label} »`,
      action: { label: "Annuler", fn: () => setTaskStatus(source.id, prev) },
    });
  };

  // Micro-feedback d'atterrissage sur la ligne déposée.
  const flashLanding = (id: string) => {
    setLandedId(id);
    setTimeout(() => setLandedId((cur) => (cur === id ? null : cur)), 500);
  };

  // Dépôt sur une LIGNE : adopte le statut de la colonne cible + s'insère
  // juste avant/après la ligne survolée.
  const dropOnRow = (target: Task) => {
    const source = visibleTasks.find((t) => t.id === dragId);
    if (!source || source.id === target.id) return;
    const targetKey = groupKeyOf(target.status);
    if (groupKeyOf(source.status) !== targetKey) {
      changeStatusWithUndo(source, targetKey);
    }
    moveTask(source.id, target.id, overAfter);
    flashLanding(source.id);
  };

  // Dépôt sur une COLONNE (en-tête / zone vide) : change juste le statut, la
  // tâche atterrit en bas de la colonne. Pas de réordonnancement nécessaire.
  const dropOnGroup = (key: StatusGroupKey) => {
    const source = visibleTasks.find((t) => t.id === dragId);
    if (!source) return;
    if (groupKeyOf(source.status) !== key) {
      changeStatusWithUndo(source, key);
    }
    flashLanding(source.id);
  };

  // Cochage avec délai de grâce : barré sur place, départ différé vers
  // « Terminé », undo dans le toast une fois le départ acté.
  const completeWithGrace = (t: Task) => {
    const prev = t.status;
    setLeaving((s) => new Set(s).add(t.id));
    const timer = setTimeout(() => {
      graceTimers.current.delete(t.id);
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(t.id);
        return n;
      });
      setTaskStatus(t.id, "done");
      // On montre la destination : « Terminé » se déplie, puis se replie.
      setCollapsed((prevCols) => {
        if (!prevCols.has("done")) return prevCols;
        const n = new Set(prevCols);
        n.delete("done");
        setTimeout(() => setCollapsed((again) => new Set(again).add("done")), 2600);
        return n;
      });
      push({
        kind: "success",
        text: "Tâche terminée",
        action: {
          label: "Annuler",
          fn: () => {
            setTaskStatus(t.id, prev);
            setJustAdded((ja) => new Set(ja).add(t.id));
          },
        },
      });
    }, 1200);
    graceTimers.current.set(t.id, timer);
  };

  const cancelGrace = (id: string) => {
    const timer = graceTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      graceTimers.current.delete(id);
    }
    setLeaving((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };

  // Suppression (menu ⋯) — réversible via le toast.
  const deleteWithUndo = (t: Task) => {
    const kids = tasks.filter((x) => x.parentTaskId === t.id);
    removeTask(t.id);
    push({
      kind: "info",
      text: "Tâche supprimée",
      action: {
        label: "Annuler",
        fn: () => {
          addTask(t);
          for (const k of kids) addTask(k);
          setJustAdded((prev) => new Set(prev).add(t.id));
          requestAnimationFrame(() => {
            document
              .querySelector(`[data-task-id="${t.id}"]`)
              ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          });
        },
      },
    });
  };

  // Réordonnancement clavier (↑ / ↓ sur la poignée) — au sein de la colonne.
  const nudgeTask = (id: string, dir: -1 | 1) => {
    const t = visibleTasks.find((x) => x.id === id);
    if (!t) return;
    const siblings = tasksByGroup[groupKeyOf(t.status)];
    const gi = siblings.findIndex((x) => x.id === id);
    const neighbor = siblings[gi + dir];
    if (!neighbor) return;
    moveTask(id, neighbor.id, dir > 0);
  };

  const clearDrag = () => {
    if (springRef.current) {
      clearTimeout(springRef.current);
      springRef.current = null;
    }
    gripArmed.current = false;
    setDragId(null);
    setOverId(null);
    setOverAfter(false);
    setOverGroup(null);
  };

  const toggleCollapse = (key: StatusGroupKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clientForTask = (t: Task): Conversation | undefined => {
    // Lien direct par conversation source quand il existe (fiable), sinon
    // retombe sur l'heuristique historique par initiales d'avatar.
    if (t.conversationId) {
      const byId = conversations.find((c) => c.id === t.conversationId);
      if (byId) return byId;
    }
    const av = t.avatar;
    return av.kind === "initials" ? clients.find((c) => initialsOf(c.name) === av.text) : undefined;
  };

  // Ouvre la conversation source d'une tâche dans l'inbox.
  const openThread = (t: Task) => {
    if (!t.conversationId) return;
    setActiveConv(t.conversationId);
    setView("inbox");
  };

  // Demandes du brief triées par urgence : priorité haute d'abord, puis
  // échéance la plus proche. La plus pressante est toujours en tête.
  const orderedItems = useMemo(() => {
    if (phase !== "done" || !briefing) return [] as DailyBriefingItem[];
    const weight = { high: 0, medium: 1, low: 2 } as const;
    return briefing.items
      .filter((it) => !ignored.has(it.conversationId))
      .slice()
      .sort(
        (a, b) =>
          weight[a.priority] - weight[b.priority] ||
          (a.due ? Date.parse(a.due) : Number.POSITIVE_INFINITY) -
            (b.due ? Date.parse(b.due) : Number.POSITIVE_INFINITY)
      );
  }, [phase, briefing, ignored]);

  // Demandes encore en attente (pas déjà couvertes par une tâche ouverte).
  const suggestions = useMemo(
    () =>
      orderedItems.filter((it) => !tasks.some((t) => t.title === it.title && t.status !== "done")),
    [orderedItems, tasks]
  );

  // La sélection clavier reste dans les bornes quand la liste évolue.
  useEffect(() => {
    setSuggSel((i) => Math.max(0, Math.min(i, Math.max(0, suggestions.length - 1))));
  }, [suggestions.length]);

  // Triage au clavier, façon Linear : ↑↓ naviguer, 1/Entrée ajouter,
  // 2 modifier, 3 ignorer. Actif uniquement quand des demandes sont à l'écran.
  // (Pas de tableau de deps : le listener est ré-attaché à chaque rendu pour
  // capturer l'état frais ; les handlers sont déclarés plus bas dans le corps
  // et ne sont touchés qu'à l'exécution, après initialisation.)
  useEffect(() => {
    if (channels.length === 0 || view !== "today") return;
    if (phase !== "done") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase() ?? "";
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable)
        return;
      if (suggestions.length === 0) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        validateAll();
        return;
      }
      const cur = suggestions[Math.min(suggSel, suggestions.length - 1)];
      if (!cur) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggSel((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggSel((i) => Math.max(i - 1, 0));
      } else if (e.key === "1" || e.key === "Enter") {
        e.preventDefault();
        onValidate(cur);
      } else if (e.key === "2" || e.key === "3") {
        e.preventDefault();
        ignoreOne(cur);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (channels.length === 0) {
    return (
      <section className="today-view today-dash" aria-label="Cette semaine">
        <NoChannelsHero />
      </section>
    );
  }

  // Valide une suggestion du brief : tâche optimiste locale (avec lien vers la
  // conversation source + vraie échéance) + persistance serveur ancrée au fil.
  const validate = (it: DailyBriefingItem): Task | null => {
    if (tasks.some((t) => t.title === it.title && t.status !== "done")) return null;
    const conv = conversations.find((c) => c.id === it.conversationId);
    const task: Task = {
      id: `brief-${it.conversationId}-${Date.now()}`,
      title: it.title,
      priority: it.priority,
      dueLabel: dueMeta(it.due, "Aujourd'hui").label,
      status: "todo",
      avatar: conv?.avatar ?? { kind: "initials", text: initialsOf(it.contactName), bg: "#EAE6FF" },
      channel: conv?.channel ?? "gmail",
      sortableIndex: Date.now(),
      fromAI: true,
      conversationId: it.conversationId,
      dueAtIso: it.due,
    };
    addTask(task);
    void createTaskFromBrief({
      conversationId: it.conversationId,
      title: it.title,
      priority: it.priority,
      due: it.due,
      ...(it.why ? { description: it.why } : {}),
    });
    setJustAdded((prev) => new Set(prev).add(task.id));
    // Confirmation inline « ✓ Ajoutée » sur la ligne de la console, le temps
    // que l'œil suive la tâche qui vient d'apparaître dans la liste.
    setJustValidated((prev) => new Set(prev).add(it.conversationId));
    setTimeout(() => {
      setJustValidated((prev) => {
        const n = new Set(prev);
        n.delete(it.conversationId);
        return n;
      });
    }, 1600);
    return task;
  };

  const onValidate = (it: DailyBriefingItem) => {
    if (validate(it)) push({ kind: "success", text: `Ajouté aux tâches : ${it.title}` });
  };

  const ignoreOne = (it: DailyBriefingItem) => {
    setIgnored((prev) => new Set(prev).add(it.conversationId));
    push({
      kind: "info",
      text: "Suggestion ignorée",
      action: {
        label: "Annuler",
        fn: () =>
          setIgnored((prev) => {
            const next = new Set(prev);
            next.delete(it.conversationId);
            return next;
          }),
      },
    });
  };

  const validateAll = () => {
    const n = suggestions.length;
    if (n === 0) return;
    for (const it of suggestions) validate(it);
    // Pas de cascade de confirmations : un seul toast, console direct au calme.
    setJustValidated(new Set());
    setBulkHover(false);
    push({ kind: "success", text: `${n} tâche${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""}` });
  };

  // Lance l'analyse Mue. « auto » : résultats dès que la réponse arrive.
  // « manual » : stepper visible (relance volontaire).
  const startAnalyze = () => {
    setScanIdx(0);
    setBriefLoaded(false);
    setBriefing(null);
    setBriefError(null);
    setSuggSel(0);
    setPhase("reading");
    void dailyBriefing().then((res) => {
      setBriefing(res.briefing);
      setBriefError(res.error);
      setBriefLoaded(true);
      setLastRunAt(Date.now());
    });
  };

  // Une ligne de tâche (poignée + case + corps), réutilisée dans chaque colonne.
  const renderRow = (t: Task) => {
    const client = clientForTask(t);
    // « Coché » visuellement = terminé OU en délai de grâce avant le départ.
    const checked = t.status === "done" || leaving.has(t.id);
    const due = dueMeta(t.dueAtIso, t.dueLabel);
    // Une tâche terminée n'a plus à crier « en retard ».
    const dueTone = checked ? "normal" : due.tone;
    const isOver = overId === t.id && dragId !== null && dragId !== t.id;
    const kids = tasks.filter((x) => x.parentTaskId === t.id);
    const kidsDone = kids.filter((k) => k.status === "done").length;
    const showChannel = !!client || !!t.conversationId;
    return (
      <Fragment key={t.id}>
        <li
          className={`mt-row ${checked ? "is-done" : ""} ${justAdded.has(t.id) ? "is-new" : ""} ${
            dragId === t.id ? "is-dragging" : ""
          } ${isOver ? (overAfter ? "is-over-after" : "is-over-before") : ""} ${
            leaving.has(t.id) ? "is-leaving" : ""
          } ${landedId === t.id ? "is-landed" : ""}`}
          draggable
          onDragStart={(e) => {
            // Le glisser ne démarre QUE depuis la poignée (armée au mousedown).
            if (!gripArmed.current) {
              e.preventDefault();
              return;
            }
            setDragId(t.id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", t.id);
          }}
          onDragOver={(e) => {
            if (!dragId || dragId === t.id) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            const rect = e.currentTarget.getBoundingClientRect();
            setOverId(t.id);
            setOverAfter(e.clientY > rect.top + rect.height / 2);
            setOverGroup(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dropOnRow(t);
            clearDrag();
          }}
          onDragEnd={clearDrag}
          data-task-id={t.id}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: ligne pilotable au clavier (Espace coche, Backspace supprime)
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === " ") {
              e.preventDefault();
              if (leaving.has(t.id)) cancelGrace(t.id);
              else if (t.status === "done") setTaskStatus(t.id, "todo");
              else completeWithGrace(t);
            } else if (e.key === "Backspace") {
              e.preventDefault();
              deleteWithUndo(t);
            }
          }}
        >
          <button
            type="button"
            className="mt-grip"
            aria-label="Glisser pour déplacer la tâche"
            title="Glisser pour déplacer"
            onMouseDown={() => {
              gripArmed.current = true;
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                nudgeTask(t.id, -1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                nudgeTask(t.id, 1);
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="9" cy="6" r="1.6" />
              <circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" />
              <circle cx="15" cy="18" r="1.6" />
            </svg>
          </button>
          <button
            type="button"
            className="mt-check"
            aria-pressed={checked}
            aria-label={checked ? "Rouvrir la tâche" : "Marquer la tâche comme terminée"}
            onClick={() => {
              if (leaving.has(t.id)) {
                // Re-clic pendant la grâce : on annule le départ, rien ne bouge.
                cancelGrace(t.id);
                return;
              }
              if (t.status === "done") {
                setTaskStatus(t.id, "todo");
                return;
              }
              completeWithGrace(t);
            }}
          />
          <div className="mt-open">
            <span className="mt-title" title={t.title}>
              {renameId === t.id ? (
                <input
                  className="mt-rename"
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = renameVal.trim();
                      if (v) patchTask(t.id, { title: v });
                      setRenameId(null);
                    } else if (e.key === "Escape") setRenameId(null);
                  }}
                  onBlur={() => {
                    const v = renameVal.trim();
                    if (v) patchTask(t.id, { title: v });
                    setRenameId(null);
                  }}
                  // biome-ignore lint/a11y/noAutofocus: édition inline volontaire
                  autoFocus
                />
              ) : (
                <span
                  className="mt-title-text"
                  onDoubleClick={() => {
                    setRenameId(t.id);
                    setRenameVal(t.title);
                  }}
                >
                  {t.title}
                </span>
              )}
              {kids.length > 0 && (
                <button
                  type="button"
                  className="mt-subchip"
                  aria-expanded={expanded.has(t.id)}
                  aria-label={`${kidsDone} sous-tâche${kidsDone > 1 ? "s" : ""} terminée${kidsDone > 1 ? "s" : ""} sur ${kids.length}`}
                  onClick={() =>
                    setExpanded((s) => {
                      const n = new Set(s);
                      if (n.has(t.id)) n.delete(t.id);
                      else n.add(t.id);
                      return n;
                    })
                  }
                >
                  <span
                    className="mt-subchip-fill"
                    style={{ width: `${Math.round((kidsDone / kids.length) * 100)}%` }}
                    aria-hidden
                  />
                  <span className="mt-subchip-label">
                    {kidsDone}/{kids.length}
                  </span>
                </button>
              )}
            </span>
            <button
              type="button"
              className="mt-client"
              onClick={() => openThread(t)}
              disabled={!t.conversationId}
              aria-label={client ? `Ouvrir le fil de ${client.name}` : undefined}
            >
              {showChannel && (
                <span className="mt-chan" aria-hidden>
                  <ChannelLogo channel={client?.channel ?? t.channel} className="" />
                </span>
              )}
              <span className="mt-client-name">{client ? client.name : ""}</span>
            </button>
            {dateEditId === t.id ? (
              <input
                type="date"
                className="mt-due-edit"
                defaultValue={t.dueAtIso ? t.dueAtIso.slice(0, 10) : ""}
                onChange={(e) => {
                  const iso = e.target.value
                    ? new Date(`${e.target.value}T17:00:00`).toISOString()
                    : null;
                  patchTask(t.id, { dueAtIso: iso, dueLabel: dueMeta(iso, "Cette semaine").label });
                  setDateEditId(null);
                }}
                onBlur={() => setDateEditId(null)}
                onKeyDown={(e) => e.key === "Escape" && setDateEditId(null)}
                // biome-ignore lint/a11y/noAutofocus: édition inline volontaire
                autoFocus
              />
            ) : (
              <button
                type="button"
                className={`mt-due ${
                  dueTone === "overdue" ? "is-overdue" : dueTone === "today" ? "is-today" : ""
                }`}
                onClick={() => setDateEditId(t.id)}
                aria-label="Modifier l'échéance"
              >
                <svg
                  className="mt-cal"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
                  <line x1="3" y1="9.5" x2="21" y2="9.5" />
                  <line x1="8" y1="2.5" x2="8" y2="6" />
                  <line x1="16" y1="2.5" x2="16" y2="6" />
                </svg>
                {due.label}
              </button>
            )}
          </div>

          {/* Actions au survol : ouvrir le fil + menu ⋯ (modifier / supprimer). */}
          <div className="mt-actions">
            {t.conversationId && (
              <button
                type="button"
                className="mt-act"
                aria-label="Ouvrir le fil de discussion"
                data-tip="Ouvrir le fil"
                data-tip-side="left"
                onClick={() => openThread(t)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.6 8.6 0 0 1-3.5-.7L3 21l1.9-4.4a8.3 8.3 0 0 1-1.4-4.6A8.4 8.4 0 0 1 12 3.6a8.4 8.4 0 0 1 9 7.9z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="mt-act"
              aria-label="Plus d'actions"
              aria-expanded={menuFor === t.id}
              onClick={() => setMenuFor((cur) => (cur === t.id ? null : t.id))}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="5" cy="12" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="19" cy="12" r="1.7" />
              </svg>
            </button>
            {menuFor === t.id && (
              <div className="mt-menu" role="menu">
                <button
                  type="button"
                  className="mt-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuFor(null);
                    setEditingTask(t);
                  }}
                >
                  <Icon name="i-edit" />
                  Modifier
                </button>
                <button
                  type="button"
                  className="mt-menu-item is-danger"
                  role="menuitem"
                  onClick={() => {
                    setMenuFor(null);
                    deleteWithUndo(t);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </li>

        {/* Checklist dépliée : les sous-tâches en mini-lignes indentées. */}
        {expanded.has(t.id) &&
          kids.map((k) => (
            <li key={k.id} className={`mt-row mt-subrow ${k.status === "done" ? "is-done" : ""}`}>
              <button
                type="button"
                className="mt-check"
                aria-pressed={k.status === "done"}
                aria-label={
                  k.status === "done" ? "Rouvrir la sous-tâche" : "Terminer la sous-tâche"
                }
                onClick={() => {
                  const next = k.status === "done" ? "todo" : "done";
                  setTaskStatus(k.id, next);
                  if (
                    next === "done" &&
                    t.status !== "done" &&
                    kids.every((x) => x.id === k.id || x.status === "done")
                  ) {
                    push({
                      kind: "info",
                      text: "Toutes les sous-tâches sont faites",
                      action: { label: "Terminer la tâche", fn: () => setTaskStatus(t.id, "done") },
                    });
                  }
                }}
              />
              <div className="mt-open">
                <span className="mt-title" title={k.title}>
                  {k.title}
                </span>
                <span className="mt-client" />
                <span className="mt-due" />
                <span />
              </div>
            </li>
          ))}
      </Fragment>
    );
  };

  return (
    <section className="today-view today2" aria-label="Cette semaine">
      {/* Wavy premium banner to scan messages and create tasks with Mue */}
      <div className="tasks-banner">
        <div className="tasks-banner-content">
          <h2>Transformez vos messages récents en tâches avec Mue</h2>
          <p>
            Mue scanne automatiquement vos conversations en attente sur tous vos canaux (Gmail,
            Slack, WhatsApp...) pour y détecter des actions clés et vous suggérer de les ajouter
            comme tâches en un clic !
          </p>
        </div>
        <button
          type="button"
          className="tasks-banner-btn"
          onClick={() => {
            setMueOpen(true);
            setSuggestTasksOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden>
            <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
          </svg>
          Suggérer des tâches avec Mue
        </button>
      </div>

      {/* ───── Box tâches ───── */}
      <section className="mtasks" aria-label="Mes tâches">
        <div className="mt-groups">
          {STATUS_GROUPS.map((g) => {
            const rows = tasksByGroup[g.key];
            // « Terminé · 0 » n'apporte rien : la colonne n'apparaît qu'à la
            // première tâche cochée.
            if (g.key === "done" && rows.length === 0) return null;
            const isCollapsed = collapsed.has(g.key);
            const isDrop = overGroup === g.key && dragId !== null;
            return (
              <section
                key={g.key}
                className={`mt-group ${isCollapsed ? "is-collapsed" : ""} ${
                  isDrop ? "is-drop" : ""
                }`}
                data-status={g.key}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOverGroup(g.key);
                  setOverId(null);
                  // Spring-loaded : la colonne repliée se déplie après 400 ms
                  // de survol pendant un drag (pattern Finder).
                  if (isCollapsed && !springRef.current) {
                    springRef.current = setTimeout(() => {
                      springRef.current = null;
                      setCollapsed((prev) => {
                        const n = new Set(prev);
                        n.delete(g.key);
                        return n;
                      });
                    }, 400);
                  }
                }}
                onDragLeave={() => {
                  if (springRef.current) {
                    clearTimeout(springRef.current);
                    springRef.current = null;
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOnGroup(g.key);
                  clearDrag();
                }}
              >
                <button
                  type="button"
                  className="mt-group-head"
                  onClick={() => toggleCollapse(g.key)}
                  aria-expanded={!isCollapsed}
                >
                  <svg
                    className="mt-group-chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                  <span className="mt-group-name">{g.label}</span>
                  <span className="mt-group-count">{rows.length}</span>
                </button>

                {!isCollapsed && (
                  <ul className="mtasks-list">
                    {rows.map(renderRow)}
                    {rows.length === 0 && g.key !== "todo" && dragId !== null && (
                      <li className="mt-group-empty">Glissez une tâche ici</li>
                    )}
                    {g.key === "todo" && (
                      <li className="mt-add">
                        <div className="mt-add-main">
                          <span className="mt-add-icon" aria-hidden>
                            <Icon name="i-plus" />
                          </span>
                          <input
                            ref={addInputRef}
                            type="text"
                            className="mt-add-input"
                            placeholder="Ajouter une tâche… (Entrée)"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addQuickTask();
                              } else if (e.key === "Escape") {
                                setNewTitle("");
                                addInputRef.current?.blur();
                              } else if (
                                e.key === "ArrowUp" &&
                                !newTitle &&
                                lastCreatedId.current
                              ) {
                                e.preventDefault();
                                const last = tasks.find((x) => x.id === lastCreatedId.current);
                                if (last) {
                                  setNewTitle(last.title);
                                  removeTask(last.id);
                                  lastCreatedId.current = null;
                                }
                              }
                            }}
                          />
                        </div>
                      </li>
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </section>

      {/* Ferme le menu ⋯ au clic n'importe où ailleurs. */}
      {menuFor && (
        <button
          type="button"
          className="mt-menu-backdrop"
          aria-label="Fermer le menu"
          tabIndex={-1}
          onClick={() => setMenuFor(null)}
        />
      )}

      {editingTask && (
        <EditTaskModal task={editingTask} open onClose={() => setEditingTask(null)} />
      )}

      {/* No modal here, MuePanel handles the scanner now */}
    </section>
  );
}
