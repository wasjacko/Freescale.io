"use client";

import { MueFlower } from "@/components/MueFlower";
import { MueMemory } from "@/components/MueMemoryDrawer";
import { MueBadge, MueMsgActions, MueObjectCard, MueSuggestions } from "@/components/mue/MueBits";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { askMue, clearMueChat, listMueChatMessages } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { MUE_DISCUSSIONS, fmtAgo, groupDiscussions } from "@/lib/mue-discussions";
import { useApp } from "@/lib/store";
import type { Priority } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { MueTaskScanner } from "./SuggestTasksModal";

type ActionRef = { entity: "task"; id: string; title: string };
/** Tâche proposée par Mue avant création (étape de prévisualisation). */
type ProposedTask = {
  title: string;
  client: string | null;
  priority: Priority;
  dueLabel: string;
  dueAtIso: string;
};

type AskMessage = {
  id: string;
  role: "user" | "mue";
  kind?: "text" | "scan" | "action" | "privacy" | "preview" | "progress" | "result";
  content: string;
  tone?: "normal" | "error";
  action?: ActionRef;
  /** Suggestions de suivi (« Améliorations »). */
  improvements?: string[];
  /** kind="preview" — liste prévisualisée + destination, en attente de validation. */
  preview?: { tasks: ProposedTask[]; destination: string; done?: boolean };
  /** kind="progress" — exécution en cours, élément par élément. */
  progress?: { label: string; total: number; current: number };
  /** kind="result" — objets réellement créés (liens cliquables). */
  created?: ActionRef[];
};

type Mode = "ask" | "agents";

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Détecte une demande d'ACTION « créer une tâche / planifier » (mock NLU). */
function parseTaskRequest(
  msg: string
): { title: string; dueLabel: string; dueAtIso: string } | null {
  const lower = msg.toLowerCase();
  if (!/(t[aâ]che|task|planifie|bloque|ajoute|cr[ée]e|rdv|rendez|calendr)/.test(lower)) return null;

  // Titre : mot après « tâche/task », sinon après « ajoute/crée ».
  let title =
    msg.match(/t[aâ]ches?\s+(?:["«]\s*)?([\p{L}\p{N}-]{2,})/iu)?.[1] ??
    msg.match(
      /(?:ajoute|ajouter|cr[ée]e?r?|planifie|bloque)\s+(?:la\s+|le\s+|une\s+|un\s+|ma\s+)?(?:t[aâ]che\s+)?([\p{L}\p{N}-]{2,})/iu
    )?.[1] ??
    "";
  const STOP = new Set(["la", "le", "les", "une", "un", "ma", "mon", "tache", "tâche", "task"]);
  if (STOP.has(title.toLowerCase())) title = "";
  if (!title) title = "Nouvelle tâche";
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Jour : un jour de semaine cité, sinon demain.
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const wd = WEEKDAYS.findIndex((d) => lower.includes(d));
  if (wd >= 0) {
    let add = (wd - now.getDay() + 7) % 7;
    if (add === 0) add = 7; // « lundi » = le prochain
    due.setDate(due.getDate() + add);
  } else {
    due.setDate(due.getDate() + 1);
  }
  // Heure : « 8h », « 8 h », « 8am » ; défaut 9h.
  const hourMatch = lower.match(/(\d{1,2})\s*(?:h|am|:00)/);
  const hour = hourMatch ? Math.min(23, Number.parseInt(hourMatch[1] ?? "9", 10)) : 9;
  due.setHours(hour, 0, 0, 0);

  const dayLabel = due.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const dueLabel = `${dayLabel} · ${hour}h`;
  return { title, dueLabel, dueAtIso: due.toISOString() };
}

/** Détecte une demande de création MULTIPLE (« toutes mes tâches de la semaine »). */
function isMultiTaskRequest(msg: string): boolean {
  const l = msg.toLowerCase();
  return /(toutes?\s+(?:mes\s+)?t[aâ]ches|mes\s+t[aâ]ches\s+(?:de\s+la\s+semaine|pour\s+la\s+semaine|de\s+cette\s+semaine)|plusieurs\s+t[aâ]ches|liste\s+de\s+t[aâ]ches|planifie\s+ma\s+semaine)/.test(
    l
  );
}

/** Échéance étalée sur les N prochains jours ouvrés (mock). */
function dueInDays(offset: number): { dueLabel: string; dueAtIso: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let added = 0;
  while (added < offset) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  d.setHours(9, 0, 0, 0);
  const dayLabel = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return { dueLabel: dayLabel, dueAtIso: d.toISOString() };
}

/** Liste de tâches proposée par Mue (mock), ancrée sur les vrais clients. */
function proposeWeekTasks(): ProposedTask[] {
  const defs: { title: string; client: string | null; priority: Priority }[] = [
    { title: "Envoyer le contrat signé", client: "Thomas Aubry", priority: "high" },
    { title: "Relancer le devis", client: "David Kim", priority: "medium" },
    { title: "Préparer la proposition commerciale", client: "Alexandre Dupont", priority: "medium" },
    { title: "Réserver le coworking", client: null, priority: "low" },
    { title: "Mettre à jour le portfolio", client: null, priority: "low" },
  ];
  return defs.map((def, i) => {
    const due = dueInDays(i + 1);
    return { ...def, dueLabel: due.dueLabel, dueAtIso: due.dueAtIso };
  });
}


const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  viewBox: "0 0 24 24",
};

const MueMark = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="mue2-mark">
    <defs>
      <linearGradient id="mue2grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7aa2ff" />
        <stop offset="50%" stopColor="#b78cff" />
        <stop offset="100%" stopColor="#ff9d7a" />
      </linearGradient>
    </defs>
    <path
      d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z"
      fill="url(#mue2grad)"
    />
    <path
      d="M18.5 16l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"
      fill="url(#mue2grad)"
    />
  </svg>
);

/**
 * MuePanel — copilote Mue façon « Brain » : deux modes (Demander / Agents),
 * un composer à liseré dégradé, 3 suggestions, et une surface de chat pur.
 * Le scan de tâches se joue INLINE dans le chat (skeleton pastel → tâches).
 */
export function MuePanel() {
  const { activeConvId, mueOpen, setMueOpen, suggestTasksOpen, setSuggestTasksOpen } = useApp();
  const { conversations, addTask } = useData();
  const push = useToast((s) => s.push);

  const [mode, setMode] = useState<Mode>("ask");
  const [askInput, setAskInput] = useState("");
  const [askPending, setAskPending] = useState(false);
  const [askHistoryLoading, setAskHistoryLoading] = useState(false);
  const [askMessages, setAskMessages] = useState<AskMessage[]>([]);
  // Exécution agentique en cours (création multiple en cours, élément par élément).
  const [executing, setExecuting] = useState(false);
  // Tâche ouverte en détail (modal) suite à une action de Mue.
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  // Sélecteur de discussions (popover) : ouverture + recherche.
  const [discOpen, setDiscOpen] = useState(false);
  // Drawer « Mémoire » — alimente ce que Mue sait de toi.
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [discQuery, setDiscQuery] = useState("");
  const [currentDisc, setCurrentDisc] = useState<{ id: string; title: string } | null>(null);

  const conv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  // Recharge l'historique quand la conversation active change.
  useEffect(() => {
    if (activeConvId === undefined) return;
    setAskInput("");
    let cancelled = false;
    setAskHistoryLoading(true);
    listMueChatMessages({ conversationId: activeConvId || null })
      .then((result) => {
        if (cancelled) return;
        if (result.error) return setAskMessages([]);
        setAskMessages(
          result.messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
        );
      })
      .finally(() => {
        if (!cancelled) setAskHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConvId]);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [askMessages, askPending]);

  const runScan = () => {
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: "Suggérer des tâches" },
      { id: `scan-${Date.now()}`, role: "mue", kind: "scan", content: "" },
    ]);
  };

  // Lance une discussion « Confidentialité » avec un message Mue vidéo +
  // l'explication RGPD (zéro entraînement, stockage chiffré non exploitable).
  const runPrivacy = () => {
    setAskMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: "Comment Mue protège mes données ?",
      },
      {
        id: `priv-${Date.now()}`,
        role: "mue",
        kind: "privacy",
        content:
          "Tes échanges restent chez toi : Mue ne s'entraîne PAS sur tes messages, ils sont stockés chiffrés dans un espace dédié à ton compte, isolé du modèle et de nos équipes. Personne n'y accède — pas même nous.",
      },
    ]);
  };

  // Déclencheur externe (store) → scan inline.
  useEffect(() => {
    if (suggestTasksOpen) {
      setMode("ask");
      runScan();
      setSuggestTasksOpen(false);
    }
  }, [suggestTasksOpen, setSuggestTasksOpen]);

  const runAsk = async (raw: string) => {
    const question = raw.trim();
    if (!question || askPending) return;
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: question },
    ]);
    setAskInput("");
    setAskPending(true);
    try {
      const res = await askMue({ conversationId: activeConvId ?? null, question });
      const answer = res.answer ?? res.error ?? "Mue n'a pas pu répondre.";
      setAskMessages((prev) => [
        ...prev,
        {
          id: `mue-${Date.now()}`,
          role: "mue",
          content: answer,
          tone: res.error ? "error" : "normal",
        },
      ]);
    } catch (err) {
      setAskMessages((prev) => [
        ...prev,
        {
          id: `mue-${Date.now()}`,
          role: "mue",
          content: err instanceof Error ? err.message : "Mue n'a pas pu répondre.",
          tone: "error",
        },
      ]);
    } finally {
      setAskPending(false);
    }
  };

  // Action « créer une tâche » : Mue agit puis renvoie une chose CLIQUABLE
  // (ouvre la fiche détaillée). Suggestions de suivi façon « Améliorations ».
  const runTaskAction = (raw: string, parsed: NonNullable<ReturnType<typeof parseTaskRequest>>) => {
    const taskId = `mue-${Date.now()}`;
    addTask({
      id: taskId,
      title: parsed.title,
      priority: "medium",
      dueLabel: parsed.dueLabel,
      status: "todo",
      avatar: { kind: "initials", text: "WA", bg: "#4f46e5" },
      channel: "gmail",
      sortableIndex: Date.now(),
      fromAI: true,
      conversationId: null,
      dueAtIso: parsed.dueAtIso,
      createdAtIso: new Date().toISOString(),
    });
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: raw.trim() },
      {
        id: `act-${Date.now()}`,
        role: "mue",
        kind: "action",
        content: `C'est fait — j'ai créé la tâche avec échéance ${parsed.dueLabel} dans ta liste perso. Tu es bon 👍`,
        action: { entity: "task", id: taskId, title: parsed.title },
        improvements: [
          `Bloque 1h sur mon agenda pour ${parsed.title}`,
          "Crée un agent qui me rappelle mes tâches chaque matin",
          "Montre-moi mes tâches en retard cette semaine",
        ],
      },
    ]);
    setAskInput("");
  };

  // ── P2 · Création MULTIPLE : preview → confirmation → exécution → résultat ──
  // Étape 1 — prévisualisation (Niveau 3). Mue ne crée RIEN encore.
  const runMultiTaskPreview = (raw: string) => {
    const tasks = proposeWeekTasks();
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: raw.trim() },
      {
        id: `prev-${Date.now()}`,
        role: "mue",
        kind: "preview",
        content: `Voici ce que je propose — ${tasks.length} tâches dans ta liste perso :`,
        preview: { tasks, destination: "Ma liste perso" },
      },
    ]);
    setAskInput("");
  };

  // Étape 2 — exécution réelle (Niveau 4), élément par élément, après validation.
  const executeMultiTask = async (previewId: string, tasks: ProposedTask[]) => {
    if (executing) return;
    setExecuting(true);
    // Verrouille la carte de preview (boutons désactivés).
    setAskMessages((prev) =>
      prev.map((m) =>
        m.id === previewId && m.preview ? { ...m, preview: { ...m.preview, done: true } } : m
      )
    );
    const progId = `prog-${Date.now()}`;
    setAskMessages((prev) => [
      ...prev,
      {
        id: progId,
        role: "mue",
        kind: "progress",
        content: "",
        progress: { label: "Création des tâches", total: tasks.length, current: 0 },
      },
    ]);
    const created: ActionRef[] = [];
    for (let i = 0; i < tasks.length; i++) {
      await new Promise((r) => setTimeout(r, 420));
      const t = tasks[i];
      if (!t) continue;
      const id = `mue-${Date.now()}-${i}`;
      addTask({
        id,
        title: t.title,
        priority: t.priority,
        dueLabel: t.dueLabel,
        status: "todo",
        avatar: { kind: "initials", text: "WA", bg: "#4f46e5" },
        channel: "gmail",
        sortableIndex: Date.now() + i,
        fromAI: true,
        conversationId: null,
        dueAtIso: t.dueAtIso,
        createdAtIso: new Date().toISOString(),
      });
      created.push({ entity: "task", id, title: t.title });
      setAskMessages((prev) =>
        prev.map((m) =>
          m.id === progId && m.progress ? { ...m, progress: { ...m.progress, current: i + 1 } } : m
        )
      );
    }
    await new Promise((r) => setTimeout(r, 280));
    // Remplace le tracker par le résultat (liens cliquables + suggestions).
    setAskMessages((prev) =>
      prev
        .filter((m) => m.id !== progId)
        .concat([
          {
            id: `res-${Date.now()}`,
            role: "mue",
            kind: "result",
            content: `C'est fait — ${tasks.length} tâches créées dans Ma liste perso.`,
            created,
            improvements: [
              "Bloque du temps dans mon calendrier pour ces tâches",
              "Priorise-les selon leur urgence",
              "Crée un agent qui me relance le lundi",
            ],
          },
        ])
    );
    setExecuting(false);
  };

  // Aiguillage : action (tâche) si l'intention est détectée, sinon question.
  const submit = (raw: string) => {
    const text = raw.trim();
    if (!text || askPending || executing) return;
    // Multi-tâches → prévisualisation (Niveau 3) AVANT toute création.
    if (isMultiTaskRequest(text)) {
      runMultiTaskPreview(text);
      return;
    }
    const parsed = parseTaskRequest(text);
    if (parsed) {
      runTaskAction(text, parsed);
      return;
    }
    void runAsk(text);
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    submit(askInput);
  };

  // Actions sur un message Mue : copier / réessayer / feedback.
  const copyText = (text: string) => {
    void navigator.clipboard?.writeText(text);
    push({ kind: "success", text: "Copié." });
  };
  const retryFromIndex = (mi: number) => {
    for (let i = mi - 1; i >= 0; i--) {
      const prev = askMessages[i];
      if (prev?.role === "user") {
        submit(prev.content);
        return;
      }
    }
  };
  const feedback = (v: "up" | "down") =>
    push({ kind: "info", text: v === "up" ? "Merci pour ton retour 👍" : "Noté — je ferai mieux." });

  const handleClear = async () => {
    const previous = askMessages;
    setAskMessages([]);
    try {
      const result = await clearMueChat({ conversationId: activeConvId || null });
      if (!result.ok) {
        setAskMessages(previous);
        push({ kind: "error", text: result.error ?? "Impossible d'effacer." });
      }
    } catch {
      setAskMessages(previous);
    }
  };

  const askInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (mueOpen && mode === "ask") requestAnimationFrame(() => askInputRef.current?.focus());
  }, [mueOpen, mode]);

  if (!mueOpen) return null;

  const hasChat = askMessages.length > 0 || askPending || askHistoryLoading || executing;

  // 3 suggestions (cartes). « Suggérer des tâches » lance le scan inline.
  const suggestions = conv
    ? [
        {
          title: "Résumer ce fil",
          sub: "L'essentiel en 3 points",
          icon: "doc",
          run: () => runAsk("Résume ce fil"),
        },
        {
          title: "Proposer une réponse",
          sub: "Mue rédige pour toi",
          icon: "reply",
          run: () => runAsk("Propose une réponse à ce fil"),
        },
        { title: "Suggérer des tâches", sub: "Mue scanne ce client", icon: "spark", run: runScan },
      ]
    : [
        {
          title: "Suggérer des tâches",
          sub: "Mue scanne tes messages",
          icon: "spark",
          run: runScan,
        },
        {
          title: "Résumer ma journée",
          sub: "Ce qui compte aujourd'hui",
          icon: "doc",
          run: () => runAsk("Résume ma journée"),
        },
        {
          title: "Prioriser cette semaine",
          sub: "Mue ordonne tes tâches",
          icon: "bolt",
          run: () => runAsk("Aide-moi à prioriser cette semaine"),
        },
      ];

  const cardIcon = (k: string) => {
    if (k === "doc")
      return (
        <svg {...stroke}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      );
    if (k === "reply")
      return (
        <svg {...stroke}>
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      );
    if (k === "bolt")
      return (
        <svg {...stroke}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
      </svg>
    );
  };

  const composer = (
    <form className="mue2-composer" onSubmit={handleAsk}>
      <textarea
        ref={askInputRef}
        className="mue2-input"
        placeholder={
          askPending || executing
            ? "J'y travaille…"
            : askMessages.length > 0
              ? "Dis à Mue ce qu'elle doit faire ensuite"
              : "Besoin d'aide ? Pose une question, recherche ou crée."
        }
        value={askInput}
        onChange={(e) => setAskInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAsk(e);
          }
        }}
        rows={2}
        disabled={askPending || executing}
        aria-label="Demander à Mue"
      />
      <div className="mue2-composer-row">
        <span className="mue2-model">
          <MueMark size={15} /> Max
        </span>
        <button
          type="submit"
          className={`mue2-send ${askPending || executing ? "is-stop" : ""}`}
          aria-label={askPending || executing ? "Arrêter" : "Envoyer"}
          disabled={askPending || executing ? false : !askInput.trim()}
        >
          {askPending || executing ? (
            <svg {...stroke}>
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg {...stroke}>
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="6 11 12 5 18 11" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <aside className="copilot mue-pane mue2 is-open" aria-label="Mue copilot">
      <header className="mue2-head">
        <div className="mue2-disc-wrap">
          <button
            type="button"
            className="mue2-disc-btn"
            aria-haspopup="menu"
            aria-expanded={discOpen}
            onClick={() => setDiscOpen((v) => !v)}
          >
            <svg {...stroke} width={14} height={14}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
            </svg>
            {currentDisc?.title ?? "Nouvelle discussion"}
            <svg {...stroke} width={12} height={12}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {discOpen && (
            <>
              <button
                type="button"
                className="mue2-disc-scrim"
                aria-label="Fermer"
                onClick={() => setDiscOpen(false)}
              />
              <div className="mue2-disc-menu" role="menu">
                <div className="mue2-disc-search">
                  <svg {...stroke} width={14} height={14}>
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Rechercher une discussion…"
                    value={discQuery}
                    onChange={(e) => setDiscQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="mue2-disc-new"
                  onClick={() => {
                    setCurrentDisc(null);
                    void handleClear();
                    setDiscOpen(false);
                    setDiscQuery("");
                  }}
                >
                  <svg {...stroke} width={14} height={14}>
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  Nouvelle discussion
                </button>
                <div className="mue2-disc-list">
                  {groupDiscussions(
                    MUE_DISCUSSIONS.filter((d) =>
                      d.title.toLowerCase().includes(discQuery.trim().toLowerCase())
                    )
                  ).map((g) => (
                    <div key={g.key} className="mue2-disc-group">
                      <div className="mue2-disc-group-label">{g.label}</div>
                      {g.items.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`mue2-disc-item ${currentDisc?.id === d.id ? "is-on" : ""}`}
                          onClick={() => {
                            setCurrentDisc({ id: d.id, title: d.title });
                            // Mock : on garde le fil courant. (Brancher backend
                            // pour charger la vraie conversation par d.id.)
                            setDiscOpen(false);
                            setDiscQuery("");
                          }}
                        >
                          <svg {...stroke} width={13} height={13}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="mue2-disc-item-title">{d.title}</span>
                          <span className="mue2-disc-item-time">{fmtAgo(d.updatedAtIso)}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        {/* Tabs (Demander / Agents) déplacées au-dessus du composer
            pour qu'elles soient visuellement attachées au chat. */}
        <div className="mue2-head-actions">
          {askMessages.length > 0 && mode === "ask" && (
            <button
              type="button"
              className="mue-agent-iconbtn"
              onClick={handleClear}
              aria-label="Nouveau fil"
              title="Nouveau fil"
            >
              <svg {...stroke}>
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          )}
          {/* Mémoire — toggle inline (la vue Mémoire s'affiche dans le panel
              au lieu d'ouvrir un drawer séparé). */}
          <button
            type="button"
            className={`mue2-mem-btn ${memoryOpen ? "is-on" : ""}`}
            title={memoryOpen ? "Fermer la mémoire" : "Mémoire de Mue"}
            aria-label="Mémoire de Mue"
            aria-pressed={memoryOpen}
            onClick={() => setMemoryOpen((v) => !v)}
          >
            <svg {...stroke} width={15} height={15}>
              <rect x="3" y="5" width="18" height="5" rx="2" />
              <rect x="3" y="14" width="18" height="5" rx="2" />
              <line x1="7" y1="7.5" x2="7.01" y2="7.5" />
              <line x1="7" y1="16.5" x2="7.01" y2="16.5" />
            </svg>
            Mémoire
          </button>
          <button
            type="button"
            className="mue-agent-iconbtn"
            onClick={() => setMueOpen(false)}
            aria-label="Replier Mue"
            title="Replier"
          >
            <svg {...stroke}>
              <polyline points="9 6 15 12 9 18" />
              <polyline points="15 6 21 12 15 18" />
            </svg>
          </button>
        </div>
      </header>

      {/* CTA RGPD — sous l'en-tête, visible uniquement quand le chat est vide
          ET que la mémoire n'est pas ouverte. */}
      {mode === "ask" && !hasChat && !memoryOpen && (
        <button type="button" className="mue2-privacy-cta" onClick={runPrivacy}>
          <span className="mue2-privacy-thumb" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              width={10}
              height={10}
              fill="currentColor"
              className="mue2-privacy-play"
              aria-hidden
            >
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </span>
          <span className="mue2-privacy-tx">
            <b>Comment Mue protège tes données</b>
            <small>Vidéo · 1 min</small>
          </span>
          <span className="mue2-privacy-arrow" aria-hidden>
            →
          </span>
        </button>
      )}

      {memoryOpen ? (
        <div className="mue2-memory-wrap">
          <MueMemory />
        </div>
      ) : mode === "agents" ? (
        <div className="mue2-agents">
          <span className="mue2-agents-orb">
            <svg {...stroke} width={26} height={26}>
              <rect x="3" y="8" width="18" height="11" rx="3" />
              <circle cx="8.5" cy="13.5" r="1.6" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="13.5" r="1.6" fill="currentColor" stroke="none" />
              <path d="M12 4v4" />
            </svg>
          </span>
          <h2>Agents Mue</h2>
          <p>
            Bientôt : des agents qui agissent seuls (relances, tri, brouillons) pendant que tu fais
            autre chose.
          </p>
        </div>
      ) : !hasChat ? (
        // ── État vide : hero logo + Mue + chips condensés + composer en bas ──
        <>
          <div className="mue2-hero">
            <span className="mue2-hero-mark">
              <MueFlower size={60} />
            </span>
            <h2 className="mue2-hero-title">Mue</h2>
          </div>
          <div className="mue2-chips" aria-label="Suggestions">
            {suggestions.map((s) => (
              <button
                key={s.title}
                type="button"
                className={`mue2-chip mue2-chip--${s.icon}`}
                onClick={s.run}
              >
                <span className="mue2-chip-ic">{cardIcon(s.icon)}</span>
                {s.title}
              </button>
            ))}
          </div>
          <div className="mue2-foot">{composer}</div>
        </>
      ) : (
        // ── Chat pur ──
        <>
          <div className="mue2-chat" ref={logRef} aria-live="polite">
            {askHistoryLoading && <div className="mue2-msg is-mue">Chargement…</div>}
            {askMessages.map((m, mi) =>
              m.role === "user" ? (
                <div key={m.id} className="mue2-msg is-user">
                  {m.content}
                </div>
              ) : m.kind === "scan" ? (
                <div key={m.id} className="mue2-msg is-mue mue2-msg--scan">
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <MueTaskScanner inline />
                </div>
              ) : m.kind === "privacy" ? (
                <div key={m.id} className="mue2-msg is-mue mue2-msg--privacy">
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  {/* Lecteur vidéo (mock) — RGPD & confidentialité. */}
                  <div className="mue2-video" role="group" aria-label="Vidéo confidentialité">
                    <div className="mue2-video-thumb">
                      <span className="mue2-video-shield" aria-hidden>
                        <svg {...stroke} width={28} height={28}>
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <polyline points="9 12 11 14 15 10" />
                        </svg>
                      </span>
                      <button type="button" className="mue2-video-play" aria-label="Lire la vidéo">
                        <svg
                          viewBox="0 0 24 24"
                          width={22}
                          height={22}
                          fill="currentColor"
                          aria-hidden
                        >
                          <polygon points="6 4 20 12 6 20 6 4" />
                        </svg>
                      </button>
                      <span className="mue2-video-time">1:02</span>
                      <span className="mue2-video-title">RGPD & Confidentialité</span>
                    </div>
                    <ul className="mue2-video-bullets">
                      <li>
                        <svg {...stroke} width={14} height={14}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Aucun entraînement sur tes messages
                      </li>
                      <li>
                        <svg {...stroke} width={14} height={14}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Stockage chiffré, espace isolé de ton compte
                      </li>
                      <li>
                        <svg {...stroke} width={14} height={14}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Non exploitable — par le modèle ni par nous
                      </li>
                      <li>
                        <svg {...stroke} width={14} height={14}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Suppression définitive à tout moment
                      </li>
                    </ul>
                  </div>
                  <div className="mue2-msg-body">{m.content}</div>
                </div>
              ) : m.kind === "preview" && m.preview ? (
                <div key={m.id} className="mue2-msg is-mue">
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <div className="mue2-msg-body">{m.content}</div>
                  <div className="mue2-prev">
                    {m.preview.tasks.map((t, i) => (
                      <div key={i} className="mue2-prev-row">
                        <span className="mue2-prev-ic" aria-hidden>
                          <svg {...stroke} width={14} height={14}>
                            <rect x="4" y="4" width="16" height="16" rx="4" />
                          </svg>
                        </span>
                        <span className="mue2-prev-main">
                          <span className="mue2-prev-title">{t.title}</span>
                          <span className="mue2-prev-meta">
                            {t.dueLabel}
                            {t.client ? ` · ${t.client}` : ""}
                          </span>
                        </span>
                        <MueBadge kind="priority" value={t.priority} />
                      </div>
                    ))}
                    <div className="mue2-prev-dest">
                      <svg {...stroke} width={13} height={13}>
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                      Destination : <strong>{m.preview.destination}</strong>
                    </div>
                  </div>
                  <div className="mue2-cfm">
                    <button
                      type="button"
                      className="mue2-cfm-btn is-primary"
                      disabled={m.preview.done}
                      onClick={() => void executeMultiTask(m.id, m.preview!.tasks)}
                    >
                      {m.preview.done ? "✓ En cours…" : "Oui, crée-les dans ma liste"}
                    </button>
                    <button
                      type="button"
                      className="mue2-cfm-btn"
                      disabled={m.preview.done}
                      onClick={() =>
                        push({ kind: "info", text: "Choix d'une autre liste — bientôt." })
                      }
                    >
                      Choisir une autre liste
                    </button>
                    <button
                      type="button"
                      className="mue2-cfm-btn"
                      disabled={m.preview.done}
                      onClick={() =>
                        push({ kind: "info", text: "Édition avant création — bientôt." })
                      }
                    >
                      Modifier avant création
                    </button>
                  </div>
                </div>
              ) : m.kind === "progress" && m.progress ? (
                <div key={m.id} className="mue2-msg is-mue">
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue · au travail
                  </div>
                  <div className="mue2-prog">
                    <div className="mue2-prog-line">
                      <span className="mue2-prog-spin" aria-hidden>
                        <svg {...stroke} width={14} height={14}>
                          <path d="M12 3a9 9 0 1 0 9 9" />
                        </svg>
                      </span>
                      {m.progress.label} {m.progress.current}/{m.progress.total}
                    </div>
                    <div className="mue2-prog-track" aria-hidden>
                      <span
                        className="mue2-prog-fill"
                        style={{
                          width: `${Math.round((m.progress.current / m.progress.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : m.kind === "result" ? (
                <div key={m.id} className="mue2-msg is-mue">
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <div className="mue2-msg-body">
                    <span className="mue2-result-check" aria-hidden>
                      <svg {...stroke} width={15} height={15}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {m.content}
                  </div>
                  {m.created && m.created.length > 0 && (
                    <div className="mue2-result-list">
                      {m.created.map((c) => (
                        <MueObjectCard
                          key={c.id}
                          title={c.title}
                          onOpen={() => setDetailTaskId(c.id)}
                        />
                      ))}
                    </div>
                  )}
                  <MueSuggestions label="Et ensuite" items={m.improvements ?? []} onPick={submit} />
                </div>
              ) : (
                <div
                  key={m.id}
                  className={`mue2-msg is-mue ${m.tone === "error" ? "is-error" : ""}`}
                >
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <div className="mue2-msg-body">
                    {m.content}
                    {m.action && (
                      <MueObjectCard
                        title={m.action.title}
                        onOpen={() => setDetailTaskId(m.action?.id ?? null)}
                      />
                    )}
                  </div>
                  <MueSuggestions
                    label="Améliorations"
                    items={m.improvements ?? []}
                    onPick={submit}
                  />
                  {m.tone !== "error" && (
                    <MueMsgActions
                      onCopy={() => copyText(m.content)}
                      onRetry={() => retryFromIndex(mi)}
                      onFeedback={feedback}
                    />
                  )}
                </div>
              )
            )}
            {askPending && (
              <div className="mue2-msg is-mue">
                <div className="mue2-msg-head">
                  <MueMark size={16} /> Mue
                </div>
                <div className="mue2-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
          <div className="mue2-foot">{composer}</div>
        </>
      )}

      {detailTaskId && (
        <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}

    </aside>
  );
}
