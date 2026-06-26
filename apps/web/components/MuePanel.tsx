"use client";

import { MueFlower } from "@/components/MueFlower";
import { MueMemory } from "@/components/MueMemoryDrawer";
import {
  MueBadge,
  MueInlineRef,
  MueMsgActions,
  MueObjectCard,
  MueSuggestions,
} from "@/components/mue/MueBits";
import { type DevisDoc, MueDocModal } from "@/components/mue/MueDocModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { askMue, clearMueChat, listMueChatMessages } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { MUE_DISCUSSIONS, fmtAgo, groupDiscussions } from "@/lib/mue-discussions";
import { useApp } from "@/lib/store";
import type { Priority, ViewId } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { MueTaskScanner } from "./SuggestTasksModal";

type ActionRef = {
  entity: "task" | "conversation" | "client" | "event" | "document";
  id: string;
  title: string;
  meta?: string;
  badge?: string;
};
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
  kind?:
    | "text"
    | "scan"
    | "action"
    | "privacy"
    | "preview"
    | "progress"
    | "result"
    | "refusal"
    | "slots";
  content: string;
  tone?: "normal" | "error";
  action?: ActionRef;
  /** Suggestions de suivi (« Améliorations »). */
  improvements?: string[];
  /** kind="refusal" — limite expliquée + alternative manuelle (CTA optionnel). */
  refusal?: { alternative: string; cta?: { label: string; view: ViewId } };
  /** kind="slots" — créneaux proposés (agenda), en attente du choix utilisateur. */
  slots?: { options: string[]; dayLabel: string; day: number; done?: boolean };
  /** kind="preview" — liste prévisualisée + destination, en attente de validation. */
  preview?: { tasks: ProposedTask[]; destination: string; done?: boolean };
  /** kind="progress" — exécution en cours, élément par élément. */
  progress?: { label: string; total: number; current: number };
  /** kind="result" — objets réellement créés (liens cliquables). */
  created?: ActionRef[];
  /** Objets cités par Mue (réponse informative) — cliquables, ouvrent le canvas. */
  sources?: ActionRef[];
  /** Réfs inline dans le contenu (tokens {{r:KEY}}) — liens cliquables dans la prose. */
  inlineRefs?: Record<string, ActionRef>;
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

/** Détecte une demande de DOCUMENT (devis/facture/présentation/contrat). */
function isDocRequest(msg: string): boolean {
  const l = msg.toLowerCase();
  return /(devis|facture|présentation|presentation|contrat)/.test(l) && /(cr[ée]e|génér|fais|rédige|prépare|prepare)/.test(l);
}

/** Détecte une demande de PLANIFICATION d'un créneau (agenda). */
function isScheduleRequest(msg: string): boolean {
  const l = msg.toLowerCase();
  return /(cr[ée]neau|rendez-vous|\brdv\b|call|réunion|reunion|appel)/.test(l) && /(bloque|r[ée]serve|cale|planifie|trouve|pose|prends)/.test(l);
}

/** Extrait un prénom/nom après « pour » (« un devis pour Jean-Pierre »). */
function extractClientName(msg: string): string {
  const m = msg.match(/pour\s+([\p{L}][\p{L}\s-]{1,30})/u);
  const name = m?.[1]?.trim().replace(/\s+/g, " ");
  return name && name.length > 1 ? name : "un client";
}

/** Convertit « 10h » / « 10h30 » en minutes depuis 8h (base de CalEvent). */
function slotToStartMinutes(slot: string): number {
  const m = slot.match(/(\d{1,2})\s*h\s*(\d{2})?/);
  const h = m ? Number.parseInt(m[1] ?? "10", 10) : 10;
  const min = m?.[2] ? Number.parseInt(m[2], 10) : 0;
  return (h - 8) * 60 + min;
}

/** Détecte une action DESTRUCTIVE / de masse que Mue doit refuser. */
function isDestructiveRequest(msg: string): boolean {
  const l = msg.toLowerCase();
  return /(supprime|efface|vide|retire|delete).*(tout|toutes|mes\s+t[aâ]ches|corbeille|conversations?|clients?)/.test(
    l
  );
}

/** Détecte une demande de PRIORISATION / focus (réponse informative, Niveau 1→2). */
function isFocusRequest(msg: string): boolean {
  const l = msg.toLowerCase();
  return /(sur quoi.*(?:concentr|focus)|me concentr|mes? priorit|qui me doit|qui attend|à r[ée]pondre|que faire|quoi faire|par quoi commenc)/.test(
    l
  );
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


// Raccourcis d'intention (façon ClickUp Brain) — chaque pill ouvre une liste
// de suggestions adaptées à Freescale ; le clic PRÉREMPLIT le composer (pas d'envoi).
type Intent = { key: string; label: string; icon: string; suggestions: string[] };
const INTENTIONS: Intent[] = [
  {
    key: "find",
    label: "Trouver",
    icon: "search",
    suggestions: [
      "Retrouve le dernier message de Sarah Lemoine",
      "Trouve les devis envoyés ce mois",
      "Où en est le projet Refonte produit V2 ?",
    ],
  },
  {
    key: "research",
    label: "Rechercher",
    icon: "compass",
    suggestions: [
      "Cherche les fils où on parle de paiement en retard",
      "Liste les relances en attente",
      "Trouve les clients silencieux depuis 10 jours",
    ],
  },
  {
    key: "create",
    label: "Créer",
    icon: "plus",
    suggestions: [
      "Crée un devis pour Jean-Pierre",
      "Crée une tâche : envoyer le contrat à Thomas",
      "Rédige une relance pour David Kim",
    ],
  },
  {
    key: "edit",
    label: "Modifier",
    icon: "pencil",
    suggestions: [
      "Reformule ce brouillon en plus chaleureux",
      "Change l'échéance de cette tâche à lundi",
      "Passe cette tâche en Terminé",
    ],
  },
  {
    key: "analyze",
    label: "Analyser",
    icon: "chart",
    suggestions: [
      "Quels clients me doivent une réponse ?",
      "Analyse ma santé client cette semaine",
      "Quel client rapporte le plus ?",
    ],
  },
  {
    key: "prioritize",
    label: "Prioriser",
    icon: "flag",
    suggestions: [
      "Sur quoi je me concentre maintenant ?",
      "Organise ma file selon ce qui compte",
      "Quel client relancer en premier ?",
      "Trie mes nouvelles tâches entrantes",
    ],
  },
  {
    key: "plan",
    label: "Planifier",
    icon: "calendar",
    suggestions: [
      "Bloque un créneau pour le call découverte",
      "Planifie ma semaine à partir de mes tâches",
      "Trouve un moment pour rappeler David Kim",
    ],
  },
];

function intentIcon(k: string) {
  const s = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    width: 14,
    height: 14,
  };
  switch (k) {
    case "search":
      return (
        <svg {...s}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "compass":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="16 8 14 14 8 16 10 10 16 8" />
        </svg>
      );
    case "plus":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...s}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      );
    case "chart":
      return (
        <svg {...s}>
          <polyline points="3 13 7 9 11 13 17 7" />
          <polyline points="13 7 17 7 17 11" />
        </svg>
      );
    case "flag":
      return (
        <svg {...s}>
          <line x1="5" y1="22" x2="5" y2="4" />
          <path d="M5 4h12l-2 4 2 4H5" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...s}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="3" x2="8" y2="7" />
          <line x1="16" y1="3" x2="16" y2="7" />
        </svg>
      );
    default:
      return null;
  }
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
export function MuePanel({ userName = null }: { userName?: string | null }) {
  const {
    activeConvId,
    mueOpen,
    setMueOpen,
    suggestTasksOpen,
    setSuggestTasksOpen,
    setActiveConv,
    setActiveClientId,
    setView,
  } = useApp();
  const { conversations, addTask, createEvent } = useData();
  const push = useToast((s) => s.push);

  const [mode, setMode] = useState<Mode>("ask");
  const [askInput, setAskInput] = useState("");
  const [askPending, setAskPending] = useState(false);
  const [askHistoryLoading, setAskHistoryLoading] = useState(false);
  const [askMessages, setAskMessages] = useState<AskMessage[]>([]);
  // Exécution agentique en cours (création multiple en cours, élément par élément).
  const [executing, setExecuting] = useState(false);
  // P5 — modale « Arrêter de générer ? » + annulation de l'exécution en cours.
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const cancelRef = useRef(false);
  // P4 — document (devis) ouvert dans une surface par-dessus le canvas.
  const [openDoc, setOpenDoc] = useState<DevisDoc | null>(null);
  const docsRef = useRef<Record<string, DevisDoc>>({});
  // Raccourci d'intention déplié (façon ClickUp Brain) — null = pills affichées.
  const [activeIntent, setActiveIntent] = useState<string | null>(null);

  const firstName = (userName ?? "").trim().split(/\s+/)[0] || "toi";
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

  // P3 — quand Mue ouvre un objet (clic carte), on navigue le canvas SANS
  // recharger/écraser le fil en cours. Ce flag dit à l'effet de sauter le reload.
  const skipReload = useRef(false);

  // Recharge l'historique quand la conversation active change.
  useEffect(() => {
    if (activeConvId === undefined) return;
    if (skipReload.current) {
      skipReload.current = false;
      return;
    }
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

  // Scroll « façon chat IA » : à chaque NOUVEAU message utilisateur, on ancre
  // ce message en HAUT du fil (la réponse se déroule en dessous, on scrolle
  // pour revoir les échanges précédents). Sur les mises à jour de la réponse,
  // on ne re-scrolle pas (l'utilisateur lit depuis le haut).
  const logRef = useRef<HTMLDivElement>(null);
  const lastUserCountRef = useRef(0);
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const userCount = askMessages.filter((m) => m.role === "user").length;
    if (userCount > lastUserCountRef.current) {
      lastUserCountRef.current = userCount;
      requestAnimationFrame(() => {
        const users = el.querySelectorAll<HTMLElement>(".mue2-msg.is-user");
        const last = users[users.length - 1];
        if (last) el.scrollTop = last.offsetTop - 12;
      });
    } else if (userCount < lastUserCountRef.current) {
      lastUserCountRef.current = userCount; // reset (nouveau fil / clear)
    }
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
    cancelRef.current = false;
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
      if (cancelRef.current) break; // P5 — exécution annulée (fermeture pendant génération)
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
    const cancelled = cancelRef.current;
    const n = created.length;
    // Remplace le tracker par le résultat (liens cliquables + suggestions).
    setAskMessages((prev) =>
      prev
        .filter((m) => m.id !== progId)
        .concat([
          {
            id: `res-${Date.now()}`,
            role: "mue",
            kind: "result",
            content: cancelled
              ? `Arrêté — ${n} ${n > 1 ? "tâches créées" : "tâche créée"} avant l'interruption.`
              : `C'est fait — ${n} tâches créées dans Ma liste perso.`,
            created,
            improvements: cancelled
              ? ["Reprends la création des tâches restantes", "Montre-moi ce qui a été créé"]
              : [
                  "Bloque du temps dans mon calendrier pour ces tâches",
                  "Priorise-les selon leur urgence",
                  "Crée un agent qui me relance le lundi",
                ],
          },
        ])
    );
    cancelRef.current = false;
    setExecuting(false);
  };

  // ── P3 · Ouvre un objet cité dans le canvas SANS fermer Mue ──
  const openObject = (ref: ActionRef) => {
    switch (ref.entity) {
      case "task":
        setDetailTaskId(ref.id);
        break;
      case "conversation":
        skipReload.current = true;
        setActiveConv(ref.id);
        setView("inbox");
        break;
      case "client":
        setActiveClientId(ref.id);
        setView("clients");
        break;
      case "event":
        setView("calendar");
        break;
      case "document": {
        const d = docsRef.current[ref.id];
        if (d) setOpenDoc(d);
        break;
      }
    }
  };

  // Rend une prose Mue avec liens objets INLINE (tokens {{r:KEY}}) + paragraphes.
  const renderRich = (content: string, refs?: Record<string, ActionRef>) => {
    return content.split("\n\n").map((para, pi) => {
      const parts = para.split(/(\{\{r:\w+\}\})/g);
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: contenu statique mock
        <p key={pi} className="mue2-rich-p">
          {parts.map((part, i) => {
            const tok = part.match(/^\{\{r:(\w+)\}\}$/);
            const ref = tok ? refs?.[tok[1] ?? ""] : undefined;
            if (ref) {
              return (
                <MueInlineRef
                  // biome-ignore lint/suspicious/noArrayIndexKey: ordre stable
                  key={i}
                  label={ref.title}
                  badge={ref.badge}
                  onOpen={() => openObject(ref)}
                />
              );
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: ordre stable
            return <span key={i}>{part}</span>;
          })}
        </p>
      );
    });
  };
  // Contenu « propre » (tokens remplacés par les noms) pour le bouton Copier.
  const cleanContent = (m: AskMessage) =>
    m.inlineRefs
      ? m.content.replace(/\{\{r:(\w+)\}\}/g, (_, k) => m.inlineRefs?.[k]?.title ?? "")
      : m.content;

  // ── P4 · Création de DOCUMENT (devis) — demande claire → création directe
  // (Niveau 4). Le document s'ouvre dans une surface par-dessus le canvas. */
  const runDocument = (raw: string) => {
    const client = extractClientName(raw);
    const id = `doc-${Date.now()}`;
    // Société dérivée des initiales (mock) : « Jean Pierre » → « JP Consulting ».
    const initials = client
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3);
    const company = `${initials} Consulting`;
    const emailHandle = client.toLowerCase().replace(/\s+/g, ".");
    const lines = [
      { label: "Logo & identité visuelle", amount: 1500 },
      { label: "Charte graphique", amount: 1200 },
      { label: "Carte de visite", amount: 350 },
      { label: "Templates réseaux sociaux", amount: 500 },
    ];
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const vat = Math.round(subtotal * 0.2);
    const total = subtotal + vat;
    const doc: DevisDoc = {
      id,
      ref: `#2026-${String(Math.floor(Date.now() / 1000) % 1000).padStart(3, "0")}`,
      dateLabel: new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      validity: "30 jours",
      client: {
        name: client,
        company,
        email: `${emailHandle}@${initials.toLowerCase()}-consulting.fr`,
        phone: "06 12 34 56 78",
        address: "42 rue des Lilas, 75011 Paris",
      },
      provider: {
        name: `${firstName} — Designer graphique freelance`,
        role: "Identité de marque & design produit",
        email: `${firstName.toLowerCase()}@freescale.site`,
      },
      lines,
      subtotal,
      vat,
      total,
      terms: "Conditions de paiement : 40 % à la commande, 60 % à la livraison · Délai 3–4 semaines.",
    };
    docsRef.current[id] = doc;
    setOpenDoc(doc);
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: raw.trim() },
      {
        id: `res-${Date.now()}`,
        role: "mue",
        kind: "result",
        content:
          `Done, voici ton devis fictif. J'ai simulé ${client} (${company}) avec un pack branding ` +
          `classique — logo, charte, carte de visite, templates réseaux — pour ${total.toLocaleString("fr-FR")} € TTC. ` +
          `Conditions 40/60, délai 3–4 semaines. Tu peux l'adapter directement dans le document.`,
        created: [{ entity: "document", id, title: `Devis ${doc.ref} — ${client}`, badge: "Brouillon" }],
        improvements: [
          "Transforme ce devis en présentation slides",
          "Bloque un créneau lundi pour le call découverte",
          "Sauvegarde mes tarifs en mémoire pour les prochains devis",
        ],
      },
    ]);
    setAskInput("");
  };

  // ── P4 · Planification — Mue lit les dispos, propose des créneaux (kind=slots),
  // crée l'événement seulement APRÈS le choix de l'utilisateur. */
  const runSlots = (raw: string) => {
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: raw.trim() },
      {
        id: `slots-${Date.now()}`,
        role: "mue",
        kind: "slots",
        content: "Tu es libre dès 10h lundi. Choisis un créneau :",
        slots: { options: ["10h", "10h30", "11h", "11h30", "12h"], dayLabel: "lundi", day: 1 },
      },
    ]);
    setAskInput("");
  };

  const confirmSlot = async (slotsId: string, slot: string, day: number, dayLabel: string) => {
    setAskMessages((prev) =>
      prev.map((m) => (m.id === slotsId && m.slots ? { ...m, slots: { ...m.slots, done: true } } : m))
    );
    const start = slotToStartMinutes(slot);
    const duration = 45;
    await createEvent({
      title: "Call découverte",
      day,
      startMinutes: start,
      durationMinutes: duration,
      color: "lav",
    });
    const fmt = (mins: number) => {
      const h = 8 + Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h${m === 0 ? "00" : m}`;
    };
    setAskMessages((prev) => [
      ...prev,
      {
        id: `res-${Date.now()}`,
        role: "mue",
        kind: "result",
        content: `C'est posé : ${dayLabel}, ${fmt(start)}–${fmt(start + duration)} (Europe/Paris), lien Meet inclus.`,
        created: [{ entity: "event", id: `ev-${Date.now()}`, title: "Call découverte", badge: "Agenda" }],
        improvements: ["Prépare l'ordre du jour du call", "Crée une note de réunion"],
      },
    ]);
  };

  // ── P3 · Réponse informative (Niveau 1→2) : cite des objets cliquables,
  // ne modifie RIEN, propose des suites. Ancré sur les vrais fils/clients. */
  const runFocus = (raw: string) => {
    // Réfs cliquables EMBARQUÉES dans la prose (tokens {{r:KEY}}) — façon Brain.
    const inlineRefs: Record<string, ActionRef> = {
      thomas: { entity: "conversation", id: "c2", title: "Thomas Aubry", badge: "À répondre" },
      david: { entity: "conversation", id: "c9", title: "David Kim", badge: "À relancer" },
      alex: { entity: "conversation", id: "c7", title: "Alexandre Dupont", badge: "En cours" },
    };
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: raw.trim() },
      {
        id: `focus-${Date.now()}`,
        role: "mue",
        kind: "text",
        content:
          "Rien en retard côté tâches, c'est bon signe. Mais 3 fils clients te réclament, par ordre d'urgence.\n\n" +
          "Je commencerais par {{r:thomas}} — il attend le contrat signé depuis 2 jours. " +
          "Ensuite {{r:david}}, silencieux depuis 12 jours avec 6 500 € à suivre. " +
          "Puis {{r:alex}}, qui attend ton retour sur les livrables.\n\n" +
          "Tu veux que je traite ces 3 fils dans cet ordre ?",
        inlineRefs,
        improvements: [
          "Rédige une relance pour David Kim",
          "Crée mes tâches de la semaine",
          "Bloque du temps pour le contrat de Thomas",
        ],
      },
    ]);
    setAskInput("");
  };

  // ── P5 · Refus gracieux d'une action destructive + alternative manuelle ──
  const runRefusal = (raw: string) => {
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: raw.trim() },
      {
        id: `ref-${Date.now()}`,
        role: "mue",
        kind: "refusal",
        content:
          "Je ne peux pas supprimer en masse — c'est une action sensible et irréversible.",
        refusal: {
          alternative:
            "Sélectionne les éléments dans le Tableau, puis envoie-les à la Corbeille d'un clic.",
          cta: { label: "Ouvrir le Tableau", view: "tasks" },
        },
        improvements: ["Archive les tâches terminées", "Montre-moi les tâches en retard"],
      },
    ]);
    setAskInput("");
  };

  // Aiguillage : action (tâche) si l'intention est détectée, sinon question.
  const submit = (raw: string) => {
    const text = raw.trim();
    if (!text || askPending || executing) return;
    // Destructif → refus (Niveau 0), AVANT toute autre intention.
    if (isDestructiveRequest(text)) {
      runRefusal(text);
      return;
    }
    // Document (devis…) → création directe + ouverture canvas (Niveau 4).
    if (isDocRequest(text)) {
      runDocument(text);
      return;
    }
    // Planification → propose des créneaux (Niveau 3), crée après choix.
    if (isScheduleRequest(text)) {
      runSlots(text);
      return;
    }
    // Priorisation / focus → réponse informative (Niveau 1→2), aucune mutation.
    if (isFocusRequest(text)) {
      runFocus(text);
      return;
    }
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

  // On n'inclut PAS askHistoryLoading : sinon le chargement async de
  // l'historique affiche une vue « Chargement… » au lieu du hero à l'ouverture.
  // L'état vide (hero + intentions) s'affiche tout de suite ; si un historique
  // existe vraiment, il peuple askMessages et bascule alors sur le chat.
  const hasChat = askMessages.length > 0 || askPending || executing;

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
            onClick={() => {
              // P5 — ne jamais interrompre silencieusement : confirmer si occupé.
              if (askPending || executing) setConfirmCloseOpen(true);
              else setMueOpen(false);
            }}
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
        // ── État vide : hero personnalisé + chips rapides + pills d'intention ──
        <>
          <div className="mue2-hero">
            <span className="mue2-hero-mark">
              <MueFlower size={60} />
            </span>
            <h2 className="mue2-hero-title">À votre service, {firstName}</h2>
          </div>
          {/* Actions rapides : uniquement en contexte conversation (résumer ce
              fil, proposer une réponse…). Hors fil, on s'appuie sur les pills. */}
          {conv && (
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
          )}
          <div className="mue2-foot">
            {/* Zone d'intention (façon ClickUp Brain) : pills ↔ suggestions. */}
            {activeIntent
              ? (() => {
                  const it = INTENTIONS.find((x) => x.key === activeIntent);
                  if (!it) return null;
                  return (
                    <div className="mue2-intentpanel">
                      <div className="mue2-intentpanel-head">
                        <span className="mue2-intentpanel-title">
                          {intentIcon(it.icon)} {it.label}
                        </span>
                        <button
                          type="button"
                          className="mue2-intentpanel-close"
                          aria-label="Fermer"
                          onClick={() => setActiveIntent(null)}
                        >
                          <svg {...stroke} width={14} height={14}>
                            <line x1="6" y1="6" x2="18" y2="18" />
                            <line x1="18" y1="6" x2="6" y2="18" />
                          </svg>
                        </button>
                      </div>
                      {it.suggestions.map((sg) => (
                        <button
                          key={sg}
                          type="button"
                          className="mue2-intentsugg"
                          onClick={() => {
                            setAskInput(sg);
                            setActiveIntent(null);
                            requestAnimationFrame(() => askInputRef.current?.focus());
                          }}
                        >
                          {intentIcon(it.icon)}
                          {sg}
                        </button>
                      ))}
                    </div>
                  );
                })()
              : (
                  <div className="mue2-intents" aria-label="Raccourcis d'intention">
                    {INTENTIONS.map((it) => (
                      <button
                        key={it.key}
                        type="button"
                        className="mue2-intent"
                        onClick={() => setActiveIntent(it.key)}
                      >
                        {intentIcon(it.icon)}
                        {it.label}
                      </button>
                    ))}
                  </div>
                )}
            {composer}
          </div>
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
              ) : m.kind === "slots" && m.slots ? (
                <div key={m.id} className="mue2-msg is-mue">
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <div className="mue2-msg-body">{m.content}</div>
                  <div className="mue2-slots">
                    {m.slots.options.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="mue2-slot"
                        disabled={m.slots?.done}
                        onClick={() =>
                          m.slots && void confirmSlot(m.id, s, m.slots.day, m.slots.dayLabel)
                        }
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : m.kind === "refusal" && m.refusal ? (
                <div key={m.id} className="mue2-msg is-mue">
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <div className="mue2-refusal">
                    <div className="mue2-refusal-reason">
                      <span className="mue2-refusal-ic" aria-hidden>
                        <svg {...stroke} width={15} height={15}>
                          <path d="M12 9v4M12 17h.01" />
                          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                        </svg>
                      </span>
                      {m.content}
                    </div>
                    <div className="mue2-refusal-alt">{m.refusal.alternative}</div>
                    {m.refusal.cta && (
                      <button
                        type="button"
                        className="mue2-cfm-btn"
                        onClick={() => m.refusal?.cta && setView(m.refusal.cta.view)}
                      >
                        {m.refusal.cta.label}
                      </button>
                    )}
                  </div>
                  <MueSuggestions
                    label="À la place"
                    items={m.improvements ?? []}
                    onPick={submit}
                  />
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
                          badge={c.badge ?? "TO DO"}
                          entity={c.entity}
                          onOpen={() => openObject(c)}
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
                    {m.inlineRefs ? renderRich(m.content, m.inlineRefs) : m.content}
                    {m.action && (
                      <MueObjectCard
                        title={m.action.title}
                        onOpen={() => m.action && openObject(m.action)}
                      />
                    )}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mue2-sources">
                      {m.sources.map((s) => (
                        <MueObjectCard
                          key={s.id}
                          title={s.title}
                          entity={s.entity}
                          meta={s.meta}
                          badge={s.badge}
                          onOpen={() => openObject(s)}
                        />
                      ))}
                    </div>
                  )}
                  <MueSuggestions
                    label="Améliorations"
                    items={m.improvements ?? []}
                    onPick={submit}
                  />
                  {m.tone !== "error" && (
                    <MueMsgActions
                      onCopy={() => copyText(cleanContent(m))}
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

      {openDoc && <MueDocModal doc={openDoc} onClose={() => setOpenDoc(null)} />}

      {/* P5 — confirmation avant fermeture pendant une génération en cours. */}
      {confirmCloseOpen && (
        <div className="mue2-closeconfirm" role="dialog" aria-modal="true">
          <div className="mue2-cc-card">
            <h4>Arrêter de générer ?</h4>
            <p>La fermeture annulera la réponse en cours.</p>
            <div className="mue2-cc-row">
              <button
                type="button"
                className="mue2-cc-btn"
                onClick={() => setConfirmCloseOpen(false)}
              >
                Laisser ouvert
              </button>
              <button
                type="button"
                className="mue2-cc-btn is-danger"
                onClick={() => {
                  cancelRef.current = true;
                  setExecuting(false);
                  setConfirmCloseOpen(false);
                  setMueOpen(false);
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
