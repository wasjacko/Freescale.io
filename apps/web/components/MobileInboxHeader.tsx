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
      <header className="mib-header">
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
            width={24}
            height={24}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {/* Trois cartes strictement carrees, decalees en profondeur. Le
                fond opaque de chaque carte masque celle qui se trouve dessous
                et rend la pile lisible plutot qu'une icone de copie. */}
            <rect className="mib-stack-card" x="3.5" y="9.5" width="10.5" height="10.5" rx="2" />
            <rect className="mib-stack-card" x="6.75" y="6.25" width="10.5" height="10.5" rx="2" />
            <rect className="mib-stack-card" x="10" y="3" width="10.5" height="10.5" rx="2" />
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
