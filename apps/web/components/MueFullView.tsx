"use client";

// Page IA dédiée — Mue plein écran. Colonne gauche : historique des
// discussions (mock partagé avec le panneau latéral). Colonne droite :
// même surface conversationnelle (composer dégradé + cartes + chat).
// Implémenté en simple wrapper qui force l'ouverture du MuePanel et le
// rend dans la zone principale, avec la liste à côté.

import { askMue } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { MUE_DISCUSSIONS, fmtAgo, groupDiscussions } from "@/lib/mue-discussions";
import { useApp } from "@/lib/store";
import { useEffect, useMemo, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "mue"; content: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  viewBox: "0 0 24 24",
};

const MueMark = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
    <defs>
      <linearGradient id="mfvgrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7aa2ff" />
        <stop offset="50%" stopColor="#b78cff" />
        <stop offset="100%" stopColor="#ff9d7a" />
      </linearGradient>
    </defs>
    <path
      d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z"
      fill="url(#mfvgrad)"
    />
  </svg>
);

/** Logo fleur Mue — 5 pétales ronds organiques façon Brain², dégradé pastel. */
const MueFlower = ({ size = 56 }: { size?: number }) => {
  // Couleurs ordonnées autour du cercle pour un dégradé fluide.
  const colors = ["#7aa2ff", "#a98aff", "#d088ec", "#ff8fb0", "#ff9d7a"];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        {colors.map((c, i) => (
          <radialGradient
            key={c}
            id={`mfv-pet-${i}`}
            cx="0.5"
            cy="0.35"
            r="0.7"
            fx="0.5"
            fy="0.25"
          >
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="55%" stopColor={c} stopOpacity="0.95" />
            <stop offset="100%" stopColor={c} stopOpacity="1" />
          </radialGradient>
        ))}
      </defs>
      {/* 5 pétales circulaires arrangés autour du centre (rotation par 72°). */}
      {colors.map((_, i) => (
        <circle
          key={i}
          cx="32"
          cy="20"
          r="13"
          fill={`url(#mfv-pet-${i})`}
          transform={`rotate(${i * 72} 32 32)`}
          style={{ mixBlendMode: "multiply" as const }}
        />
      ))}
    </svg>
  );
};

export function MueFullView() {
  const { activeConvId } = useApp();
  const { conversations: _convs } = useData();
  const [query, setQuery] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, pending]);

  const groups = useMemo(
    () =>
      groupDiscussions(
        MUE_DISCUSSIONS.filter((d) => d.title.toLowerCase().includes(query.trim().toLowerCase()))
      ),
    [query]
  );
  const current = currentId ? (MUE_DISCUSSIONS.find((d) => d.id === currentId) ?? null) : null;

  const submit = async () => {
    const q = input.trim();
    if (!q || pending) return;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: q }]);
    setInput("");
    setPending(true);
    try {
      const res = await askMue({ conversationId: activeConvId ?? null, question: q });
      const ans = res.answer ?? res.error ?? "Mue n'a pas pu répondre.";
      setMessages((m) => [...m, { id: `m-${Date.now()}`, role: "mue", content: ans }]);
    } finally {
      setPending(false);
    }
  };

  const newDiscussion = () => {
    setCurrentId(null);
    setMessages([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const openDiscussion = (id: string) => {
    setCurrentId(id);
    // Mock : on (re)part vide pour l'affichage. Plus tard : charger les vrais
    // messages depuis le backend via listMueChatMessages({sessionId}).
    setMessages([]);
  };

  return (
    <section className="mfv" aria-label="Mue — page dédiée">
      {/* ── Colonne discussions ── */}
      <aside className="mfv-side">
        <button type="button" className="mfv-new" onClick={newDiscussion}>
          <svg {...stroke} width={14} height={14}>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Nouvelle discussion
        </button>
        <label className="mfv-search">
          <svg {...stroke} width={14} height={14}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="mfv-list">
          {groups.map((g) => (
            <div key={g.key} className="mfv-group">
              <div className="mfv-group-label">{g.label}</div>
              {g.items.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`mfv-item ${currentId === d.id ? "is-on" : ""}`}
                  onClick={() => openDiscussion(d.id)}
                >
                  <svg {...stroke} width={13} height={13}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="mfv-item-title">{d.title}</span>
                  <span className="mfv-item-time">{fmtAgo(d.updatedAtIso)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Zone chat ── */}
      <div className="mfv-main">
        <header className="mfv-head">
          <h1>{current?.title ?? "Nouvelle discussion"}</h1>
        </header>

        {messages.length === 0 ? (
          <div className="mfv-hero">
            <span className="mfv-hero-mark">
              <MueFlower size={64} />
            </span>
            <h2 className="mfv-hero-title">Mue</h2>
          </div>
        ) : (
          <div className="mfv-chat" ref={logRef}>
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="mfv-msg mfv-msg--user">
                  {m.content}
                </div>
              ) : (
                <div key={m.id} className="mfv-msg mfv-msg--mue">
                  <div className="mfv-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <div className="mfv-msg-body">{m.content}</div>
                </div>
              )
            )}
            {pending && (
              <div className="mfv-msg mfv-msg--mue">
                <div className="mfv-msg-head">
                  <MueMark size={16} /> Mue
                </div>
                <div className="mfv-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions condensées (chips) juste au-dessus du composer. */}
        {messages.length === 0 && (
          <div className="mfv-chips" aria-label="Suggestions">
            {(
              [
                {
                  label: "Recherche approfondie",
                  q: "Fais une recherche approfondie sur mes clients récents",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  ),
                  cls: "purple",
                },
                {
                  label: "Tâche",
                  q: "Crée une tâche pour demain",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ),
                  cls: "green",
                },
                {
                  label: "Résumer ma journée",
                  q: "Résume ma journée",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  ),
                  cls: "blue",
                },
                {
                  label: "Suggérer des tâches",
                  q: "Suggère des tâches depuis mes messages",
                  icon: (
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden>
                      <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
                    </svg>
                  ),
                  cls: "orange",
                },
              ] as const
            ).map((c) => (
              <button
                key={c.label}
                type="button"
                className={`mfv-chip mfv-chip--${c.cls}`}
                onClick={() => {
                  setInput(c.q);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                <span className="mfv-chip-ic">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        )}

        <form
          className="mfv-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <textarea
            ref={inputRef}
            className="mfv-input"
            rows={2}
            placeholder="Pose une question, recherche ou crée…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            disabled={pending}
          />
          <div className="mfv-composer-row">
            <span className="mfv-model">
              <MueMark size={15} /> Max
            </span>
            <button
              type="submit"
              className="mfv-send"
              aria-label="Envoyer"
              disabled={!input.trim() || pending}
            >
              <svg {...stroke}>
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="6 11 12 5 18 11" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
