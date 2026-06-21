"use client";

// Freescale V2 · Phase 2 — Vue « Clients » (pilier CENTRALISER).
// Grille de fiches client → ouvre le hub 360 (ClientHub). 100% UI mock.

import { ClientHub } from "@/components/ClientHub";
import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar, StatusPill } from "@/components/ui/Primitives";
import { MOCK_CLIENTS } from "@/lib/mock-v2";
import { useApp } from "@/lib/store";
import type { Client, ProjectStatus, Tone } from "@/lib/types";
import { useState } from "react";

const STATUS_TONE: Record<ProjectStatus, Tone> = {
  "on-track": "ok",
  "at-risk": "warn",
  late: "neutral",
  done: "neutral",
};
const STATUS_LABEL: Record<ProjectStatus, string> = {
  "on-track": "Dans les temps",
  "at-risk": "À risque",
  late: "En retard",
  done: "Terminé",
};

type Filter = "all" | "awaiting" | "at-risk";
const FILTERS: [Filter, string][] = [
  ["all", "Tous"],
  ["awaiting", "En attente"],
  ["at-risk", "À risque"],
];

export function ClientsView() {
  // Le client ouvert vit dans le store → on peut ouvrir une fiche depuis
  // ailleurs (ex. bouton « Voir la fiche client » d'un thread de l'inbox).
  const { activeClientId, setActiveClientId } = useApp();
  const [filter, setFilter] = useState<Filter>("all");

  const openClient = MOCK_CLIENTS.find((c) => c.id === activeClientId) ?? null;
  if (openClient) {
    return (
      <section className="clients-view" aria-label="Fiche client">
        <ClientHub client={openClient} onBack={() => setActiveClientId("")} />
      </section>
    );
  }

  const clients = MOCK_CLIENTS.filter((c) => {
    if (filter === "awaiting") return (c.awaitingCount ?? 0) > 0;
    if (filter === "at-risk")
      return c.project?.status === "at-risk" || c.project?.status === "late";
    return true;
  });

  return (
    <section className="clients-view" aria-label="Clients">
      <header className="clients-head">
        <div>
          <p className="clients-sub">Tout ce qui concerne chaque client, au même endroit.</p>
        </div>
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
      </header>

      <div className="clients-grid">
        {clients.map((c) => (
          <ClientCard key={c.id} client={c} onOpen={() => setActiveClientId(c.id)} />
        ))}
      </div>
    </section>
  );
}

function ClientCard({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const st = client.project?.status;
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
        {(client.awaitingCount ?? 0) > 0 && (
          <span className="client-card__badge">{client.awaitingCount} en attente</span>
        )}
      </div>

      {client.project && (
        <div className="client-card__project">
          <div className="client-card__project-row">
            <span className="client-card__project-name">{client.project.name}</span>
            {st && <StatusPill tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</StatusPill>}
          </div>
          <ProgressBar value={client.project.progress} tone={st ? STATUS_TONE[st] : "ok"} />
        </div>
      )}

      <div className="client-card__foot">
        <span className="client-card__channels">
          {client.channels.map((ch) => (
            <ChannelLogo key={ch} channel={ch} className="client-card__chan" />
          ))}
        </span>
        {client.lastContactLabel && (
          <span className="client-card__last">{client.lastContactLabel}</span>
        )}
      </div>
    </button>
  );
}
