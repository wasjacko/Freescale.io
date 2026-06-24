"use client";

import { AccountMenu } from "@/components/AccountMenu";
import { AddChannelModal } from "@/components/AddChannelModal";
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
  const { mueOpen, setMueOpen } = useApp();
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
        <button
          type="button"
          className={`topbar-actbtn topbar-mue ${mueOpen ? "is-active" : ""}`}
          aria-label="Agent — assistant Mue"
          aria-pressed={mueOpen}
          title="Agent"
          onClick={() => setMueOpen(!mueOpen)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
            <path
              d="M12 7.9l.95 2.15 2.15.95-2.15.95L12 15.1l-.95-2.15L8.9 12l2.15-.95z"
              fill="currentColor"
              stroke="none"
            />
          </svg>
          <span className="topbar-actbtn-label">Agent</span>
        </button>

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
