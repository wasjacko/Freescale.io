import type { Task, UpcomingEvent } from "@/lib/types";

const pravatar = (id: number) => `https://i.pravatar.cc/120?img=${id}`;

export const TASKS: Task[] = [
  {
    id: "t1",
    title: "Reply about the landing page",
    priority: "high",
    dueLabel: "Due today",
    isToday: true,
    avatar: { kind: "img", src: pravatar(47), alt: "Sarah" },
    channel: "instagram",
    status: "todo",
  },
  {
    id: "t2",
    title: "Follow up about the project timeline",
    priority: "medium",
    dueLabel: "Due tomorrow",
    avatar: { kind: "img", src: pravatar(12), alt: "Mike" },
    channel: "whatsapp",
    status: "todo",
  },
  {
    id: "t3",
    title: "Review the project brief",
    priority: "high",
    dueLabel: "Due tomorrow",
    avatar: { kind: "img", src: pravatar(33), alt: "Dylan" },
    channel: "gmail",
    status: "todo",
  },
  {
    id: "t4",
    title: "Share design system update",
    priority: "low",
    dueLabel: "Due Fri, May 24",
    avatar: { kind: "img", src: pravatar(5), alt: "Laura" },
    channel: "slack",
    status: "todo",
  },
  {
    id: "t5",
    title: "Schedule content call",
    priority: "low",
    dueLabel: "Due next week",
    avatar: { kind: "img", src: pravatar(47), alt: "Sarah" },
    channel: "instagram",
    status: "todo",
  },
  {
    id: "t6",
    title: "Prepare for design review",
    priority: "medium",
    dueLabel: "No due date",
    avatar: { kind: "initials", text: "DR", bg: "linear-gradient(135deg,#7C5BFF,#5865F2)" },
    channel: "slack",
    status: "todo",
  },
];

export const UPCOMING: UpcomingEvent[] = [
  { id: "u1", title: "Design review", when: "Tomorrow, 10:00 AM", channel: "slack" },
  { id: "u2", title: "Client call", when: "Tomorrow, 12:00 PM", channel: "gmail" },
];
