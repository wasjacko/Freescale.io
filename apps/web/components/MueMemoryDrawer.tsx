"use client";

// Drawer « Mémoire » — alimente ce que Mue sait de toi (surnom, rôle,
// préférences, mémoires par client, import depuis une autre IA). Slide-over
// rendu via portal pour passer au-dessus de tout. 100% UI mock.

import { Avatar } from "@/components/ui/Avatar";
import { MOCK_CLIENTS } from "@/lib/mock-v2";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  viewBox: "0 0 24 24",
};

export function MueMemoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [surnom, setSurnom] = useState("wass");
  const [role, setRole] = useState("");
  const [prefsOn, setPrefsOn] = useState(true);
  const [importExpanded, setImportExpanded] = useState(true);
  // Clients dont la mémoire est activée (par défaut : tous suggérés ON).
  const [memClients, setMemClients] = useState<Set<string>>(
    () => new Set(MOCK_CLIENTS.slice(0, 3).map((c) => c.id))
  );
  // Recherche dans la liste clients.
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const filteredClients = q.trim()
    ? MOCK_CLIENTS.filter((c) =>
        `${c.name} ${c.company ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
      )
    : MOCK_CLIENTS;

  const toggleClient = (id: string) =>
    setMemClients((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return createPortal(
    <div className="mmd-overlay" role="dialog" aria-modal="true" aria-label="Mémoire de Mue">
      <button
        type="button"
        className="mmd-backdrop"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={onClose}
      />
      <aside className="mmd-sheet">
        <header className="mmd-head">
          <h2>Mémoire de Mue</h2>
          <button type="button" className="mmd-close" aria-label="Fermer" onClick={onClose}>
            <svg {...stroke}>
              <polyline points="9 6 15 12 9 18" />
              <polyline points="15 6 21 12 15 18" />
            </svg>
          </button>
        </header>
        <p className="mmd-intro">
          Gère ce que Mue sait de toi (préférences, contexte, style de travail). Plus elle en sait,
          plus tes conversations sont personnalisées et utiles.
        </p>

        {/* Import depuis une autre IA — collapsible. */}
        <section className={`mmd-card ${importExpanded ? "" : "is-collapsed"}`}>
          <header className="mmd-card-head">
            <div className="mmd-card-logos" aria-hidden>
              <span className="mmd-logo mmd-logo--gpt">G</span>
              <span className="mmd-logo mmd-logo--claude">✦</span>
              <span className="mmd-logo mmd-logo--gemini">✦</span>
            </div>
            <button
              type="button"
              className="mmd-card-toggle"
              aria-label={importExpanded ? "Réduire" : "Déplier"}
              onClick={() => setImportExpanded((v) => !v)}
            >
              {importExpanded ? "−" : "+"}
            </button>
          </header>
          {importExpanded && (
            <>
              <h3 className="mmd-card-title">Apportez vos souvenirs d'une autre IA.</h3>
              <p className="mmd-card-sub">
                Tu utilises déjà ChatGPT, Gemini ou Claude ? Apporte ce qu'ils savent sur toi dans
                Mue : copie un message, colle la réponse.
              </p>
              <button type="button" className="mmd-card-cta">
                Commencer
              </button>
            </>
          )}
        </section>

        {/* Surnom + rôle */}
        <label className="mmd-field">
          <span>Surnom</span>
          <input value={surnom} onChange={(e) => setSurnom(e.target.value)} />
        </label>
        <label className="mmd-field">
          <span>Votre rôle</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ex. Freelance designer, Dev indépendant…"
          />
        </label>

        {/* Préférences globales */}
        <div className="mmd-section">
          <div className="mmd-section-head">
            <span>Mes préférences</span>
            <button
              type="button"
              className={`mmd-switch ${prefsOn ? "is-on" : ""}`}
              aria-pressed={prefsOn}
              onClick={() => setPrefsOn((v) => !v)}
              aria-label="Activer mes préférences"
            >
              <span className="mmd-switch-knob" />
            </button>
          </div>
          <div className="mmd-prefs-empty">
            <strong>Aucune préférence pour le moment</strong>
            <span>Définis ton ton, style et préférences de travail.</span>
            <button type="button" className="mmd-prefs-btn">
              ✎ Modifier les préférences
            </button>
          </div>
        </div>

        {/* Mémoire PAR CLIENT — sélection multi. */}
        <div className="mmd-section">
          <div className="mmd-section-head">
            <span>Mémoire par client</span>
            <span className="mmd-count">{memClients.size} actifs</span>
          </div>
          <p className="mmd-section-sub">
            Choisis les clients pour lesquels Mue mémorise le contexte (préférences, ton, projet en
            cours).
          </p>
          <label className="mmd-search">
            <svg {...stroke} width={14} height={14}>
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Rechercher un client…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <ul className="mmd-clients">
            {filteredClients.map((c) => {
              const on = memClients.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`mmd-client ${on ? "is-on" : ""}`}
                    onClick={() => toggleClient(c.id)}
                  >
                    <Avatar avatar={{ ...c.avatar, alt: c.name }} size={28} />
                    <span className="mmd-client-id">
                      <span className="mmd-client-name">{c.name}</span>
                      {c.company && <span className="mmd-client-co">{c.company}</span>}
                    </span>
                    <span className={`mmd-check ${on ? "is-on" : ""}`} aria-hidden>
                      {on && (
                        <svg
                          viewBox="0 0 24 24"
                          width={11}
                          height={11}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>,
    document.body
  );
}
