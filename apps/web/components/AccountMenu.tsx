"use client";

// Panneau de compte flottant — s'ouvre au clic sur l'avatar (bas de la sidebar).
// Récupère les actions retirées de la chrome (Paramètres · Se déconnecter) +
// un statut « Actif » et des raccourcis. 100% UI mock (sauf nav réelle).

import type { CurrentUser } from "@/lib/auth";
import { useToast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useEffect, useState } from "react";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export function AccountMenu({ user, onClose }: { user: CurrentUser | null; onClose: () => void }) {
  const { setView, setMueOpen } = useApp();
  const push = useToast((s) => s.push);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        className="account-menu-backdrop"
        onClick={onClose}
        aria-hidden
        tabIndex={-1}
      />
      <div className="account-menu" role="menu" aria-label="Menu du compte">
        <div className="account-menu-head">
          <span className="account-menu-as">Connecté en tant que {user?.name ?? "Compte"}</span>
          <span className="account-menu-email">{user?.email ?? "—"}</span>
        </div>

        <button
          type="button"
          className="account-menu-status"
          onClick={() => setActive((a) => !a)}
          aria-pressed={active}
        >
          <span className={`account-menu-dot ${active ? "is-on" : ""}`} aria-hidden />
          <span className="account-menu-status-label">{active ? "Actif" : "Absent"}</span>
          <span className={`account-menu-switch ${active ? "is-on" : ""}`} aria-hidden>
            <span className="account-menu-knob" />
          </span>
        </button>

        <div className="account-menu-sep" />

        <button
          type="button"
          className="account-menu-item"
          onClick={() => {
            setView("recap");
            onClose();
          }}
        >
          <svg {...stroke}>
            <line x1="4" y1="20" x2="20" y2="20" />
            <rect x="5" y="11" width="3.5" height="6" rx="1" />
            <rect x="10.25" y="7" width="3.5" height="10" rx="1" />
            <rect x="15.5" y="13" width="3.5" height="4" rx="1" />
          </svg>
          Tableau de bord
        </button>
        <button
          type="button"
          className="account-menu-item"
          onClick={() => {
            setMueOpen(true);
            onClose();
          }}
        >
          <svg {...stroke}>
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
          </svg>
          Demander à Mue
        </button>

        <div className="account-menu-sep" />

        <Link href="/app/settings/profile" className="account-menu-item" onClick={onClose}>
          <svg {...stroke}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Paramètres du compte
        </Link>
        <button
          type="button"
          className="account-menu-item"
          onClick={() => {
            push({ kind: "info", text: "Aide & support — bientôt 👋" });
            onClose();
          }}
        >
          <svg {...stroke}>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5" />
            <line x1="12" y1="17" x2="12" y2="17" />
          </svg>
          Aide & support
        </button>

        <div className="account-menu-sep" />

        <a href="/home/index.html" className="account-menu-item is-danger">
          <svg {...stroke}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Se déconnecter
        </a>
      </div>
    </>
  );
}
