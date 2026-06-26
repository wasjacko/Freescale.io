"use client";

// Vue « Mémoire » — alimente ce que Mue sait de toi (surnom, rôle,
// préférences, mémoires par client, import depuis une autre IA).
// Rendue INLINE dans le panneau Mue (plus de slide-over portal).

import { Avatar } from "@/components/ui/Avatar";
import { MOCK_CLIENTS } from "@/lib/mock-v2";
import { useState } from "react";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  viewBox: "0 0 24 24",
};

export function MueMemory() {
  const [surnom, setSurnom] = useState("wass");
  const [role, setRole] = useState("");
  const [prefsOn, setPrefsOn] = useState(true);
  const [importExpanded, setImportExpanded] = useState(true);
  const [memClients, setMemClients] = useState<Set<string>>(
    () => new Set(MOCK_CLIENTS.slice(0, 3).map((c) => c.id))
  );
  const [q, setQ] = useState("");

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

  return (
    <div className="mmd-inline" aria-label="Mémoire de Mue">
      <h2 className="mmd-title">Mémoire de Mue</h2>
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
              Tu utilises déjà ChatGPT, Gemini ou Claude ? Apporte ce qu'ils savent sur toi dans Mue
              : copie un message, colle la réponse.
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
    </div>
  );
}
