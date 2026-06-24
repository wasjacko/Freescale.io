// Discussions sauvegardées avec Mue (mock UI). Branchera plus tard sur la
// table mue_chat_messages (groupée par session). Utilisé par le panneau Mue
// et la page IA dédiée.

export type MueDiscussion = {
  id: string;
  title: string;
  /** Date relative ISO — pour grouper Aujourd'hui / Hier / Cette semaine / Plus tôt. */
  updatedAtIso: string;
};

function isoMinusHours(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}
function isoMinusDays(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}

export const MUE_DISCUSSIONS: MueDiscussion[] = [
  { id: "d-status", title: "Project Status Summary", updatedAtIso: isoMinusHours(0.1) },
  { id: "d-triage", title: "Task Triage", updatedAtIso: isoMinusHours(2) },
  { id: "d-due", title: "Update Task Due Date", updatedAtIso: isoMinusHours(3) },
  { id: "d-poio", title: "Add poio task to calendar", updatedAtIso: isoMinusHours(4) },
  { id: "d-onboard", title: "Onboarding Progress Summary", updatedAtIso: isoMinusHours(6) },
  { id: "d-plan", title: "Setup Project Planner Agent", updatedAtIso: isoMinusDays(4) },
  { id: "d-relance", title: "Rédige une relance pour David", updatedAtIso: isoMinusDays(7) },
  { id: "d-recap", title: "Résume ma semaine", updatedAtIso: isoMinusDays(12) },
];

export function groupDiscussions(list: MueDiscussion[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = today.getTime();
  const groups: { key: string; label: string; items: MueDiscussion[] }[] = [
    { key: "today", label: "Aujourd'hui", items: [] },
    { key: "yest", label: "Hier", items: [] },
    { key: "week", label: "Cette semaine", items: [] },
    { key: "earlier", label: "Plus tôt", items: [] },
  ];
  for (const d of list) {
    const ms = new Date(d.updatedAtIso).getTime();
    const days = (t - new Date(new Date(ms).setHours(0, 0, 0, 0)).getTime()) / 86_400_000;
    if (days <= 0) groups[0]?.items.push(d);
    else if (days < 2) groups[1]?.items.push(d);
    else if (days < 7) groups[2]?.items.push(d);
    else groups[3]?.items.push(d);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function fmtAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = diffMs / 60_000;
  if (min < 1) return "à l'instant";
  if (min < 60) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 24) {
    const d = new Date(iso);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  const d = diffMs / 86_400_000;
  if (d < 7) return `${Math.round(d)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
