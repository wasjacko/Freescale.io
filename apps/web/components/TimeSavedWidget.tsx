"use client";

// Freescale V2 · Phase 4 — Bilan de la semaine (topbar).
// PAS d'« heures gagnées » (interprété → bullshit). Que des FAITS comptables :
// ce que Mue a fait + ce qui demande encore ton attention.

import { MOCK_WEEK_RECAP } from "@/lib/mock-v2";
import { useState } from "react";

export function TimeSavedWidget() {
  const [open, setOpen] = useState(false);
  const r = MOCK_WEEK_RECAP;

  return (
    <div className="tsaved">
      <button
        type="button"
        className={`tsaved-btn ${open ? "is-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Bilan de la semaine"
        title="Bilan de la semaine"
      >
        <span className="tsaved-spark" aria-hidden>
          ✦
        </span>
        <span className="tsaved-word">Cette semaine</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="tsaved-backdrop"
            tabIndex={-1}
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="tsaved-pop" role="dialog" aria-label="Bilan de la semaine">
            <div className="tsaved-pop-section">Cette semaine, Mue a</div>
            <ul className="tsaved-pop-list">
              {r.activity.map((a) => (
                <li key={a.label}>
                  <span>{a.label}</span>
                  <b>{a.value}</b>
                </li>
              ))}
            </ul>
            <div className="tsaved-pop-section">À suivre</div>
            <ul className="tsaved-pop-list">
              {r.followUp.map((f) => (
                <li key={f.label}>
                  <span>{f.label}</span>
                  <b className="tsaved-followval">{f.value}</b>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
