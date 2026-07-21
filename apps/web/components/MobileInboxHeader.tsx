"use client";

// Header mobile de l'Inbox — style Beeper.
// [◱ btn rond blanc]   Titre gras (folder actif)   [spacer]
// Gauche → écran Comptes (portail plein écran).
// Le filtrage vit dans le bouton filtre de la barre de recherche (plus de
// hamburger ni de drawer).
//
// Uniquement rendu en mobile (< 768px, la CSS parente le masque en desktop).

import { MobileAccountsScreen } from "@/components/MobileAccountsScreen";
import { useState } from "react";

type Props = {
  folderLabel: string;
};

export function MobileInboxHeader({ folderLabel }: Props) {
  const [accountsOpen, setAccountsOpen] = useState(false);

  return (
    <>
      <header className="mib-header" role="banner">
        {/* Gauche — icône « stack » : ouvre la page Comptes */}
        <button
          type="button"
          className="mib-btn"
          aria-label="Comptes et boîtes de réception"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(8);
            }
            setAccountsOpen(true);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {/* Deux cartes superposées légèrement décalées — évoque des
                boîtes de réception empilées, cohérent avec « Comptes ». */}
            <rect x="8" y="4" width="12" height="14" rx="2.2" />
            <path d="M5 8v11a2 2 0 0 0 2 2h10" />
          </svg>
        </button>

        {/* Centre — titre gras, dossier actif */}
        <h1 className="mib-title">{folderLabel}</h1>

        {/* Droite — spacer (même largeur que le bouton gauche) pour garder le
            titre parfaitement centré. Le filtrage vit désormais dans le bouton
            filtre de la barre de recherche (plus de hamburger ni de drawer). */}
        <span className="mib-spacer" aria-hidden />
      </header>

      {accountsOpen && <MobileAccountsScreen onClose={() => setAccountsOpen(false)} />}
    </>
  );
}
