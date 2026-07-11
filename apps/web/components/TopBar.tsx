"use client";

import { AccountMenu } from "@/components/AccountMenu";
import { AddChannelModal } from "@/components/AddChannelModal";
import GlobalSearchDropdown from "@/components/GlobalSearchDropdown";
import { MueFlower } from "@/components/MueFlower";
import { ChannelLogo } from "@/components/icons/Icon";
import type { CurrentUser } from "@/lib/auth";
import { CHANNEL_PROVIDER_REGISTRY, channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { CREDITS_REMAINING, fmtCredits } from "@/lib/credits";
import { useApp } from "@/lib/store";
import { useState } from "react";

/**
 * TopBar — bandeau fin en haut de la zone de contenu : TOUS les canaux du
 * registre sont affichés (connectés en couleur, non connectés en gris,
 * clic = ouvre la modale de connexion) + un CTA « Connecter un canal ».
 * Boutons Réglages · Mue à droite.
 */
export function TopBar({ user }: { user: CurrentUser | null }) {
  const data = useData();
  const { mueOpen, setMueOpen, view } = useApp();
  // Sur la page Mue plein-écran, le bouton 'Agent' n'a aucun sens — l'utilisateur
  // EST déjà dans Mue. On masque alors le bouton dans la topbar.
  const onMueView = view === "ai-knowledge";
  const [addOpen, setAddOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const initials =
    user?.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";
  const connectedKinds = new Set((data.channels ?? []).map((c) => c.kind));

  return (
    <header className="topbar">
      <div className="topbar-channels" aria-label="Canaux">
        {/* On n'affiche QUE les canaux réellement connectés — pour connecter
            un nouveau canal, utiliser le CTA « Connecter un canal » à droite. */}
        {CHANNEL_PROVIDER_REGISTRY.filter((p) => connectedKinds.has(p.kind)).map((p) => {
          const label = channelProviderLabel(p.kind);
          return (
            <span
              key={p.kind}
              className="topbar-channel is-on"
              aria-label={`${label} — connecté`}
              title={`${label} — connecté`}
            >
              <ChannelLogo channel={p.kind} className="topbar-channel-logo" />
            </span>
          );
        })}
        {/* Séparateur + CTA « Connecter un canal » : intégrés au même
            groupe pour former UN composant unifié (cadre partagé). */}
        <span className="topbar-channels-sep" aria-hidden />
        <div className="topbar-connect">
          <button
            type="button"
            className="topbar-connect-cta"
            onClick={() => setAddOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={addOpen}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un canal
          </button>
          <AddChannelModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            connectedKinds={connectedKinds}
          />
        </div>
      </div>

      {/* Barre de recherche globale SaaS + Bouton Mue inclus */}
      {!onMueView && (
        <div className="topbar-global-search">
          <svg className="topbar-search-ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="topbar-search-input" 
            onFocus={() => setIsSearchOpen(true)}
          />
          
          {/* CTA "Demander à Mue" incrusté dans la barre de recherche */}
          <button
            type="button"
            className={`topbar-mue-cta ${mueOpen ? "is-active" : ""}`}
            onClick={() => setMueOpen(!mueOpen)}
            aria-label="Ouvrir l'assistant Mue"
          >
            <MueFlower size={14} />
            <span className="topbar-mue-cta-label">Demander à Mue</span>
            <span className="topbar-mue-cta-shortcut">⌘K</span>
          </button>

          {isSearchOpen && (
            <GlobalSearchDropdown onClose={() => setIsSearchOpen(false)} />
          )}
        </div>
      )}

      {/* Backdrop invisible pour fermer le panel de recherche au clic (placé en dehors des éléments avec transform) */}
      {isSearchOpen && !onMueView && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
          onClick={() => setIsSearchOpen(false)} 
        />
      )}

      {/* Actions à droite (Compte, etc.) */}
      <div className="topbar-actions">
        {/* Compte — avatar circulaire simple avec un petit chevron en badge
            bas-droite. Plus de pill, plus d'anneau vert (l'info crédits vit
            dans le panneau qui s'ouvre au clic). */}
        <div className="topbar-account">
          <button
            type="button"
            className={`topbar-avatar ${accountOpen ? "is-open" : ""}`}
            onClick={() => setAccountOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label="Mon compte"
            title={`${fmtCredits(CREDITS_REMAINING)} crédits restants`}
          >
            <span className="topbar-avatar-img">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" />
              ) : (
                initials
              )}
            </span>
            <svg
              className="topbar-avatar-caret"
              viewBox="0 0 24 24"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {accountOpen && <AccountMenu user={user} onClose={() => setAccountOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
