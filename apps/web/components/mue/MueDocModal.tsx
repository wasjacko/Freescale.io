"use client";

// Surface document légère (mock) — ouvre un devis généré par Mue dans une
// modale par-dessus le canvas. Le panneau Mue reste ouvert à droite.

export type DevisDoc = {
  id: string;
  client: string;
  ref: string;
  dateLabel: string;
  lines: { label: string; amount: number }[];
  total: number;
};

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

export function MueDocModal({ doc, onClose }: { doc: DevisDoc; onClose: () => void }) {
  return (
    <div className="muedoc-overlay" role="dialog" aria-modal="true" aria-label={`Devis ${doc.client}`}>
      <button type="button" className="muedoc-scrim" aria-label="Fermer" onClick={onClose} />
      <div className="muedoc-sheet">
        <header className="muedoc-head">
          <div>
            <h2>Devis — {doc.client}</h2>
            <span className="muedoc-sub">
              {doc.ref} · {doc.dateLabel}
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
          {doc.lines.map((l, i) => (
            <div key={i} className="muedoc-line">
              <span>{l.label}</span>
              <strong>{eur(l.amount)}</strong>
            </div>
          ))}
          <div className="muedoc-total">
            <span>Total</span>
            <strong>{eur(doc.total)}</strong>
          </div>
        </div>
        <footer className="muedoc-foot">
          <span className="muedoc-hint">Brouillon — adapte-le directement dans le document.</span>
        </footer>
      </div>
    </div>
  );
}
