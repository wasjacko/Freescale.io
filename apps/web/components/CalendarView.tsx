"use client";

import { EventEditModal } from "@/components/calendar/EventEditModal";
import { ChannelLogo, Icon } from "@/components/icons/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { CalEvent } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

const HOURS = [
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
];

function buildWeekLabels() {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const abbrs = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
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
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
  return `${fmt(sun)} – ${fmt(sat)}, ${sat.getFullYear()}`;
}

const ROW_HEIGHT = 32; // px per 30-min slot
const GRID_ROWS = 22; // 11 hours × 2 (8 AM → 7 PM)

/**
 * Snap a Y-pixel offset (within the grid body) to a startMinutes value
 * (in 30-minute increments, capped to grid range).
 */
function pxToStartMinutes(y: number): number {
  const slot = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / ROW_HEIGHT)));
  return slot * 30;
}

/**
 * Given an event-card click target (or empty slot), which day column is
 * the pointer in? Computed from horizontal offset relative to the grid
 * minus the time-label gutter (first column ~64px wide).
 */
function xToDay(x: number, gridWidth: number, timeColWidth = 64): number {
  const usable = gridWidth - timeColWidth;
  const xInBody = Math.max(0, x - timeColWidth);
  const dayWidth = usable / 7;
  return Math.max(0, Math.min(6, Math.floor(xInBody / dayWidth)));
}

type DragState =
  | { kind: "idle" }
  // Creating a new event by dragging on empty space.
  | {
      kind: "creating";
      day: number;
      startY: number;
      currentY: number;
    }
  // Moving an existing event by dragging its body.
  | {
      kind: "moving";
      eventId: string;
      anchorOffsetY: number; // grab point inside the event (px from top)
      currentDay: number;
      currentStartMinutes: number;
      durationMinutes: number;
    };

export function CalendarView() {
  const { events, createEvent, updateEvent, deleteEvent } = useData();
  const push = useToast((s) => s.push);
  const dayLabels = useMemo(buildWeekLabels, []);
  const weekRange = useMemo(weekRangeLabel, []);

  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);

  const now = new Date();
  const nowMinutes = Math.max(0, now.getHours() * 60 + now.getMinutes() - 8 * 60);
  const nowTime = now.toLocaleTimeString("fr-FR", { hour: "numeric", minute: "2-digit" });
  const nowTop = (nowMinutes / 30) * ROW_HEIGHT + 4;

  // ─── Pointer handling ──────────────────────────────────────────────
  // The grid is positioned with CSS grid (time column + 7 day columns).
  // We read the bounding rect on each event to compute (day, y) → drag
  // create vs move vs click.

  const onGridPointerDown = (e: React.PointerEvent) => {
    // Ignore clicks that originate inside an event card — those are
    // handled by the event's own onPointerDown.
    if ((e.target as HTMLElement).closest(".cal-event")) return;
    // Only react to left button / first touch.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const day = xToDay(x, rect.width);

    // Reject drags that started in the day-label row (above the grid).
    if (y < 0) return;

    setDrag({
      kind: "creating",
      day,
      startY: y,
      currentY: y,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onGridPointerMove = (e: React.PointerEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;

    if (drag.kind === "creating") {
      setDrag({ ...drag, currentY: Math.max(0, Math.min(GRID_ROWS * ROW_HEIGHT, y)) });
    } else if (drag.kind === "moving") {
      const day = xToDay(x, rect.width);
      const startMinutes = pxToStartMinutes(y - drag.anchorOffsetY);
      setDrag({
        ...drag,
        currentDay: day,
        currentStartMinutes: startMinutes,
      });
    }
  };

  const onGridPointerUp = async (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

    if (drag.kind === "creating") {
      const yA = Math.min(drag.startY, drag.currentY);
      const yB = Math.max(drag.startY, drag.currentY);
      const startMinutes = pxToStartMinutes(yA);
      const endMinutes = pxToStartMinutes(yB);
      // Minimum 30 minutes — if the user just clicked without dragging,
      // create a default 1-hour block.
      const durationMinutes = endMinutes - startMinutes < 30 ? 60 : endMinutes - startMinutes;
      setDrag({ kind: "idle" });

      // Default title "Nouvel évènement" — the edit modal pops open
      // immediately so the user can rename inline.
      const title = "Nouvel évènement";
      const res = await createEvent({
        title,
        day: drag.day,
        startMinutes,
        durationMinutes,
      });
      if (!res.ok) {
        push({ kind: "error", text: res.error ?? "Création impossible." });
      } else {
        push({ kind: "info", text: "Évènement créé. Clique pour modifier.", duration: 2000 });
      }
    } else if (drag.kind === "moving") {
      const { eventId, currentDay, currentStartMinutes } = drag;
      setDrag({ kind: "idle" });
      const res = await updateEvent({
        id: eventId,
        day: currentDay,
        startMinutes: currentStartMinutes,
      });
      if (!res.ok) push({ kind: "error", text: res.error ?? "Déplacement impossible." });
    }
  };

  const onGridPointerCancel = () => setDrag({ kind: "idle" });

  // Event-card pointer handlers — split between "click" (open edit
  // modal) and "drag" (move). We detect intent by the distance moved
  // before pointerup.
  const eventGrabRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const onEventPointerDown = (e: React.PointerEvent, ev: CalEvent) => {
    e.stopPropagation();
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    eventGrabRef.current = {
      id: ev.id,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    const eventTopPx = (ev.startMinutes / 30) * ROW_HEIGHT;
    setDrag({
      kind: "moving",
      eventId: ev.id,
      anchorOffsetY: y - eventTopPx,
      currentDay: ev.day,
      currentStartMinutes: ev.startMinutes,
      durationMinutes: ev.durationMinutes,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onEventPointerMove = (e: React.PointerEvent) => {
    if (!eventGrabRef.current) return;
    const dx = Math.abs(e.clientX - eventGrabRef.current.startX);
    const dy = Math.abs(e.clientY - eventGrabRef.current.startY);
    if (dx > 4 || dy > 4) eventGrabRef.current.moved = true;
    onGridPointerMove(e);
  };

  const onEventPointerUp = async (e: React.PointerEvent, ev: CalEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    const grab = eventGrabRef.current;
    eventGrabRef.current = null;

    // Pure click (no drag movement) → open the edit modal.
    if (grab && !grab.moved) {
      setDrag({ kind: "idle" });
      setEditingEvent(ev);
      return;
    }

    // Otherwise it's a move — commit the new position.
    if (drag.kind === "moving" && drag.eventId === ev.id) {
      const { currentDay, currentStartMinutes } = drag;
      setDrag({ kind: "idle" });
      if (currentDay !== ev.day || currentStartMinutes !== ev.startMinutes) {
        const res = await updateEvent({
          id: ev.id,
          day: currentDay,
          startMinutes: currentStartMinutes,
        });
        if (!res.ok) push({ kind: "error", text: res.error ?? "Déplacement impossible." });
      }
    }
  };

  // While moving, the dragged event renders at its DRAG position, not
  // its stored position. We compute the visible event list by replacing
  // the moving event's coords in-flight.
  const visibleEvents = useMemo(() => {
    if (drag.kind !== "moving") return events;
    return events.map((e) =>
      e.id === drag.eventId
        ? { ...e, day: drag.currentDay as CalEvent["day"], startMinutes: drag.currentStartMinutes }
        : e
    );
  }, [events, drag]);

  // Ghost rectangle while drag-creating.
  const ghost = useMemo(() => {
    if (drag.kind !== "creating") return null;
    const yA = Math.min(drag.startY, drag.currentY);
    const yB = Math.max(drag.startY, drag.currentY);
    const startMinutes = pxToStartMinutes(yA);
    const endMinutes = pxToStartMinutes(yB);
    const rowStart = startMinutes / 30 + 1;
    const rowSpan = Math.max(1, (endMinutes - startMinutes) / 30 || 2);
    return {
      day: drag.day,
      rowStart,
      rowSpan,
      label: formatTime(startMinutes, Math.max(30, endMinutes - startMinutes)),
    };
  }, [drag]);

  // Escape key cancels in-flight drag
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drag.kind !== "idle") {
        setDrag({ kind: "idle" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drag.kind]);

  return (
    <section className="calendar-view" aria-label="Calendar">
      <header className="cal-head">
        <div className="cal-controls">
          <button className="cal-btn" type="button">
            Aujourd&apos;hui
          </button>
          <button className="cal-range" type="button">
            {weekRange}
          </button>
          <button
            className="btn-new-task"
            type="button"
            onClick={() =>
              setEditingEvent({
                id: "__new__",
                title: "",
                day: new Date().getDay() as CalEvent["day"],
                startMinutes: 60,
                durationMinutes: 60,
                color: "lav",
              })
            }
          >
            <Icon name="i-plus" />
            Nouvel évènement
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
        <div
          ref={gridRef}
          className={`cal-grid ${drag.kind === "creating" ? "is-creating" : ""} ${drag.kind === "moving" ? "is-moving" : ""}`}
          onPointerDown={onGridPointerDown}
          onPointerMove={onGridPointerMove}
          onPointerUp={onGridPointerUp}
          onPointerCancel={onGridPointerCancel}
          style={{ touchAction: "none" }}
        >
          {HOURS.map((h, i) => (
            <div key={h} className="cal-time" style={{ gridRow: i * 2 + 1 }}>
              {h}
            </div>
          ))}

          {events.length === 0 && drag.kind === "idle" && (
            <div
              style={{
                gridColumn: "2 / -1",
                gridRow: "3 / 10",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
              }}
            >
              <EmptyState
                icon="i-cal"
                title="Calendrier vide"
                description="Cliquez ou glissez sur un créneau pour créer un évènement, ou déplacez un évènement existant."
                cta={{
                  label: "Nouvel évènement",
                  onClick: () =>
                    setEditingEvent({
                      id: "__new__",
                      title: "",
                      day: new Date().getDay() as CalEvent["day"],
                      startMinutes: 60,
                      durationMinutes: 60,
                      color: "lav",
                    }),
                }}
              />
            </div>
          )}

          {visibleEvents.map((ev) => {
            const rowStart = ev.startMinutes / 30 + 1;
            const rowSpan = ev.durationMinutes / 30;
            const isBeingDragged = drag.kind === "moving" && drag.eventId === ev.id;
            return (
              <div
                key={ev.id}
                className={`cal-event ${ev.color} ${isBeingDragged ? "is-dragging" : ""}`}
                style={{
                  gridColumn: ev.day + 2,
                  gridRow: `${rowStart} / span ${rowSpan}`,
                }}
                onPointerDown={(e) => onEventPointerDown(e, ev)}
                onPointerMove={onEventPointerMove}
                onPointerUp={(e) => onEventPointerUp(e, ev)}
                onPointerCancel={onGridPointerCancel}
              >
                <strong>{ev.title || "Sans titre"}</strong>
                <span className="ev-time">{formatTime(ev.startMinutes, ev.durationMinutes)}</span>
                {ev.channel && (
                  <span className="ev-logo">
                    <ChannelLogo channel={ev.channel} className="" />
                  </span>
                )}
              </div>
            );
          })}

          {/* Ghost while drag-creating */}
          {ghost && (
            <div
              className="cal-event cal-event-ghost lav"
              style={{
                gridColumn: ghost.day + 2,
                gridRow: `${ghost.rowStart} / span ${ghost.rowSpan}`,
              }}
            >
              <strong>Nouvel évènement</strong>
              <span className="ev-time">{ghost.label}</span>
            </div>
          )}
        </div>

        <div className="cal-now" data-time={nowTime} style={{ top: `${nowTop}px` }} />
      </div>

      {editingEvent && (
        <EventEditModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={async (patch) => {
            if (editingEvent.id === "__new__") {
              await createEvent({
                title: patch.title ?? editingEvent.title,
                day: patch.day ?? editingEvent.day,
                startMinutes: patch.startMinutes ?? editingEvent.startMinutes,
                durationMinutes: patch.durationMinutes ?? editingEvent.durationMinutes,
                color: patch.color ?? editingEvent.color,
              });
              push({ kind: "info", text: "Évènement créé." });
            } else {
              const res = await updateEvent({
                id: editingEvent.id,
                ...patch,
              });
              if (!res.ok) push({ kind: "error", text: res.error ?? "Échec." });
              else push({ kind: "info", text: "Évènement mis à jour." });
            }
            setEditingEvent(null);
          }}
          onDelete={async () => {
            if (editingEvent.id === "__new__") {
              setEditingEvent(null);
              return;
            }
            const res = await deleteEvent(editingEvent.id);
            if (!res.ok) push({ kind: "error", text: res.error ?? "Suppression impossible." });
            else push({ kind: "info", text: "Évènement supprimé." });
            setEditingEvent(null);
          }}
        />
      )}
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
  return `${h24}:${min.toString().padStart(2, "0")}`;
}
