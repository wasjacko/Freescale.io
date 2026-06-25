"use client";

// Freescale V2 · Phase 2 — « Santé client » = COCKPIT BUSINESS.
// Tout est DÉDUIT des échanges par Mue (jamais saisi à la main) :
//   • argent à suivre = montants de devis/factures cités dans les fils
//   • stade commercial = prospect / actif / dormant (inféré du contenu)
//   • santé relation = qui doit répondre, silence, relances
// La liste est triée par « qui mérite ton attention maintenant » (valeur × risque).

import { ClientHub } from "@/components/ClientHub";
import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MOCK_CLIENTS } from "@/lib/mock-v2";
import { useApp } from "@/lib/store";
import type { Client, Tone } from "@/lib/types";
import { useMemo, useState } from "react";

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

// ── Santé de la relation (signaux de communication) ──────────────────
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

// ── Argent à suivre = montants évoqués dans les échanges, non réglés ──
// (détecté par Mue dans les messages — pas une compta certifiée).
export function moneySignal(c: Client): {
  dues: number;
  late: boolean;
  label: string | null;
  tone: Tone;
} {
  const inv = c.invoices ?? [];
  const dues = inv.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  if (dues === 0) return { dues: 0, late: false, label: null, tone: "ok" };
  const late = inv.some((i) => i.status === "late");
  return {
    dues,
    late,
    label: `${eur(dues)} à suivre`,
    tone: late ? "danger" : "warn",
  };
}

const STAGE: Record<NonNullable<Client["stage"]>, { label: string; cls: string }> = {
  prospect: { label: "Prospect", cls: "prospect" },
  active: { label: "Actif", cls: "active" },
  dormant: { label: "Dormant", cls: "dormant" },
};

// Score d'attention : valeur × risque. Plus c'est haut, plus ça remonte.
function attentionScore(c: Client): number {
  const h = relationHealth(c);
  const m = moneySignal(c);
  let s = 0;
  if (h.state === "owe") s += 40;
  else if (h.state === "silent") s += 30;
  else if (h.state === "awaiting") s += 15;
  if (m.dues > 0) s += m.late ? 35 : 18;
  s += Math.min(m.dues / 1000, 20); // l'argent en jeu fait remonter
  if (c.stage === "dormant") s += 10;
  return s;
}

type Filter = "all" | "money" | "reply" | "risk";
const FILTERS: [Filter, string][] = [
  ["all", "Tous"],
  ["money", "Argent à suivre"],
  ["reply", "À répondre"],
  ["risk", "À risque"],
];

export function ClientsView() {
  const { activeClientId, setActiveClientId } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  // KPI business — tout dérivé de la liste clients (signaux des échanges).
  const totalDues = MOCK_CLIENTS.reduce((s, c) => s + moneySignal(c).dues, 0);
  const clientsWithDues = MOCK_CLIENTS.filter((c) => moneySignal(c).dues > 0).length;
  const toReplyCount = MOCK_CLIENTS.filter((c) => relationHealth(c).state === "owe").length;
  const atRiskCount = MOCK_CLIENTS.filter((c) => {
    const st = relationHealth(c).state;
    return st === "silent" || st === "awaiting" || c.stage === "dormant";
  }).length;

  const kpis: { key: Filter; val: string; label: string; tone: "alert" | "warn" | "neutral" }[] = [
    {
      key: "money",
      val: eur(totalDues),
      label: "à suivre (devis + factures évoqués)",
      tone: "warn",
    },
    {
      key: "money",
      val: `${clientsWithDues}`,
      label: "clients avec de l'argent en attente",
      tone: "neutral",
    },
    { key: "reply", val: `${toReplyCount}`, label: "clients attendent ta réponse", tone: "alert" },
    {
      key: "risk",
      val: `${atRiskCount}`,
      label: "relations à surveiller",
      tone: atRiskCount > 0 ? "alert" : "neutral",
    },
  ];

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_CLIENTS.filter((c) => {
      const h = relationHealth(c);
      if (filter === "money" && moneySignal(c).dues === 0) return false;
      if (filter === "reply" && h.state !== "owe") return false;
      if (
        filter === "risk" &&
        h.state !== "silent" &&
        h.state !== "awaiting" &&
        c.stage !== "dormant"
      )
        return false;
      if (q) {
        const hay = `${c.name} ${c.company ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => attentionScore(b) - attentionScore(a));
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
    <section className="clients-view" aria-label="Santé client">
      <header className="clients-head">
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

      {/* KPI business — argent + attention. Cliquables (filtrent la liste). */}
      <div className="clients-kpis" aria-label="Pilotage">
        {kpis.map((k, i) => (
          <button
            key={`${k.key}-${i}`}
            type="button"
            className={`clients-kpi clients-kpi--${k.tone}`}
            onClick={() => setFilter(k.key)}
          >
            <span className="clients-kpi-val">{k.val}</span>
            <span className="clients-kpi-label">{k.label}</span>
          </button>
        ))}
      </div>
      <p className="clients-disclaimer">
        Montants et stades <strong>détectés par Mue</strong> dans tes échanges — à vérifier, ce
        n'est pas ta compta.
      </p>

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
  const m = moneySignal(client);
  const stage = client.stage ? STAGE[client.stage] : null;
  return (
    <button type="button" className="client-card" onClick={onOpen}>
      <div className="client-card__top">
        <span className="client-card__av">
          <Avatar avatar={{ ...client.avatar, alt: client.name }} size={44} />
        </span>
        <div className="client-card__id">
          <span className="client-card__name">{client.name}</span>
          <span className="client-card__meta">
            {client.company && <span className="client-card__company">{client.company}</span>}
            {stage && (
              <span className={`client-card__stage client-card__stage--${stage.cls}`}>
                {stage.label}
              </span>
            )}
          </span>
        </div>
        <span className="client-card__channels">
          {client.channels.map((ch) => (
            <ChannelLogo key={ch} channel={ch} className="client-card__chan" />
          ))}
        </span>
      </div>

      {/* Ligne ARGENT — le cœur du pilotage business. */}
      <div className={`client-card__money client-card__money--${m.label ? m.tone : "ok"}`}>
        <svg
          viewBox="0 0 24 24"
          width={15}
          height={15}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="12" y1="1.5" x2="12" y2="22.5" />
          <path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <span className="client-card__money-label">{m.label ?? "Rien à suivre"}</span>
      </div>

      {/* Ligne RELATION — qui doit répondre / silence. */}
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
