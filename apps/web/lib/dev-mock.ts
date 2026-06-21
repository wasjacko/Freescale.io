import "server-only";
import type {
  DailyBriefing,
  ReplySuggestion,
  SuggestedTask,
  ThreadSummary,
  TranslatedMessage,
} from "@/lib/actions/mue";
import type { CurrentUser } from "@/lib/auth";
import type { InboxData } from "@/lib/data/queries";
import { MOCK_MUE_ANSWERS } from "@/lib/mock-v2";
import type { CalEvent, Conversation, Message, Task, UpcomingEvent } from "@/lib/types";

/**
 * DEV-ONLY auth + data bypass.
 *
 * Lets us work on the SaaS UI locally WITHOUT going through login or
 * connecting a real Gmail. Injects a fake user + rich sample inbox data.
 *
 * GUARD: double-locked so it can NEVER leak to production —
 *   1. NODE_ENV must be "development" (Vercel/prod builds = "production")
 *   2. DEV_NO_AUTH must be explicitly "1" in .env.local
 *
 * Turn it OFF anytime by removing DEV_NO_AUTH from .env.local.
 */
export function isDevNoAuth(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_NO_AUTH === "1";
}

export function mockCurrentUser(): CurrentUser {
  return {
    id: "dev-user-0000",
    email: "dev@freescale.local",
    name: "Wacil AIT",
    firstName: "Wacil",
    avatarUrl: "/avatar.png",
    role: "Freelance",
    onboardedAt: "2026-01-01T00:00:00.000Z", // déjà onboardé → pas de chips
    profileRole: "Développeur",
    profileObjective: "Gagner du temps sur la gestion client",
    profileUsageMode: "solo",
  };
}

// Helper : ISO relatif (il y a N minutes/heures/jours)
function isoAgo(opts: { days?: number; hours?: number; minutes?: number }): string {
  const d = new Date();
  if (opts.days) d.setDate(d.getDate() - opts.days);
  if (opts.hours) d.setHours(d.getHours() - opts.hours);
  if (opts.minutes) d.setMinutes(d.getMinutes() - opts.minutes);
  return d.toISOString();
}

// Vrais visuels pour la démo : photos humaines (pravatar) + logos de marques
// (clearbit). Fallback initiales si l'image ne charge pas (géré par <Avatar/>).
const IMG = (src: string): Conversation["avatar"] => ({ kind: "img", src });

// Avatars « maison » (illustrations 3D) — on s'en sert PARTOUT pour les
// contacts/clients à la place des photos pravatar. 5 visuels, on boucle.
const FACES = [
  "/avatars/1.webp",
  "/avatars/2.webp",
  "/avatars/3.webp",
  "/avatars/4.webp",
  "/avatars/5.webp",
  "/avatars/6.webp",
];
const FACE = (i: number): Conversation["avatar"] => ({
  kind: "img",
  src: FACES[((i % FACES.length) + FACES.length) % FACES.length] as string,
});

const AV = (text: string, bg: string): Conversation["avatar"] => ({
  kind: "initials",
  text,
  bg,
});

export function mockInboxData(): InboxData {
  const conversations: Conversation[] = [
    {
      id: "c1",
      name: "Sarah Lemoine",
      preview:
        "Parfait pour la nouvelle direction ! Quelques ajustements avant de partager à l'équipe.",
      lastAtIso: isoAgo({ minutes: 4 }),
      avatar: FACE(0),
      channel: "whatsapp",
      unread: true,
      group: "today",
      subject: "Maquettes V2 — design review",
      contactEmail: "sarah@brightstone.fr",
      category: "client",
      starred: true,
      tags: ["design", "urgent"],
      lastInboundAt: isoAgo({ minutes: 4 }),
      lastOutboundAt: isoAgo({ hours: 3 }),
      clientTone: "cool",
      clientLang: "fr",
    },
    {
      id: "c7",
      name: "Alexandre Dupont",
      preview:
        "J'ai bien reçu les livrables, mais j'ai une question sur les temps de chargement de l'API.",
      lastAtIso: isoAgo({ minutes: 35 }),
      avatar: FACE(1),
      channel: "slack",
      unread: true,
      group: "today",
      subject: "Optimisation de l'API",
      contactEmail: "alexandre@dupont-consulting.fr",
      category: "client",
      tags: ["technique", "performance"],
      lastInboundAt: isoAgo({ minutes: 35 }),
      lastOutboundAt: isoAgo({ hours: 5 }),
      clientTone: "direct",
      clientLang: "fr",
    },
    {
      id: "c8",
      name: "Clara Martin",
      preview: "Bonjour ! Est-ce qu'on peut caler notre call de kick-off lundi après-midi à 14h ?",
      lastAtIso: isoAgo({ hours: 1, minutes: 15 }),
      avatar: FACE(2),
      channel: "gmail",
      unread: true,
      group: "today",
      subject: "Kick-off Projet Alpha",
      contactEmail: "clara.martin@alpha-corp.com",
      category: "client",
      starred: true,
      tags: ["meeting", "important"],
      lastInboundAt: isoAgo({ hours: 1, minutes: 15 }),
      lastOutboundAt: isoAgo({ days: 1 }),
      clientTone: "chaleureux",
      clientLang: "fr",
    },
    {
      id: "c2",
      name: "Thomas Aubry",
      preview:
        "Peux-tu m'envoyer le contrat signé avant vendredi ? On veut lancer le sprint lundi.",
      lastAtIso: isoAgo({ hours: 2 }),
      avatar: FACE(3),
      channel: "gmail",
      unread: true,
      group: "today",
      subject: "Contrat mission — ITWA",
      contactEmail: "thomas@itwa.io",
      category: "client",
      tags: ["contrat"],
      lastInboundAt: isoAgo({ hours: 2 }),
      lastOutboundAt: isoAgo({ days: 1 }),
      clientTone: "direct",
      clientLang: "fr",
    },
    {
      id: "c9",
      name: "David Kim",
      preview:
        "The feedback from the board is highly positive. Can we proceed to signing next week?",
      lastAtIso: isoAgo({ hours: 4 }),
      avatar: FACE(5),
      channel: "linkedin",
      group: "today",
      subject: "Board approval & Contract",
      contactEmail: "david@kim-ventures.com",
      category: "client",
      tags: ["contrat"],
      lastInboundAt: isoAgo({ hours: 4 }),
      lastOutboundAt: isoAgo({ days: 3 }),
      clientTone: "formal",
      clientLang: "en",
    },
    {
      id: "c3",
      name: "Capucine Roy",
      preview: "J'ai relu le devis, tout est bon de mon côté. On valide ?",
      lastAtIso: isoAgo({ hours: 5 }),
      avatar: FACE(4),
      channel: "linkedin",
      group: "today",
      subject: "Devis refonte site vitrine",
      contactEmail: "capucine@studio-mave.fr",
      category: "client",
      lastInboundAt: isoAgo({ hours: 5 }),
      lastOutboundAt: isoAgo({ days: 2 }),
      clientTone: "chaleureux",
      clientLang: "fr",
    },
    {
      id: "c10",
      name: "Sophie Bernard",
      preview:
        "Merci pour le retour rapide. Je valide la proposition financière. On commence quand ?",
      lastAtIso: isoAgo({ hours: 18 }),
      avatar: FACE(0),
      channel: "whatsapp",
      group: "yesterday",
      subject: "Validation proposition commerciale",
      contactEmail: "sophie.b@inov.fr",
      category: "client",
      tags: ["validation"],
      lastInboundAt: isoAgo({ hours: 18 }),
      lastOutboundAt: isoAgo({ days: 2 }),
      clientTone: "cool",
      clientLang: "fr",
    },
    {
      id: "c4",
      name: "Notion",
      preview: "Votre rapport hebdomadaire d'activité est prêt à consulter.",
      lastAtIso: isoAgo({ days: 1, hours: 1 }),
      avatar: IMG("https://www.google.com/s2/favicons?domain=notion.so&sz=128"),
      channel: "gmail",
      group: "yesterday",
      subject: "Votre semaine sur Notion",
      contactEmail: "team@notion.so",
      category: "notif",
    },
    {
      id: "c11",
      name: "Marc Durand",
      preview:
        "Est-ce qu'on pourrait ajouter un écran de statistiques sur le dashboard ? Quel serait le surcoût ?",
      lastAtIso: isoAgo({ days: 1, hours: 4 }),
      avatar: FACE(1),
      channel: "outlook",
      group: "yesterday",
      subject: "Demande d'évolution — Module Stats",
      contactEmail: "m.durand@durand-associes.fr",
      category: "client",
      tags: ["estimation"],
      lastInboundAt: isoAgo({ days: 1, hours: 4 }),
      lastOutboundAt: isoAgo({ days: 4 }),
      clientTone: "chaleureux",
      clientLang: "fr",
    },
    {
      id: "c5",
      name: "Luc Mercier",
      preview: "Hello ! Dispo pour un call rapide cette semaine sur le projet e-commerce ?",
      lastAtIso: isoAgo({ days: 2 }),
      avatar: FACE(2),
      channel: "gmail",
      group: "this-week",
      subject: "Call projet e-commerce",
      contactEmail: "luc@mercier-co.fr",
      category: "client",
      lastInboundAt: isoAgo({ days: 5 }),
      lastOutboundAt: isoAgo({ days: 2 }),
      clientTone: "cool",
      clientLang: "fr",
    },
    {
      id: "c12",
      name: "Julie Roche",
      preview:
        "Je serai en congé toute la semaine prochaine, n'hésite pas à m'envoyer le code d'accès par mail.",
      lastAtIso: isoAgo({ days: 3 }),
      avatar: FACE(3),
      channel: "slack",
      group: "this-week",
      subject: "Accès hébergement / Absence",
      contactEmail: "j.roche@aeris-travel.fr",
      category: "client",
      lastInboundAt: isoAgo({ days: 3 }),
      lastOutboundAt: isoAgo({ days: 6 }),
      clientTone: "cool",
      clientLang: "fr",
    },
    {
      id: "c6",
      name: "Stripe",
      preview: "Vous avez reçu un paiement de 1 250,00 € de la part de ITWA SAS.",
      lastAtIso: isoAgo({ days: 4 }),
      avatar: IMG("https://www.google.com/s2/favicons?domain=stripe.com&sz=128"),
      channel: "gmail",
      group: "earlier",
      subject: "Paiement reçu · 1 250,00 €",
      contactEmail: "receipts@stripe.com",
      category: "notif",
    },
  ];

  // Horodatages relatifs pour démontrer les séparateurs de date du fil :
  // hier après-midi → aujourd'hui matin (comme « Tuesday, 16:53 » + « Today »).
  const atIso = (dayOffset: number, h: number, m: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const hm = (iso: string) =>
    new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // 4 messages sortants (moi) le matin, puis les réponses de Sarah.
  const c1o1 = atIso(-1, 9, 12);
  const c1o2 = atIso(-1, 9, 13);
  const c1o3 = atIso(-1, 9, 14);
  const c1o4 = atIso(-1, 9, 15);
  const c1m1 = atIso(-1, 16, 53);
  const c1m2 = atIso(-1, 16, 54);
  const c1m3 = atIso(0, 10, 8);
  const c1o5 = atIso(0, 10, 15);
  const c1o6 = atIso(0, 10, 16);
  const c1m4 = atIso(0, 10, 20);
  const c1o7 = atIso(0, 10, 22);
  const c1m5 = atIso(0, 10, 25);
  const c1o8 = atIso(0, 10, 30);
  const c2m1 = atIso(0, 12, 30);

  const c7m1 = isoAgo({ minutes: 35 });
  const c8m1 = isoAgo({ hours: 1, minutes: 15 });
  const c9m1 = isoAgo({ hours: 4 });
  const c10m1 = isoAgo({ hours: 18 });
  const c11m1 = isoAgo({ days: 1, hours: 4 });
  const c12m1 = isoAgo({ days: 3 });

  const messagesByConv: Record<string, Message[]> = {
    c1: [
      {
        id: "m1o",
        dir: "out",
        text: "Salut Sarah ! Voici la première version des maquettes 👇",
        time: hm(c1o1),
        sentAtIso: c1o1,
      },
      {
        id: "m2o",
        dir: "out",
        text: "J'ai repris la nouvelle direction qu'on avait évoquée.",
        time: hm(c1o2),
        sentAtIso: c1o2,
      },
      {
        id: "m3o",
        dir: "out",
        text: "N'hésite pas si tu veux ajuster des choses.",
        time: hm(c1o3),
        sentAtIso: c1o3,
      },
      {
        id: "m4o",
        dir: "out",
        text: "Hâte d'avoir ton retour 🙌",
        time: hm(c1o4),
        sentAtIso: c1o4,
      },
      {
        id: "m1",
        dir: "in",
        text: "Parfait pour la nouvelle direction ! 🔥",
        time: hm(c1m1),
        sentAtIso: c1m1,
        senderName: "Sarah Lemoine",
        senderEmail: "sarah@brightstone.fr",
      },
      {
        id: "m2",
        dir: "in",
        text: "Quelques ajustements avant de partager à l'équipe.",
        time: hm(c1m2),
        sentAtIso: c1m2,
        senderName: "Sarah Lemoine",
        senderEmail: "sarah@brightstone.fr",
      },
      {
        id: "m3",
        dir: "in",
        text: "Tu peux m'envoyer la V2 d'ici vendredi ?",
        time: hm(c1m3),
        sentAtIso: c1m3,
        senderName: "Sarah Lemoine",
        senderEmail: "sarah@brightstone.fr",
      },
      {
        id: "m5o",
        dir: "out",
        text: "Oui bien sûr, je m'en occupe aujourd'hui.",
        time: hm(c1o5),
        sentAtIso: c1o5,
      },
      {
        id: "m6o",
        dir: "out",
        text: "Je vais également intégrer les retours sur la typographie et les contrastes de couleurs.",
        time: hm(c1o6),
        sentAtIso: c1o6,
      },
      {
        id: "m4",
        dir: "in",
        text: "Super, merci beaucoup ! Pense aussi à modifier le header, l'ancien ne plaisait pas trop à l'équipe.",
        time: hm(c1m4),
        sentAtIso: c1m4,
        senderName: "Sarah Lemoine",
        senderEmail: "sarah@brightstone.fr",
      },
      {
        id: "m7o",
        dir: "out",
        text: "Entendu, j'ajuste le header avec les nouvelles propositions.",
        time: hm(c1o7),
        sentAtIso: c1o7,
      },
      {
        id: "m5",
        dir: "in",
        text: "Top ! Hâte de voir ça. Je reste disponible si besoin.",
        time: hm(c1m5),
        sentAtIso: c1m5,
        senderName: "Sarah Lemoine",
        senderEmail: "sarah@brightstone.fr",
      },
      {
        id: "m8o",
        dir: "out",
        text: "Parfait, je reviens vers toi très vite avec les maquettes mises à jour.",
        time: hm(c1o8),
        sentAtIso: c1o8,
      },
    ],
    c2: [
      {
        id: "m4",
        dir: "in",
        text: "Peux-tu m'envoyer le contrat signé avant vendredi ? On veut lancer le sprint lundi.",
        time: hm(c2m1),
        sentAtIso: c2m1,
        senderName: "Thomas Aubry",
        senderEmail: "thomas@itwa.io",
      },
    ],
    c7: [
      {
        id: "mc7_1",
        dir: "in",
        text: "J'ai bien reçu les livrables, mais j'ai une question sur les temps de chargement de l'API. Les requêtes de liste mettent plus de 2s à s'exécuter.",
        time: hm(c7m1),
        sentAtIso: c7m1,
        senderName: "Alexandre Dupont",
        senderEmail: "alexandre@dupont-consulting.fr",
      },
    ],
    c8: [
      {
        id: "mc8_1",
        dir: "in",
        text: "Bonjour ! Est-ce qu'on peut caler notre call de kick-off lundi après-midi à 14h ?",
        time: hm(c8m1),
        sentAtIso: c8m1,
        senderName: "Clara Martin",
        senderEmail: "clara.martin@alpha-corp.com",
      },
    ],
    c9: [
      {
        id: "mc9_1",
        dir: "in",
        text: "The feedback from the board is highly positive. Can we proceed to signing next week?",
        time: hm(c9m1),
        sentAtIso: c9m1,
        senderName: "David Kim",
        senderEmail: "david@kim-ventures.com",
      },
    ],
    c10: [
      {
        id: "mc10_1",
        dir: "in",
        text: "Merci pour le retour rapide. Je valide la proposition financière. On commence quand ?",
        time: hm(c10m1),
        sentAtIso: c10m1,
        senderName: "Sophie Bernard",
        senderEmail: "sophie.b@inov.fr",
      },
    ],
    c11: [
      {
        id: "mc11_1",
        dir: "in",
        text: "Est-ce qu'on pourrait ajouter un écran de statistiques sur le dashboard ? Quel serait le surcoût ?",
        time: hm(c11m1),
        sentAtIso: c11m1,
        senderName: "Marc Durand",
        senderEmail: "m.durand@durand-associes.fr",
      },
    ],
    c12: [
      {
        id: "mc12_1",
        dir: "in",
        text: "Je serai en congé toute la semaine prochaine, n'hésite pas à m'envoyer le code d'accès par mail.",
        time: hm(c12m1),
        sentAtIso: c12m1,
        senderName: "Julie Roche",
        senderEmail: "j.roche@aeris-travel.fr",
      },
    ],
  };

  // Échéance relative au jour courant (17h locale) — permet de démontrer les
  // états « En retard » / « Aujourd'hui » quel que soit le jour du test.
  const dueIn = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  };

  const tasks: Task[] = [
    {
      id: "t1",
      title: "Envoyer la V2 des maquettes à Sarah",
      priority: "high",
      dueLabel: "Aujourd'hui",
      isToday: true,
      avatar: AV("SL", "#FFE5E1"),
      channel: "whatsapp",
      status: "todo",
      sortableIndex: 1000,
      fromAI: true,
      conversationId: "c1",
      dueAtIso: dueIn(0),
      createdAtIso: isoAgo({ hours: 2 }),
      coverImage: "/tasks/1.png",
    },
    {
      id: "t2",
      title: "Signer + renvoyer le contrat ITWA",
      priority: "high",
      dueLabel: "Vendredi",
      avatar: AV("TA", "#E8EAFF"),
      channel: "gmail",
      status: "in-progress",
      sortableIndex: 2000,
      fromAI: true,
      conversationId: "c2",
      clientConvIds: ["c2", "c7", "c9"],
      dueAtIso: dueIn(2),
      createdAtIso: isoAgo({ days: 1 }),
    },
    // Sous-tâches de t2 — la checklist du contrat (démo du chip « 1/2 »).
    {
      id: "t2a",
      title: "Relire les clauses de cession",
      priority: "medium",
      dueLabel: "Vendredi",
      avatar: AV("TA", "#E8EAFF"),
      channel: "gmail",
      status: "done",
      parentTaskId: "t2",
      sortableIndex: 2100,
    },
    {
      id: "t2b",
      title: "Préparer la version signée pour l'envoi",
      priority: "medium",
      dueLabel: "Vendredi",
      avatar: AV("TA", "#E8EAFF"),
      channel: "gmail",
      status: "todo",
      parentTaskId: "t2",
      sortableIndex: 2200,
    },
    {
      id: "t3",
      title: "Valider le devis de Capucine",
      priority: "medium",
      dueLabel: "Cette semaine",
      avatar: AV("CR", "#D8F3DD"),
      channel: "linkedin",
      status: "awaiting-reply",
      sortableIndex: 3000,
      fromAI: true,
      conversationId: "c3",
      dueAtIso: dueIn(-2),
      createdAtIso: isoAgo({ days: 3 }),
    },
    {
      id: "t5",
      title: "Cadrer le brief de la refonte landing page",
      priority: "low",
      dueLabel: "Cette semaine",
      avatar: FACE(2),
      channel: "gmail",
      status: "to-scope",
      sortableIndex: 5000,
      createdAtIso: isoAgo({ days: 1, hours: 4 }),
    },
    {
      id: "t6",
      title: "Livrer les wireframes V1 à Sarah",
      priority: "medium",
      dueLabel: "12 juin",
      avatar: AV("SL", "#FFE5E1"),
      channel: "whatsapp",
      status: "done",
      sortableIndex: 6000,
      fromAI: true,
      conversationId: "c1",
      createdAtIso: isoAgo({ days: 8 }),
    },
    {
      id: "t7",
      title: "Optimiser les requêtes API pour Alexandre",
      priority: "high",
      dueLabel: "Demain",
      avatar: FACE(1),
      channel: "slack",
      status: "in-progress",
      sortableIndex: 2300,
      fromAI: true,
      conversationId: "c7",
      dueAtIso: dueIn(1),
      createdAtIso: isoAgo({ hours: 6 }),
    },
    {
      id: "t8",
      title: "Préparer la proposition commerciale pour Sophie",
      priority: "medium",
      dueLabel: "Cette semaine",
      avatar: FACE(0),
      channel: "whatsapp",
      status: "in-progress",
      sortableIndex: 2400,
      conversationId: "c10",
      dueAtIso: dueIn(3),
      createdAtIso: isoAgo({ days: 1 }),
      coverImage: "/tasks/2.png",
    },
    {
      id: "t9",
      title: "Chiffrer l'écran de statistiques du dashboard",
      priority: "medium",
      dueLabel: "Jeudi",
      avatar: FACE(3),
      channel: "outlook",
      status: "in-progress",
      sortableIndex: 2500,
      fromAI: true,
      conversationId: "c11",
      clientConvIds: ["c9", "c1"],
      dueAtIso: dueIn(4),
      createdAtIso: isoAgo({ days: 2 }),
    },
  ];

  const events: CalEvent[] = [
    {
      id: "e1",
      title: "Design review — Sarah",
      startMinutes: 60,
      durationMinutes: 60,
      day: 2,
      color: "pink",
      channel: "gmail",
    },
    {
      id: "e2",
      title: "Call e-commerce — Luc",
      startMinutes: 180,
      durationMinutes: 45,
      day: 3,
      color: "blue",
      channel: "gmail",
    },
    {
      id: "e3",
      title: "Focus : dev sprint ITWA",
      startMinutes: 300,
      durationMinutes: 120,
      day: 4,
      color: "lav",
    },
  ];

  const upcoming: UpcomingEvent[] = [
    { id: "u1", title: "Design review — Sarah", when: "Mar. 9:00", channel: "gmail" },
    { id: "u2", title: "Call e-commerce — Luc", when: "Mer. 11:00", channel: "gmail" },
  ];

  // Programmatically generate 98 more mock conversations to reach 110 total conversations (around 100 as requested)
  const generatedConversations: Conversation[] = [];
  const generatedMessagesByConv: Record<string, Message[]> = {};

  const firstNames = [
    "Paul",
    "Jean",
    "Julie",
    "Marie",
    "Pierre",
    "Michel",
    "Lucas",
    "Léa",
    "Emma",
    "Hugo",
    "Chloé",
    "Nathan",
    "Manon",
    "Enzo",
    "Sarah",
    "Louis",
    "Arthur",
    "Mathis",
    "Camille",
    "Clara",
  ];
  const lastNames = [
    "Martin",
    "Bernard",
    "Dubois",
    "Thomas",
    "Robert",
    "Richard",
    "Petit",
    "Durand",
    "Leroy",
    "Moreau",
    "Simon",
    "Laurent",
    "Lefebvre",
    "Michel",
    "Garcia",
    "David",
    "Bertrand",
    "Roux",
    "Vincent",
    "Fournier",
  ];
  const channels = ["gmail", "outlook", "whatsapp", "slack", "linkedin"] as const;
  const subjects = [
    "Question sur la facturation",
    "Mise à jour du calendrier",
    "Retour sur la réunion de ce matin",
    "Documents à signer",
    "Proposition commerciale révisée",
    "Disponibilités pour un entretien",
    "Problème d'accès à la plateforme",
    "Validation des maquettes V3",
    "Suivi du projet de développement",
    "Demande d'informations complémentaires",
  ];
  const previews = [
    "Bonjour, auriez-vous des disponibilités pour un appel demain ?",
    "Voici les fichiers mis à jour, dites-moi si cela vous convient.",
    "Merci pour votre réactivité. Nous validons les étapes présentées.",
    "Pouvez-vous me confirmer la date de livraison finale ?",
    "Un petit point pour vous informer que le contrat est prêt.",
    "Je rencontre un bug sur la page de connexion, pouvez-vous regarder ?",
    "Excellent travail sur le design, toute l'équipe est ravie !",
    "N'oubliez pas de m'envoyer le RIB pour le règlement.",
    "Pouvez-vous ajouter Marc en copie sur nos prochains échanges ?",
    "Je serai en déplacement professionnel la semaine prochaine.",
  ];
  const groups = ["today", "yesterday", "this-week", "earlier"] as const;
  const tones = ["cool", "direct", "chaleureux", "formal"] as const;

  for (let i = 13; i <= 110; i++) {
    const fn = firstNames[i % firstNames.length] ?? "User";
    const ln = lastNames[(i * 3) % lastNames.length] ?? "Name";
    const name = `${fn} ${ln}`;
    const channel = channels[i % channels.length] ?? "gmail";
    const subject = subjects[i % subjects.length] ?? "Sujet";
    const preview = previews[i % previews.length] ?? "Aperçu";
    const category = i % 5 === 0 ? "notif" : "client";
    const group = groups[i % groups.length] ?? "earlier";
    const unread = i % 3 === 0;

    let lastAtIso: string;
    if (group === "today") {
      lastAtIso = isoAgo({ minutes: (i * 7) % 60, hours: (i * 3) % 12 });
    } else if (group === "yesterday") {
      lastAtIso = isoAgo({ days: 1, hours: (i * 2) % 24 });
    } else if (group === "this-week") {
      lastAtIso = isoAgo({ days: 2 + (i % 4) });
    } else {
      lastAtIso = isoAgo({ days: 7 + (i % 20) });
    }

    const convId = `c${i}`;
    const contactEmail = `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`;

    generatedConversations.push({
      id: convId,
      name,
      preview,
      lastAtIso,
      // Vraie photo (pravatar) pour chaque contact ; repli initiales noires
      // géré par <Avatar/> si l'image ne charge pas.
      avatar: FACE(i),
      channel,
      unread,
      group,
      subject,
      contactEmail,
      category,
      starred: i % 10 === 0,
      tags: i % 8 === 0 ? ["important"] : [],
      lastInboundAt: lastAtIso,
      clientTone: category === "client" ? (tones[i % tones.length] ?? "cool") : null,
      clientLang: category === "client" ? "fr" : null,
    });

    generatedMessagesByConv[convId] = [
      {
        id: `m${i}_1`,
        dir: "in",
        text: preview,
        time: hm(lastAtIso),
        sentAtIso: lastAtIso,
        senderName: name,
        senderEmail: contactEmail,
      },
    ];
  }

  // Inbox volontairement resserrée sur les 5 clients principaux — les mêmes
  // que la page Clients (Sarah, Alexandre, Capucine, Thomas, David).
  const INBOX_CLIENT_IDS = new Set(["c1", "c7", "c3", "c2", "c9"]);
  const allConversations = [...conversations, ...generatedConversations].filter((c) =>
    INBOX_CLIENT_IDS.has(c.id)
  );
  const allMessagesByConv = { ...messagesByConv, ...generatedMessagesByConv };

  return {
    workspaceId: "dev-ws-0000",
    activeWorkspaceId: "dev-ws-0000",
    currentWorkspaceRole: "owner",
    workspaces: [{ id: "dev-ws-0000", name: "Mon workspace", role: "owner" }],
    canConnectChannels: true,
    conversations: allConversations,
    messagesByConv: allMessagesByConv,
    tasks,
    events,
    upcoming,
    channels: [
      {
        id: "ch-gmail-dev",
        kind: "gmail",
        displayName: "dev@freescale.local",
        conversationCount: allConversations.length,
        unreadCount: allConversations.filter((c) => c.unread).length,
        status: "active",
        lastSyncError: null,
      },
    ],
  };
}

// ── Mue mock responses (DEV_NO_AUTH) ────────────────────────────────────
// Let the whole Mue surface render locally — brief, summary, tasks,
// replies, chat, translation — without a real Claude key or workspace.

const MOCK_CONTACT: Record<string, string> = {
  c1: "Sarah Lemoine",
  c2: "Thomas Aubry",
  c3: "Capucine Roy",
  c4: "Notion",
  c5: "Luc Mercier",
  c6: "Stripe",
};

export function mockDailyBriefing(): DailyBriefing {
  return {
    headline: "4 tâches détectées dans tes conversations récentes.",
    items: [
      {
        conversationId: "c1",
        contactName: "Sarah Lemoine",
        title: "Envoyer la V2 des maquettes à Sarah",
        why: "Elle a validé la direction et attend la V2.",
        priority: "high",
        due: null,
        timeAgo: "il y a 4 min",
        avatars: [{ kind: "image", url: FACES[0] as string }],
      },
      {
        conversationId: "c7",
        contactName: "Alexandre Dupont",
        title: "Répondre à Alexandre sur les temps de réponse de l'API",
        why: "Question technique en attente depuis ce matin.",
        priority: "high",
        due: null,
        timeAgo: "il y a 35 min",
        avatars: [{ kind: "image", url: FACES[1] as string }],
      },
      {
        conversationId: "c9",
        contactName: "David Kim",
        title: "Confirmer la signature avec David (semaine prochaine)",
        why: "Le board a validé, il veut avancer sur la signature.",
        priority: "medium",
        due: null,
        timeAgo: "il y a 1 h",
        avatars: [{ kind: "image", url: FACES[2] as string }],
      },
      {
        conversationId: "c2",
        contactName: "Thomas Aubry",
        title: "Envoyer le contrat signé à Thomas",
        why: "Il veut le contrat avant vendredi pour lancer le sprint.",
        priority: "high",
        due: null,
        timeAgo: "il y a 2 h",
        avatars: [{ kind: "image", url: FACES[3] as string }],
      },
    ],
  };
}

export function mockThreadSummary(conversationId: string): ThreadSummary {
  const name = MOCK_CONTACT[conversationId] ?? "ton contact";
  return {
    tldr: `${name} a validé la nouvelle direction et attend ta prochaine étape.`,
    bullets: [
      "La direction créative est validée de son côté.",
      "Quelques ajustements demandés avant partage à l'équipe.",
      "Prochaine étape : envoyer la V2 en fin de journée.",
    ],
  };
}

export function mockSuggestedTasks(conversationId: string): SuggestedTask[] {
  const name = MOCK_CONTACT[conversationId] ?? "le contact";
  return [
    { title: `Envoyer la V2 à ${name}`, priority: "high", due: null },
    {
      title: "Préparer les ajustements demandés avant partage équipe",
      priority: "medium",
      due: null,
    },
  ];
}

export function mockReplySuggestions(_conversationId: string): ReplySuggestion[] {
  return [
    {
      label: "Confirmer + délai",
      text: "Merci pour ton retour ! Je prends en compte les ajustements et je t'envoie la V2 en fin de journée.",
    },
    {
      label: "Demander des précisions",
      text: "Content que la direction te plaise. Tu peux me préciser les ajustements que tu as en tête avant que je partage à l'équipe ?",
    },
    {
      label: "Proposer un point",
      text: "Parfait ! On se cale 15 min en visio pour valider les derniers détails avant que je finalise la V2 ?",
    },
  ];
}

export function mockAskMueAnswer(question: string): string {
  const q = question.toLowerCase();
  // Questions « activité » → réponse sourcée (Dupont / Sarah / factures…),
  // façon « demande, ne cherche pas » directement dans le copilote.
  for (const entry of MOCK_MUE_ANSWERS) {
    if (entry.match.some((m) => q.includes(m))) {
      const a = entry.answer;
      const bullets = a.bullets?.length ? `\n\n${a.bullets.map((b) => `• ${b}`).join("\n")}` : "";
      const sources = a.sources?.length
        ? `\n\nSources : ${a.sources.map((s) => `${s.count} ${s.label}`).join(" · ")}`
        : "";
      return `${a.text}${bullets}${sources}`;
    }
  }
  if (q.includes("résum") || q.includes("resum")) {
    return "En deux mots : la direction est validée, il reste des ajustements mineurs, et la prochaine étape est d'envoyer la V2. Tu veux que je te prépare un brouillon de réponse ?";
  }
  if (
    q.includes("répond") ||
    q.includes("repond") ||
    q.includes("brouillon") ||
    q.includes("réponse")
  ) {
    return "Voici une piste : « Merci pour ton retour ! Je prends en compte les ajustements et je t'envoie la V2 en fin de journée. » Tu veux un ton plus formel ou plus direct ?";
  }
  return "Bien noté. (Réponse simulée en local — branche un vrai Gmail + clé Claude pour des réponses réelles.) Je peux résumer le fil, proposer une réponse, ou sortir les actions à faire — dis-moi.";
}

export function mockTranslatedMessages(
  conversationId: string,
  targetLang: string
): TranslatedMessage[] {
  const name = MOCK_CONTACT[conversationId] ?? "Contact";
  return [
    {
      sender: name,
      date: new Date().toISOString(),
      translated: `[${targetLang}] Great on the new direction! A few tweaks before sharing with the team.`,
    },
    {
      sender: "Moi",
      date: new Date().toISOString(),
      translated: `[${targetLang}] Got it! I'll send you the V2 by end of day.`,
    },
  ];
}

export function mockToneRewrite(text: string, tone: string): string {
  const trimmed = text.trim();
  if (tone === "formal") return `Bonjour,\n\n${trimmed}\n\nBien cordialement,`;
  if (tone === "casual") return `Hello ! ${trimmed} 🙌`;
  return trimmed;
}
