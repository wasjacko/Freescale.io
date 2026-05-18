"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { EmptyState } from "@/components/ui/EmptyState";

const HOURS = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM"];

function buildWeekLabels() {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const abbrs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return abbrs.map((abbr, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return {
      abbr,
      num: d.getDate(),
      isToday:
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate(),
    };
  });
}

function weekRangeLabel() {
  const now = new Date();
  const sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${fmt(sun)} – ${fmt(sat)}, ${sat.getFullYear()}`;
}

const ROW_HEIGHT = 32; // px per 30-min slot

export function CalendarView() {
  const { events } = useData();
  const push = useToast((s) => s.push);
  const dayLabels = useMemo(buildWeekLabels, []);
  const weekRange = useMemo(weekRangeLabel, []);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const now = new Date();
  const nowMinutes = Math.max(0, now.getHours() * 60 + now.getMinutes() - 8 * 60);
  const nowTime = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const nowTop = (nowMinutes / 30) * ROW_HEIGHT + 4;

  return (
    <section className="calendar-view" aria-label="Calendar">
      <header className="cal-head">
        <h1>Calendar</h1>
        <div className="cal-controls">
          <button className="cal-btn" type="button">Today</button>
          <button className="cal-btn icon-only" type="button" aria-label="Previous">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className="cal-btn icon-only" type="button" aria-label="Next">
            <Icon name="i-chevron" />
          </button>
          <button className="cal-range" type="button">
            {weekRange}
            <Icon name="i-chevron-down" />
          </button>
          <div className="cal-toggle">
            <button
              className={viewMode === "week" ? "active" : ""}
              type="button"
              onClick={() => setViewMode("week")}
            >
              Week
            </button>
            <button
              className={viewMode === "month" ? "active" : ""}
              type="button"
              onClick={() => setViewMode("month")}
            >
              Month
            </button>
          </div>
          <button className="btn-new-task" type="button">
            <Icon name="i-plus" />
            New event
          </button>
        </div>
      </header>

      <div className="cal-days">
        <div className="cal-tz">GMT+2</div>
        {dayLabels.map((d) => (
          <div key={`${d.abbr}-${d.num}`} className={`cal-day ${d.isToday ? "is-today" : ""}`}>
            {d.abbr} <span className="daynum">{d.num}</span>
          </div>
        ))}
      </div>

      <div className="cal-body">
        <div className="cal-grid">
          {HOURS.map((h, i) => (
            <div key={h} className="cal-time" style={{ gridRow: i * 2 + 1 }}>
              {h}
            </div>
          ))}

          {events.length === 0 && (
            <div
              className="cal-empty-overlay"
              style={{ gridColumn: "2 / -1", gridRow: "1 / -1" }}
            >
              <EmptyState
                icon="i-calendar"
                title="Aucun évènement cette semaine"
                description="Connecte Google Calendar pour voir tes rendez-vous ici, ou crée-en un manuellement."
                cta={{
                  label: "Bientôt — Connecter Calendar",
                  onClick: () =>
                    push({
                      text: "L'intégration Google Calendar arrive bientôt.",
                      duration: 2600,
                    }),
                }}
              />
            </div>
          )}
          {events.map((ev) => {
            // startMinutes in [0, 660] (8AM-7PM range)
            const rowStart = ev.startMinutes / 30 + 1;
            const rowSpan = ev.durationMinutes / 30;
            return (
              <div
                key={ev.id}
                className={`cal-event ${ev.color}`}
                style={{
                  gridColumn: ev.day + 2, // +1 for time column, +1 for 1-based
                  gridRow: `${rowStart} / span ${rowSpan}`,
                }}
              >
                <strong>{ev.title}</strong>
                <span className="ev-time">{formatTime(ev.startMinutes, ev.durationMinutes)}</span>
                {ev.channel && (
                  <span className="ev-logo">
                    <ChannelLogo channel={ev.channel} className="" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="cal-now" data-time={nowTime} style={{ top: `${nowTop}px` }} />
      </div>
    </section>
  );
}

function formatTime(startMinutes: number, durationMinutes: number) {
  const start = minutesFrom8AM(startMinutes);
  const end = minutesFrom8AM(startMinutes + durationMinutes);
  return `${start} – ${end}`;
}

function minutesFrom8AM(m: number): string {
  const totalMin = 8 * 60 + m;
  const h24 = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  return `${h12}:${min.toString().padStart(2, "0")} ${ampm}`;
}
