"use client";

// Freescale V2 · Phase 2 — Hub Client 360 (pilier CENTRALISER).
// Tout sur un client au même endroit : aperçu, conversations, tâches,
// projet, fichiers, facturation, mémoire Mue. 100% UI mock.

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { IntegrationChip, ProgressBar, SectionCard, StatusPill } from "@/components/ui/Primitives";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { Client, Conversation, InvoiceStatus, ProjectStatus, Task, Tone } from "@/lib/types";
import type { ReactNode } from "react";
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
const INVOICE_TONE: Record<InvoiceStatus, Tone> = { paid: "ok", pending: "warn", late: "neutral" };
const INVOICE_LABEL: Record<InvoiceStatus, string> = {
  paid: "Payée",
  pending: "En attente",
  late: "En retard",
};

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

const TABS = [
  { id: "overview", label: "Aperçu" },
  { id: "convs", label: "Conversations" },
  { id: "tasks", label: "Tâches" },
  { id: "project", label: "Projet" },
  { id: "files", label: "Fichiers" },
  { id: "billing", label: "Facturation" },
  { id: "mue", label: "Ce que Mue sait" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ClientHub({ client, onBack }: { client: Client; onBack: () => void }) {
  const [tab, setTab] = useState<TabId>("overview");
  const data = useData();
  const { setView, setActiveConv } = useApp();
  const ids = client.conversationIds ?? [];
  const openThread = () => {
    if (!ids[0]) return;
    setActiveConv(ids[0]);
    setView("inbox");
  };
  const convs = (data.conversations ?? []).filter((c) => ids.includes(c.id));
  const tasks = (data.tasks ?? []).filter(
    (t) => t.conversationId && ids.includes(t.conversationId)
  );

  return (
    <div className="client-hub">
      <button type="button" className="client-hub__back" onClick={onBack}>
        <svg
          viewBox="0 0 24 24"
          width={15}
          height={15}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Tous les clients
      </button>

      <header className="client-hub__head">
        <span className="client-hub__av">
          <Avatar avatar={{ ...client.avatar, alt: client.name }} size={56} />
        </span>
        <div className="client-hub__id">
          <h1 className="client-hub__name">{client.name}</h1>
          <div className="client-hub__meta">
            {client.company && <span>{client.company}</span>}
            {client.email && <span className="client-hub__email">{client.email}</span>}
            <span className="client-hub__channels">
              {client.channels.map((ch) => (
                <ChannelLogo key={ch} channel={ch} className="client-hub__chan" />
              ))}
            </span>
          </div>
          {client.integrations && client.integrations.length > 0 && (
            <div className="client-hub__integs">
              {client.integrations.map((b) => (
                <IntegrationChip key={b.kind} badge={b} />
              ))}
            </div>
          )}
        </div>
        {ids.length > 0 && (
          <button type="button" className="client-hub__openthread" onClick={openThread}>
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Ouvrir le fil
          </button>
        )}
      </header>

      <nav className="client-hub__tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`client-hub__tab ${tab === t.id ? "is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="client-hub__body">
        {tab === "overview" && <OverviewTab client={client} convs={convs} />}
        {tab === "convs" && <ConvsTab convs={convs} />}
        {tab === "tasks" && <TasksTab tasks={tasks} />}
        {tab === "project" && <ProjectTab client={client} />}
        {tab === "files" && <FilesTab client={client} />}
        {tab === "billing" && <BillingTab client={client} />}
        {tab === "mue" && <MueTab client={client} />}
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="hub-empty">{children}</div>;
}

type TimelineKind = "message" | "mue" | "project" | "invoice";

function OverviewTab({ client, convs }: { client: Client; convs: Conversation[] }) {
  const p = client.project;
  const invoices = client.invoices ?? [];
  const duesCount = invoices.filter((i) => i.status !== "paid").length;

  // Timeline unifiée (mock) synthétisée à partir des données réelles du client :
  // message le plus récent + action Mue + jalon projet + dernière facture.
  const lead = convs[0];
  const lastDone = p?.milestones.filter((m) => m.done).at(-1);
  const lastInvoice = invoices.at(-1);
  const timeline: { kind: TimelineKind; title: string; detail?: string; time?: string }[] = [];
  if (lead)
    timeline.push({
      kind: "message",
      title: `Message de ${client.name}`,
      detail: lead.preview,
      time: client.lastContactLabel ?? "",
    });
  timeline.push({
    kind: "mue",
    title: "Mue a proposé un brouillon de réponse",
    time: "aujourd'hui",
  });
  if (lastDone)
    timeline.push({
      kind: "project",
      title: `Jalon validé — ${lastDone.label}`,
      time: p?.dueLabel ?? "",
    });
  if (lastInvoice)
    timeline.push({
      kind: "invoice",
      title: `Facture ${lastInvoice.number} · ${INVOICE_LABEL[lastInvoice.status]}`,
      time: lastInvoice.dateLabel,
    });

  return (
    <div className="hub-overview">
      <div className="hub-stats">
        <Stat label="En attente" value={`${client.awaitingCount ?? 0}`} />
        <Stat label="Conversations" value={`${convs.length}`} />
        <Stat label="Canaux" value={`${client.channels.length}`} />
        <Stat label="Factures dues" value={`${duesCount}`} />
      </div>

      <SectionCard title="Activité récente">
        <ul className="hub-timeline">
          {timeline.map((e) => (
            <li key={e.title} className="hub-tl">
              <span className={`hub-tl__dot hub-tl__dot--${e.kind}`} aria-hidden />
              <div className="hub-tl__main">
                <span className="hub-tl__title">{e.title}</span>
                {e.detail && <span className="hub-tl__detail">{e.detail}</span>}
              </div>
              {e.time && <span className="hub-tl__time">{e.time}</span>}
            </li>
          ))}
        </ul>
      </SectionCard>

      {p && (
        <SectionCard title="Projet en cours">
          <div className="hub-proj-row">
            <span className="hub-proj-name">{p.name}</span>
            <StatusPill tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</StatusPill>
          </div>
          <ProgressBar value={p.progress} tone={STATUS_TONE[p.status]} />
          <div className="hub-proj-foot">
            <span>{p.progress}%</span>
            {p.dueLabel && <span>{p.dueLabel}</span>}
          </div>
        </SectionCard>
      )}

      {client.mueFacts && client.mueFacts.length > 0 && (
        <SectionCard
          title={
            <>
              <span className="hub-spark" aria-hidden>
                ✦
              </span>{" "}
              Ce que Mue retient
            </>
          }
        >
          <ul className="hub-facts">
            {client.mueFacts.slice(0, 3).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hub-stat">
      <span className="hub-stat__val">{value}</span>
      <span className="hub-stat__label">{label}</span>
    </div>
  );
}

function ConvsTab({ convs }: { convs: Conversation[] }) {
  if (convs.length === 0) return <Empty>Aucune conversation liée.</Empty>;
  return (
    <SectionCard title="Conversations">
      <ul className="hub-list">
        {convs.map((c) => (
          <li key={c.id} className="hub-conv">
            <ChannelLogo channel={c.channel} className="hub-conv__chan" />
            <div className="hub-conv__main">
              <span className="hub-conv__subj">{c.subject ?? c.name}</span>
              <span className="hub-conv__prev">{c.preview}</span>
            </div>
            {c.unread && <span className="hub-conv__dot" aria-label="non lu" />}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return <Empty>Aucune tâche liée à ce client.</Empty>;
  return (
    <SectionCard title="Tâches">
      <ul className="hub-list">
        {tasks.map((t) => (
          <li key={t.id} className="hub-task">
            <span className={`hub-task__dot hub-task__dot--${t.status}`} />
            <span className="hub-task__title">{t.title}</span>
            <span className="hub-task__due">{t.dueLabel}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ProjectTab({ client }: { client: Client }) {
  const p = client.project;
  if (!p) return <Empty>Aucun projet.</Empty>;
  return (
    <SectionCard
      title={p.name}
      action={<StatusPill tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</StatusPill>}
    >
      <ProgressBar value={p.progress} tone={STATUS_TONE[p.status]} />
      <div className="hub-proj-foot">
        <span>{p.progress}% complété</span>
        {p.dueLabel && <span>{p.dueLabel}</span>}
      </div>
      <ul className="hub-milestones">
        {p.milestones.map((m) => (
          <li key={m.id} className={m.done ? "is-done" : ""}>
            <span className="hub-ms__check" aria-hidden>
              {m.done ? "✓" : ""}
            </span>
            {m.label}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function FilesTab({ client }: { client: Client }) {
  const files = client.files ?? [];
  if (files.length === 0) return <Empty>Aucun fichier.</Empty>;
  return (
    <SectionCard title="Fichiers">
      <ul className="hub-files">
        {files.map((f) => (
          <li key={f.id} className="hub-file">
            <span className="hub-file__ic">{f.kind.toUpperCase().slice(0, 3)}</span>
            <span className="hub-file__name">{f.name}</span>
            <span className="hub-file__meta">
              {f.sizeLabel} · {f.dateLabel}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function BillingTab({ client }: { client: Client }) {
  const invs = client.invoices ?? [];
  if (invs.length === 0) return <Empty>Aucune facture.</Empty>;
  const total = invs.reduce((s, i) => s + i.amount, 0);
  return (
    <SectionCard title="Facturation" action={<span className="hub-total">{eur(total)}</span>}>
      <ul className="hub-invoices">
        {invs.map((i) => (
          <li key={i.id} className="hub-inv">
            <span className="hub-inv__num">{i.number}</span>
            <span className="hub-inv__date">{i.dateLabel}</span>
            <span className="hub-inv__amt">{eur(i.amount)}</span>
            <StatusPill tone={INVOICE_TONE[i.status]}>{INVOICE_LABEL[i.status]}</StatusPill>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function MueTab({ client }: { client: Client }) {
  const facts = client.mueFacts ?? [];
  if (facts.length === 0) return <Empty>Mue n'a encore rien appris sur ce client.</Empty>;
  return (
    <SectionCard
      title={
        <>
          <span className="hub-spark" aria-hidden>
            ✦
          </span>{" "}
          Ce que Mue sait
        </>
      }
    >
      <ul className="hub-facts">
        {facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </SectionCard>
  );
}
