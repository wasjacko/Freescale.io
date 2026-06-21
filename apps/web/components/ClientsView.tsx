"use client";

// Freescale V2 · Phase 2 — Vue « Clients » (pilier CENTRALISER).
// Grille de fiches client → ouvre le hub 360 (ClientHub). 100% UI mock.

import { ClientHub } from "@/components/ClientHub";
import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MOCK_CLIENTS } from "@/lib/mock-v2";
import { useApp } from "@/lib/store";
import type { Client, Tone } from "@/lib/types";
import { useMemo, useState } from "react";

// ── Santé de la relation ────────────────────────────────────────────
// On NE prétend PAS connaître l'avancement d'un projet (impossible depuis
// une inbox). On affiche uniquement des signaux calculables depuis les
// échanges : qui doit répondre, depuis quand, et le silence éventuel.
export type RelationState = "owe" | "awaiting" | "silent" | "ok";
export function relationHealth(c: Client): {
  state: RelationState;
  label: string;
  tone: Tone;
} {
  if (c.owesReply) return { state: "owe", label: "Tu dois une réponse", tone: "warn" };
  if ((c.awaitingDays ?? 0) >= 2)
    return { state: "awaiting", label: `En attente de lui · ${c.awaitingDays} j`, tone: "info" };
  if ((c.silentDays ?? 0) >= 10)
    return { state: "silent", label: `Silence depuis ${c.silentDays} j`, tone: "danger" };
  return { state: "ok", label: "Relation à jour", tone: "ok" };
}

type Filter = "all" | "to-reply" | "risk";
const FILTERS: [Filter, string][] = [
  ["all", "Tous"],
  ["to-reply", "À répondre"],
  ["risk", "À surveiller"],
];

export function ClientsView() {
  // Le client ouvert vit dans le store → on peut ouvrir une fiche depuis
  // ailleurs (ex. bouton « Voir la fiche client » d'un thread de l'inbox).
  const { activeClientId, setActiveClientId } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_CLIENTS.filter((c) => {
      const h = relationHealth(c);
      if (filter === "to-reply" && h.state !== "owe") return false;
      if (filter === "risk" && h.state !== "silent" && h.state !== "awaiting") return false;
      if (q) {
        const hay = `${c.name} ${c.company ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filter, query]);

  const openClient = MOCK_CLIENTS.find((c) => c.id === activeClientId) ?? null;
  if (openClient) {
    return (
      <section className="clients-view" aria-label="Fiche client">
        <ClientHub client={openClient} onBack={() => setActiveClientId("")} />
      </section>
    );
  }

  return (
    <section className="clients-view" aria-label="Clients">
      <header className="clients-head">
        <div className="clients-head__title">
          <h1 className="clients-h1">Clients</h1>
          <span className="clients-count">{MOCK_CLIENTS.length}</span>
        </div>
        <div className="clients-head__tools">
          <label className="clients-search">
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Rechercher un client…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="clients-filters">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`clients-filter ${filter === key ? "is-active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {clients.length === 0 ? (
        <div className="clients-empty">Aucun client ne correspond.</div>
      ) : (
        <div className="clients-grid">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} onOpen={() => setActiveClientId(c.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function ClientCard({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const h = relationHealth(client);
  return (
    <button type="button" className="client-card" onClick={onOpen}>
      <div className="client-card__top">
        <span className="client-card__av">
          <Avatar avatar={{ ...client.avatar, alt: client.name }} size={44} />
        </span>
        <div className="client-card__id">
          <span className="client-card__name">{client.name}</span>
          {client.company && <span className="client-card__company">{client.company}</span>}
        </div>
        <span className="client-card__channels">
          {client.channels.map((ch) => (
            <ChannelLogo key={ch} channel={ch} className="client-card__chan" />
          ))}
        </span>
      </div>

      {/* Santé de la relation — signal honnête, pas un % de projet inventé. */}
      <div className={`client-card__relation client-card__relation--${h.state}`}>
        <span className="client-card__rdot" aria-hidden />
        <span className="client-card__rlabel">{h.label}</span>
        {client.lastContactLabel && (
          <span className="client-card__last">{client.lastContactLabel}</span>
        )}
      </div>
    </button>
  );
}
