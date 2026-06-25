"use client";

// Freescale V2 — Santé client refondue en COCKPIT BUSINESS visuel.
// Layout dérivé de la maquette de référence :
//   1) Sélecteur de période (segmented)
//   2) 3 KPI cards (clients total / nouveaux / fidèles) avec delta vs période précédente
//   3) 2 cards graphiques (Répartition par statut · Répartition par canal)
//   4) Carrousel horizontal de fiches clients
//   5) 2 cards d'insights détectés par Mue
// Les chiffres sont DÉRIVÉS de MOCK_CLIENTS (mock), pas inventés.

import { ClientHub } from "@/components/ClientHub";
import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MOCK_CLIENTS } from "@/lib/mock-v2";
import { useApp } from "@/lib/store";
import type { ChannelId, Client, Tone } from "@/lib/types";
import { useMemo, useState } from "react";

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

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

const STAGE: Record<NonNullable<Client["stage"]>, { label: string; cls: string; color: string }> = {
  prospect: { label: "Prospect", cls: "prospect", color: "#2563eb" },
  active: { label: "Actif", cls: "active", color: "#16a34a" },
  dormant: { label: "Dormant", cls: "dormant", color: "#64748b" },
};

// Couleurs par canal pour la répartition.
const CHAN_COLOR: Record<ChannelId, string> = {
  gmail: "#ea4335",
  whatsapp: "#25d366",
  linkedin: "#0a66c2",
  slack: "#611f69",
  outlook: "#0078d4",
  icloud: "#a0a0a0",
  imap: "#9097a3",
  instagram: "#e1306c",
  discord: "#5865f2",
  x: "#0f1419",
  telegram: "#229ed9",
  messenger: "#0084ff",
  sms: "#34c759",
};
const CHAN_LABEL: Record<ChannelId, string> = {
  gmail: "Gmail",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  slack: "Slack",
  outlook: "Outlook",
  icloud: "iCloud",
  imap: "IMAP",
  instagram: "Instagram",
  discord: "Discord",
  x: "X",
  telegram: "Telegram",
  messenger: "Messenger",
  sms: "SMS",
};

type Period = "week" | "month" | "year";
const PERIODS: [Period, string][] = [
  ["week", "Cette semaine"],
  ["month", "Ce mois"],
  ["year", "Cette année"],
];

// Multiplicateurs mock pour donner du sens aux deltas (mock-only).
const PERIOD_FACTOR: Record<Period, { total: number; new: number; loyal: number; deltaT: number; deltaN: number; deltaL: number }> = {
  week: { total: 1, new: 1, loyal: 1, deltaT: 2, deltaN: 12, deltaL: -1 },
  month: { total: 1, new: 1, loyal: 1, deltaT: 4, deltaN: 19, deltaL: -1 },
  year: { total: 1, new: 1, loyal: 1, deltaT: 11, deltaN: 28, deltaL: 3 },
};

type Filter = "all" | "money" | "reply" | "risk";

// Score d'attention : valeur × risque. Plus c'est haut, plus ça remonte.
function attentionScore(c: Client): number {
  const h = relationHealth(c);
  const m = moneySignal(c);
  let s = 0;
  if (h.state === "owe") s += 40;
  else if (h.state === "silent") s += 30;
  else if (h.state === "awaiting") s += 15;
  if (m.dues > 0) s += m.late ? 35 : 18;
  s += Math.min(m.dues / 1000, 20);
  if (c.stage === "dormant") s += 10;
  return s;
}

export function ClientsView() {
  const { activeClientId, setActiveClientId } = useApp();
  const [period, setPeriod] = useState<Period>("month");
  const [filter, _setFilter] = useState<Filter>("all");

  // ─ KPI dérivés ──────────────────────────────────────────────────────
  const total = MOCK_CLIENTS.length;
  const nouveaux = MOCK_CLIENTS.filter((c) => c.stage === "prospect").length;
  const fideles = MOCK_CLIENTS.filter((c) => c.stage === "active").length;
  const f = PERIOD_FACTOR[period];

  // ─ Répartition par statut (donut) ───────────────────────────────────
  const stageDist = useMemo(() => {
    const counts: Record<NonNullable<Client["stage"]>, number> = {
      prospect: 0,
      active: 0,
      dormant: 0,
    };
    for (const c of MOCK_CLIENTS) {
      if (c.stage) counts[c.stage]++;
    }
    const tot = Math.max(1, Object.values(counts).reduce((a, b) => a + b, 0));
    return (Object.entries(counts) as [NonNullable<Client["stage"]>, number][]).map(
      ([key, count]) => ({
        key,
        count,
        pct: Math.round((count / tot) * 100),
        ...STAGE[key],
      })
    );
  }, []);

  // ─ Répartition par canal (gauge) ────────────────────────────────────
  const channelDist = useMemo(() => {
    const counts = new Map<ChannelId, number>();
    for (const c of MOCK_CLIENTS) for (const ch of c.channels) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const tot = Math.max(1, Array.from(counts.values()).reduce((a, b) => a + b, 0));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ch, count]) => ({
        ch,
        count,
        pct: Math.round((count / tot) * 100),
        color: CHAN_COLOR[ch],
        label: CHAN_LABEL[ch],
      }));
  }, []);

  // ─ Liste clients triée par attention (carrousel) ────────────────────
  const clients = useMemo(() => {
    return [...MOCK_CLIENTS]
      .filter((c) => {
        if (filter === "all") return true;
        const h = relationHealth(c);
        if (filter === "money") return moneySignal(c).dues > 0;
        if (filter === "reply") return h.state === "owe";
        if (filter === "risk")
          return h.state === "silent" || h.state === "awaiting" || c.stage === "dormant";
        return true;
      })
      .sort((a, b) => attentionScore(b) - attentionScore(a));
  }, [filter]);

  // ─ Insights Mue (chiffres dérivés des données mock) ─────────────────
  const avgChannels = (
    MOCK_CLIENTS.reduce((s, c) => s + c.channels.length, 0) / Math.max(1, MOCK_CLIENTS.length)
  ).toFixed(1);
  const avgSilence = Math.round(
    MOCK_CLIENTS.reduce((s, c) => s + (c.silentDays ?? c.awaitingDays ?? 0), 0) /
      Math.max(1, MOCK_CLIENTS.length)
  );

  const openClient = MOCK_CLIENTS.find((c) => c.id === activeClientId) ?? null;
  if (openClient) {
    return (
      <section className="clients-view" aria-label="Fiche client">
        <ClientHub client={openClient} onBack={() => setActiveClientId("")} />
      </section>
    );
  }

  return (
    <section className="clients-view clients-view--v2" aria-label="Santé client">
      {/* ── 1) Sélecteur de période ── */}
      <div className="csv-period" role="tablist" aria-label="Période">
        {PERIODS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={period === key}
            className={`csv-period__btn ${period === key ? "is-on" : ""}`}
            onClick={() => setPeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 2) 3 KPI cards ── */}
      <div className="csv-kpis">
        <KpiCard
          label="Nombre de clients total"
          value={total}
          delta={f.deltaT}
          icon={
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="9" cy="8" r="3.5" />
              <circle cx="17" cy="9" r="2.6" />
              <path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5" />
              <path d="M14 18c.4-2 1.7-3.2 3.5-3.2s3 1.2 3.5 3.2" />
            </svg>
          }
        />
        <KpiCard
          label="Nouveaux clients"
          hint
          value={nouveaux}
          delta={f.deltaN}
          icon={
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="9" r="3.5" />
              <path d="M5 20c0-3.7 3.1-6 7-6s7 2.3 7 6" />
            </svg>
          }
        />
        <KpiCard
          label="Clients fidèles"
          hint
          value={fideles}
          delta={f.deltaL}
          icon={
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="12 3 14.6 9 21 9.5 16 13.7 17.6 20 12 16.7 6.4 20 8 13.7 3 9.5 9.4 9" />
            </svg>
          }
        />
      </div>

      {/* ── 3) 2 cards graphiques ── */}
      <div className="csv-charts">
        <article className="csv-chart">
          <header className="csv-chart__head">Répartition par statut</header>
          <div className="csv-chart__body">
            <Donut parts={stageDist.map((s) => ({ value: s.count, color: s.color }))} centerLabel="Total clients" centerValue={String(total)} />
            <ul className="csv-legend">
              {stageDist.map((s) => (
                <li key={s.key} className="csv-leg">
                  <span className="csv-leg__dot" style={{ background: s.color }} aria-hidden />
                  <span className="csv-leg__name">{s.label}</span>
                  <span className="csv-leg__nums">
                    <strong>{s.count}</strong> · {s.pct} %
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="csv-chart">
          <header className="csv-chart__head">Répartition par canal</header>
          <div className="csv-chart__body">
            <Gauge parts={channelDist.map((s) => ({ value: s.count, color: s.color }))} centerLabel="Connexions" centerValue={String(channelDist.reduce((a, b) => a + b.count, 0))} />
            <ul className="csv-legend csv-legend--grid">
              {channelDist.map((c) => (
                <li key={c.ch} className="csv-leg">
                  <span className="csv-leg__dot" style={{ background: c.color }} aria-hidden />
                  <span className="csv-leg__name">{c.label}</span>
                  <span className="csv-leg__nums">
                    <strong>{c.count}</strong> · {c.pct} %
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>

      {/* ── 4) Carrousel horizontal de clients ── */}
      <div className="csv-rail" aria-label="Clients à surveiller">
        {clients.map((c) => (
          <MiniClientCard key={c.id} client={c} onOpen={() => setActiveClientId(c.id)} />
        ))}
      </div>

      {/* ── 5) Insights Mue ── */}
      <div className="csv-insights">
        <article className="csv-insight">
          <p>
            Tes clients t'écrivent en moyenne sur <strong>{avgChannels}&nbsp;canaux</strong> chacun
            — l'unification fait gagner du temps.
          </p>
          <span className="csv-insight__ic">
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="3" x2="8" y2="7" />
              <line x1="16" y1="3" x2="16" y2="7" />
            </svg>
          </span>
        </article>
        <article className="csv-insight">
          <p>
            Délai moyen avant relance détecté par Mue : <strong>{avgSilence}&nbsp;j</strong> —
            Mue te signale les fils qui dépassent ce seuil.
          </p>
          <span className="csv-insight__ic csv-insight__ic--warn">
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
          </span>
        </article>
      </div>
    </section>
  );
}

// ── Petits composants ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  icon,
  hint,
}: {
  label: string;
  value: number;
  delta: number;
  icon: React.ReactNode;
  hint?: boolean;
}) {
  const up = delta >= 0;
  return (
    <article className="csv-kpi">
      <header className="csv-kpi__head">
        <span className="csv-kpi__label">
          {label}
          {hint && (
            <span className="csv-kpi__hint" aria-hidden>
              <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="11" x2="12" y2="16" />
                <circle cx="12" cy="8" r="0.6" fill="currentColor" />
              </svg>
            </span>
          )}
        </span>
        <span className="csv-kpi__ic">{icon}</span>
      </header>
      <div className="csv-kpi__val">{value.toLocaleString("fr-FR")}</div>
      <footer className="csv-kpi__foot">
        <span className={`csv-kpi__delta ${up ? "is-up" : "is-down"}`}>
          <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {up ? <polyline points="6 14 12 8 18 14" /> : <polyline points="6 10 12 16 18 10" />}
          </svg>
          {up ? "+" : ""}
          {delta} %
        </span>
        <span className="csv-kpi__note">vs période précédente</span>
      </footer>
    </article>
  );
}

function Donut({
  parts,
  centerLabel,
  centerValue,
}: {
  parts: { value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const r = 56;
  const stroke = 18;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const tot = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  return (
    <svg viewBox="0 0 160 160" width={160} height={160} className="csv-donut" aria-hidden>
      <circle cx="80" cy="80" r={r} stroke="#eef0f5" strokeWidth={stroke} fill="none" />
      {parts.map((p, i) => {
        const len = (p.value / tot) * C;
        const dash = `${len} ${C}`;
        const dashoffset = -offset;
        offset += len;
        return (
          <circle
            key={i}
            cx="80"
            cy="80"
            r={r}
            stroke={p.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={dash}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
            transform="rotate(-90 80 80)"
          />
        );
      })}
      <text x="80" y="74" textAnchor="middle" className="csv-donut__lbl">
        {centerLabel}
      </text>
      <text x="80" y="94" textAnchor="middle" className="csv-donut__val">
        {centerValue}
      </text>
    </svg>
  );
}

function Gauge({
  parts,
  centerLabel,
  centerValue,
}: {
  parts: { value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  // Demi-cercle (gauche → droite, ouvert en bas).
  const r = 60;
  const C = Math.PI * r; // longueur du demi-cercle
  const tot = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  let offset = 0;
  return (
    <svg viewBox="0 0 160 100" width={160} height={100} className="csv-gauge" aria-hidden>
      <path d="M 16 80 A 60 60 0 0 1 144 80" fill="none" stroke="#eef0f5" strokeWidth={18} strokeLinecap="butt" />
      {parts.map((p, i) => {
        const len = (p.value / tot) * C;
        const dash = `${len} ${C}`;
        const dashoffset = -offset;
        offset += len;
        return (
          <path
            key={i}
            d="M 16 80 A 60 60 0 0 1 144 80"
            fill="none"
            stroke={p.color}
            strokeWidth={18}
            strokeLinecap="butt"
            strokeDasharray={dash}
            strokeDashoffset={dashoffset}
          />
        );
      })}
      <text x="80" y="62" textAnchor="middle" className="csv-donut__lbl">
        {centerLabel}
      </text>
      <text x="80" y="80" textAnchor="middle" className="csv-donut__val">
        {centerValue}
      </text>
    </svg>
  );
}

function MiniClientCard({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const h = relationHealth(client);
  const m = moneySignal(client);
  const stage = client.stage ? STAGE[client.stage] : null;
  return (
    <button type="button" className="csv-mini" onClick={onOpen}>
      <div className="csv-mini__top">
        <Avatar avatar={{ ...client.avatar, alt: client.name }} size={32} />
        <div className="csv-mini__id">
          <span className="csv-mini__name">{client.name}</span>
          <span className="csv-mini__meta">
            {client.company && <span className="csv-mini__company">{client.company}</span>}
            {stage && (
              <span className={`csv-mini__stage csv-mini__stage--${stage.cls}`}>{stage.label}</span>
            )}
          </span>
        </div>
        <span className="csv-mini__chans">
          {client.channels.slice(0, 2).map((ch) => (
            <ChannelLogo key={ch} channel={ch} className="csv-mini__chan" />
          ))}
        </span>
      </div>

      <div className={`csv-mini__money csv-mini__money--${m.label ? m.tone : "ok"}`}>
        <span className="csv-mini__money-ic" aria-hidden>$</span>
        <span>{m.label ?? "Rien à suivre"}</span>
      </div>

      <div className={`csv-mini__rel csv-mini__rel--${h.state}`}>
        <span className="csv-mini__dot" aria-hidden />
        <span className="csv-mini__rlbl">{h.label}</span>
        {client.lastContactLabel && <span className="csv-mini__last">{client.lastContactLabel}</span>}
      </div>
    </button>
  );
}
