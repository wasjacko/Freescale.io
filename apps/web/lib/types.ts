// Domain types shared across the app

export type ChannelId =
  | "gmail"
  | "instagram"
  | "whatsapp"
  | "slack"
  | "discord"
  | "x"
  | "linkedin"
  | "telegram"
  | "messenger";

export type ViewId = "inbox" | "tasks" | "calendar" | "ai-knowledge";

export type AvatarSource = { kind: "img"; src: string } | { kind: "initials"; text: string; bg?: string };

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
};

export type MessageDirection = "in" | "out";

export type Message = {
  id: string;
  dir: MessageDirection;
  text: string;
  time: string;
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
  status: "todo" | "in-progress" | "awaiting-reply" | "done";
  /** Parent task id when this task is a subtask; null/undefined for top-level tasks. */
  parentTaskId?: string | null;
  /** Manual sort rank — higher = later in the list. */
  sortableIndex?: number;
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
