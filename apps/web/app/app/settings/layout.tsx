import Link from "next/link";
import { Sprite } from "@/components/icons/Sprite";
import { Icon } from "@/components/icons/Icon";

const NAV = [
  { href: "/app/settings/profile" as const, label: "Profil", icon: "i-user" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-page">
      <Sprite />
      <aside className="settings-rail">
        <Link href="/app" className="settings-back">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Retour à l&apos;inbox</span>
        </Link>
        <div className="settings-rail-title">Paramètres</div>
        <nav className="settings-nav">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="settings-nav-item">
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="settings-main">{children}</main>
    </div>
  );
}
