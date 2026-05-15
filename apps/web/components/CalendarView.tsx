"use client";

import { useState } from "react";
import { EVENTS, DAY_LABELS, HOURS } from "@/lib/data/events";
import { Icon, ChannelLogo } from "@/components/icons/Icon";

const ROW_HEIGHT = 32; // px per 30-min slot

export function CalendarView() {
  const [weekRange] = useState("May 18 – 24, 2026");
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  // Now line — assume 10:21 AM = 60+30+30/2 = 141 minutes from 8AM
  // Each 30 min = 32px, so 141 min = 141/30 * 32 ≈ 150 px from top
  const nowMinutes = 141;
  const nowTop = (nowMinutes / 30) * ROW_HEIGHT + 4; // small offset

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
        {DAY_LABELS.map((d) => (
          <div key={d.num} className={`cal-day ${d.isToday ? "is-today" : ""}`}>
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

          {EVENTS.map((ev) => {
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

        <div className="cal-now" data-time="10:21 AM" style={{ top: `${nowTop}px` }} />
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
