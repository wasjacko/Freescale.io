"use client";

import { useEffect, useRef, useState } from "react";
import type { CalEvent } from "@/lib/types";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;
const COLORS: CalEvent["color"][] = ["lav", "pink", "green", "blue", "orange", "peach", "cream"];

function minutesToHHMM(m: number): string {
  const total = 8 * 60 + m;
  const h = Math.floor(total / 60);
  const min = total % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map((p) => parseInt(p, 10));
  if (Number.isNaN(h ?? NaN) || Number.isNaN(m ?? NaN)) return 0;
  return Math.max(0, (h! - 8) * 60 + m!);
}

type Patch = Partial<Pick<CalEvent, "title" | "day" | "startMinutes" | "durationMinutes" | "color">>;

export function EventEditModal({
  event,
  onClose,
  onSave,
  onDelete,
}: {
  event: CalEvent;
  onClose: () => void;
  onSave: (patch: Patch) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const isNew = event.id === "__new__";
  const [title, setTitle] = useState(event.title);
  const [day, setDay] = useState<number>(event.day);
  const [startHHMM, setStartHHMM] = useState(minutesToHHMM(event.startMinutes));
  const [endHHMM, setEndHHMM] = useState(
    minutesToHHMM(event.startMinutes + event.durationMinutes)
  );
  const [color, setColor] = useState<CalEvent["color"]>(event.color);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim() && isNew) {
      // For a fresh event the user may want to skip giving it a title
      // right now — default to "Nouvel évènement".
      setTitle("Nouvel évènement");
    }
    setSaving(true);
    const startMin = hhmmToMinutes(startHHMM);
    const endMin = hhmmToMinutes(endHHMM);
    const durationMinutes = Math.max(30, endMin - startMin);
    await onSave({
      title: title.trim() || "Nouvel évènement",
      day: day as CalEvent["day"],
      startMinutes: startMin,
      durationMinutes,
      color,
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setSaving(true);
    await onDelete();
    setSaving(false);
  };

  return (
    <div
      className="event-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? "Nouvel évènement" : "Modifier l'évènement"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="event-modal">
        <header className="event-modal-head">
          <h2>{isNew ? "Nouvel évènement" : "Modifier l'évènement"}</h2>
          <button type="button" className="event-modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <div className="event-modal-body">
          <label className="event-field">
            <span className="event-field-label">Titre</span>
            <input
              ref={inputRef}
              type="text"
              className="event-field-input"
              placeholder="Réunion, démo, créneau focus…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </label>

          <label className="event-field">
            <span className="event-field-label">Jour</span>
            <select
              className="event-field-input"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </label>

          <div className="event-field-row">
            <label className="event-field">
              <span className="event-field-label">Début</span>
              <input
                type="time"
                className="event-field-input"
                value={startHHMM}
                onChange={(e) => setStartHHMM(e.target.value)}
                step="900"
                min="08:00"
                max="19:00"
              />
            </label>
            <label className="event-field">
              <span className="event-field-label">Fin</span>
              <input
                type="time"
                className="event-field-input"
                value={endHHMM}
                onChange={(e) => setEndHHMM(e.target.value)}
                step="900"
                min="08:00"
                max="19:00"
              />
            </label>
          </div>

          <div className="event-field">
            <span className="event-field-label">Couleur</span>
            <div className="event-color-row" role="radiogroup" aria-label="Couleur">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  className={`event-color-swatch ${c} ${color === c ? "is-active" : ""}`}
                  onClick={() => setColor(c)}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <footer className="event-modal-foot">
          {!isNew ? (
            <button
              type="button"
              className={`event-modal-delete ${confirmDelete ? "is-confirm" : ""}`}
              onClick={handleDelete}
              disabled={saving}
            >
              {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
            </button>
          ) : (
            <span />
          )}
          <div className="event-modal-foot-right">
            <button type="button" className="event-modal-cancel" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button
              type="button"
              className="event-modal-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Enregistrement…" : isNew ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
