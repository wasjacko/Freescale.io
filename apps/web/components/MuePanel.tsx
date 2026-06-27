"use client";

import { MueFlower } from "@/components/MueFlower";
import { MueMemory } from "@/components/MueMemoryDrawer";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import {
  MueInlineRef,
  MueMsgActions,
  MueObjectCard,
  MueSuggestions,
} from "@/components/mue/MueBits";
import { type DevisDoc, MueDocModal } from "@/components/mue/MueDocModal";
import { askMue, clearMueChat, listMueChatMessages } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { MUE_DISCUSSIONS, fmtAgo, groupDiscussions } from "@/lib/mue-discussions";
import { useApp } from "@/lib/store";
import type { Priority, ViewId } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { MueTaskScanner } from "./SuggestTasksModal";

type ActionRef = {
  entity: "task" | "conversation" | "client" | "event" | "document";
  id: string;
  title: string;
  meta?: string;
  badge?: string;
  /** True juste après que Mue vient de créer cet objet → déclenche une
   *  animation de lueur sur la pillule pour qu'on la remarque. */
  fresh?: boolean;
};
/** Tâche proposée par Mue avant création (étape de prévisualisation). */
type ProposedTask = {
  title: string;
  client: string | null;
  priority: Priority;
  dueLabel: string;
  dueAtIso: string;
  conversationId?: string | null;
  status?: "to-scope" | "todo" | "in-progress" | "awaiting-reply" | "done";
};

// Statuts canoniques (mêmes libellés + accents que le Tableau de tâches).
const STATUS_META: Record<
  NonNullable<ProposedTask["status"]>,
  { label: string; color: string }
> = {
  "to-scope": { label: "À cadrer", color: "#8b5cf6" },
  todo: { label: "À faire", color: "#4f6cf7" },
  "in-progress": { label: "En cours", color: "#d97706" },
  "awaiting-reply": { label: "En attente", color: "#0891b2" },
  done: { label: "Terminé", color: "#16a34a" },
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
    | "slots"
    | "thinking"
    | "skeleton";
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
  /** Étapes de réflexion de Mue affichées dynamiquement. */
  thinkingSteps?: string[];
  /** Étape active en cours de réflexion. */
  activeThinkingStep?: string;
  /** Durée finale de la réflexion en secondes. */
  thinkingDuration?: number;
  /** Temps écoulé pendant la réflexion en secondes. */
  thinkingElapsed?: number;
};

type Mode = "ask" | "agents";

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Détecte une demande d'ACTION « créer une tâche / planifier » (mock NLU). */
function parseTaskRequest(
  msg: string
): { title: string; dueLabel: string; dueAtIso: string; client: string | null } | null {
  const lower = msg.toLowerCase();
  if (!/(t[aâ]che|task|planifie|bloque|ajoute|cr[ée]e|rdv|rendez|calendr)/.test(lower)) return null;

  // 1) Extrait TOUT le texte après le déclencheur, pas juste le premier mot.
  let titlePart = "";
  const afterColon = msg.match(/t[aâ]ches?\s*[:\-—]\s*(.+)/iu);
  const afterTache = msg.match(/t[aâ]ches?\s+(?:de\s+|pour\s+)?(.+)/iu);
  const afterVerb = msg.match(
    /(?:ajoute|ajouter|cr[ée]e?r?|planifie|bloque)\s+(?:la\s+|le\s+|une\s+|un\s+|ma\s+|mon\s+)?(?:t[aâ]che\s+(?:de\s+)?)?(.+)/iu
  );
  if (afterColon?.[1]) titlePart = afterColon[1];
  else if (afterTache?.[1]) titlePart = afterTache[1];
  else if (afterVerb?.[1]) titlePart = afterVerb[1];

  // 2) Nettoyage AMONT du titlePart : retire les hints temporels avant
  //    l'extraction du client (sinon « Thomas Aubry jeudi » serait capturé
  //    comme nom de client au lieu de « Thomas Aubry »).
  titlePart = titlePart
    .replace(/\b(aujourd['']?hui|demain|ce\s+soir|ce\s+matin|cet\s+apr[èe]s[- ]?midi)\b/giu, "")
    .replace(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/giu, "")
    .replace(/\b\d{1,2}\s*(?:h|am|:00)\b/giu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // 3) Détection client : « pour <Nom> » en fin de phrase, sinon « à/de <Nom> ».
  let client: string | null = null;
  const forClient = titlePart.match(/^(.*?)\s+pour\s+([\p{L}][\p{L}\s'-]{1,30}?)\s*\.?\s*$/u);
  if (forClient?.[1] != null && forClient?.[2] != null) {
    titlePart = forClient[1].trim();
    client = forClient[2].trim().replace(/\s+/g, " ");
  } else {
    const trailing = titlePart.match(/\b(?:à|de|avec)\s+([A-ZÀ-Ý][\p{L}'-]+)\b/u);
    if (trailing?.[1]) client = trailing[1];
  }

  // 4) Polish final : ponctuation en bord.
  let title = titlePart.replace(/^[:\-—,;\s]+/u, "").replace(/[:\-—,;\s.]+$/u, "");
  if (title.length < 3) title = "Nouvelle tâche";
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
  return { title, dueLabel, dueAtIso: due.toISOString(), client };
}

/** Détecte une demande de DOCUMENT (devis/facture/présentation/contrat). */
function isDocRequest(msg: string): boolean {
  const l = msg.toLowerCase();
  // Si l'utilisateur dit explicitement « tâche/task », c'est une tâche
  // (même s'il y a « contrat à envoyer » dans le contenu).
  if (/\bt[aâ]ches?\b|\btask\b/.test(l)) return false;
  return (
    /(devis|facture|présentation|presentation|contrat)/.test(l) &&
    /(cr[ée]e|génér|fais|rédige|prépare|prepare)/.test(l)
  );
}

/** Détecte une demande de PLANIFICATION d'un créneau (agenda). */
function isScheduleRequest(msg: string): boolean {
  const l = msg.toLowerCase();
  return (
    /(cr[ée]neau|rendez-vous|\brdv\b|call|réunion|reunion|appel)/.test(l) &&
    /(bloque|r[ée]serve|cale|planifie|trouve|pose|prends)/.test(l)
  );
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
  // Patterns historiques (semaine, toutes mes tâches, planifie ma semaine)
  if (
    /(toutes?\s+(?:mes\s+)?t[aâ]ches|mes\s+t[aâ]ches\s+(?:de\s+la\s+semaine|pour\s+la\s+semaine|de\s+cette\s+semaine)|plusieurs\s+t[aâ]ches|liste\s+de\s+t[aâ]ches|planifie\s+ma\s+semaine)/.test(
      l
    )
  ) {
    return true;
  }
  // Nouveau : extraction de tâches depuis les emails/messages reçus.
  // « à partir des nouveaux messages », « depuis mes messages », « scanne mes mails »…
  return /(t[aâ]ches?[^.?!]*(?:à\s+partir\s+(?:de(?:s)?\s+)?|depuis\s+(?:mes\s+|les\s+)?|dans\s+(?:mes\s+|les\s+)?)?(?:nouveaux?\s+|nouvelles?\s+|récents?\s+|récentes?\s+|reçus?\s+|non\s+lus?\s+)?(?:messages?|mails?|emails?|conversations?|fils?)\b|scann?e[rz]?\s+(?:mes\s+|les\s+)?(?:messages?|mails?|emails?|inbox))/.test(
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
  const dayLabel = d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return { dueLabel: dayLabel, dueAtIso: d.toISOString() };
}

/** Liste de tâches proposée par Mue (mock), ancrée sur les vrais clients. */
function proposeWeekTasks(): ProposedTask[] {
  const defs: {
    title: string;
    client: string | null;
    priority: Priority;
    conversationId: string | null;
    status: NonNullable<ProposedTask["status"]>;
  }[] = [
    {
      title: "Envoyer le contrat signé",
      client: "Thomas Aubry",
      priority: "high",
      conversationId: "c2",
      status: "todo",
    },
    {
      title: "Relancer le devis",
      client: "David Kim",
      priority: "medium",
      conversationId: "c9",
      status: "awaiting-reply",
    },
    {
      title: "Préparer la proposition commerciale",
      client: "Alexandre Dupont",
      priority: "medium",
      conversationId: "c7",
      status: "to-scope",
    },
    {
      title: "Réserver le coworking",
      client: null,
      priority: "low",
      conversationId: null,
      status: "todo",
    },
    {
      title: "Mettre à jour le portfolio",
      client: null,
      priority: "low",
      conversationId: null,
      status: "to-scope",
    },
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
      "Trouve mes tâches en retard",
      "Cherche dans mes échanges tout ce qui concerne…",
      "Trouve les fils clients sans réponse",
      "Retrouve un fichier (devis, contrat, brief)…",
    ],
  },
  {
    key: "research",
    label: "Rechercher",
    icon: "compass",
    suggestions: [
      "Recherche les tendances récentes de mon secteur",
      "Trouve les actus récentes sur le client…",
      "Comment d'autres freelances facturent ce type de projet ?",
      "Quelles bonnes pratiques pour relancer sans relancer trop ?",
    ],
  },
  {
    key: "create",
    label: "Créer",
    icon: "plus",
    suggestions: [
      "Crée mes tâches à partir des nouveaux messages reçus",
      "Crée une tâche pour…",
      "Rédige un devis pour…",
      "Écris une relance pour…",
      "Prépare un compte-rendu de call sur…",
    ],
  },
  {
    key: "edit",
    label: "Modifier",
    icon: "pencil",
    suggestions: [
      "Change le statut d'une tâche sur…",
      "Change l'échéance d'une tâche sur…",
      "Définis la priorité d'une tâche sur…",
      "Reformule mon brouillon en plus chaleureux",
    ],
  },
  {
    key: "analyze",
    label: "Analyser",
    icon: "chart",
    suggestions: [
      "Qu'est-ce que j'ai livré cette semaine ?",
      "Quels clients me doivent une réponse ?",
      "Analyse ma santé client",
      "Quel client rapporte le plus vs temps passé ?",
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


// Titre du bloc thinking : cycle entre 3 états (Réfléchit → Comprend → Conçoit)
// toutes les ~850ms. Reste figé sur le dernier label jusqu'à la fin du thinking.
// Défini HORS de MuePanel pour ne pas être recréé à chaque render (sinon
// useState reset à chaque mount).
const THINKING_LABELS = ["Réfléchit", "Comprend", "Conçoit"] as const;
function ThinkingTitle() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (idx >= THINKING_LABELS.length - 1) return;
    // Chaque phase (Réfléchit → Comprend → Conçoit) dure plus longtemps +
    // un peu de jitter → réflexion qui respire au lieu de défiler trop vite.
    const delay = 1700 + Math.random() * 700;
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, THINKING_LABELS.length - 1)), delay);
    return () => clearTimeout(t);
  }, [idx]);
  return <span className="mue-thinking-title">{THINKING_LABELS[idx]}</span>;
}

// Cache module-level des escaliers déjà entièrement révélés (par clé) → au
// re-render (scroll, autre message…) tout réapparaît d'un coup, pas de rejeu.
const STAIRCASE_DONE = new Set<string>();
type StairItem = { node: React.ReactNode; skeleton?: React.ReactNode };
// Un palier : s'il a un skeleton, on l'affiche d'abord (~700ms) puis on morphe
// vers le contenu réel. Sinon, contenu direct (slide-in).
function MueStairSlot({ item, instant }: { item: StairItem; instant: boolean }) {
  const [ready, setReady] = useState(instant || !item.skeleton);
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setReady(true), 650 + Math.random() * 350);
    return () => clearTimeout(t);
  }, [ready]);
  return (
    <div className="mue2-stair-item">{ready ? item.node : item.skeleton}</div>
  );
}
// MueStaircase — RÈGLE D'AFFICHAGE : révèle ses enfants STRICTEMENT un par un,
// de haut en bas, rien avant son tour. Chaque palier paraît d'abord en
// skeleton pastel (s'il en a un) puis morphe vers le contenu. Défini hors de
// MuePanel pour garder son state entre les renders.
function MueStaircase({ items, doneKey }: { items: StairItem[]; doneKey: string }) {
  const already = STAIRCASE_DONE.has(doneKey);
  const [revealed, setRevealed] = useState(already ? items.length : 0);
  useEffect(() => {
    if (already) {
      setRevealed(items.length);
      return;
    }
    if (revealed >= items.length) {
      STAIRCASE_DONE.add(doneKey);
      return;
    }
    // 1er palier rapide, puis délai variable entre chaque (≈ réflexion).
    const delay = revealed === 0 ? 140 : 360 + Math.random() * 460;
    const t = setTimeout(() => setRevealed((r) => r + 1), delay);
    return () => clearTimeout(t);
  }, [revealed, items.length, already, doneKey]);
  return (
    <>
      {items.slice(0, revealed).map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: ordre stable, séquentiel
        <MueStairSlot key={i} item={item} instant={already} />
      ))}
    </>
  );
}

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
  const { addTask, createEvent } = useData();
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

  // Réflexion Mue : gestion des timers (étapes animées pendant le thinking).
  // Pas d'état d'expansion : une fois la réflexion finie, le bloc disparaît.
  const activeTimersRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const clearActiveTimers = useCallback(() => {
    for (const t of activeTimersRef.current) {
      clearTimeout(t);
      clearInterval(t);
    }
    activeTimersRef.current = [];
  }, []);
  useEffect(() => {
    return () => {
      clearActiveTimers();
    };
  }, [clearActiveTimers]);
  // Raccourci d'intention déplié (façon ClickUp Brain) — null = pills affichées.
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  // Intention RENDUE : suit activeIntent mais persiste à la fermeture pour
  // laisser jouer l'animation de sortie. panelOpen pilote la classe is-open :
  // on monte d'abord à opacity:0 (panelOpen false), puis on passe is-open à la
  // frame SUIVANTE → la transition d'apparition se joue vraiment.
  const [displayIntent, setDisplayIntent] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // Sélecteur de modèle dans le composer (façon ClickUp).
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>("mue-max");
  useEffect(() => {
    if (activeIntent) {
      setDisplayIntent(activeIntent);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPanelOpen(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setPanelOpen(false);
    const t = setTimeout(() => setDisplayIntent(null), 240);
    return () => clearTimeout(t);
  }, [activeIntent]);

  const firstName = (userName ?? "").trim().split(/\s+/)[0] || "toi";
  // Tâche ouverte en détail (modal) suite à une action de Mue.
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  // Sélecteur de discussions (popover) : ouverture + recherche.
  const [discOpen, setDiscOpen] = useState(false);
  // Drawer « Mémoire » — alimente ce que Mue sait de toi.
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [discQuery, setDiscQuery] = useState("");
  const [currentDisc, setCurrentDisc] = useState<{ id: string; title: string } | null>(null);


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
      // Double rAF : on attend que le DOM (bulle + réponse en cours) soit posé
      // avant d'ancrer. scrollIntoView + scroll-margin-top (CSS) laissent une
      // marge confortable au-dessus du message → toujours bien visible.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const users = el.querySelectorAll<HTMLElement>(".mue2-msg.is-user");
          const last = users[users.length - 1];
          if (last) last.scrollIntoView({ block: "start", behavior: "smooth" });
        })
      );
    } else if (userCount < lastUserCountRef.current) {
      lastUserCountRef.current = userCount; // reset (nouveau fil / clear)
    }
  }, [askMessages]);

  const runScan = useCallback(() => {
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: "Suggérer des tâches" },
      { id: `scan-${Date.now()}`, role: "mue", kind: "scan", content: "" },
    ]);
  }, []);

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
          "tes échanges restent chez toi. je m'entraîne PAS sur tes messages, ils sont chiffrés dans un espace dédié à ton compte, isolé du modèle et de l'équipe. personne n'y touche, nous compris.",
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
  }, [suggestTasksOpen, setSuggestTasksOpen, runScan]);

  const runAsk = async (raw: string) => {
    const question = raw.trim();
    if (!question) return;
    try {
      const res = await askMue({ conversationId: activeConvId ?? null, question });
      const answer = res.answer ?? res.error ?? "Mue n'a pas pu répondre.";
      return {
        id: `mue-${Date.now()}`,
        role: "mue" as const,
        content: answer,
        tone: res.error ? ("error" as const) : ("normal" as const),
      };
    } catch (err) {
      return {
        id: `mue-${Date.now()}`,
        role: "mue" as const,
        content: err instanceof Error ? err.message : "Mue n'a pas pu répondre.",
        tone: "error" as const,
      };
    }
  };

  // Action « créer une tâche » : Mue agit puis renvoie une chose CLIQUABLE
  // (ouvre la fiche détaillée). Suggestions de suivi façon « Améliorations ».
  // Création d'UNE tâche : preview → validation utilisateur → création.
  // Mue n'écrit RIEN dans la liste avant d'avoir reçu l'OK explicite. Le rendu
  // de la preview est mutualisé avec runMultiTaskPreview (kind='preview' +
  // tableau .preview.tasks à 1 élément).
  const runTaskPreview = (
    _raw: string,
    parsed: NonNullable<ReturnType<typeof parseTaskRequest>>
  ) => {
    const proposed: ProposedTask = {
      title: parsed.title,
      client: parsed.client,
      priority: "medium",
      dueLabel: parsed.dueLabel,
      dueAtIso: parsed.dueAtIso,
      status: "todo",
    };
    // Si un client a été détecté, on cite explicitement la conversation
    // « source » dont Mue a déduit la demande → l'utilisateur peut cliquer
    // dessus pour vérifier le contexte avant de valider.
    const inlineRefs: Record<string, ActionRef> = {};
    let content = `c'est noté, je crée **${parsed.title}**`;
    if (parsed.client) {
      const slug = parsed.client.toLowerCase().replace(/\s+/g, "-");
      inlineRefs.client = {
        entity: "client",
        id: `client-${slug}`,
        title: parsed.client,
      };
      inlineRefs.source = {
        entity: "conversation",
        id: `conv-${slug}`,
        title: `Discussion avec ${parsed.client}`,
        badge: "Hier",
      };
      content += ` pour {{r:client}} dans ta liste perso, échéance ${parsed.dueLabel}. je l'ai repérée depuis {{r:source}}. je valide ?`;
    } else {
      content += ` dans ta liste perso, échéance ${parsed.dueLabel}. je valide ?`;
    }
    return {
      id: `prev-${Date.now()}`,
      role: "mue" as const,
      kind: "preview" as const,
      content,
      inlineRefs,
      preview: { tasks: [proposed], destination: "Ma liste perso" },
    };
  };

  // ── P2 · Création MULTIPLE : preview → confirmation → exécution → résultat ──
  // Étape 1 — prévisualisation (Niveau 3). Mue ne crée RIEN encore.
  const runMultiTaskPreview = (_raw: string) => {
    const tasks = proposeWeekTasks();
    return {
      id: `prev-${Date.now()}`,
      role: "mue" as const,
      kind: "preview" as const,
      content:
        "ok, j'ai fouillé tes 15 nouveaux messages. 13 cachent une tâche en fait. voilà ce que j'en sors :",
      preview: { tasks, destination: "Ma liste perso" },
    };
  };

  const handleEditTaskTitle = (messageId: string, taskIdx: number, newTitle: string) => {
    setAskMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && m.preview) {
          const updatedTasks = m.preview.tasks.map((t, idx) =>
            idx === taskIdx ? { ...t, title: newTitle } : t
          );
          return {
            ...m,
            preview: {
              ...m.preview,
              tasks: updatedTasks,
            },
          };
        }
        return m;
      })
    );
  };

  // Édition par tâche dans la preview : changer le statut, retirer une tâche.
  const handleEditTaskStatus = (
    messageId: string,
    taskIdx: number,
    status: NonNullable<ProposedTask["status"]>
  ) => {
    setAskMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.preview
          ? {
              ...m,
              preview: {
                ...m.preview,
                tasks: m.preview.tasks.map((t, idx) =>
                  idx === taskIdx ? { ...t, status } : t
                ),
              },
            }
          : m
      )
    );
  };
  const handleRemoveTask = (messageId: string, taskIdx: number) => {
    setAskMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.preview
          ? {
              ...m,
              preview: {
                ...m.preview,
                tasks: m.preview.tasks.filter((_, idx) => idx !== taskIdx),
              },
            }
          : m
      )
    );
  };
  // Quelle tâche affiche son menu de statut (clé "msgId:idx"), null = aucun.
  const [statusMenuFor, setStatusMenuFor] = useState<string | null>(null);

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
      created.push({ entity: "task", id, title: t.title, fresh: true });
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
              ? `ok j'arrête. ${n} ${n > 1 ? "tâches créées" : "tâche créée"} avant que tu coupes.`
              : "voilà, c'est dans ta liste.",
            improvements: cancelled
              ? ["Reprends les tâches restantes", "Montre-moi ce qui a été créé"]
              : [
                  "Bloque du temps pour ces tâches",
                  "Priorise-les par urgence",
                  "Relance-moi là-dessus lundi matin",
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

  // ── Streaming texte façon « vraie IA » ──
  // Une fois un message Mue affiché en entier, son id va dans streamedIdsRef →
  // au re-render (scroll, autre message…) il s'affiche d'un coup, pas de
  // réanimation. Branchement futur sur un vrai stream : remplacer le rAF par
  // l'arrivée des chunks et appeler streamedIdsRef.current.add(id) à la fin.
  const streamedIdsRef = useRef<Set<string>>(new Set());
  // État qui force un re-render quand un message finit son streaming, pour
  // pouvoir révéler les suggestions « Et ensuite » dans la foulée.
  const [doneStreamingIds, setDoneStreamingIds] = useState<Set<string>>(new Set());
  const markStreamingDone = (id: string) =>
    setDoneStreamingIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const StreamingText = ({
    id,
    text,
    refs,
  }: {
    id: string;
    text: string;
    refs?: Record<string, ActionRef> | undefined;
  }) => {
    const already = streamedIdsRef.current.has(id);
    const [visible, setVisible] = useState(already ? text : "");
    useEffect(() => {
      if (already) {
        setVisible(text);
        markStreamingDone(id);
        return;
      }
      let i = 0;
      let raf = 0;
      // Vitesse : 1 caractère / frame ≈ 60 char/s — proche d'une vraie IA,
      // lecture confortable, ressenti « token par token ».
      const tick = () => {
        i = Math.min(i + 1, text.length);
        setVisible(text.slice(0, i));
        if (i < text.length) raf = requestAnimationFrame(tick);
        else {
          streamedIdsRef.current.add(id);
          markStreamingDone(id);
        }
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
      // text + id sont la clé : si content change (re-stream) ou nouveau msg.
    }, [text, id, already]);
    if (refs) return <>{renderRich(visible, refs)}</>;
    return <>{visible}</>;
  };

  // Rend une prose Mue avec liens objets INLINE (tokens {{r:KEY}}) + paragraphes.
  // Rend les segments inline d'un paragraphe : tokens {{r:KEY}} (pillule objet),
  // **gras**, et texte brut. Utilisé pour paragraphes ET items de liste.
  const renderInline = (text: string, refs?: Record<string, ActionRef>) => {
    const parts = text.split(/(\{\{r:\w+\}\}|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      const tok = part.match(/^\{\{r:(\w+)\}\}$/);
      const ref = tok ? refs?.[tok[1] ?? ""] : undefined;
      if (ref) {
        return (
          <MueInlineRef
            // biome-ignore lint/suspicious/noArrayIndexKey: ordre stable
            key={i}
            label={ref.title}
            badge={ref.badge}
            entity={ref.entity}
            revealId={ref.id}
            onOpen={() => openObject(ref)}
          />
        );
      }
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: ordre stable
          <strong key={i}>{renderInline(bold[1] ?? "", refs)}</strong>
        );
      }
      // biome-ignore lint/suspicious/noArrayIndexKey: ordre stable
      return <span key={i}>{part}</span>;
    });
  };
  const renderRich = (content: string, refs?: Record<string, ActionRef>) => {
    return content.split("\n\n").map((para, pi) => {
      // Liste numérotée : paragraphe qui commence par "1. " et dont chaque
      // ligne suivante est "N. <texte>". Rendu avec compteur perso + retrait.
      if (/^\d+\.\s/.test(para)) {
        const items = para.split(/\n(?=\d+\.\s)/).map((line) => {
          const m = line.match(/^(\d+)\.\s+([\s\S]*)$/);
          return m ? { num: m[1] ?? "", body: m[2] ?? "" } : { num: "", body: line };
        });
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: contenu statique mock
          <ol key={pi} className="mue2-rich-ol">
            {items.map((it, ii) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: ordre stable
              <li key={ii} className="mue2-rich-ol-item">
                <span className="mue2-rich-ol-num">{it.num}.</span>
                <span className="mue2-rich-ol-body">{renderInline(it.body, refs)}</span>
              </li>
            ))}
          </ol>
        );
      }
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: contenu statique mock
        <p key={pi} className="mue2-rich-p">
          {renderInline(para, refs)}
        </p>
      );
    });
  };
  // Contenu « propre » pour le bouton Copier : tokens remplacés par les noms,
  // **gras** dépouillé.
  const cleanContent = (m: AskMessage) => {
    let out = m.inlineRefs
      ? m.content.replace(/\{\{r:(\w+)\}\}/g, (_, k) => m.inlineRefs?.[k]?.title ?? "")
      : m.content;
    out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
    return out;
  };

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
      terms:
        "Conditions de paiement : 40 % à la commande, 60 % à la livraison · Délai 3–4 semaines.",
    };
    docsRef.current[id] = doc;
    setOpenDoc(doc);
    return {
      id: `res-${Date.now()}`,
      role: "mue" as const,
      kind: "result" as const,
      content: `voilà ton devis. j'ai parié sur un pack branding classique pour ${client} (${company}) : logo, charte, carte de visite, templates réseaux. ça fait ${total.toLocaleString("fr-FR")} € TTC, conditions 40/60, délai 3 à 4 semaines. ajuste direct dans le doc si besoin.`,
      created: [
        {
          entity: "document" as const,
          id,
          title: `Devis ${doc.ref} — ${client}`,
          badge: "Brouillon",
        },
      ],
      improvements: [
        "Transforme ce devis en présentation slides",
        "Bloque un créneau lundi pour le call découverte",
        "Sauvegarde mes tarifs en mémoire pour les prochains devis",
      ],
    };
  };

  // ── P4 · Planification — Mue lit les dispos, propose des créneaux (kind=slots),
  // crée l'événement seulement APRÈS le choix de l'utilisateur. */
  const runSlots = (_raw: string) => {
    return {
      id: `slots-${Date.now()}`,
      role: "mue" as const,
      kind: "slots" as const,
      content: "t'es libre dès 10h lundi. dis-moi quel créneau :",
      slots: { options: ["10h", "10h30", "11h", "11h30", "12h"], dayLabel: "lundi", day: 1 },
    };
  };

  const confirmSlot = async (slotsId: string, slot: string, day: number, dayLabel: string) => {
    setAskMessages((prev) =>
      prev.map((m) =>
        m.id === slotsId && m.slots ? { ...m, slots: { ...m.slots, done: true } } : m
      )
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
        content: `c'est calé : ${dayLabel}, ${fmt(start)} à ${fmt(start + duration)} (Europe/Paris), lien Meet inclus.`,
        created: [
          { entity: "event", id: `ev-${Date.now()}`, title: "Call découverte", badge: "Agenda" },
        ],
        improvements: ["Prépare l'ordre du jour du call", "Crée une note de réunion"],
      },
    ]);
  };

  // ── P3 · Réponse informative (Niveau 1→2) : cite des objets cliquables,
  // ne modifie RIEN, propose des suites. Ancré sur les vrais fils/clients. */
  const runFocus = (_raw: string) => {
    const inlineRefs: Record<string, ActionRef> = {
      thomas: { entity: "conversation", id: "c2", title: "Thomas Aubry", badge: "À répondre" },
      david: { entity: "conversation", id: "c9", title: "David Kim", badge: "À relancer" },
      alex: { entity: "conversation", id: "c7", title: "Alexandre Dupont", badge: "En cours" },
    };
    const firstName = userName ? userName.split(/\s+/)[0] : null;
    const greeting = firstName ? `ok ${firstName}` : "ok";
    // Voix Mue : pote en chat, direct, opinions, pas de tirets longs.
    const content =
      `${greeting}, le topo : rien en retard côté tâches, ton agenda est clair. ` +
      `mais **3 fils clients te réclament**, et franchement ça presse un peu. ` +
      `voilà l'ordre que je tiendrais.\n\n` +
      `1. **réponds à {{r:thomas}}** : il attend le contrat signé depuis 2 jours, ` +
      `c'est ça qui débloque le reste. commence par lui.\n` +
      `2. **relance {{r:david}}** : silence radio depuis 12 jours avec 6 500 € à suivre. ` +
      `un mot suffit pour rouvrir, laisse pas filer.\n` +
      `3. **réponds à {{r:alex}}** : il attend ton retour sur les livrables, ` +
      `pas urgent mais ça traîne depuis hier.\n\n` +
      `le reste (facturation, prospection, admin) peut attendre lundi. ` +
      `concentre ton énergie là où ça compte.\n\n` +
      `je m'occupe des 3 dans cet ordre ?`;
    return {
      id: `focus-${Date.now()}`,
      role: "mue" as const,
      kind: "text" as const,
      content,
      inlineRefs,
      improvements: [
        "Rédige une relance pour David Kim",
        "Crée mes tâches de la semaine",
        "Bloque du temps pour le contrat de Thomas",
      ],
    };
  };

  // ── P5 · Refus gracieux d'une action destructive + alternative manuelle ──
  const runRefusal = (_raw: string) => {
    return {
      id: `ref-${Date.now()}`,
      role: "mue" as const,
      kind: "refusal" as const,
      content: "là je te suis pas. supprimer en masse c'est sensible et irréversible, je touche pas à ça tout seul.",
      refusal: {
        alternative:
          "par contre, sélectionne les éléments dans le Tableau et envoie-les à la Corbeille d'un clic, tu gardes la main.",
        cta: { label: "Ouvrir le Tableau", view: "tasks" as ViewId },
      },
      improvements: ["Archive les tâches terminées", "Montre-moi les tâches en retard"],
    };
  };

  const renderThinkingBlock = (m: AskMessage) => {
    const steps = m.thinkingSteps;
    if (!steps || steps.length === 0) return null;

    // Une fois la réflexion terminée, on ne garde RIEN à l'écran (pas de
    // toggle « Pensée de Mue » repliée) : seule la réponse finale reste.
    if (m.kind !== "thinking") return null;

    return (
      <div className="mue-thinking-container is-active">
        <div className="mue-thinking-summary">
          <MueFlower size={20} animated />
          <ThinkingTitle />
        </div>
        <div className="mue-thinking-steps">
          {steps.map((label, idx) => {
            const isCurrent = idx === steps.length - 1;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: ordre stable, accumulé
                key={idx}
                className={`mue-thinking-step ${isCurrent ? "is-current" : "is-done"}`}
              >
                <span className="mue-step-bullet">
                  <span className="mue-step-bullet-dot" />
                </span>
                <span className="mue-step-text">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Aiguillage : action (tâche) si l'intention est détectée, sinon question.
  const submit = (raw: string) => {
    const text = raw.trim();
    if (!text || askPending || executing) return;

    // Repart d'un état non-annulé (après un reset « Nouvelle discussion »).
    cancelRef.current = false;

    // 1. Ajouter le message utilisateur
    const userMsgId = `user-${Date.now()}`;
    setAskMessages((prev) => [...prev, { id: userMsgId, role: "user", content: text }]);
    setAskInput("");
    setAskPending(true);

    // 2. Déterminer l'action et les étapes
    let getResult: () => Promise<AskMessage> | AskMessage;
    let steps: string[];

    if (isDestructiveRequest(text)) {
      getResult = () => runRefusal(text);
      steps = [
        "Analyse de l'impact de la requête...",
        "Vérification des règles de sécurité...",
        "Interdiction des suppressions globales...",
      ];
    } else if (isDocRequest(text)) {
      getResult = () => runDocument(text);
      steps = [
        "Extraction du nom du client...",
        "Calcul des prestations standard...",
        "Valorisation HT / TVA / TTC...",
        "Génération du document de facturation...",
      ];
    } else if (isScheduleRequest(text)) {
      getResult = () => runSlots(text);
      steps = [
        "Interrogation de ton planning...",
        "Détection des conflits d'horaires...",
        "Calcul des meilleurs créneaux de réunion...",
      ];
    } else if (isFocusRequest(text)) {
      getResult = () => runFocus(text);
      steps = [
        "Lecture de tes fils de discussion...",
        "Calcul des temps de réponse moyens...",
        "Priorisation par niveau d'urgence client...",
      ];
    } else if (isMultiTaskRequest(text)) {
      getResult = () => runMultiTaskPreview(text);
      steps = [
        "Connexion sécurisée aux comptes email (Gmail, Outlook)...",
        "Scan des 15 derniers messages non lus...",
        "Analyse sémantique du contenu et du contexte...",
        "Détection des requêtes et engagements clients...",
        "Identification des clients et interlocuteurs clés...",
        "Extraction des échéances implicites et deadlines...",
        "Évaluation du niveau d'urgence des demandes...",
        "Regroupement et consolidation des actions par client...",
        "Formulation intelligente des titres de tâches...",
        "Vérification des doublons dans ta liste actuelle...",
        "Génération des fiches de tâches éditables...",
        "Finalisation de la liste d'actions...",
      ];
    } else {
      const parsed = parseTaskRequest(text);
      if (parsed) {
        getResult = () => runTaskPreview(text, parsed);
        steps = [
          "Analyse de l'action à créer...",
          "Calcul de l'échéance intelligente...",
          "Préparation du brouillon de tâche...",
        ];
      } else {
        // Direct question: starts LLM call in the background immediately
        const askPromise = runAsk(text).then(
          (msg) =>
            msg || {
              id: `mue-${Date.now()}`,
              role: "mue" as const,
              content: "Désolé, je n'ai pas pu générer de réponse.",
            }
        );
        getResult = () => askPromise;
        const lowerText = text.toLowerCase();
        if (lowerText.includes("résume") || lowerText.includes("resum")) {
          steps = [
            "Analyse du fil de discussion en cours...",
            "Identification des principaux interlocuteurs...",
            "Extraction des points clés et décisions...",
            "Synthèse du brief en 3 points...",
          ];
        } else if (lowerText.includes("relance") || lowerText.includes("relanc")) {
          steps = [
            "Identification du client à relancer...",
            "Lecture du dernier échange et du contexte...",
            "Évaluation de l'enjeu — ferme ou courtois ?",
            "Rédaction d'une relance prête à envoyer...",
          ];
        } else if (
          lowerText.includes("répons") ||
          lowerText.includes("ecris") ||
          lowerText.includes("rédige") ||
          lowerText.includes("écris")
        ) {
          steps = [
            "Lecture du fil avec le client...",
            "Identification de la demande et du ton attendu...",
            "Rédaction d'une réponse personnalisée...",
            "Vérification de la cohérence avec ton style...",
          ];
        } else {
          steps = [
            "Analyse sémantique de ta question...",
            "Consultation de ta base de connaissances et de ta mémoire...",
            "Recherche d'éléments pertinents dans ton espace...",
            "Synthèse et mise en forme de la réponse...",
          ];
        }
      }
    }

    clearActiveTimers();

    // 3. Ajouter le message de réflexion inline.
    // Étape initiale CONTEXTUELLE : on prend steps[0] si dispo (chaque intent
    // a sa propre première étape signée) plutôt qu'un générique « Prend en
    // compte… ». Fallback uniquement si aucun intent n'a matché.
    const thinkingId = `thinking-${Date.now()}`;
    const initialStep = steps[0] ?? "Prend en compte...";
    const stepsAfterFirst = steps.slice(1);
    setAskMessages((prev) => [
      ...prev,
      {
        id: thinkingId,
        role: "mue",
        kind: "thinking",
        content: "",
        thinkingSteps: [initialStep],
        activeThinkingStep: initialStep,
        thinkingElapsed: 0,
      },
    ]);

    const T = isMultiTaskRequest(text)
      ? 13000 + Math.random() * 3000 // 13 à 16 s pour un scan multi-task
      : 6500 + Math.random() * 2500; // 6.5 à 9 s — réflexion qui respire
    const startTime = Date.now();

    // Live counter timer (100ms interval) for internal elapsed state tracking
    const intervalId = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setAskMessages((prev) =>
        prev.map((msg) => (msg.id === thinkingId ? { ...msg, thinkingElapsed: elapsed } : msg))
      );
    }, 100);
    activeTimersRef.current.push(intervalId);

    // Schedule updates for steps: the wording changes approximately every 2s randomly
    const currentSteps: string[] = [initialStep];
    const scheduleNextStep = (stepIdx: number) => {
      if (Date.now() - startTime >= T) return;

      // Délai PAR ÉTAPE volontairement très variable → simule une vraie
      // réflexion (certaines étapes sont rapides, d'autres demandent plus de
      // temps), au lieu d'un tempo régulier qui sonne faux.
      const jitter = (min: number, max: number) => min + Math.random() * (max - min);
      // Un quart des étapes « bute » un peu plus longtemps (réflexion appuyée).
      const ponder = Math.random() < 0.25;
      const nextDelay = isMultiTaskRequest(text)
        ? ponder
          ? jitter(1600, 2600)
          : jitter(450, 1300)
        : ponder
          ? jitter(1900, 3000)
          : jitter(500, 1600);
      const timeoutId = setTimeout(() => {
        if (Date.now() - startTime >= T) return;

        // On a déjà affiché steps[0] comme étape initiale, on enchaîne donc
        // sur stepsAfterFirst (= steps.slice(1)).
        let nextStepText = stepsAfterFirst[stepIdx];
        if (!nextStepText) {
          const fallbacks = [
            "Analyse finale...",
            "Mise en forme des données...",
            "Préparation de la réponse...",
          ];
          nextStepText = fallbacks[stepIdx - stepsAfterFirst.length] || "Finalisation...";
        }

        currentSteps.push(nextStepText);
        setAskMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingId
              ? {
                  ...msg,
                  thinkingSteps: [...currentSteps],
                  activeThinkingStep: nextStepText,
                }
              : msg
          )
        );

        scheduleNextStep(stepIdx + 1);
      }, nextDelay);
      activeTimersRef.current.push(timeoutId);
    };

    // Start scheduling steps (the first one "Prend en compte..." is shown immediately)
    scheduleNextStep(0);

    // Final resolution timer
    const finalTimeoutId = setTimeout(async () => {
      const duration = (Date.now() - startTime) / 1000;
      clearActiveTimers();

      try {
        const result = await getResult();
        const finalResult: AskMessage = {
          ...result,
          thinkingSteps: currentSteps,
          thinkingDuration: duration,
        };
        setAskMessages((prev) => prev.map((msg) => (msg.id === thinkingId ? finalResult : msg)));
      } catch (err) {
        setAskMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingId
              ? {
                  id: `err-${Date.now()}`,
                  role: "mue",
                  content: "Mue n'a pas pu traiter ta demande.",
                  tone: "error" as const,
                  thinkingSteps: currentSteps,
                  thinkingDuration: duration,
                }
              : msg
          )
        );
      } finally {
        setAskPending(false);
      }
    }, T);
    activeTimersRef.current.push(finalTimeoutId);
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
    push({
      kind: "info",
      text: v === "up" ? "Merci pour ton retour 👍" : "Noté — je ferai mieux.",
    });

  // « Nouvelle discussion » — reset LOCAL et inconditionnel : on vide le fil
  // tout de suite et on garde le reset quoi qu'il arrive côté serveur (la
  // suppression distante est best-effort). On annule aussi toute génération
  // en cours et on repart d'un état totalement vierge.
  const handleClear = async () => {
    clearActiveTimers();
    cancelRef.current = true;
    setExecuting(false);
    setAskPending(false);
    setAskMessages([]);
    setAskInput("");
    setCurrentDisc(null);
    streamedIdsRef.current = new Set();
    setDoneStreamingIds(new Set());
    // Suppression serveur best-effort — n'annule jamais le reset visuel.
    try {
      await clearMueChat({ conversationId: activeConvId || null });
    } catch {
      // ignoré : le fil est déjà vidé localement, c'est ce qui compte.
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

  const composer = (
    <form className="mue2-composer" onSubmit={handleAsk}>
      <textarea
        ref={askInputRef}
        className="mue2-input"
        placeholder={
          askPending || executing
            ? "je m'en occupe…"
            : askMessages.length > 0
              ? "et ensuite, on fait quoi ?"
              : "balance, je m'en occupe (crée, fouille, rédige…)"
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
        <div className="mue2-model-wrap">
          <button
            type="button"
            className="mue2-model"
            aria-haspopup="menu"
            aria-expanded={modelPickerOpen}
            onClick={(e) => {
              e.stopPropagation();
              setModelPickerOpen((v) => !v);
            }}
          >
            {currentModel === "mue-max" ? (
              <>Max</>
            ) : currentModel === "gpt" ? (
              <>
                <span className="mue2-model-ic" aria-hidden>
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor" aria-hidden>
                    <path d="M22 9.4a5.5 5.5 0 0 0-.5-4.5 5.6 5.6 0 0 0-6-2.6 5.5 5.5 0 0 0-9.3 2 5.5 5.5 0 0 0-3.7 2.7 5.6 5.6 0 0 0 .7 6.6 5.5 5.5 0 0 0 .5 4.5 5.6 5.6 0 0 0 6 2.6 5.5 5.5 0 0 0 4.2 1.9 5.6 5.6 0 0 0 5.1-3.9 5.5 5.5 0 0 0 3.7-2.7 5.6 5.6 0 0 0-.7-6.6zm-8.3 11.6a4.1 4.1 0 0 1-2.6-1l.1-.1 4.4-2.5a.7.7 0 0 0 .4-.6V11l1.9 1v5a4.1 4.1 0 0 1-4.2 4zm-9-3.9a4.1 4.1 0 0 1-.5-2.7l.2.1 4.4 2.6c.2.1.5.1.8 0L15 14v2.2c0 .1 0 .2-.1.3L10.4 19a4.1 4.1 0 0 1-5.7-1.9zM3.5 9.4a4.1 4.1 0 0 1 2.1-1.8v5.1c0 .3.1.5.4.7l5.3 3-1.8 1.1c-.1 0-.2 0-.3 0L4.7 14.8a4.1 4.1 0 0 1-1.2-5.4zm15.2 3.5l-5.3-3.1 1.8-1c.1 0 .2 0 .3 0l4.5 2.6a4.1 4.1 0 0 1-.6 7.4v-5.2c0-.3-.2-.5-.7-.7zm1.9-2.8l-.2-.2-4.4-2.5a.7.7 0 0 0-.7 0L10 10.5V8.3c0-.1 0-.2.1-.3L14.6 5a4.1 4.1 0 0 1 6 4.3zm-9.8 3.8L9 12.8v-2.3l4-2.3 4 2.3v2.3l-4 2.3z" />
                  </svg>
                </span>
                GPT-5.5
              </>
            ) : currentModel === "claude" ? (
              <>
                <span className="mue2-model-ic" aria-hidden style={{ color: "#d97757" }}>
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor">
                    <path
                      d="M12 2v8M12 14v8M2 12h8M14 12h8M4.93 4.93l5.66 5.66M13.41 13.41l5.66 5.66M4.93 19.07l5.66-5.66M13.41 10.59l5.66-5.66"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Claude Opus 4.8
              </>
            ) : (
              <>
                <span className="mue2-model-ic" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    width={15}
                    height={15}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5L12 2Z"
                      fill="url(#gem-grad)"
                    />
                    <defs>
                      <linearGradient id="gem-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#4285f4" />
                        <stop offset="1" stopColor="#34a853" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                Gemini 3.1 Pro
              </>
            )}
            <svg
              viewBox="0 0 24 24"
              width={11}
              height={11}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {modelPickerOpen && (
            <>
              <button
                type="button"
                className="mue2-model-scrim"
                aria-label="Fermer"
                onClick={() => setModelPickerOpen(false)}
              />
              <div className="mue2-model-menu" role="menu">
                <div className="mue2-model-menu-head">Meilleurs modèles</div>
                {[
                  { id: "mue-max", label: "Mue", suffix: "Max", icon: "mue" },
                  { id: "gpt", label: "GPT-5.5", icon: "gpt" },
                  { id: "claude", label: "Claude Opus 4.8", icon: "claude" },
                  { id: "gemini", label: "Gemini 3.1 Pro", icon: "gemini" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`mue2-model-item ${currentModel === m.id ? "is-on" : ""}`}
                    onClick={() => {
                      setCurrentModel(m.id);
                      setModelPickerOpen(false);
                    }}
                  >
                    <span className="mue2-model-item-ic" aria-hidden>
                      {m.icon === "mue" ? (
                        <MueFlower size={16} />
                      ) : m.icon === "gpt" ? (
                        <svg
                          viewBox="0 0 24 24"
                          width={16}
                          height={16}
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M22 9.4a5.5 5.5 0 0 0-.5-4.5 5.6 5.6 0 0 0-6-2.6 5.5 5.5 0 0 0-9.3 2 5.5 5.5 0 0 0-3.7 2.7 5.6 5.6 0 0 0 .7 6.6 5.5 5.5 0 0 0 .5 4.5 5.6 5.6 0 0 0 6 2.6 5.5 5.5 0 0 0 4.2 1.9 5.6 5.6 0 0 0 5.1-3.9 5.5 5.5 0 0 0 3.7-2.7 5.6 5.6 0 0 0-.7-6.6zm-8.3 11.6a4.1 4.1 0 0 1-2.6-1l.1-.1 4.4-2.5a.7.7 0 0 0 .4-.6V11l1.9 1v5a4.1 4.1 0 0 1-4.2 4zm-9-3.9a4.1 4.1 0 0 1-.5-2.7l.2.1 4.4 2.6c.2.1.5.1.8 0L15 14v2.2c0 .1 0 .2-.1.3L10.4 19a4.1 4.1 0 0 1-5.7-1.9zM3.5 9.4a4.1 4.1 0 0 1 2.1-1.8v5.1c0 .3.1.5.4.7l5.3 3-1.8 1.1c-.1 0-.2 0-.3 0L4.7 14.8a4.1 4.1 0 0 1-1.2-5.4zm15.2 3.5l-5.3-3.1 1.8-1c.1 0 .2 0 .3 0l4.5 2.6a4.1 4.1 0 0 1-.6 7.4v-5.2c0-.3-.2-.5-.7-.7zm1.9-2.8l-.2-.2-4.4-2.5a.7.7 0 0 0-.7 0L10 10.5V8.3c0-.1 0-.2.1-.3L14.6 5a4.1 4.1 0 0 1 6 4.3zm-9.8 3.8L9 12.8v-2.3l4-2.3 4 2.3v2.3l-4 2.3z" />
                        </svg>
                      ) : m.icon === "claude" ? (
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="#d97757" aria-hidden>
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" aria-hidden>
                          <defs>
                            <linearGradient id={`gem-grad-mi-${m.id}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0" stopColor="#4285f4" />
                              <stop offset="1" stopColor="#34a853" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5L12 2Z"
                            fill={`url(#gem-grad-mi-${m.id})`}
                          />
                        </svg>
                      )}
                    </span>
                    <span className="mue2-model-item-label">
                      {m.label}
                      {m.suffix && <span className="mue2-model-item-badge">{m.suffix}</span>}
                    </span>
                    {currentModel === m.id && (
                      <svg
                        className="mue2-model-item-check"
                        viewBox="0 0 24 24"
                        width={14}
                        height={14}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
                <div className="mue2-model-menu-sep" />
                <button type="button" className="mue2-model-more">
                  <svg
                    viewBox="0 0 24 24"
                    width={13}
                    height={13}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="7 13 12 18 17 13" />
                    <polyline points="7 6 12 11 17 6" />
                  </svg>
                  Afficher plus
                </button>
              </div>
            </>
          )}
        </div>
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
        {hasChat && (
          <button
            type="button"
            className="mue2-newdisc"
            title="Nouvelle discussion"
            aria-label="Nouvelle discussion"
            onClick={() => {
              void handleClear();
              setDiscOpen(false);
            }}
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
            </svg>
          </button>
        )}
        <div className="mue2-disc-wrap">
          <button
            type="button"
            className={`mue2-disc-btn ${discOpen ? "is-active" : ""}`}
            aria-haspopup="menu"
            aria-expanded={discOpen}
            onClick={() => setDiscOpen((v) => !v)}
          >
            <svg {...stroke} width={14} height={14}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
            </svg>
            {(() => {
              if (currentDisc?.title) return currentDisc.title;
              const firstUser = askMessages.find((m) => m.role === "user");
              if (!firstUser) return "Nouvelle discussion";
              const t = firstUser.content.trim().replace(/\s+/g, " ");
              return t.length > 38 ? `${t.slice(0, 38)}…` : t || "Nouvelle discussion";
            })()}
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
            <h2 className="mue2-hero-title">Muee</h2>
          </div>
          <div className="mue2-foot">
            {/* Zone d'intention (façon ClickUp Brain). La rangée de pills garde
                TOUJOURS sa hauteur ; quand on déplie une intention, ses
                suggestions s'affichent en popover ABSOLU au-dessus du composer
                (hors flux) → le hero « À votre service » ne bouge pas.
                Tout disparaît dès que le composer contient du texte. */}
            {!askInput.trim() && (
              <div className="mue2-intentzone">
                {activeIntent && (
                  <button
                    type="button"
                    className="mue2-intent-scrim"
                    onClick={() => setActiveIntent(null)}
                    aria-label="Fermer"
                  />
                )}
                <div
                  className={`mue2-intents ${activeIntent ? "is-hidden" : ""}`}
                  aria-label="Raccourcis d'intention"
                  aria-hidden={!!activeIntent}
                >
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
                {displayIntent &&
                  (() => {
                    const it = INTENTIONS.find((x) => x.key === displayIntent);
                    if (!it) return null;
                    return (
                      <div className={`mue2-intentpanel ${panelOpen ? "is-open" : ""}`}>
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
                  })()}
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
                    <MueFlower size={16} /> Mue
                  </div>
                  <MueTaskScanner inline />
                </div>
              ) : m.kind === "privacy" ? (
                <div key={m.id} className="mue2-msg is-mue mue2-msg--privacy">
                  <div className="mue2-msg-head">
                    <MueFlower size={16} /> Mue
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
                    <MueFlower size={16} /> Mue
                  </div>
                  {renderThinkingBlock(m)}
                  {/* RÈGLE : tout s'affiche en escalier, de haut en bas, rien
                      avant son tour — texte, puis chaque tâche, puis la
                      destination, puis le bouton de confirmation. */}
                  <MueStaircase
                    doneKey={`prev:${m.id}`}
                    items={[
                      {
                        node: (
                          <div className="mue2-msg-body">
                            <StreamingText id={m.id} text={m.content} refs={m.inlineRefs} />
                          </div>
                        ),
                      },
                      ...m.preview.tasks.map((t, i) => ({
                        skeleton: (
                          <div className="mue2-prev mue2-prev--single">
                            <div className="mue2-prev-row mue2-prev-row--skeleton" aria-busy="true">
                              <div className="mue2-prev-main">
                                <span className="mue2-skel-line mue2-skel-line--title" aria-hidden />
                                <span className="mue2-skel-line mue2-skel-line--meta" aria-hidden />
                              </div>
                              <span className="mue2-skel-badge" aria-hidden />
                            </div>
                          </div>
                        ),
                        node: (
                          <div className="mue2-prev mue2-prev--single">
                            <div className="mue2-prev-row">
                              <div className="mue2-prev-row-content">
                                <div className="mue2-prev-row-top">
                                  <input
                                    type="text"
                                    className="mue2-prev-title-input"
                                    value={t.title}
                                    onChange={(e) => handleEditTaskTitle(m.id, i, e.target.value)}
                                    disabled={m.preview?.done}
                                    title="Clique pour modifier le titre de la tâche"
                                  />
                                  {/* Statut éditable : clic = menu de choix. */}
                                  <div className="mue2-prev-status-wrap">
                                    {(() => {
                                      const st = STATUS_META[t.status ?? "todo"];
                                      const key = `${m.id}:${i}`;
                                      return (
                                        <button
                                          type="button"
                                          className="mue2-prev-status-badge mue2-prev-status-badge--btn"
                                          style={{
                                            color: st.color,
                                            background: `color-mix(in srgb, ${st.color} 14%, transparent)`,
                                          }}
                                          disabled={m.preview?.done}
                                          aria-haspopup="menu"
                                          onClick={() =>
                                            setStatusMenuFor((cur) => (cur === key ? null : key))
                                          }
                                        >
                                          {st.label}
                                          <svg
                                            viewBox="0 0 24 24"
                                            width={11}
                                            height={11}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={2.2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden
                                          >
                                            <polyline points="6 9 12 15 18 9" />
                                          </svg>
                                        </button>
                                      );
                                    })()}
                                    {statusMenuFor === `${m.id}:${i}` && (
                                      <>
                                        <button
                                          type="button"
                                          className="mue2-prev-status-scrim"
                                          aria-label="Fermer"
                                          onClick={() => setStatusMenuFor(null)}
                                        />
                                        <div className="mue2-prev-status-menu" role="menu">
                                          {(
                                            Object.keys(STATUS_META) as NonNullable<
                                              ProposedTask["status"]
                                            >[]
                                          ).map((key) => {
                                            const meta = STATUS_META[key];
                                            return (
                                              <button
                                                key={key}
                                                type="button"
                                                className="mue2-prev-status-item"
                                                onClick={() => {
                                                  handleEditTaskStatus(m.id, i, key);
                                                  setStatusMenuFor(null);
                                                }}
                                              >
                                                <span
                                                  className="mue2-prev-status-dot"
                                                  style={{ background: meta.color }}
                                                  aria-hidden
                                                />
                                                {meta.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {/* Retirer cette tâche de la liste à créer. */}
                                  <button
                                    type="button"
                                    className="mue2-prev-remove"
                                    title="Retirer cette tâche"
                                    aria-label="Retirer cette tâche"
                                    disabled={m.preview?.done}
                                    onClick={() => handleRemoveTask(m.id, i)}
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width={14}
                                      height={14}
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      aria-hidden
                                    >
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                    </svg>
                                  </button>
                                </div>
                                {(t.client || t.conversationId) && (
                                  <div className="mue2-prev-row-bottom">
                                    {t.client && (
                                      <span className="mue2-prev-client-tag">👤 {t.client}</span>
                                    )}
                                    {t.conversationId && (
                                      <button
                                        type="button"
                                        className="mue2-prev-msg-link"
                                        onClick={() =>
                                          t.conversationId &&
                                          openObject({
                                            entity: "conversation",
                                            id: t.conversationId,
                                            title: t.client ?? "Discussion",
                                          })
                                        }
                                      >
                                        💬 Voir le message
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ),
                      })),
                      {
                        node: (
                          <div className="mue2-cfm">
                            <button
                              type="button"
                              className="mue2-cfm-btn is-primary"
                              disabled={m.preview?.done}
                              onClick={() =>
                                m.preview?.tasks && void executeMultiTask(m.id, m.preview.tasks)
                              }
                            >
                              {m.preview?.done
                                ? "✓ En cours…"
                                : m.preview?.tasks.length === 1
                                  ? "Oui, crée-la dans ma liste"
                                  : "Oui, crée-les dans ma liste"}
                            </button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              ) : m.kind === "progress" && m.progress ? (
                <div key={m.id} className="mue2-msg is-mue">
                  <div className="mue2-msg-head">
                    <MueFlower size={16} /> Mue · au travail
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
                    <MueFlower size={16} /> Mue
                  </div>
                  {renderThinkingBlock(m)}
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
                    <MueFlower size={16} /> Mue
                  </div>
                  {renderThinkingBlock(m)}
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
                  <MueSuggestions label="À la place" items={m.improvements ?? []} onPick={submit} />
                </div>
              ) : m.kind === "thinking" ? (
                <div key={m.id} className="mue2-msg is-mue">
                  {renderThinkingBlock(m)}
                </div>
              ) : m.kind === "result" ? (
                <div key={m.id} className="mue2-msg is-mue">
                  <div className="mue2-msg-head">
                    <MueFlower size={16} /> Mue
                  </div>
                  {renderThinkingBlock(m)}
                  <div className="mue2-msg-body">
                    <span className="mue2-result-check" aria-hidden>
                      <svg {...stroke} width={15} height={15}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <StreamingText id={m.id} text={m.content} />
                  </div>
                  {m.created && m.created.length > 0 && (
                    <div className="mue2-result-list">
                      {m.created.map((c) => (
                        <MueObjectCard
                          key={c.id}
                          title={c.title}
                          badge={c.badge ?? "TO DO"}
                          entity={c.entity}
                          revealId={c.id}
                          fresh={c.fresh}
                          onOpen={() => openObject(c)}
                        />
                      ))}
                    </div>
                  )}
                  {doneStreamingIds.has(m.id) && (
                    <div className="mue2-after-stream">
                      <MueSuggestions
                        label="Et ensuite"
                        items={m.improvements ?? []}
                        onPick={submit}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  key={m.id}
                  className={`mue2-msg is-mue ${m.tone === "error" ? "is-error" : ""}`}
                >
                  <div className="mue2-msg-head">
                    <MueFlower size={16} /> Mue
                  </div>
                  {renderThinkingBlock(m)}
                  <div className="mue2-msg-body">
                    <StreamingText id={m.id} text={m.content} refs={m.inlineRefs} />
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
                  {doneStreamingIds.has(m.id) && (
                    <div className="mue2-after-stream">
                      <MueSuggestions
                        label="Améliorations"
                        items={m.improvements ?? []}
                        onPick={submit}
                      />
                    </div>
                  )}
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
            {askPending && !askMessages.some((msg) => msg.kind === "thinking") && (
              <div className="mue2-msg is-mue">
                <div className="mue2-msg-head">
                  <MueFlower size={16} /> Mue
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
