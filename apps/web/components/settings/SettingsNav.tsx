"use client";

import { Icon } from "@/components/icons/Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Settings sidebar nav with active-route highlighting. Lives in a
 * client component so we can read usePathname() — the parent layout
 * stays a Server Component (no SSR cost for the rest of the page).
 *
 * Active match is prefix-based: a route like /app/settings/profile/edit
 * still highlights "Profil". That's intentional — sub-pages inherit
 * their parent's nav row.
 */

const NAV = [
  { href: "/app/settings/profile" as const, label: "Profil", icon: "i-user" },
  { href: "/app/settings/connections" as const, label: "Connexions", icon: "i-globe" },
  { href: "/app/settings/templates" as const, label: "Modèles", icon: "i-edit" },
  { href: "/app/settings/billing" as const, label: "Abonnement", icon: "i-lock" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="settings-nav">
      {NAV.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`settings-nav-item ${isActive ? "is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
