import type {
  Avatar,
  ChannelId,
  Conversation,
  Message,
  Task,
  CalEvent,
  UpcomingEvent,
} from "@/lib/types";

type Row = Record<string, unknown>;

const CHANNEL_KINDS = new Set<ChannelId>([
  "gmail",
  "instagram",
  "whatsapp",
  "slack",
  "discord",
  "x",
  "linkedin",
  "telegram",
  "messenger",
]);

function toChannel(kind: unknown): ChannelId {
  return CHANNEL_KINDS.has(kind as ChannelId) ? (kind as ChannelId) : "gmail";
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function avatarFor(name: string, url: string | null | undefined): Avatar {
  if (url) return { kind: "img", src: url, alt: name };
  return { kind: "initials", text: initialsOf(name), bg: "#0F172A", alt: name };
}

function groupFor(iso: string): Conversation["group"] {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) return "today";
  const startOfYest = new Date(startOfToday);
  startOfYest.setDate(startOfToday.getDate() - 1);
  if (date >= startOfYest) return "yesterday";
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 7);
  if (date >= startOfWeek) return "this-week";
  return "earlier";
}

export function adaptConversation(row: Row): Conversation {
  const contact = (row.contacts ?? null) as Row | null;
  const channelAccount = (row.channel_accounts ?? null) as Row | null;
  const name = (contact?.display_name as string) || "Unknown";
  const lastAt = (row.last_message_at as string) ?? new Date().toISOString();
  const rawCategory = (row.category as string | null) ?? null;
  const category =
    rawCategory === "client" ||
    rawCategory === "promo" ||
    rawCategory === "notif" ||
    rawCategory === "other"
      ? rawCategory
      : null;
  return {
    id: row.id as string,
    name,
    preview: (row.preview as string) ?? "",
    lastAtIso: lastAt,
    avatar: avatarFor(name, contact?.avatar_url as string | null | undefined),
    channel: toChannel(channelAccount?.kind),
    unread: ((row.unread_count as number) ?? 0) > 0,
    group: groupFor(lastAt),
    category,
    starred: !!(row.starred as boolean | undefined),
    snoozedUntilIso: (row.snoozed_until as string | null) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    ...((row.subject as string) ? { subject: row.subject as string } : {}),
    ...((contact?.email as string) ? { contactEmail: contact!.email as string } : {}),
  };
}

export function adaptMessage(row: Row): Message {
  const sent = (row.sent_at as string) ?? new Date().toISOString();
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const from = (meta.from ?? null) as { name?: string; email?: string } | null;
  return {
    id: row.id as string,
    dir: (row.direction as Message["dir"]) ?? "in",
    text: (row.body_text as string) ?? "",
    time: new Date(sent).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    ...(meta.subject ? { subject: meta.subject as string } : {}),
    ...(from?.name ? { senderName: from.name } : {}),
    ...(from?.email ? { senderEmail: from.email } : {}),
    ...((row.body_html as string) ? { bodyHtml: row.body_html as string } : {}),
    dateLong: new Date(sent).toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function priorityFor(p: unknown): Task["priority"] {
  if (p === "low" || p === "medium" || p === "high") return p;
  if (p === "urgent") return "high";
  return "medium";
}

function statusFor(s: unknown): Task["status"] {
  if (s === "todo" || s === "in-progress" || s === "awaiting-reply" || s === "done") return s;
  if (s === "in_progress") return "in-progress";
  if (s === "awaiting_reply") return "awaiting-reply";
  return "todo";
}

function dueLabel(iso: string | null | undefined): { label: string; isToday: boolean } {
  if (!iso) return { label: "No due date", isToday: false };
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTom = new Date(startOfToday);
  startOfTom.setDate(startOfToday.getDate() + 1);
  const startOfDayAfter = new Date(startOfToday);
  startOfDayAfter.setDate(startOfToday.getDate() + 2);
  if (date >= startOfToday && date < startOfTom) return { label: "Due today", isToday: true };
  if (date >= startOfTom && date < startOfDayAfter) return { label: "Due tomorrow", isToday: false };
  const diffDays = Math.floor((date.getTime() - startOfToday.getTime()) / 86400000);
  if (diffDays >= 0 && diffDays < 7) {
    return {
      label: `Due ${date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}`,
      isToday: false,
    };
  }
  if (diffDays >= 7 && diffDays < 14) return { label: "Due next week", isToday: false };
  return {
    label: `Due ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`,
    isToday: false,
  };
}

export function adaptTask(row: Row): Task {
  const conv = (row.conversations ?? null) as Row | null;
  const contact = (conv?.contacts ?? null) as Row | null;
  const channelAccount = (conv?.channel_accounts ?? null) as Row | null;
  const name = (contact?.display_name as string) || "Task";
  const { label, isToday } = dueLabel(row.due_at as string | null | undefined);
  return {
    id: row.id as string,
    title: row.title as string,
    priority: priorityFor(row.priority),
    dueLabel: label,
    isToday,
    isDone: row.status === "done",
    avatar: avatarFor(name, contact?.avatar_url as string | null | undefined),
    channel: toChannel(channelAccount?.kind),
    status: statusFor(row.status),
    parentTaskId: (row.parent_task_id as string | null | undefined) ?? null,
    sortableIndex:
      typeof row.sortable_index === "number" ? (row.sortable_index as number) : 0,
  };
}

export function adaptCalendarEvent(row: Row, weekStart: Date): CalEvent | null {
  const startsAt = new Date(row.starts_at as string);
  const endsAt = new Date(row.ends_at as string);
  const dayDiff = Math.floor((startsAt.getTime() - weekStart.getTime()) / 86400000);
  if (dayDiff < 0 || dayDiff > 6) return null;
  const startMinutes =
    startsAt.getHours() * 60 + startsAt.getMinutes() - 8 * 60; // grid starts at 8 AM
  if (startMinutes < 0) return null;
  const duration = Math.max(15, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));
  const colors: CalEvent["color"][] = ["lav", "pink", "green", "blue", "orange", "peach", "cream"];
  const hash = (row.id as string).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length] ?? "lav";
  const channel = row.channel ? toChannel(row.channel) : undefined;
  return {
    id: row.id as string,
    title: row.title as string,
    startMinutes,
    durationMinutes: duration,
    day: dayDiff as CalEvent["day"],
    color,
    ...(channel ? { channel } : {}),
  };
}

export function adaptUpcoming(row: Row): UpcomingEvent {
  const startsAt = new Date(row.starts_at as string);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);
  let when: string;
  if (startsAt >= tomorrow && startsAt < dayAfter) {
    when = `Tomorrow, ${startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  } else {
    when = startsAt.toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return {
    id: row.id as string,
    title: row.title as string,
    when,
    channel: toChannel(row.channel),
  };
}
