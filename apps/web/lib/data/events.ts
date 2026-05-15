import type { CalEvent } from "@/lib/types";

// startMinutes = minutes from 8:00 AM. Each row in the grid = 30 min.
// Day 0 = Sun, 1 = Mon, ..., 6 = Sat

export const EVENTS: CalEvent[] = [
  { id: "e1", title: "Project sync",              day: 1, startMinutes: 60,  durationMinutes: 60, color: "lav",    channel: "slack" },
  { id: "e2", title: "Client call",               day: 1, startMinutes: 240, durationMinutes: 60, color: "peach",  channel: "gmail" },
  { id: "e3", title: "Reply about the landing page", day: 2, startMinutes: 60, durationMinutes: 30, color: "pink", channel: "instagram" },
  { id: "e4", title: "Share design system update",day: 2, startMinutes: 240, durationMinutes: 30, color: "lav",    channel: "slack" },
  { id: "e5", title: "Team stand-up",             day: 2, startMinutes: 420, durationMinutes: 30, color: "lav",    channel: "discord" },
  { id: "e6", title: "Design review",             day: 3, startMinutes: 120, durationMinutes: 60, color: "green",  channel: "slack" },
  { id: "e7", title: "Lunch break",               day: 3, startMinutes: 300, durationMinutes: 60, color: "cream" },
  { id: "e8", title: "Follow up with Mike",       day: 4, startMinutes: 90,  durationMinutes: 30, color: "blue",   channel: "whatsapp" },
  { id: "e9", title: "Prepare for design review", day: 4, startMinutes: 480, durationMinutes: 60, color: "peach",  channel: "slack" },
  { id: "e10", title: "Review the project brief", day: 5, startMinutes: 180, durationMinutes: 30, color: "orange", channel: "gmail" },
  { id: "e11", title: "Schedule content call",    day: 5, startMinutes: 360, durationMinutes: 30, color: "blue",   channel: "instagram" },
];

type DayLabel = { abbr: string; num: number; isToday?: boolean };

export const DAY_LABELS: DayLabel[] = [
  { abbr: "Sun", num: 18 },
  { abbr: "Mon", num: 19 },
  { abbr: "Tue", num: 20, isToday: true },
  { abbr: "Wed", num: 21 },
  { abbr: "Thu", num: 22 },
  { abbr: "Fri", num: 23 },
  { abbr: "Sat", num: 24 },
];

export const HOURS = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM"];
