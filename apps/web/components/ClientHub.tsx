"use client";

// Freescale V2 · Phase 2 — Hub Client 360 (pilier CENTRALISER).
// Tout ce que l'INBOX peut réellement savoir sur un client, au même endroit :
// santé de la relation, conversations, tâches liées, mémoire Mue. 100% UI mock.
// On n'affiche PAS de projet/fichiers/facturation : ces données ne peuvent pas
// venir d'une boîte mail (cela supposerait Stripe / un drive / un PM connectés).

import { relationHealth } from "@/components/ClientsView";
import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { SectionCard } from "@/components/ui/Primitives";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { Client, Conversation, Task } from "@/lib/types";
import type { ReactNode } from "react";
import { useState } from "react";

const TABS = [
  { id: "overview", label: "Aperçu" },
  { id: "convs", label: "Conversations" },
  { id: "tasks", label: "Tâches" },
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
        {tab === "overview" && (
          <OverviewTab client={client} convs={convs} tasks={tasks} onOpenThread={openThread} />
        )}
        {tab === "convs" && <ConvsTab convs={convs} />}
        {tab === "tasks" && <TasksTab tasks={tasks} />}
        {tab === "mue" && <MueTab client={client} />}
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="hub-empty">{children}</div>;
}

function OverviewTab({
  client,
  convs,
  tasks,
  onOpenThread,
}: {
  client: Client;
  convs: Conversation[];
  tasks: Task[];
  onOpenThread: () => void;
}) {
  const h = relationHealth(client);
  const openTasks = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="hub-overview">
      {/* Bandeau santé de la relation — l'info honnête en haut. */}
      <div className={`hub-relation hub-relation--${h.state}`}>
        <span className="hub-relation__dot" aria-hidden />
        <div className="hub-relation__main">
          <span className="hub-relation__label">{h.label}</span>
          <span className="hub-relation__sub">
            Dernier échange {client.lastContactLabel ?? "—"}
          </span>
        </div>
        {h.state === "owe" && (
          <button type="button" className="hub-relation__cta" onClick={onOpenThread}>
            Répondre
          </button>
        )}
        {(h.state === "awaiting" || h.state === "silent") && (
          <button type="button" className="hub-relation__cta" onClick={onOpenThread}>
            Relancer
          </button>
        )}
      </div>

      <div className="hub-stats">
        <Stat label="À répondre" value={`${client.awaitingCount ?? 0}`} />
        <Stat label="Tâches en cours" value={`${openTasks}`} />
        <Stat label="Conversations" value={`${convs.length}`} />
      </div>

      <SectionCard title="Derniers échanges">
        {convs.length === 0 ? (
          <Empty>Aucune conversation liée.</Empty>
        ) : (
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
        )}
      </SectionCard>

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
          <p className="hub-facts__src">D'après vos échanges — corrige si c'est faux.</p>
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
      <p className="hub-facts__src">
        Déduit automatiquement de vos échanges. Ces points peuvent être imparfaits — corrige-les si
        besoin.
      </p>
      <ul className="hub-facts">
        {facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </SectionCard>
  );
}
