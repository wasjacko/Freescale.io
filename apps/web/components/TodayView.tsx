"use client";

import { NoChannelsHero } from "@/components/NoChannelsHero";
import { Icon } from "@/components/icons/Icon";
import {
  type DailyBriefing,
  type DailyBriefingItem,
  createTaskFromBrief,
  dailyBriefing,
} from "@/lib/actions/mue";
import type { CurrentUser } from "@/lib/auth";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type BriefState = { kind: "loading" } | { kind: "result"; data: DailyBriefing } | { kind: "error" };

function dateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date());
}

function priorityLabel(priority: DailyBriefingItem["priority"]) {
  if (priority === "high") return "Prioritaire";
  if (priority === "low") return "À surveiller";
  return "À traiter";
}

function formatDue(due: string | null) {
  if (!due) return null;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return due;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}

export function TodayView({ user }: { user: CurrentUser | null }) {
  const router = useRouter();
  const push = useToast((state) => state.push);
  const { conversations, tasks, channels, activeWorkspaceId } = useData();
  const { view, setActiveConv, setView } = useApp();
  const [brief, setBrief] = useState<BriefState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [createdIds, setCreatedIds] = useState<Set<string>>(new Set());

  const cacheKey = useMemo(
    () => `fs:today-brief:${activeWorkspaceId ?? "personal"}:${dateKey()}`,
    [activeWorkspaceId]
  );

  const loadBrief = useCallback(
    async (fresh = false) => {
      if (!fresh) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setBrief({ kind: "result", data: JSON.parse(cached) as DailyBriefing });
            return;
          }
        } catch {}
      }

      if (fresh) setRefreshing(true);
      setBrief({ kind: "loading" });
      try {
        const result = await dailyBriefing();
        if (!result.briefing || result.error) {
          setBrief({ kind: "error" });
          return;
        }
        setBrief({ kind: "result", data: result.briefing });
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result.briefing));
        } catch {}
      } catch {
        setBrief({ kind: "error" });
      } finally {
        setRefreshing(false);
      }
    },
    [cacheKey]
  );

  useEffect(() => {
    if (view === "today" && channels.length > 0) void loadBrief();
  }, [channels.length, loadBrief, view]);

  const openConversation = (conversationId: string) => {
    setActiveConv(conversationId);
    setView("inbox");
  };

  const handleCreateTask = async (item: DailyBriefingItem) => {
    if (creatingId || createdIds.has(item.conversationId)) return;
    setCreatingId(item.conversationId);
    try {
      const result = await createTaskFromBrief({
        conversationId: item.conversationId,
        title: item.title,
        description: item.why,
        priority: item.priority,
        due: item.due,
      });
      if (!result.ok) {
        push({ kind: "error", text: result.error ?? "Création impossible." });
        return;
      }
      setCreatedIds((current) => new Set(current).add(item.conversationId));
      push({ kind: "info", text: "Tâche ajoutée à votre liste.", duration: 2400 });
      router.refresh();
    } catch {
      push({ kind: "error", text: "Création impossible." });
    } finally {
      setCreatingId(null);
    }
  };

  if (channels.length === 0) {
    return (
      <section className="today-view" aria-label="Aujourd'hui">
        <NoChannelsHero />
      </section>
    );
  }

  const items = brief.kind === "result" ? brief.data.items : [];
  const unreadCount = conversations.filter((conversation) => conversation.unread).length;
  const taskCount = tasks.filter((task) => task.status !== "done").length;
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const heading =
    brief.kind === "loading"
      ? "Mue prépare vos priorités."
      : brief.kind === "error"
        ? "Votre journée commence dans l'inbox."
        : items.length === 0
          ? "Rien d'urgent détecté aujourd'hui."
          : `${items.length} action${items.length > 1 ? "s" : ""} à traiter maintenant.`;
  const supportingCopy =
    brief.kind === "result"
      ? brief.data.headline
      : brief.kind === "error"
        ? "Le brief est indisponible pour le moment. Vos conversations restent accessibles."
        : "Je lis les conversations récentes pour faire ressortir les prochaines actions.";

  return (
    <section className="today-view" aria-label="Aujourd'hui">
      <header className="today-hero">
        <div className="today-date">
          <Icon name="i-spark" />
          <span>{user?.firstName ? `Bonjour ${user.firstName}` : "Aujourd'hui"}</span>
          <span aria-hidden="true">·</span>
          <time>{dateLabel}</time>
        </div>
        <div className="today-hero-row">
          <div>
            <h1>{heading}</h1>
            <p>{supportingCopy}</p>
          </div>
          <button
            type="button"
            className="today-refresh"
            onClick={() => void loadBrief(true)}
            disabled={refreshing || brief.kind === "loading"}
          >
            <Icon name="i-spark" />
            {refreshing ? "Analyse en cours" : "Actualiser avec Mue"}
          </button>
        </div>
      </header>

      <div className="today-grid">
        <main className="today-priorities" aria-live="polite">
          <div className="today-section-head">
            <h2>À traiter maintenant</h2>
            {brief.kind === "result" && <span>{items.length}</span>}
          </div>

          {brief.kind === "loading" && (
            <div className="today-loading" aria-label="Chargement des priorités">
              <span />
              <span />
              <span />
            </div>
          )}

          {brief.kind === "error" && (
            <div className="today-empty">
              <strong>Le brief Mue n'est pas disponible.</strong>
              <p>Ouvrez l'inbox pour traiter vos derniers messages ou relancez l'analyse.</p>
              <button type="button" onClick={() => setView("inbox")}>
                Ouvrir l'inbox
              </button>
            </div>
          )}

          {brief.kind === "result" && items.length === 0 && (
            <div className="today-empty">
              <strong>Aucune action prioritaire détectée.</strong>
              <p>Votre inbox reste accessible pour consulter les nouveaux échanges.</p>
              <button type="button" onClick={() => setView("inbox")}>
                Voir l'inbox
              </button>
            </div>
          )}

          {items.map((item) => {
            const due = formatDue(item.due);
            const created = createdIds.has(item.conversationId);
            return (
              <article key={item.conversationId} className={`today-item is-${item.priority}`}>
                <div className="today-item-main">
                  <div className="today-item-meta">
                    <span className="today-priority">{priorityLabel(item.priority)}</span>
                    <span>{item.contactName}</span>
                    {due && <time>Échéance {due}</time>}
                  </div>
                  <h3>{item.title}</h3>
                  {item.why && <p>{item.why}</p>}
                </div>
                <div className="today-item-actions">
                  <button
                    type="button"
                    className="today-open"
                    onClick={() => openConversation(item.conversationId)}
                  >
                    Ouvrir
                  </button>
                  <button
                    type="button"
                    className={`today-create ${created ? "is-done" : ""}`}
                    onClick={() => void handleCreateTask(item)}
                    disabled={creatingId === item.conversationId || created}
                  >
                    {created
                      ? "Tâche créée"
                      : creatingId === item.conversationId
                        ? "Création..."
                        : "Créer tâche"}
                  </button>
                </div>
              </article>
            );
          })}
        </main>

        <aside className="today-summary" aria-label="Repères du jour">
          <h2>Repères du jour</h2>
          <dl>
            <div>
              <dt>Messages non lus</dt>
              <dd>{unreadCount}</dd>
            </div>
            <div>
              <dt>Tâches ouvertes</dt>
              <dd>{taskCount}</dd>
            </div>
            <div>
              <dt>Conversations</dt>
              <dd>{conversations.length}</dd>
            </div>
          </dl>
          <div className="today-links">
            <button type="button" onClick={() => setView("inbox")}>
              <Icon name="i-inbox" />
              Voir toute l'inbox
            </button>
            <button type="button" onClick={() => setView("tasks")}>
              <Icon name="i-task" />
              Ouvrir mes tâches
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
