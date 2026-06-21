"use client";

import { EventEditModal } from "@/components/calendar/EventEditModal";
import { ChannelLogo, Icon } from "@/components/icons/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { CalEvent } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

// Format 24 h, cohérent avec le reste de l'UI française (8 h → 18 h).
const HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

// Semaine lundi→dimanche (convention FR/Europe). On stocke le jour des
// évènements en getDay() JS (0=Dim..6=Sam) ; cet ordre mappe colonne→jour.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const ABBRS_MON = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Lundi de la semaine affichée (décalée de `offset` semaines).
function mondayOf(offset: number) {
  const now = new Date();
  const back = (now.getDay() + 6) % 7; // jours depuis lundi
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back + offset * 7);
}

function buildWeekLabels(offset: number) {
  const now = new Date();
  const monday = mondayOf(offset);
  return ABBRS_MON.map((abbr, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      abbr,
      num: d.getDate(),
      weekday: d.getDay(),
      isToday:
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate(),
    };
  });
}

function weekRangeLabel(offset: number) {
  const mon = mondayOf(offset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
  return `${fmt(mon)} – ${fmt(sun)}, ${sun.getFullYear()}`;
}

// weekday (0=Dim..6=Sam) → index de colonne (0=Lun..6=Dim).
const colOfWeekday = (wd: number) => WEEKDAY_ORDER.indexOf(wd as (typeof WEEKDAY_ORDER)[number]);

// Légende des couleurs (donne enfin un sens aux couleurs).
const LEGEND: { color: string; label: string }[] = [
  { color: "blue", label: "RDV client" },
  { color: "lav", label: "Focus" },
  { color: "green", label: "Échéance" },
];

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
// Renvoie le jour (getDay() 0=Dim..6=Sam) sous le pointeur, en tenant compte
// de l'ordre lundi-d'abord et du nombre de colonnes (7 en semaine, 1 en jour).
function xToDay(x: number, gridWidth: number, cols: number, timeColWidth = 60): number {
  if (cols === 1) return WEEKDAY_ORDER[0]; // remplacé par selectedDay côté appelant
  const usable = gridWidth - timeColWidth;
  const xInBody = Math.max(0, x - timeColWidth);
  const colIndex = Math.max(0, Math.min(6, Math.floor(xInBody / (usable / 7))));
  return WEEKDAY_ORDER[colIndex] as number;
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

  // Navigation : semaine affichée + vue (semaine / jour).
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDay());

  const dayLabels = useMemo(() => buildWeekLabels(weekOffset), [weekOffset]);
  const weekRange = useMemo(() => weekRangeLabel(weekOffset), [weekOffset]);
  // En vue jour, on n'affiche que la colonne du jour choisi.
  const visibleDayLabels =
    view === "day" ? dayLabels.filter((d) => d.weekday === selectedDay) : dayLabels;
  // Les évènements mock n'ont pas de date → on ne les montre que sur la
  // semaine courante (offset 0), sinon ils se répéteraient chaque semaine.
  const showEvents = weekOffset === 0;
  const dayAt = (x: number, width: number) => (view === "day" ? selectedDay : xToDay(x, width, 7));

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
    const day = dayAt(x, rect.width);

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
      const day = dayAt(x, rect.width);
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
          <button
            className="cal-btn"
            type="button"
            onClick={() => {
              setWeekOffset(0);
              setSelectedDay(new Date().getDay());
            }}
          >
            Aujourd&apos;hui
          </button>
          <div className="cal-nav">
            <button
              className="cal-nav__btn"
              type="button"
              aria-label="Semaine précédente"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              ‹
            </button>
            <button
              className="cal-nav__btn"
              type="button"
              aria-label="Semaine suivante"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              ›
            </button>
          </div>
          <span className="cal-range">{weekRange}</span>
        </div>

        <div className="cal-controls">
          <ul className="cal-legend" aria-label="Légende des couleurs">
            {LEGEND.map((l) => (
              <li key={l.color} className="cal-legend__item">
                <span className={`cal-legend__dot ${l.color}`} aria-hidden />
                {l.label}
              </li>
            ))}
          </ul>
          <div className="cal-viewtoggle" role="tablist" aria-label="Vue">
            {(["week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={`cal-viewtoggle__btn ${view === v ? "is-active" : ""}`}
                onClick={() => setView(v)}
              >
                {v === "week" ? "Semaine" : "Jour"}
              </button>
            ))}
          </div>
          <button
            className="btn-new-task"
            type="button"
            onClick={() =>
              setEditingEvent({
                id: "__new__",
                title: "",
                day: (view === "day" ? selectedDay : new Date().getDay()) as CalEvent["day"],
                startMinutes: 60,
                durationMinutes: 60,
                color: "blue",
              })
            }
          >
            <Icon name="i-plus" />
            Nouvel évènement
          </button>
        </div>
      </header>

      <div className={`cal-days ${view === "day" ? "is-day" : ""}`}>
        <div className="cal-tz">GMT+2</div>
        {visibleDayLabels.map((d) => (
          <button
            key={`${d.abbr}-${d.num}`}
            type="button"
            className={`cal-day ${d.isToday ? "is-today" : ""}`}
            onClick={() => {
              setSelectedDay(d.weekday);
              setView("day");
            }}
            title="Voir cette journée"
          >
            {d.abbr} <span className="daynum">{d.num}</span>
          </button>
        ))}
      </div>

      <div className="cal-body">
        <div
          ref={gridRef}
          className={`cal-grid ${view === "day" ? "is-day" : ""} ${drag.kind === "creating" ? "is-creating" : ""} ${drag.kind === "moving" ? "is-moving" : ""}`}
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

          {showEvents && events.length === 0 && drag.kind === "idle" && (
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

          {showEvents &&
            visibleEvents
              .filter((ev) => view !== "day" || ev.day === selectedDay)
              .map((ev) => {
                const rowStart = ev.startMinutes / 30 + 1;
                const rowSpan = ev.durationMinutes / 30;
                const isBeingDragged = drag.kind === "moving" && drag.eventId === ev.id;
                return (
                  <div
                    key={ev.id}
                    className={`cal-event ${ev.color} ${isBeingDragged ? "is-dragging" : ""}`}
                    style={{
                      gridColumn: (view === "day" ? 0 : colOfWeekday(ev.day)) + 2,
                      gridRow: `${rowStart} / span ${rowSpan}`,
                    }}
                    onPointerDown={(e) => onEventPointerDown(e, ev)}
                    onPointerMove={onEventPointerMove}
                    onPointerUp={(e) => onEventPointerUp(e, ev)}
                    onPointerCancel={onGridPointerCancel}
                  >
                    <strong>{ev.title || "Sans titre"}</strong>
                    <span className="ev-time">
                      {formatTime(ev.startMinutes, ev.durationMinutes)}
                    </span>
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
              className="cal-event cal-event-ghost blue"
              style={{
                gridColumn: (view === "day" ? 0 : colOfWeekday(ghost.day)) + 2,
                gridRow: `${ghost.rowStart} / span ${ghost.rowSpan}`,
              }}
            >
              <strong>Nouvel évènement</strong>
              <span className="ev-time">{ghost.label}</span>
            </div>
          )}
        </div>

        {showEvents && (view === "week" || selectedDay === now.getDay()) && (
          <div className="cal-now" data-time={nowTime} style={{ top: `${nowTop}px` }} />
        )}
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
