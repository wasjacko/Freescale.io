// Crédits IA (mock) — partagés entre l'anneau de l'avatar et le menu compte.
export const BRAIN_USES = 46;
export const BRAIN_LIMIT = 60;
export const CREDITS_REMAINING = 1500;
export const CREDITS_TOTAL = 2000;

export const brainPct = Math.round((BRAIN_USES / BRAIN_LIMIT) * 100);
export const creditsPct = Math.round((CREDITS_REMAINING / CREDITS_TOTAL) * 100);

/** « 1500 » → « 1,5k ». */
export function fmtCredits(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`;
  }
  return `${n}`;
}
