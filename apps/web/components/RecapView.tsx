"use client";

// Freescale V2 — Page « Cette semaine » (bilan).
// Sortie de la topbar → page dédiée. PAS d'« heures gagnées » (interprété) :
// uniquement des FAITS comptables + ce qui demande encore ton attention.

import { MOCK_WEEK_RECAP } from "@/lib/mock-v2";

export function RecapView() {
  const r = MOCK_WEEK_RECAP;

  return (
    <section className="recap-view" aria-label="Bilan de la semaine">
      <header className="recap-head">
        <p className="recap-sub">
          Ce que Mue a fait pour toi, et ce qui demande encore ton attention.
        </p>
      </header>

      <div className="recap-section">
        <h2 className="recap-section-title">
          <span className="recap-spark" aria-hidden>
            ✦
          </span>
          Cette semaine, Mue a
        </h2>
        <div className="recap-kpis">
          {r.activity.map((a) => (
            <div key={a.label} className="recap-kpi">
              <span className="recap-kpi-val">{a.value}</span>
              <span className="recap-kpi-label">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="recap-section">
        <h2 className="recap-section-title">À suivre</h2>
        <div className="recap-follow">
          {r.followUp.map((f) => (
            <div key={f.label} className="recap-follow-card">
              <span className="recap-follow-val">{f.value}</span>
              <span className="recap-follow-label">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
