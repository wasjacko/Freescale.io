"use client";

import { Icon } from "@/components/icons/Icon";
import type { CurrentUser } from "@/lib/auth";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import Link from "next/link";

export function MobileMoreView({ user }: { user: CurrentUser | null }) {
  const { view, setView } = useApp();
  const { channels } = useData();
  const shown = view === "more";

  return (
    <section className="mobile-more-view" aria-label="Plus" hidden={!shown}>
      <header className="mobile-more-head">
        <p>Compte et outils</p>
        <h1>Plus</h1>
      </header>

      <button type="button" className="mobile-more-mue" onClick={() => setView("ai-knowledge")}>
        <span className="mobile-more-mue-icon">
          <Icon name="i-spark" />
        </span>
        <span>
          <strong>Mue Copilot</strong>
          <small>Resumer, extraire et rediger</small>
        </span>
        <Icon name="i-chevron" />
      </button>

      <div className="mobile-more-list" role="list">
        <button type="button" className="mobile-more-row" onClick={() => setView("ai-knowledge")}>
          <Icon name="i-book" />
          <span>AI Knowledge</span>
          <small>Beta</small>
        </button>
        {user ? (
          <Link href="/app/settings/connections" className="mobile-more-row">
            <Icon name="i-globe" />
            <span>Canaux connectes</span>
            <small>{channels.length}</small>
          </Link>
        ) : (
          <button type="button" className="mobile-more-row" onClick={() => setView("inbox")}>
            <Icon name="i-globe" />
            <span>Canaux connectes</span>
            <small>{channels.length}</small>
          </button>
        )}
        <button type="button" className="mobile-more-row" onClick={() => setView("calendar")}>
          <Icon name="i-cal" />
          <span>Calendriers</span>
          <small>Ouvrir</small>
        </button>
      </div>

      <div className="mobile-more-list" role="list">
        {user ? (
          <Link href="/app/settings/profile" className="mobile-more-row">
            <Icon name="i-settings" />
            <span>Parametres</span>
            <small>Compte</small>
          </Link>
        ) : (
          <button type="button" className="mobile-more-row" onClick={() => setView("tasks")}>
            <Icon name="i-settings" />
            <span>Parametres</span>
            <small>Local</small>
          </button>
        )}
        <Link href="/support" className="mobile-more-row">
          <Icon name="i-info" />
          <span>Aide et support</span>
          <small>Ouvrir</small>
        </Link>
        <Link href="/privacy" className="mobile-more-row">
          <Icon name="i-lock" />
          <span>Confidentialite</span>
          <small>Lire</small>
        </Link>
      </div>

      <div className="mobile-more-account">
        <span className="mobile-more-avatar">{user?.firstName?.[0] ?? "F"}</span>
        <span>
          <strong>{user?.firstName ?? "Freescale"}</strong>
          <small>{user?.email ?? "Mode SaaS local"}</small>
        </span>
      </div>
    </section>
  );
}
