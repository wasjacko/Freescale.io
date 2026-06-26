"use client";

// Surface document (mock) — ouvre un devis généré par Mue dans une modale
// par-dessus le canvas. Structure complète façon vrai devis (en-tête, client,
// prestataire, prestations, total, conditions). Le panneau Mue reste à droite.
// Rendu via PORTAL sur document.body : sinon le position:fixed serait scopé au
// panneau .copilot (qui a un transform) → fiche mal positionnée + bande grise.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type DevisDoc = {
  id: string;
  ref: string;
  dateLabel: string;
  validity: string;
  client: { name: string; company: string; email: string; phone: string; address: string };
  provider: { name: string; role: string; email: string };
  lines: { label: string; amount: number }[];
  subtotal: number;
  vat: number;
  total: number;
  terms: string;
};

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

export function MueDocModal({ doc, onClose }: { doc: DevisDoc; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div
      className="muedoc-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Devis ${doc.client.name}`}
    >
      <button type="button" className="muedoc-scrim" aria-label="Fermer" onClick={onClose} />
      <div className="muedoc-sheet">
        <header className="muedoc-head">
          <div>
            <h2>
              Devis {doc.ref} — {doc.client.name}
            </h2>
            <span className="muedoc-sub">
              {doc.dateLabel} · Validité {doc.validity}
            </span>
          </div>
          <button type="button" className="muedoc-close" aria-label="Fermer" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="muedoc-body">
          <div className="muedoc-cols">
            <section className="muedoc-block">
              <h3>Client</h3>
              <dl>
                <div>
                  <dt>Nom</dt>
                  <dd>{doc.client.name}</dd>
                </div>
                <div>
                  <dt>Société</dt>
                  <dd>{doc.client.company}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{doc.client.email}</dd>
                </div>
                <div>
                  <dt>Téléphone</dt>
                  <dd>{doc.client.phone}</dd>
                </div>
                <div>
                  <dt>Adresse</dt>
                  <dd>{doc.client.address}</dd>
                </div>
              </dl>
            </section>
            <section className="muedoc-block">
              <h3>Prestataire</h3>
              <dl>
                <div>
                  <dt>Nom</dt>
                  <dd>{doc.provider.name}</dd>
                </div>
                <div>
                  <dt>Activité</dt>
                  <dd>{doc.provider.role}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{doc.provider.email}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="muedoc-block">
            <h3>Prestations</h3>
            <div className="muedoc-lines">
              {doc.lines.map((l, i) => (
                <div key={i} className="muedoc-line">
                  <span>{l.label}</span>
                  <strong>{eur(l.amount)}</strong>
                </div>
              ))}
            </div>
            <div className="muedoc-totals">
              <div>
                <span>Sous-total HT</span>
                <span>{eur(doc.subtotal)}</span>
              </div>
              <div>
                <span>TVA 20 %</span>
                <span>{eur(doc.vat)}</span>
              </div>
              <div className="muedoc-grand">
                <span>Total TTC</span>
                <strong>{eur(doc.total)}</strong>
              </div>
            </div>
          </section>

          <p className="muedoc-terms">{doc.terms}</p>
        </div>

        <footer className="muedoc-foot">
          <span className="muedoc-hint">Brouillon — adapte-le directement dans le document.</span>
        </footer>
      </div>
    </div>,
    document.body
  );
}
