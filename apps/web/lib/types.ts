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

export type Conversation = {
  id: string;
  name: string;
  preview: string;
  time: string;
  avatar: Avatar;
  channel: ChannelId;
  unread?: boolean;
  group: "today" | "yesterday" | "this-week" | "earlier";
};

export type MessageDirection = "in" | "out";

export type Message = {
  id: string;
  dir: MessageDirection;
  text: string;
  time: string;
  /** For incoming messages with image attachments */
  shots?: boolean;
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
