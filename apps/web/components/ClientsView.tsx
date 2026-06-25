"use client";

// Freescale V2 — Pilotage clients (refonte v3).
// Décisions clés vs. la maquette générique :
//   • Le wedge value de Freescale = « argent évoqué dans tes échanges » + Mue qui priorise.
//   • Les chiffres montrés sont DÉRIVÉS de MOCK_CLIENTS. Ce qu'on ne peut pas dériver
//     honnêtement (deltas vs période précédente avec n<10) est masqué.
//   • Tout chiffre estimé par l'IA porte la signature « Mue ».
//   • Le toggle période modifie aussi le périmètre des KPI, pas seulement les deltas.

import { ClientHub } from "@/components/ClientHub";
import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MOCK_CLIENTS } from "@/lib/mock-v2";
import { useApp } from "@/lib/store";
import type { ChannelId, Client, Tone } from "@/lib/types";
import { useMemo, useState } from "react";

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

// ── Santé de la relation ─────────────────────────────────────────────
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

const STAGE: Record<NonNullable<Client["stage"]>, { label: string; cls: string; color: string }> = {
  // Note : on évite le vert pur sur le stade « Actif » (conflit visuel avec le canal WhatsApp).
  // On utilise du violet/indigo pour Actif → distinction nette dans le donut + légende.
  prospect: { label: "Prospect", cls: "prospect", color: "#2563eb" },
  active: { label: "Actif", cls: "active", color: "#6d4cf2" },
  dormant: { label: "Dormant", cls: "dormant", color: "#94a3b8" },
};

const CHAN_COLOR: Record<ChannelId, string> = {
  gmail: "#ea4335",
  whatsapp: "#25d366",
  linkedin: "#0a66c2",
  slack: "#611f69",
  outlook: "#0078d4",
  icloud: "#94a3b8",
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

type Filter = "all" | "money" | "reply" | "risk";
const FILTERS: [Filter, string][] = [
  ["all", "Tous"],
  ["money", "Argent à suivre"],
  ["reply", "À répondre"],
  ["risk", "À risque"],
];

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
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  // ─ KPI dérivés pour le score de santé ─────────────────────────────
  const total = MOCK_CLIENTS.length;
  const toReplyCount = MOCK_CLIENTS.filter((c) => relationHealth(c).state === "owe").length;

  // ─ SCORE DE SANTÉ — 4 indicateurs composent une note 0–100 ────────
  // Source de vérité : on ne MESURE que ce qu'on observe dans l'inbox.
  // Wordings à la 2e personne + chiffre concret pour rendre ça humain.
  const health = useMemo(() => {
    const n = Math.max(1, total);
    const reactivite = Math.round((1 - toReplyCount / n) * 100);
    const actifs = MOCK_CLIENTS.filter((c) => c.stage === "active").length;
    const regularite = Math.round((actifs / n) * 100);
    const silents = MOCK_CLIENTS.filter((c) => (c.silentDays ?? 0) >= 10).length;
    const engagement = Math.round((1 - silents / n) * 100);
    const invoices = MOCK_CLIENTS.flatMap((c) => c.invoices ?? []);
    const lateInv = invoices.filter((i) => i.status === "late").length;
    const paiements =
      invoices.length === 0 ? 100 : Math.round((1 - lateInv / invoices.length) * 100);

    const score = Math.round((reactivite + regularite + engagement + paiements) / 4);
    const verdict =
      score >= 80
        ? {
            label: "Belle dynamique",
            tagline: "Tes clients sont bien suivis — continue sur cette lancée.",
            tone: "good" as const,
          }
        : score >= 60
          ? {
              label: "Bonne base",
              tagline: "L'essentiel est tenu, quelques fils méritent ton attention.",
              tone: "fair" as const,
            }
          : {
              label: "Quelques fils à reprendre",
              tagline: "Pas de panique — voici ce qui pèse sur le score.",
              tone: "warn" as const,
            };
    return {
      score,
      verdict,
      items: [
        {
          key: "reactivite",
          label: "Tu réponds vite",
          hint:
            toReplyCount === 0
              ? "Personne n'attend ta réponse"
              : `${toReplyCount} ${toReplyCount > 1 ? "réponses dues" : "réponse due"} en ce moment`,
          value: reactivite,
        },
        {
          key: "regularite",
          label: "Tes relations vivent",
          hint: `${actifs} client${actifs > 1 ? "s" : ""} actif${actifs > 1 ? "s" : ""} sur ${n}`,
          value: regularite,
        },
        {
          key: "engagement",
          label: "Tu es présent",
          hint:
            silents === 0
              ? "Aucun fil en silence prolongé"
              : `${silents} fil${silents > 1 ? "s" : ""} à réveiller (>10j sans nouvelle)`,
          value: engagement,
        },
        {
          key: "paiements",
          label: "Trésorerie saine",
          hint:
            invoices.length === 0
              ? "Aucune facture suivie"
              : `${lateInv} sur ${invoices.length} facture${invoices.length > 1 ? "s" : ""} en retard`,
          value: paiements,
        },
      ],
    };
  }, [total, toReplyCount]);

  // ─ Répartition par stade ─────────────────────────────────────────
  const stageDist = useMemo(() => {
    const counts: Record<NonNullable<Client["stage"]>, number> = {
      prospect: 0,
      active: 0,
      dormant: 0,
    };
    for (const c of MOCK_CLIENTS) if (c.stage) counts[c.stage]++;
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

  // ─ Répartition par canal (barre empilée — pas une jauge) ─────────
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

  // ─ Grille filtrée ────────────────────────────────────────────────
  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...MOCK_CLIENTS]
      .filter((c) => {
        if (q) {
          const hay = `${c.name} ${c.company ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        const h = relationHealth(c);
        if (filter === "money") return moneySignal(c).dues > 0;
        if (filter === "reply") return h.state === "owe";
        if (filter === "risk")
          return h.state === "silent" || h.state === "awaiting" || c.stage === "dormant";
        return true;
      })
      .sort((a, b) => attentionScore(b) - attentionScore(a));
  }, [filter, query]);

  // ─ Insights observationnels neutres ──────────────────────────────
  const avgChannels = (
    MOCK_CLIENTS.reduce((s, c) => s + c.channels.length, 0) / Math.max(1, MOCK_CLIENTS.length)
  ).toFixed(1);
  const topChannel = channelDist[0];

  const openClient = MOCK_CLIENTS.find((c) => c.id === activeClientId) ?? null;
  if (openClient) {
    return (
      <section className="clients-view" aria-label="Fiche client">
        <ClientHub client={openClient} onBack={() => setActiveClientId("")} />
      </section>
    );
  }

  return (
    <section className="clients-view clients-view--v3" aria-label="Pilotage clients">
      {/* ── En-tête : juste les outils (recherche + période) ── */}
      <header className="csv3-head csv3-head--bare">
        <div className="csv3-head__tools">
          <label className="csv3-search">
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
        </div>
      </header>

      {/* ── HERO : score de santé global + ses 4 indicateurs ────────────
           Le score répond à « est-ce que ma santé client est bonne ? ».
           Chaque indicateur explique POURQUOI — pas de boîte noire. */}
      <section className={`csv3-score csv3-score--${health.verdict.tone}`} aria-label="Score de santé">
        <div className="csv3-score__head">
          <ScoreRing value={health.score} tone={health.verdict.tone} />
          <div className="csv3-score__id">
            <span className="csv3-score__verdict">{health.verdict.label}</span>
            <span className="csv3-score__tagline">{health.verdict.tagline}</span>
          </div>
          <span className="csv3-mue-tag csv3-mue-tag--inline" title="Calculé par Mue à partir de 4 signaux dans tes échanges">
            <MueSparkSmall /> Calculé par Mue
          </span>
        </div>
        <ul className="csv3-score__items">
          {health.items.map((it) => (
            <HealthBar
              key={it.key}
              label={it.label}
              hint={it.hint}
              value={it.value}
              icon={HEALTH_ICONS[it.key as keyof typeof HEALTH_ICONS]}
            />
          ))}
        </ul>
      </section>

      {/* ── 2 visualisations : donut stade + barre canal (le bon type de chart) ── */}
      <div className="csv3-charts">
        <article className="csv3-chart">
          <header className="csv3-chart__head">
            <h3>Répartition par stade</h3>
            <span className="csv3-mue-tag" title="Stade inféré par Mue à partir du contenu des échanges">
              <MueSparkSmall /> Mue
            </span>
          </header>
          <div className="csv3-chart__body">
            <Donut parts={stageDist.map((s) => ({ value: s.count, color: s.color }))} />
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

        <article className="csv3-chart">
          <header className="csv3-chart__head">
            <h3>Répartition par canal</h3>
            <span className="csv3-chart__note">Sur quels canaux tes clients t'écrivent</span>
          </header>
          <div className="csv3-chart__body csv3-chart__body--bar">
            <StackedBar parts={channelDist.map((s) => ({ value: s.count, color: s.color }))} />
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

      {/* ── Filtres + grille COMPLÈTE (plus de carrousel qui cache) ── */}
      <div className="csv3-grid-head">
        <h2>Tous les clients</h2>
        <div className="csv3-filters" role="tablist">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`csv3-filter ${filter === key ? "is-on" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="csv3-empty">
          <p>Aucun client ne correspond à ce filtre.</p>
          <button
            type="button"
            className="csv3-empty__reset"
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
          >
            Réinitialiser le filtre
          </button>
        </div>
      ) : (
        <div className="csv3-grid">
          {clients.map((c) => (
            <MiniClientCard key={c.id} client={c} onOpen={() => setActiveClientId(c.id)} />
          ))}
        </div>
      )}

      {/* ── Insights Mue : observations neutres sur le portefeuille ── */}
      <div className="csv3-insights">
        <article className="csv3-insight">
          <span className="csv3-insight__ic" aria-hidden>
            <MueSparkSmall />
          </span>
          <p>
            {topChannel ? (
              <>
                Ton canal principal est <strong>{topChannel.label}</strong> —{" "}
                <strong>{topChannel.pct}&nbsp;%</strong> de tes échanges y passent.
              </>
            ) : (
              <>Aucun canal connecté pour l'instant.</>
            )}
          </p>
        </article>
        <article className="csv3-insight">
          <span className="csv3-insight__ic" aria-hidden>
            <MueSparkSmall />
          </span>
          <p>
            Tes clients t'écrivent en moyenne sur <strong>{avgChannels}&nbsp;canaux</strong> —
            Freescale les regroupe tous en un seul endroit.
          </p>
        </article>
      </div>
    </section>
  );
}

// ── Petits composants ──────────────────────────────────────────────────

function MueSparkSmall() {
  return (
    <svg viewBox="0 0 24 24" width={11} height={11} aria-hidden>
      <defs>
        <linearGradient id="muespk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7aa2ff" />
          <stop offset="50%" stopColor="#b78cff" />
          <stop offset="100%" stopColor="#ff9d7a" />
        </linearGradient>
      </defs>
      <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" fill="url(#muespk)" />
    </svg>
  );
}

function Donut({ parts }: { parts: { value: number; color: string }[] }) {
  const r = 56;
  const stroke = 16;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const tot = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  return (
    <svg viewBox="0 0 160 160" width={150} height={150} className="csv-donut" aria-hidden>
      <circle cx="80" cy="80" r={r} stroke="var(--csv-track)" strokeWidth={stroke} fill="none" />
      {parts.map((p, i) => {
        const len = (p.value / tot) * C;
        const dash = `${Math.max(0, len - 2)} ${C}`;
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
    </svg>
  );
}

function StackedBar({ parts }: { parts: { value: number; color: string }[] }) {
  const tot = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  return (
    <div className="csv-bar" role="img" aria-label="Répartition par canal">
      {parts.map((p, i) => {
        const w = (p.value / tot) * 100;
        return (
          <span
            key={i}
            className="csv-bar__seg"
            style={{ width: `${w}%`, background: p.color }}
            title={`${p.value} (${Math.round(w)} %)`}
          />
        );
      })}
    </div>
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
        <span className="csv-mini__money-ic" aria-hidden>€</span>
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

// ── Icônes SVG cohérentes avec le reste de l'app (stroke 1.8) ─────────
const ICON_STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const HEALTH_ICONS = {
  reactivite: (
    <svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}>
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  ),
  regularite: (
    <svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21 4 21 9 16 9" />
    </svg>
  ),
  engagement: (
    <svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}>
      <path d="M3 12h3l3-7 4 14 3-7h5" />
    </svg>
  ),
  paiements: (
    <svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}>
      <path d="M17.5 6a6.5 6.5 0 1 0 0 12" />
      <line x1="6" y1="10" x2="14" y2="10" />
      <line x1="6" y1="14" x2="14" y2="14" />
    </svg>
  ),
} as const;

// ── Anneau de score — plus grand, gradient subtil + suffixe /100 ──────
function ScoreRing({ value, tone }: { value: number; tone: "good" | "fair" | "warn" }) {
  const r = 42;
  const C = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * C;
  const gradId = `csv3-grad-${tone}`;
  return (
    <svg viewBox="0 0 104 104" width={104} height={104} className={`csv3-ring csv3-ring--${tone}`} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop
            offset="0%"
            stopColor={tone === "good" ? "#22b06e" : tone === "fair" ? "#7aa2ff" : "#f59e0b"}
          />
          <stop
            offset="100%"
            stopColor={tone === "good" ? "#148a5a" : tone === "fair" ? "#4f6cf7" : "#d97706"}
          />
        </linearGradient>
      </defs>
      <circle cx="52" cy="52" r={r} stroke="var(--csv-track)" strokeWidth={9} fill="none" />
      <circle
        cx="52"
        cy="52"
        r={r}
        stroke={`url(#${gradId})`}
        strokeWidth={9}
        fill="none"
        strokeDasharray={`${dash} ${C}`}
        strokeLinecap="round"
        transform="rotate(-90 52 52)"
      />
      <text x="52" y="55" textAnchor="middle" className="csv3-ring__val">
        {value}
      </text>
      <text x="52" y="70" textAnchor="middle" className="csv3-ring__unit">
        / 100
      </text>
    </svg>
  );
}

// ── Carte d'indicateur (icône SVG + libellé + valeur + jauge généreuse) ─
function HealthBar({
  label,
  hint,
  value,
  icon,
}: {
  label: string;
  hint: string;
  value: number;
  icon: React.ReactNode;
}) {
  const tone = value >= 80 ? "good" : value >= 60 ? "fair" : "warn";
  return (
    <li className={`csv3-hbar csv3-hbar--${tone}`}>
      <div className="csv3-hbar__head">
        <span className="csv3-hbar__ic" aria-hidden>
          {icon}
        </span>
        <span className="csv3-hbar__label">{label}</span>
        <span className={`csv3-hbar__val csv3-hbar__val--${tone}`}>{value}%</span>
      </div>
      <div className="csv3-hbar__track">
        <span className={`csv3-hbar__fill csv3-hbar__fill--${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="csv3-hbar__hint">{hint}</span>
    </li>
  );
}
