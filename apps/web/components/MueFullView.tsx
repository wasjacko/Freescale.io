"use client";

// Page IA dédiée — Mue plein écran. Colonne gauche : historique des
// discussions (mock partagé avec le panneau latéral). Colonne droite :
// même surface conversationnelle (composer dégradé + cartes + chat).
// Implémenté en simple wrapper qui force l'ouverture du MuePanel et le
// rend dans la zone principale, avec la liste à côté.

import { MueFlower } from "@/components/MueFlower";
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
            <h2 className="mfv-hero-title">Votre Mue</h2>
            {/* Exemples défilants — donnent une idée immédiate de ce qu'on peut faire. */}
            <div className="mfv-examples" aria-hidden>
              <span>📄 Document</span>
              <span>● Résumé rapide</span>
              <span>👓 Super agent client</span>
              <span>✦ Recherche approfondie</span>
              <span>🗓 Planifier ma semaine</span>
            </div>
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
                    <MueFlower size={16} /> Mue
                  </div>
                  <div className="mfv-msg-body">{m.content}</div>
                </div>
              )
            )}
            {pending && (
              <div className="mfv-msg mfv-msg--mue">
                <div className="mfv-msg-head">
                  <MueFlower size={16} /> Mue
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

        {/* 7 actions — au-dessus du composer (Trouver · Rechercher · Créer …). */}
        {messages.length === 0 && (
          <div className="mfv-actions" aria-label="Actions">
            {(
              [
                {
                  label: "Trouver",
                  q: "Trouve ",
                  cls: "find",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  ),
                },
                {
                  label: "Rechercher",
                  q: "Fais une recherche approfondie sur ",
                  cls: "search",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <path d="M9 11l-4 9 9-4" />
                      <path d="M14 6l4 4" />
                      <path d="M21 3l-7 7-1 5 5-1 7-7-4-4z" />
                    </svg>
                  ),
                },
                {
                  label: "Créer",
                  q: "Crée ",
                  cls: "create",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  ),
                },
                {
                  label: "Modifier",
                  q: "Modifie ",
                  cls: "edit",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  ),
                },
                {
                  label: "Analyser",
                  q: "Analyse ",
                  cls: "analyze",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <polyline points="3 13 7 9 11 13 17 7" />
                      <polyline points="13 7 17 7 17 11" />
                    </svg>
                  ),
                },
                {
                  label: "Prioriser",
                  q: "Aide-moi à prioriser ",
                  cls: "prioritize",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <line x1="5" y1="22" x2="5" y2="4" />
                      <path d="M5 4h12l-2 4 2 4H5" />
                    </svg>
                  ),
                },
                {
                  label: "Planifier",
                  q: "Planifie ",
                  cls: "plan",
                  icon: (
                    <svg {...stroke} width={14} height={14}>
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="8" y1="3" x2="8" y2="7" />
                      <line x1="16" y1="3" x2="16" y2="7" />
                    </svg>
                  ),
                },
              ] as const
            ).map((a) => (
              <button
                key={a.label}
                type="button"
                className={`mfv-act mfv-act--${a.cls}`}
                onClick={() => {
                  setInput(a.q);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                <span className="mfv-act-ic">{a.icon}</span>
                {a.label}
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
            placeholder="Pose une question, crée, recherche, @ pour mentionner…"
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
            <button type="button" className="mfv-cbtn" aria-label="Joindre">
              <svg {...stroke} width={16} height={16}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button type="button" className="mfv-cbtn" aria-label="Modèle / template">
              <svg {...stroke} width={16} height={16}>
                <rect x="3" y="4" width="14" height="14" rx="2" />
                <path d="M19 8.5l1.6.6.6 1.6.6-1.6 1.6-.6-1.6-.6-.6-1.6-.6 1.6z" />
              </svg>
            </button>
            <span className="mfv-spacer" />
            <button type="button" className="mfv-model">
              <MueFlower size={15} /> Max
              <svg {...stroke} width={12} height={12}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <button type="button" className="mfv-cbtn" aria-label="Dicter">
              <svg {...stroke} width={16} height={16}>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <line x1="12" y1="18" x2="12" y2="21" />
              </svg>
            </button>
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
