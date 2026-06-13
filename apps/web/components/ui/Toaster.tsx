"use client";

/**
 * Toaster désactivé (demande produit : aucune notification toast).
 *
 * Le store `useToast` continue d'exister — les actions appellent toujours
 * `toast.*` sans erreur — mais plus rien ne s'affiche à l'écran. Pour
 * réactiver les notifications, restaurer le rendu de la liste `toasts`.
 */
export function Toaster() {
  return null;
}
