"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { CurrentUser } from "@/lib/auth";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MueAvatar } from "@/components/MueAvatar";
import {
  summarizeThread,
  suggestTasks,
  translateThread,
  type ThreadSummary,
  type SuggestedTask,
  type TranslatedMessage,
} from "@/lib/actions/mue";

type MueResult =
  | { kind: "summary"; data: ThreadSummary }
  | { kind: "tasks"; data: SuggestedTask[] }
  | { kind: "translation"; data: TranslatedMessage[]; lang: string }
  | { kind: "loading"; label: string }
  | { kind: "error"; message: string };

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
  const push = useToast((s) => s.push);
  const conv = conversations.find((c) => c.id === activeConvId);
  const contactName = conv?.name.split(/[ –-]/)[0]?.trim() ?? "";
  const userName = user?.firstName ?? "vous";

  const [result, setResult] = useState<MueResult | null>(null);

  const requireConv = () => {
    if (!activeConvId) {
      push({ text: "Sélectionnez une conversation d'abord." });
      return false;
    }
    return true;
  };

  const handleSummary = async () => {
    if (!requireConv()) return;
    setResult({ kind: "loading", label: "Résumé en cours…" });
    const res = await summarizeThread(activeConvId);
    if (res.error || !res.summary) {
      setResult({ kind: "error", message: res.error ?? "Erreur Mue" });
    } else {
      setResult({ kind: "summary", data: res.summary });
    }
  };

  const handleTasks = async () => {
    if (!requireConv()) return;
    setResult({ kind: "loading", label: "Extraction des tâches…" });
    const res = await suggestTasks(activeConvId);
    if (res.error) {
      setResult({ kind: "error", message: res.error });
    } else if (res.tasks.length === 0) {
      setResult({
        kind: "error",
        message: "Aucune action concrète détectée dans cette conversation.",
      });
    } else {
      setResult({ kind: "tasks", data: res.tasks });
    }
  };

  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const handleTranslate = () => {
    if (!requireConv()) return;
    // Toggle the native in-panel picker instead of window.prompt — feels
    // less like a browser interruption and matches the rest of Mue's UI.
    setLangPickerOpen((open) => !open);
  };

  const runTranslation = async (langLabel: string) => {
    setLangPickerOpen(false);
    if (!requireConv()) return;
    setResult({ kind: "loading", label: `Traduction en ${langLabel}…` });
    const res = await translateThread(activeConvId, langLabel);
    if (res.error || res.messages.length === 0) {
      setResult({ kind: "error", message: res.error ?? "Aucune traduction" });
    } else {
      setResult({ kind: "translation", data: res.messages, lang: langLabel });
    }
  };

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
              <button className="action" type="button" onClick={handleTasks}>
                <span className="action-icon"><Icon name="i-spark" /></span>
                <span>
                  <span className="action-title">Suggérer des tâches</span>
                  <span className="action-desc">Transformer les points clés en actions</span>
                </span>
              </button>
              <button className="action" type="button" onClick={handleSummary}>
                <span className="action-icon warm"><Icon name="i-list" /></span>
                <span>
                  <span className="action-title">Résumer la conversation</span>
                  <span className="action-desc">Points principaux en un résumé clair</span>
                </span>
              </button>
              <button
                className={`action ${langPickerOpen ? "is-active" : ""}`}
                type="button"
                onClick={handleTranslate}
                aria-expanded={langPickerOpen}
              >
                <span className="action-icon cool"><Icon name="i-globe" /></span>
                <span>
                  <span className="action-title">Traduire la conversation</span>
                  <span className="action-desc">Traduire en une autre langue</span>
                </span>
                <span className="action-chevron" aria-hidden>
                  {langPickerOpen ? "▴" : "▾"}
                </span>
              </button>

              {langPickerOpen && (
                <div className="mue-lang-picker" role="menu">
                  {[
                    { code: "en", label: "anglais", flag: "🇬🇧" },
                    { code: "es", label: "espagnol", flag: "🇪🇸" },
                    { code: "fr", label: "français", flag: "🇫🇷" },
                    { code: "it", label: "italien", flag: "🇮🇹" },
                    { code: "de", label: "allemand", flag: "🇩🇪" },
                    { code: "pt", label: "portugais", flag: "🇵🇹" },
                    { code: "nl", label: "néerlandais", flag: "🇳🇱" },
                    { code: "ar", label: "arabe", flag: "🇸🇦" },
                    { code: "zh", label: "chinois", flag: "🇨🇳" },
                    { code: "ja", label: "japonais", flag: "🇯🇵" },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      role="menuitem"
                      className="mue-lang-option"
                      onClick={() => void runTranslation(l.label)}
                    >
                      <span className="mue-lang-flag" aria-hidden>{l.flag}</span>
                      <span className="mue-lang-label">{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {result && (
              <section className="mue-result" aria-live="polite">
                <header className="mue-result-head">
                  <span className="mue-result-title">
                    {result.kind === "loading" && result.label}
                    {result.kind === "error" && "Erreur Mue"}
                    {result.kind === "summary" && "Résumé"}
                    {result.kind === "tasks" && "Tâches suggérées"}
                    {result.kind === "translation" && `Traduit en ${result.lang}`}
                  </span>
                  <button
                    type="button"
                    className="mue-result-close"
                    onClick={() => setResult(null)}
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </header>

                {result.kind === "loading" && (
                  <div className="mue-result-loading">
                    <span className="mue-result-spinner" />
                  </div>
                )}

                {result.kind === "error" && (
                  <p className="mue-result-error">{result.message}</p>
                )}

                {result.kind === "summary" && (
                  <div className="mue-result-body">
                    <p className="mue-result-tldr">{result.data.tldr}</p>
                    <ul className="mue-result-bullets">
                      {result.data.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.kind === "tasks" && (
                  <ul className="mue-result-tasks">
                    {result.data.map((t, i) => (
                      <li key={i} className={`mue-task is-${t.priority}`}>
                        <span className="mue-task-priority" title={`Priorité ${t.priority}`} />
                        <span className="mue-task-title">{t.title}</span>
                        {t.due && <span className="mue-task-due">{t.due}</span>}
                      </li>
                    ))}
                  </ul>
                )}

                {result.kind === "translation" && (
                  <div className="mue-result-translation">
                    {result.data.map((m, i) => (
                      <div key={i} className="mue-translated-msg">
                        <div className="mue-translated-meta">
                          <strong>{m.sender}</strong>
                          <span>{new Date(m.date).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                        <p>{m.translated}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="footnote">
              <Icon name="i-info" size={13} />
              <span>Mue analyse la conversation active à chaque action.</span>
            </div>
          </div>
        </div>
    </aside>
  );
}
