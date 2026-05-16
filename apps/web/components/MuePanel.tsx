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
  const { conversations, tasks, upcoming } = useData();
  const conv = conversations.find((c) => c.id === activeConvId);
  const contactName = conv?.name.split(/[ –-]/)[0]?.trim() ?? "";
  const userName = user?.firstName ?? "there";

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
                <h2>Hey, I&apos;m right here<br />with you and {contactName}.</h2>
                <p>I&apos;m listening to every word of your chat. Whenever you need me, I can summarize the thread, draft a kind reply, or turn ideas into tasks — just ask.</p>
              </div>
            )}
            {view === "tasks" && (
              <div className="yuka-tasks">
                <h2>I&apos;ve scanned your messages.<br />Here&apos;s what matters.</h2>
                <p>Focus on these tasks to stay ahead.</p>
              </div>
            )}
            {view === "calendar" && (
              <div className="yuka-cal">
                <h2>{greeting()},<br />{userName} 👋</h2>
                <p>You have 3 events scheduled today.</p>
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
              <button className="action" type="button">
                <span className="action-icon"><Icon name="i-spark" /></span>
                <span>
                  <span className="action-title">Suggest tasks</span>
                  <span className="action-desc">Turn key points into next steps</span>
                </span>
                <span className="action-arrow"><Icon name="i-chevron" /></span>
              </button>
              <button className="action" type="button">
                <span className="action-icon warm"><Icon name="i-list" /></span>
                <span>
                  <span className="action-title">Summarize conversation</span>
                  <span className="action-desc">Main points in a clear summary</span>
                </span>
                <span className="action-arrow"><Icon name="i-chevron" /></span>
              </button>
              <button className="action" type="button">
                <span className="action-icon cool"><Icon name="i-globe" /></span>
                <span>
                  <span className="action-title">Translate conversation</span>
                  <span className="action-desc">Translate to another language</span>
                </span>
                <span className="action-arrow"><Icon name="i-chevron" /></span>
              </button>
            </section>

            <div className="divider"><span>More ideas?</span></div>

            <div className="ask">
              <span className="ask-icon"><Icon name="i-spark" /></span>
              <input type="text" placeholder="Ask Mue anything…" />
              <kbd>⌘ K</kbd>
            </div>

            <div className="footnote">
              <Icon name="i-info" size={13} />
              <span>Mue adapts to the content you&apos;re working on.</span>
            </div>
          </div>
        </div>
    </aside>
  );
}
