"use client";

import { useApp } from "@/lib/store";
import { useData } from "@/lib/contexts/DataContext";
import type { CurrentUser } from "@/lib/auth";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MueAvatar } from "@/components/MueAvatar";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Hey night owl";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function MuePanel({ user }: { user?: CurrentUser | null }) {
  const { view, activeConvId } = useApp();
  const { conversations, tasks, upcoming, events } = useData();
  const conv = conversations.find((c) => c.id === activeConvId);
  const contactName = conv?.name.split(/[ –-]/)[0]?.trim() ?? "";
  const userName = user?.firstName ?? "vous";

  // Real counts so the panel never invents data
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayStart.getDate() + 1);
  const todayEventsCount = events.filter((e) => {
    // events are stored in minute-from-8AM form; the day check is done at
    // adapter time, so anything in `events` is already "this week". For
    // "today" we re-check the calendar grid: events.day matches the local day.
    const localDay = todayStart.getDay();
    return e.day === localDay;
  }).length;
  const openTasksCount = tasks.filter((t) => t.status !== "done").length;
  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <aside className="copilot" aria-label="Mue AI copilot">
      <header className="copilot-head">
        <div className="ai-brand">
          <span className="ai-name">Mue</span>
          <span className="ai-pill">AI Copilot</span>
        </div>
      </header>

      <div className="copilot-inner">
          <section className="hero">
            <div className="hero-avatar" id="yuka-canvas">
              <MueAvatar />
              {view === "inbox" && conv && conv.avatar.kind === "img" && (
                <span className="hero-context" aria-label={`Now helping with ${conv.name}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={conv.avatar.src} alt={conv.avatar.alt ?? ""} />
                </span>
              )}
            </div>

            {view === "inbox" && (
              <div className="yuka-inbox">
                <h2>
                  {greeting()},<br />{userName} 👋
                </h2>
                <p>
                  {unreadCount > 0
                    ? `${unreadCount} conversation${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""} aujourd'hui.`
                    : "Aucune conversation non lue. Inbox au clair."}
                  {contactName ? <> Vous lisez avec <strong>{contactName}</strong>.</> : null}
                </p>
              </div>
            )}
            {view === "tasks" && (
              <div className="yuka-tasks">
                <h2>
                  {openTasksCount > 0
                    ? <>{openTasksCount} tâche{openTasksCount > 1 ? "s" : ""}<br />à traiter.</>
                    : <>Aucune tâche<br />en attente.</>}
                </h2>
                <p>
                  {openTasksCount > 0
                    ? "Focus sur celles qui débloquent quelqu'un d'autre."
                    : "Bonne nouvelle, votre liste est vide."}
                </p>
              </div>
            )}
            {view === "calendar" && (
              <div className="yuka-cal">
                <h2>{greeting()},<br />{userName} 👋</h2>
                <p>
                  {todayEventsCount > 0
                    ? `${todayEventsCount} évènement${todayEventsCount > 1 ? "s" : ""} aujourd'hui.`
                    : "Aucun évènement prévu aujourd'hui."}
                </p>
              </div>
            )}
          </section>

          <div className="copilot-bottom">
            {view === "calendar" && (
              <section className="yuka-cal" aria-label="Today's schedule">
                <div className="section-label">Today&apos;s schedule</div>
                <div className="schedule-list">
                  {tasks.slice(0, 3).map((t) => (
                    <button key={t.id} className="sched-card" type="button">
                      <span className="sched-av">
                        <Avatar avatar={t.avatar} />
                        <span className="conv-badge"><ChannelLogo channel={t.channel} className="" /></span>
                      </span>
                      <span className="sched-body">
                        <span className="sched-title">{t.title}</span>
                        <span className="sched-time"><Icon name="i-clock" />{t.dueLabel}</span>
                      </span>
                      <span className={`priority ${t.priority}`}>{t.priority[0]?.toUpperCase()}{t.priority.slice(1)}</span>
                    </button>
                  ))}
                </div>

                <button className="view-full" type="button">
                  View full day
                  <Icon name="i-chevron" />
                </button>

                <div className="section-label" style={{ marginTop: 22 }}>Upcoming</div>
                <div className="up-list">
                  {upcoming.map((u) => (
                    <div key={u.id} className="up-card">
                      <ChannelLogo channel={u.channel} />
                      <span className="up-body">
                        <span className="up-title">{u.title}</span>
                        <span className="up-when">{u.when}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <button className="view-more" type="button">
                  View more
                  <Icon name="i-chevron" />
                </button>
              </section>
            )}

            <section className="actions" aria-label="Suggested actions">
              <button className="action" type="button" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>
                <span className="action-icon"><Icon name="i-spark" /></span>
                <span>
                  <span className="action-title">Suggérer des tâches</span>
                  <span className="action-desc">Transformer les points clés en actions</span>
                </span>
                <span className="add-channel-tag" style={{ marginLeft: "auto" }}>Bientôt</span>
              </button>
              <button className="action" type="button" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>
                <span className="action-icon warm"><Icon name="i-list" /></span>
                <span>
                  <span className="action-title">Résumer la conversation</span>
                  <span className="action-desc">Points principaux en un résumé clair</span>
                </span>
                <span className="add-channel-tag" style={{ marginLeft: "auto" }}>Bientôt</span>
              </button>
              <button className="action" type="button" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>
                <span className="action-icon cool"><Icon name="i-globe" /></span>
                <span>
                  <span className="action-title">Traduire la conversation</span>
                  <span className="action-desc">Traduire en une autre langue</span>
                </span>
                <span className="add-channel-tag" style={{ marginLeft: "auto" }}>Bientôt</span>
              </button>
            </section>

            <div className="footnote">
              <Icon name="i-info" size={13} />
              <span>L&apos;IA de Mue arrive bientôt. Pour le moment elle veille sur votre inbox.</span>
            </div>
          </div>
        </div>
    </aside>
  );
}
