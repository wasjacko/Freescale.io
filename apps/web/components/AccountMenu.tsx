"use client";

// Panneau de compte flottant — s'ouvre au clic sur l'avatar (bas de la sidebar).
// Récupère les actions retirées de la chrome (Paramètres · Se déconnecter) +
// un statut « Actif » et des raccourcis. 100% UI mock (sauf nav réelle).

import type { CurrentUser } from "@/lib/auth";
import { BRAIN_USES, CREDITS_REMAINING, brainPct, creditsPct, fmtCredits } from "@/lib/credits";
import { useToast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useEffect } from "react";

/** Petit anneau de progression (jauge verte). */
function Ring({ pct }: { pct: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg className="amc-ring" viewBox="0 0 24 24" width={22} height={22} aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(22,163,74,0.18)" strokeWidth="3" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="#16a34a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(100, Math.max(0, pct)) / 100)}
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

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
  const { setView, setMueOpen, setDataViewOpen, setActiveFolder, setActiveConv, theme, setTheme } =
    useApp();
  const push = useToast((s) => s.push);

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

        <div className="account-menu-sep" />

        <div className="account-menu-credits">
          <div className="amc-row">
            <Ring pct={brainPct} />
            <span className="amc-val">{BRAIN_USES}</span>
            <span className="amc-label">Utilisations de l'IA Mue</span>
          </div>
          <div className="amc-row">
            <Ring pct={creditsPct} />
            <span className="amc-val">{fmtCredits(CREDITS_REMAINING)}</span>
            <span className="amc-label">Crédits restants</span>
          </div>
        </div>

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

        <button
          type="button"
          className="account-menu-item"
          onClick={() => {
            setDataViewOpen(true);
            onClose();
          }}
        >
          <svg {...stroke}>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Ce que Freescale voit
        </button>
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
        <div className="account-menu-theme">
          <span className="account-menu-theme-id">
            <svg {...stroke}>
              <rect x="3" y="3" width="13" height="6" rx="1.5" />
              <path d="M16 6h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-7" />
              <path d="M12 12v3" />
              <rect x="9.5" y="15" width="5" height="6" rx="1" />
            </svg>
            Thème
          </span>
          <div className="account-menu-theme-seg" role="group" aria-label="Thème">
            <button
              type="button"
              className={`amt-opt ${theme === "system" ? "is-on" : ""}`}
              aria-pressed={theme === "system"}
              onClick={() => setTheme("system")}
              title="Suit le réglage de ton système"
            >
              <svg {...stroke} width={15} height={15}>
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <line x1="8" y1="20" x2="16" y2="20" />
                <line x1="12" y1="17" x2="12" y2="20" />
              </svg>
              Système
            </button>
            <button
              type="button"
              className={`amt-opt ${theme === "light" ? "is-on" : ""}`}
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
              title="Force le thème clair"
            >
              <svg {...stroke} width={15} height={15}>
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
              Clair
            </button>
            <button
              type="button"
              className={`amt-opt ${theme === "dark" ? "is-on" : ""}`}
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
              title="Force le thème sombre"
            >
              <svg {...stroke} width={15} height={15}>
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
              Sombre
            </button>
          </div>
        </div>
        <button
          type="button"
          className="account-menu-item"
          onClick={() => {
            setView("inbox");
            setActiveConv("");
            setActiveFolder("view:trash");
            onClose();
          }}
        >
          <svg {...stroke}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          Corbeille
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
