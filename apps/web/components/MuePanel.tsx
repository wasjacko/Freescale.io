"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { CurrentUser } from "@/lib/auth";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MueAvatar } from "@/components/MueAvatar";
import { dailyBriefing, type DailyBriefing } from "@/lib/actions/mue";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Bonsoir";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

/**
 * MuePanel — the "morning briefing" copilot panel on the right side.
 *
 * Inspired by Kinso's daily-brief pattern (greeting + counts + briefing
 * CTA + ask bar). The three thread-level actions (Résumer / Tâches /
 * Traduire) moved out of here into Thread.tsx, where they live inline
 * with the conversation the user is reading — much closer to where
 * the action context actually is.
 *
 * This panel now plays the "concierge" role: a warm greeting at top,
 * a quick read on what's in the inbox today, and one big "Brief du
 * jour" button that asks Claude to summarise the day so the user can
 * triage at a glance. An "Ask Mue" input sits at the bottom as a
 * placeholder for the upcoming chat-with-Mue mode.
 */
export function MuePanel({ user }: { user?: CurrentUser | null }) {
  const { view } = useApp();
  const { conversations, tasks } = useData();
  const push = useToast((s) => s.push);
  const userName = user?.firstName ?? "vous";

  // Real, currently-loaded inbox numbers so the greeting never lies.
  const newCount = conversations.filter((c) => c.unread).length;
  const activeCount = conversations.length - newCount;
  const openTasksCount = tasks.filter((t) => t.status !== "done").length;

  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [askInput, setAskInput] = useState("");

  const handleBriefing = async () => {
    if (briefingLoading) return;
    setBriefingLoading(true);
    setBriefingError(null);
    setBriefing(null);
    try {
      const res = await dailyBriefing();
      if (res.error || !res.briefing) {
        setBriefingError(res.error ?? "Brief indisponible");
      } else {
        setBriefing(res.briefing);
      }
    } catch (err) {
      setBriefingError(err instanceof Error ? err.message : String(err));
    } finally {
      setBriefingLoading(false);
    }
  };

  return (
    <aside className="copilot" aria-label="Mue AI copilot">
      <header className="copilot-head">
        <div className="ai-brand">
          <span className="ai-name">Mue</span>
          <span className="ai-pill">AI Copilot</span>
        </div>
      </header>

      <div className="copilot-inner">
        <section className="mue-greet" aria-label="Daily greeting">
          <div className="mue-greet-avatar">
            <MueAvatar />
          </div>
          <h2 className="mue-greet-title">
            {greeting()}, <span className="mue-greet-name">{userName}.</span>
          </h2>
          <p className="mue-greet-sub">
            Vous avez{" "}
            <strong>{newCount}</strong>{" "}
            nouveau{newCount > 1 ? "x" : ""} message{newCount > 1 ? "s" : ""}{" "}
            et <strong>{activeCount}</strong> conversation{activeCount > 1 ? "s" : ""} active{activeCount > 1 ? "s" : ""}.
          </p>
          <button
            type="button"
            className="mue-brief-btn"
            onClick={handleBriefing}
            disabled={briefingLoading}
          >
            <Icon name="i-spark" />
            {briefingLoading ? "Brief en cours…" : "Brief du jour"}
            {!briefingLoading && (
              <svg className="mue-brief-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 12l4-4-4-4" />
              </svg>
            )}
          </button>
        </section>

        {briefing && (
          <section className="mue-brief-card" aria-live="polite">
            <header className="mue-brief-card-head">
              <span className="mue-brief-card-label">Brief du jour</span>
              <button
                type="button"
                className="mue-brief-card-close"
                onClick={() => setBriefing(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </header>
            <p className="mue-brief-headline">{briefing.headline}</p>
            {briefing.highlights.length > 0 && (
              <ul className="mue-brief-list">
                {briefing.highlights.map((h, i) => (
                  <li key={i} className="mue-brief-item">
                    <div className="mue-brief-who">{h.who}</div>
                    <div className="mue-brief-why">{h.why}</div>
                    <div className="mue-brief-action">→ {h.action}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {briefingError && (
          <section className="mue-brief-card is-error" aria-live="polite">
            <p>{briefingError}</p>
            <button
              type="button"
              className="mue-brief-card-close"
              onClick={() => setBriefingError(null)}
              aria-label="Fermer"
            >✕</button>
          </section>
        )}

        {view === "tasks" && (
          <section className="mue-quick" aria-label="Open tasks">
            <div className="section-label">Tâches ouvertes</div>
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
            {openTasksCount > 3 && (
              <button className="view-full" type="button">
                Voir toutes les tâches
                <Icon name="i-chevron" />
              </button>
            )}
          </section>
        )}

        <form
          className="mue-ask"
          onSubmit={(e) => {
            e.preventDefault();
            if (!askInput.trim()) return;
            push({ text: "L'ask de Mue arrive bientôt — pour l'instant utilisez le Brief.", duration: 3000 });
            setAskInput("");
          }}
        >
          <Icon name="i-spark" />
          <input
            type="text"
            placeholder="Demandez à Mue..."
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            aria-label="Demander à Mue"
          />
          {askInput && (
            <button type="submit" className="mue-ask-send" aria-label="Envoyer">
              →
            </button>
          )}
        </form>

        <div className="footnote">
          <Icon name="i-info" size={13} />
          <span>Brief et actions Mue activés sur cette inbox.</span>
        </div>
      </div>
    </aside>
  );
}
