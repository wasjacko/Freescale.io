"use client";

// Page Mue plein écran — landing centrée façon « Brain² » : halo dégradé en
// haut, logo + wordmark, onglets Demander / Agents, gros composer, et une
// rangée de cartes de suggestion. « Mémoire » en haut à droite.

import { MueFlower } from "@/components/MueFlower";
import { askMue } from "@/lib/actions/mue";
import { useApp } from "@/lib/store";
import { useEffect, useRef, useState } from "react";

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

// Cartes de suggestion (titre + sous-titre + icône) — pré-remplissent le composer.
const SUGGESTION_CARDS = [
  {
    title: "Rédiger le portfolio",
    sub: "Brouillon des descriptions projet",
    prompt: "Rédige les descriptions de projet pour mon portfolio",
    icon: (
      <svg {...stroke} width={16} height={16}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    ),
  },
  {
    title: "Avancement portfolio",
    sub: "Résumer ce qui reste à faire",
    prompt: "Résume l'avancement de mon portfolio et ce qui reste à faire",
    icon: (
      <svg {...stroke} width={16} height={16}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Factures de juin",
    sub: "Générer les relances",
    prompt: "Prépare les relances pour mes factures de juin",
    icon: (
      <svg {...stroke} width={16} height={16}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "MAJ Behance",
    sub: "Créer les sous-tâches",
    prompt: "Planifie la mise à jour de mon Behance en sous-tâches",
    icon: (
      <svg {...stroke} width={16} height={16}>
        <path d="M12 3l1.6 4.6 4.6 1.6-4.6 1.6L12 15.4l-1.6-4.6L5.8 9.2l4.6-1.6L12 3z" />
      </svg>
    ),
  },
];

export function MueFullView() {
  const { activeConvId } = useApp();
  const [mode, setMode] = useState<"ask" | "agents">("ask");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, pending]);

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

  const fillAndFocus = (q: string) => {
    setInput(q);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const composer = (
    <form
      className="mfv2-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <textarea
        ref={inputRef}
        className="mfv2-input"
        rows={2}
        placeholder="Faites des recherches dans votre environnement de travail et sur le Web en quelques secondes. Que voulez-vous trouver ?"
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
      <div className="mfv2-composer-row">
        <button type="button" className="mfv2-cbtn" aria-label="Joindre">
          <svg {...stroke} width={17} height={17}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button type="button" className="mfv2-cbtn" aria-label="Modèle / template">
          <svg {...stroke} width={17} height={17}>
            <rect x="3" y="4" width="14" height="14" rx="2" />
            <path d="M19 8.5l1.4.5.5 1.4.5-1.4 1.4-.5-1.4-.5-.5-1.4-.5 1.4z" />
          </svg>
        </button>
        <span className="mfv2-spacer" />
        <button type="button" className="mfv2-model">
          <MueFlower size={15} /> Max
          <svg {...stroke} width={12} height={12}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {input.trim() ? (
          <button type="submit" className="mfv2-send" aria-label="Envoyer" disabled={pending}>
            <svg {...stroke}>
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="6 11 12 5 18 11" />
            </svg>
          </button>
        ) : (
          <button type="button" className="mfv2-cbtn mfv2-mic" aria-label="Dicter">
            <svg {...stroke} width={17} height={17}>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="18" x2="12" y2="21" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );

  return (
    <section className="mfv2" aria-label="Mue — page dédiée">
      <span className="mfv2-glow" aria-hidden />
      <header className="mfv2-top">
        <button type="button" className="mfv2-memoire">
          <svg {...stroke} width={16} height={16}>
            <rect x="3" y="4" width="18" height="6" rx="1.5" />
            <rect x="3" y="14" width="18" height="6" rx="1.5" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
            <line x1="7" y1="17" x2="7.01" y2="17" />
          </svg>
          Mémoire
        </button>
      </header>

      {messages.length === 0 ? (
        <div className="mfv2-center">
          <div className="mfv2-logo">
            <MueFlower size={48} />
          </div>

          <div className="mfv2-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "ask"}
              className={`mfv2-tab ${mode === "ask" ? "is-on" : ""}`}
              onClick={() => setMode("ask")}
            >
              <MueFlower size={15} /> Demander
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "agents"}
              className={`mfv2-tab ${mode === "agents" ? "is-on" : ""}`}
              onClick={() => setMode("agents")}
            >
              <svg {...stroke} width={15} height={15}>
                <rect x="2" y="7" width="20" height="10" rx="3" />
                <circle cx="8" cy="12" r="1.6" />
                <circle cx="16" cy="12" r="1.6" />
              </svg>
              Agents
            </button>
          </div>

          {composer}

          <div className="mfv2-cards">
            {SUGGESTION_CARDS.map((c) => (
              <button
                key={c.title}
                type="button"
                className="mfv2-card"
                onClick={() => fillAndFocus(c.prompt)}
              >
                <span className="mfv2-card-ic">{c.icon}</span>
                <span className="mfv2-card-title">{c.title}</span>
                <span className="mfv2-card-sub">{c.sub}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mfv2-conv">
          <div className="mfv2-chat" ref={logRef}>
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="mfv2-msg mfv2-msg--user">
                  {m.content}
                </div>
              ) : (
                <div key={m.id} className="mfv2-msg mfv2-msg--mue">
                  <div className="mfv2-msg-head">
                    <MueFlower size={16} /> Mue
                  </div>
                  <div className="mfv2-msg-body">{m.content}</div>
                </div>
              )
            )}
            {pending && (
              <div className="mfv2-msg mfv2-msg--mue">
                <div className="mfv2-msg-head">
                  <MueFlower size={16} /> Mue
                </div>
                <div className="mfv2-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
          {composer}
        </div>
      )}
    </section>
  );
}
