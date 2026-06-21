// Domain types shared across the app

export type ChannelId =
  | "gmail"
  | "outlook"
  | "icloud"
  | "imap"
  | "instagram"
  | "whatsapp"
  | "slack"
  | "discord"
  | "x"
  | "linkedin"
  | "telegram"
  | "messenger"
  | "sms";

export type ViewId =
  | "today"
  | "inbox"
  | "tasks"
  | "calendar"
  | "ai-knowledge"
  | "clients"
  | "recap"
  | "mue";

export type AvatarSource =
  | { kind: "img"; src: string }
  | { kind: "initials"; text: string; bg?: string };

export type Avatar = AvatarSource & {
  alt?: string;
};

/** Mue-classified bucket. NULL = not yet triaged. */
export type ConversationCategory = "client" | "promo" | "notif" | "other" | null;

export type Conversation = {
  id: string;
  name: string;
  preview: string;
  /** ISO date of last message; formatted client-side for correct local time */
  lastAtIso: string;
  avatar: Avatar;
  channel: ChannelId;
  unread?: boolean;
  group: "today" | "yesterday" | "this-week" | "earlier";
  subject?: string;
  contactEmail?: string;
  category?: ConversationCategory;
  starred?: boolean;
  /** ISO date until which the conv is snoozed; null/undefined means active. */
  snoozedUntilIso?: string | null;
  /** Lowercased freeform labels applied by the user. */
  tags?: string[];
  /** Team member currently responsible for this conversation. */
  assignedTo?: string | null;

  // ── Fondations relationnelles (Lot 0) ──────────────────────────────
  /** ISO du dernier message ENTRANT (du client). */
  lastInboundAt?: string | null;
  /** ISO du dernier message SORTANT (de moi). */
  lastOutboundAt?: string | null;
  /** Dérivé : la balle est dans MON camp (le client attend ma réponse). */
  awaitingReply?: boolean;
  /** Dérivé : la balle est dans LEUR camp (j'attends leur retour → relance). */
  waitingOnThem?: boolean;
  /** Ton préféré appris pour ce client (ex. "cool", "formel", "direct"). */
  clientTone?: string | null;
  /** Langue préférée pour ce client (ex. "fr", "en"). */
  clientLang?: string | null;
};

export type MessageDirection = "in" | "out";

export type Message = {
  id: string;
  dir: MessageDirection;
  text: string;
  time: string;
  /** ISO d'envoi — sert aux séparateurs de date du fil (« Aujourd'hui, 10:08 »). */
  sentAtIso?: string;
  /** For incoming messages with image attachments */
  shots?: boolean;
  /** Email-only fields, populated when the message is part of an email thread */
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  senderAvatarUrl?: string;
  dateLong?: string;
  bodyHtml?: string;
  /**
   * Delivery status for OUTGOING optimistic messages only. Absent means
   * the message is server-confirmed (the normal case after a refresh).
   * - "pending" : sent optimistically, awaiting server ACK
   * - "failed"  : srvSend threw; user should retry
   */
  status?: "pending" | "failed";
};

export type Priority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  priority: Priority;
  dueLabel: string;
  isToday?: boolean;
  isDone?: boolean;
  avatar: Avatar;
  channel: ChannelId;
  status: "to-scope" | "todo" | "in-progress" | "awaiting-reply" | "done";
  /** Parent task id when this task is a subtask; null/undefined for top-level tasks. */
  parentTaskId?: string | null;
  /** Manual sort rank — higher = later in the list. */
  sortableIndex?: number;
  /** True when the task was generated/suggested by Mue (shows the « IA » badge). */
  fromAI?: boolean;
  /** Conversation source — permet « Ouvrir le fil » depuis la tâche. */
  conversationId?: string | null;
  /** Plusieurs clients sur la tâche : ids de conversations → avatars empilés. */
  clientConvIds?: string[] | null;
  /** Échéance brute ISO (due_at). dueLabel reste le libellé d'affichage de secours. */
  dueAtIso?: string | null;
  /** Date de création ISO — affichée dans la colonne « Créée le ». */
  createdAtIso?: string | null;
  /** Image jointe (cover) — affichée dans la carte Kanban / la ligne. */
  coverImage?: string | null;
};

export type CalEvent = {
  id: string;
  title: string;
  startMinutes: number; // minutes from 8 AM, e.g. 9:00 AM = 60
  durationMinutes: number;
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sun, 6 = Sat
  color: "lav" | "pink" | "green" | "blue" | "orange" | "peach" | "cream";
  channel?: ChannelId;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  when: string;
  channel: ChannelId;
};

// ───────────────────────────────────────────────────────────────────────
// Freescale V2 — entités UI (mock only, zéro backend pour l'instant)
// Portent les 3 piliers : centraliser (Client/Projet) · prioriser
// (ActionItem) · réduire la recherche (MueAnswer).
// ───────────────────────────────────────────────────────────────────────

/** Statut d'un projet / livrable. */
export type ProjectStatus = "on-track" | "at-risk" | "late" | "done";

/** Tonalité visuelle générique des pastilles/barres. */
export type Tone = "ok" | "warn" | "danger" | "neutral" | "info";

/** Intégrations tech (chips visuels, non branchés). */
export type IntegrationKind = "github" | "linear" | "stripe" | "notion" | "figma";

export type IntegrationBadge = {
  kind: IntegrationKind;
  /** ex. "repo lié", "5 issues", "facture en retard". */
  label: string;
  tone?: Tone;
};

export type Milestone = {
  id: string;
  label: string;
  done: boolean;
};

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  /** 0–100. */
  progress: number;
  milestones: Milestone[];
  dueLabel?: string;
};

export type FileKind = "pdf" | "image" | "doc" | "sheet" | "zip" | "other";

export type FileItem = {
  id: string;
  name: string;
  kind: FileKind;
  sizeLabel: string;
  dateLabel: string;
};

export type InvoiceStatus = "paid" | "pending" | "late";

export type Invoice = {
  id: string;
  /** ex. "FAC-2026-014". */
  number: string;
  /** Montant en euros. */
  amount: number;
  status: InvoiceStatus;
  dateLabel: string;
};

/** Fiche client agrégée — le hub 360 (pilier « centraliser »). */
export type Client = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  avatar: Avatar;
  /** Canaux par lesquels on échange avec ce client. */
  channels: ChannelId[];
  /** Libellé du dernier contact (ex. "il y a 2 j"). */
  lastContactLabel?: string;
  /** Nombre de conversations en attente de ma réponse. */
  awaitingCount?: number;
  project?: Project;
  files?: FileItem[];
  invoices?: Invoice[];
  /** Faits appris par Mue (mock). */
  mueFacts?: string[];
  /** Chips d'intégration tech affichés dans le header. */
  integrations?: IntegrationBadge[];
  /** IDs des conversations liées (réutilise les convs mock). */
  conversationIds?: string[];
};

/** Raison de priorisation d'une action (pilier « prioriser »). */
export type ActionReason = "late" | "awaiting" | "due-today" | "follow-up";

export type ActionItem = {
  id: string;
  title: string;
  clientName: string;
  avatar: Avatar;
  channel: ChannelId;
  reason: ActionReason;
  /** ex. "en attente depuis 2 j", "en retard · 2 j". */
  reasonLabel: string;
  dueLabel?: string;
  conversationId?: string | null;
};

/** Réponse mock de « Ask Mue » (pilier « réduire la recherche »). */
export type MueAnswer = {
  text: string;
  bullets?: string[];
  sources?: { label: string; count: number }[];
};
