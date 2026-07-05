"use client";

import { AccountMenu } from "@/components/AccountMenu";
import { AddChannelModal } from "@/components/AddChannelModal";
import { MueFlower } from "@/components/MueFlower";
import { ChannelLogo } from "@/components/icons/Icon";
import type { CurrentUser } from "@/lib/auth";
import { channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { CREDITS_REMAINING, creditsPct, fmtCredits } from "@/lib/credits";
import { useApp } from "@/lib/store";
import { useState } from "react";

/**
 * TopBar — bandeau fin en haut de la zone de contenu : seuls les canaux
 * CONNECTÉS sont affichés (en couleur) + un CTA « Connecter un canal » qui
 * ouvre une modale listant tous les canaux. Boutons Réglages · Mue à droite.
 */
export function TopBar({ user }: { user: CurrentUser | null }) {
  const data = useData();
  const { mueOpen, setMueOpen, view } = useApp();
  // Sur la page Mue plein-écran, le bouton 'Agent' n'a aucun sens — l'utilisateur
  // EST déjà dans Mue. On masque alors le bouton dans la topbar.
  const onMueView = view === "ai-knowledge";
  const [addOpen, setAddOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const initials =
    user?.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";
  const connectedKinds = new Set((data.channels ?? []).map((c) => c.kind));
  const connected = [...connectedKinds];

  return (
    <header className="topbar">
      <div className="topbar-channels" aria-label="Canaux connectés">
        {connected.map((kind) => {
          const label = channelProviderLabel(kind);
          return (
            <span
              key={kind}
              className="topbar-channel is-on"
              aria-label={`${label} — connecté`}
              title={`${label} — connecté`}
            >
              <ChannelLogo channel={kind} className="topbar-channel-logo" />
            </span>
          );
        })}
      </div>

      {/* Actions à droite : Connecter un canal · Mue · avatar du compte. */}
      <div className="topbar-actions">
        {/* Conteneur relatif : la fenêtre flottante s'ancre sous le bouton. */}
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
            Connecter un canal
          </button>
          <AddChannelModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            connectedKinds={connectedKinds}
          />
        </div>
        {!onMueView && (
          <button
            type="button"
            className={`topbar-actbtn topbar-mue ${mueOpen ? "is-active" : ""}`}
            aria-label="Panneau Agent Mue"
            aria-pressed={mueOpen}
            title="Panneau Agent Mue"
            onClick={() => setMueOpen(!mueOpen)}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              style={{ marginRight: "6px", overflow: "visible" }}
            >
              {/* 3D solid shadow layer */}
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="#5a32fa"
                transform="translate(2, 2)"
                opacity="0.8"
              />
              {/* Front glass path */}
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="url(#mue-glass-grad)"
                stroke="rgba(255, 255, 255, 0.95)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="mue-glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.25)" />
                </linearGradient>
              </defs>
            </svg>
            <span className="topbar-actbtn-label">
              Assistant Mue
            </span>
          </button>
        )}

        {/* Compte — avatar en haut à droite ; clic = panneau flottant. */}
        <div className="topbar-account">
          <button
            type="button"
            className={`topbar-avatar ${accountOpen ? "is-open" : ""}`}
            onClick={() => setAccountOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label="Mon compte"
          >
            <span
              className="topbar-avatar-ring"
              style={{ ["--pct" as string]: `${creditsPct}%` }}
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
            </span>
            <svg
              className="topbar-avatar-caret"
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {accountOpen && <AccountMenu user={user} onClose={() => setAccountOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
