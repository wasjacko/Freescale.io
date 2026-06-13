import { Sprite } from "@/components/icons/Sprite";
import { SettingsNav } from "@/components/settings/SettingsNav";
import Link from "next/link";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-page">
      <Sprite />
      <aside className="settings-rail">
        <Link href="/app" className="settings-back">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Retour à l&apos;inbox</span>
        </Link>
        <div className="settings-rail-title">Paramètres</div>
        <SettingsNav />
        {/* Déconnexion (simulée) → home statique. Réciproque du « Connexion »
            de la home qui ramène vers /app. */}
        <a href="/home/index.html" className="settings-logout">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Se déconnecter</span>
        </a>
      </aside>
      <main className="settings-main">{children}</main>
    </div>
  );
}
