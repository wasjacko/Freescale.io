import type { Conversation } from "@/lib/types";

/**
 * Urgence relationnelle — LA définition unique (Lot 0).
 *
 * C'est la source de vérité partagée par l'accueil, l'inbox et les tâches :
 * on ne trie plus par date, on trie par "ce qui risque de faire tomber une
 * balle relationnelle". Toutes les surfaces consomment ces fonctions ; aucune
 * ne recalcule sa propre logique d'urgence.
 */

const HOUR = 3_600_000;

function ms(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** La balle est dans MON camp : le client attend ma réponse. */
export function isAwaitingMyReply(c: Conversation): boolean {
  if (typeof c.awaitingReply === "boolean") return c.awaitingReply;
  const inAt = ms(c.lastInboundAt);
  const outAt = ms(c.lastOutboundAt);
  if (inAt && outAt) return inAt > outAt;
  if (inAt && !outAt) return true;
  // Fallback quand on n'a pas la direction : un non-lu = il attend.
  return !!c.unread;
}

/** La balle est dans LEUR camp : j'attends leur retour (candidat relance). */
export function isWaitingOnThem(c: Conversation): boolean {
  if (typeof c.waitingOnThem === "boolean") return c.waitingOnThem;
  const inAt = ms(c.lastInboundAt);
  const outAt = ms(c.lastOutboundAt);
  if (inAt && outAt) return outAt > inAt;
  if (outAt && !inAt) return true;
  return false;
}

/** Âge de la balle en heures (depuis le dernier message pertinent). */
export function ballAgeHours(c: Conversation): number {
  const ref = isAwaitingMyReply(c)
    ? ms(c.lastInboundAt) || ms(c.lastAtIso)
    : ms(c.lastOutboundAt) || ms(c.lastAtIso);
  if (!ref) return 0;
  return Math.max(0, (Date.now() - ref) / HOUR);
}

/** Une relance est due : la balle est dans leur camp depuis trop longtemps. */
export function isFollowupDue(c: Conversation, thresholdHours = 48): boolean {
  return isWaitingOnThem(c) && ballAgeHours(c) >= thresholdHours;
}

/** True si le fil est en pause (snoozé) à l'instant T. */
export function isSnoozed(c: Conversation): boolean {
  return !!c.snoozedUntilIso && ms(c.snoozedUntilIso) > Date.now();
}

/**
 * Score d'urgence relationnelle. Plus haut = plus urgent.
 * Cible : clients d'abord ; "il attend ma réponse" > "non lu" > ancienneté ;
 * le bruit (notif/promo) coule au fond ; le snoozé disparaît tant que ça dure.
 */
export function relationalUrgency(c: Conversation): number {
  let score = 0;

  // 1. Un client passe avant tout ; le bruit coule.
  if (c.category === "client") score += 1000;
  else if (c.category === "notif" || c.category === "promo") score -= 500;

  // 2. La balle dans mon camp = le plus actionnable.
  if (isAwaitingMyReply(c)) score += 400;
  else if (c.unread) score += 120;

  // 3. Relance due = à ne surtout pas lâcher (le risque business #1).
  if (isFollowupDue(c)) score += 250;

  // 4. Ancienneté de la balle (plafonnée à 10 jours), pondérée par le camp.
  score += Math.min(ballAgeHours(c), 240) * (isAwaitingMyReply(c) ? 1.5 : 0.6);

  // 5. Épinglé.
  if (c.starred) score += 60;

  // 6. Snoozé → tout en bas tant que la pause dure.
  if (isSnoozed(c)) score -= 2000;

  return Math.round(score);
}

/** Tri par urgence relationnelle décroissante (copie, non mutant). */
export function sortByUrgency(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => relationalUrgency(b) - relationalUrgency(a));
}

/** Les fils où le client attend ma réponse (à traiter en premier). */
export function awaitingMyReply(convs: Conversation[]): Conversation[] {
  return sortByUrgency(convs.filter((c) => isAwaitingMyReply(c) && !isSnoozed(c)));
}

/** Les relances dues (la balle dans leur camp depuis trop longtemps). */
export function followupsDue(convs: Conversation[], thresholdHours = 48): Conversation[] {
  return sortByUrgency(convs.filter((c) => isFollowupDue(c, thresholdHours) && !isSnoozed(c)));
}
