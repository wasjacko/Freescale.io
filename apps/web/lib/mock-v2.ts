// Freescale V2 — données MOCK (UI only, zéro backend).
//
// Volontairement SANS `server-only` : les écrans V2 (Plan du jour, Hub
// client, Ask Mue) sont des composants client et importent ces fausses
// données directement. Quand la V3 branchera le vrai (Supabase + RAG +
// intégrations), ces constantes seront remplacées par de vraies requêtes.

import type { ActionItem, Avatar, Client, MueAnswer } from "@/lib/types";

// Avatars « maison » (illustrations 3D) — utilisés partout à la place des
// photos pravatar, cohérents avec l'inbox.
const FACES = ["/avatars/1.webp", "/avatars/2.webp", "/avatars/3.webp", "/avatars/4.webp", "/avatars/5.webp", "/avatars/6.webp"];
const FACE = (i: number): Avatar => ({ kind: "img", src: FACES[((i % FACES.length) + FACES.length) % FACES.length] as string });

// ── Pilier « centraliser » : fiches clients 360 ────────────────────────
// Réutilise les conversations existantes du mock inbox (c1, c7, c3, c2, c9).
export const MOCK_CLIENTS: Client[] = [
  {
    id: "cl-sarah",
    name: "Sarah Lemoine",
    company: "Brightstone",
    email: "sarah@brightstone.fr",
    avatar: FACE(0),
    channels: ["whatsapp", "gmail"],
    lastContactLabel: "il y a 4 min",
    awaitingCount: 1,
    project: {
      id: "pr-bright",
      name: "Refonte produit V2",
      status: "on-track",
      progress: 65,
      dueLabel: "livraison 30 juin",
      milestones: [
        { id: "m1", label: "Wireframes", done: true },
        { id: "m2", label: "Design system", done: true },
        { id: "m3", label: "Intégration front", done: false },
        { id: "m4", label: "Tests & recette", done: false },
      ],
    },
    files: [
      {
        id: "f1",
        name: "maquettes-v2.fig",
        kind: "image",
        sizeLabel: "8,2 Mo",
        dateLabel: "12 juin",
      },
      {
        id: "f2",
        name: "brief-refonte.pdf",
        kind: "pdf",
        sizeLabel: "640 Ko",
        dateLabel: "2 juin",
      },
    ],
    invoices: [
      { id: "i1", number: "FAC-2026-012", amount: 2400, status: "paid", dateLabel: "30 mai" },
      { id: "i2", number: "FAC-2026-018", amount: 1800, status: "pending", dateLabel: "12 juin" },
    ],
    mueFacts: [
      "Préfère les échanges sur WhatsApp",
      "Aime un ton direct et visuel",
      "Décisionnaire final sur le design",
    ],
    integrations: [
      { kind: "figma", label: "3 fichiers", tone: "neutral" },
      { kind: "github", label: "repo lié", tone: "neutral" },
      { kind: "stripe", label: "facture en attente", tone: "warn" },
    ],
    conversationIds: ["c1"],
  },
  {
    id: "cl-alex",
    name: "Alexandre Dupont",
    company: "Dupont Consulting",
    email: "alexandre@dupont-consulting.fr",
    avatar: FACE(1),
    channels: ["slack", "gmail"],
    lastContactLabel: "il y a 35 min",
    awaitingCount: 1,
    project: {
      id: "pr-api",
      name: "Optimisation API",
      status: "at-risk",
      progress: 40,
      dueLabel: "échéance 25 juin",
      milestones: [
        { id: "m1", label: "Audit perf", done: true },
        { id: "m2", label: "Refacto requêtes", done: false },
        { id: "m3", label: "Mise en cache", done: false },
        { id: "m4", label: "Tests de charge", done: false },
      ],
    },
    files: [
      { id: "f1", name: "audit-perf.pdf", kind: "pdf", sizeLabel: "1,1 Mo", dateLabel: "8 juin" },
      {
        id: "f2",
        name: "contrat-mission.pdf",
        kind: "pdf",
        sizeLabel: "320 Ko",
        dateLabel: "20 mai",
      },
    ],
    invoices: [
      { id: "i1", number: "FAC-2026-009", amount: 3200, status: "paid", dateLabel: "18 mai" },
      { id: "i2", number: "FAC-2026-019", amount: 2100, status: "late", dateLabel: "5 juin" },
    ],
    mueFacts: [
      "Très technique — veut des détails et des chiffres",
      "Sensible aux temps de réponse de l'API",
      "Répond vite sur Slack",
    ],
    integrations: [
      { kind: "github", label: "12 PR", tone: "neutral" },
      { kind: "linear", label: "5 issues", tone: "neutral" },
      { kind: "stripe", label: "facture en retard", tone: "danger" },
    ],
    conversationIds: ["c7"],
  },
  {
    id: "cl-capucine",
    name: "Capucine Roy",
    company: "Studio Mave",
    email: "capucine@studio-mave.fr",
    avatar: FACE(4),
    channels: ["linkedin", "gmail"],
    lastContactLabel: "il y a 5 h",
    awaitingCount: 1,
    project: {
      id: "pr-vitrine",
      name: "Site vitrine",
      status: "late",
      progress: 80,
      dueLabel: "en retard · 2 j",
      milestones: [
        { id: "m1", label: "Maquettes", done: true },
        { id: "m2", label: "Intégration", done: true },
        { id: "m3", label: "Contenus (attente client)", done: false },
        { id: "m4", label: "Mise en ligne", done: false },
      ],
    },
    files: [
      {
        id: "f1",
        name: "devis-site-vitrine.pdf",
        kind: "pdf",
        sizeLabel: "210 Ko",
        dateLabel: "1 juin",
      },
    ],
    invoices: [
      { id: "i1", number: "FAC-2026-014", amount: 1500, status: "pending", dateLabel: "1 juin" },
    ],
    mueFacts: [
      "Studio créatif — ton chaleureux apprécié",
      "Attend la validation du devis pour avancer",
      "Préfère LinkedIn",
    ],
    integrations: [
      { kind: "figma", label: "1 fichier", tone: "neutral" },
      { kind: "stripe", label: "devis envoyé", tone: "warn" },
    ],
    conversationIds: ["c3"],
  },
  {
    id: "cl-thomas",
    name: "Thomas Aubry",
    company: "ITWA",
    email: "thomas@itwa.io",
    avatar: FACE(3),
    channels: ["gmail"],
    lastContactLabel: "il y a 2 h",
    awaitingCount: 1,
    project: {
      id: "pr-itwa",
      name: "Démarrage sprint",
      status: "on-track",
      progress: 20,
      dueLabel: "kickoff lundi",
      milestones: [
        { id: "m1", label: "Cadrage", done: true },
        { id: "m2", label: "Contrat signé", done: false },
        { id: "m3", label: "Kickoff", done: false },
      ],
    },
    files: [
      {
        id: "f1",
        name: "contrat-mission-itwa.pdf",
        kind: "pdf",
        sizeLabel: "280 Ko",
        dateLabel: "16 juin",
      },
    ],
    invoices: [
      { id: "i1", number: "FAC-2026-021", amount: 4000, status: "pending", dateLabel: "16 juin" },
    ],
    mueFacts: [
      "Veut le contrat signé avant vendredi",
      "Lance le sprint lundi",
      "Ton direct, va à l'essentiel",
    ],
    integrations: [
      { kind: "github", label: "repo créé", tone: "neutral" },
      { kind: "stripe", label: "acompte en attente", tone: "warn" },
    ],
    conversationIds: ["c2"],
  },
  {
    id: "cl-david",
    name: "David Kim",
    company: "Kim Ventures",
    email: "david@kim-ventures.com",
    avatar: FACE(5),
    channels: ["linkedin"],
    lastContactLabel: "il y a 4 h",
    awaitingCount: 0,
    project: {
      id: "pr-kim",
      name: "Board approval & contrat",
      status: "on-track",
      progress: 90,
      dueLabel: "signature semaine pro",
      milestones: [
        { id: "m1", label: "Proposition", done: true },
        { id: "m2", label: "Validation board", done: true },
        { id: "m3", label: "Signature", done: false },
      ],
    },
    files: [],
    invoices: [
      { id: "i1", number: "FAC-2026-022", amount: 6500, status: "pending", dateLabel: "14 juin" },
    ],
    mueFacts: [
      "Communique en anglais",
      "Board a validé — signature la semaine prochaine",
      "Ton formel",
    ],
    integrations: [{ kind: "stripe", label: "contrat en attente", tone: "warn" }],
    conversationIds: ["c9"],
  },
];

// ── Pilier « prioriser » : actions du Plan du Jour ──────────────────────
export const MOCK_ACTIONS: ActionItem[] = [
  {
    id: "a1",
    title: "Valider le devis de Capucine",
    clientName: "Capucine Roy",
    avatar: FACE(4),
    channel: "linkedin",
    reason: "late",
    reasonLabel: "en retard · 2 j",
    conversationId: "c3",
  },
  {
    id: "a2",
    title: "Répondre à Alexandre sur les temps de réponse API",
    clientName: "Alexandre Dupont",
    avatar: FACE(1),
    channel: "slack",
    reason: "awaiting",
    reasonLabel: "en attente depuis 35 min",
    conversationId: "c7",
  },
  {
    id: "a3",
    title: "Envoyer le contrat signé à Thomas",
    clientName: "Thomas Aubry",
    avatar: FACE(3),
    channel: "gmail",
    reason: "due-today",
    reasonLabel: "à faire aujourd'hui",
    dueLabel: "avant vendredi",
    conversationId: "c2",
  },
  {
    id: "a4",
    title: "Confirmer le kick-off avec Clara (lundi 14h)",
    clientName: "Clara Martin",
    avatar: FACE(2),
    channel: "gmail",
    reason: "awaiting",
    reasonLabel: "en attente depuis 1 h",
    conversationId: "c8",
  },
  {
    id: "a5",
    title: "Relancer Sophie sur le démarrage",
    clientName: "Sophie Bernard",
    avatar: FACE(0),
    channel: "whatsapp",
    reason: "follow-up",
    reasonLabel: "relance recommandée",
    conversationId: "c10",
  },
];

// ── Pilier « réduire la recherche » : réponses Ask Mue ──────────────────
// Match approximatif (mots-clés) côté composant ; sinon FALLBACK.
export const MOCK_MUE_ANSWERS: { match: string[]; answer: MueAnswer }[] = [
  {
    match: ["dupont", "alexandre", "api"],
    answer: {
      text: "Le projet « Optimisation API » de Dupont Consulting est à risque (40 % d'avancement, échéance le 25 juin).",
      bullets: [
        "Alexandre attend ta réponse sur les temps de réponse de l'API (depuis 35 min, sur Slack).",
        "La refacto des requêtes est en cours, la mise en cache et les tests de charge restent à faire.",
        "Une facture (FAC-2026-019, 2 100 €) est en retard.",
      ],
      sources: [
        { label: "messages", count: 6 },
        { label: "tâche", count: 1 },
        { label: "facture", count: 1 },
      ],
    },
  },
  {
    match: ["sarah", "brightstone", "maquette", "design"],
    answer: {
      text: "Le projet « Refonte produit V2 » de Sarah (Brightstone) est dans les temps (65 %, livraison le 30 juin).",
      bullets: [
        "Sarah a renvoyé des ajustements sur les maquettes V2 il y a 4 min (WhatsApp).",
        "Wireframes et design system validés ; l'intégration front est en cours.",
        "Facture FAC-2026-018 (1 800 €) en attente de paiement.",
      ],
      sources: [
        { label: "messages", count: 4 },
        { label: "fichiers", count: 2 },
      ],
    },
  },
  {
    match: ["facture", "impayé", "retard", "paiement", "stripe"],
    answer: {
      text: "Tu as 1 facture en retard et 4 en attente de paiement.",
      bullets: [
        "En retard : FAC-2026-019 — Dupont Consulting — 2 100 €.",
        "En attente : Brightstone (1 800 €), Studio Mave (1 500 €), ITWA (4 000 €), Kim Ventures (6 500 €).",
      ],
      sources: [{ label: "factures", count: 5 }],
    },
  },
];

export const MOCK_MUE_ANSWER_FALLBACK: MueAnswer = {
  text: "Je n'ai pas encore l'info exacte sous la main (démo). Essaie « où en est Dupont ? », « résume Sarah » ou « mes factures en retard ».",
  sources: [],
};

export const MOCK_SUGGESTED_QUESTIONS = [
  "Où en est le projet Dupont ?",
  "Résume la situation de Sarah",
  "Quelles factures sont en retard ?",
];

/**
 * Bilan de la semaine — FAITS RÉELS comptables (pas d'« heures gagnées »
 * interprétées). « activity » = ce que Mue a fait ; « followUp » = ce qui
 * demande encore ton attention (rend le bilan utile, pas auto-congratulant).
 */
export const MOCK_WEEK_RECAP = {
  activity: [
    { label: "Brouillons proposés par Mue", value: 12 },
    { label: "Messages triés automatiquement", value: 23 },
    { label: "Relances envoyées", value: 5 },
    { label: "Tâches créées depuis tes messages", value: 4 },
  ],
  followUp: [
    { label: "Clients en attente de réponse", value: 4 },
    { label: "Actions prioritaires aujourd'hui", value: 3 },
  ],
};
