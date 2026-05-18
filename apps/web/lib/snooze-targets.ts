/**
 * Quick-pick snooze destinations in the user's local timezone.
 *
 *   • "Plus tard aujourd'hui" → 3h from now
 *   • "Ce soir"               → today 19:00 (rolls to tomorrow if past)
 *   • "Demain matin"          → tomorrow 08:00
 *   • "Semaine prochaine"     → next Monday 08:00
 *
 * Shared by the per-conv ContextMenu and the bulk-toolbar snooze
 * dropdown so the labels + offsets stay identical across both UIs.
 */
export type SnoozeTarget = { label: string; iso: string };

export function snoozeTargets(): SnoozeTarget[] {
  const now = new Date();
  const targets: SnoozeTarget[] = [];

  const laterToday = new Date(now);
  laterToday.setHours(now.getHours() + 3, 0, 0, 0);
  targets.push({ label: "Plus tard aujourd'hui (3h)", iso: laterToday.toISOString() });

  const tonight = new Date(now);
  tonight.setHours(19, 0, 0, 0);
  if (tonight <= now) tonight.setDate(tonight.getDate() + 1);
  targets.push({ label: "Ce soir (19h)", iso: tonight.toISOString() });

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  targets.push({ label: "Demain matin (8h)", iso: tomorrow.toISOString() });

  // Next Monday 08:00 (this week's upcoming Monday, or +7 if today is Mon)
  const nextMon = new Date(now);
  const daysUntilMon = (1 + 7 - nextMon.getDay()) % 7 || 7;
  nextMon.setDate(now.getDate() + daysUntilMon);
  nextMon.setHours(8, 0, 0, 0);
  targets.push({ label: "Semaine prochaine", iso: nextMon.toISOString() });

  return targets;
}
