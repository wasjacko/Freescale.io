"use client";

import { DayPlan } from "@/components/DayPlan";
import { askMue, clearMueChat, listMueChatMessages } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import { useEffect, useMemo, useRef, useState } from "react";
import { MueTaskScanner } from "./SuggestTasksModal";

type AskMessage = {
  id: string;
  role: "user" | "mue";
  content: string;
  tone?: "normal" | "error";
};

/**
 * MuePanel — Mue en panneau latéral, déclenché par un bouton (façon
 * « Agent »).
 *
 *   • fermé  → un bouton pilule « ✦ Mue » (le lanceur). Pas de rail.
 *   • ouvert → un panneau qui glisse depuis la droite et pousse le contenu,
 *              surface conversationnelle « Demander à Mue ».
 *
 * Les actions sur un fil (Résumer · Tâches · Traduire) vivent INLINE dans
 * le thread (ThreadAiBar). Ici, Mue est ce à quoi tu parles.
 */
export function MuePanel() {
  const {
    activeConvId,
    mueOpen,
    setMueOpen,
    mueView,
    setMueView,
    suggestTasksOpen,
    setSuggestTasksOpen,
  } = useApp();
  const { conversations } = useData();
  const push = useToast((s) => s.push);
  const [askInput, setAskInput] = useState("");
  const [askPending, setAskPending] = useState(false);
  const [askHistoryLoading, setAskHistoryLoading] = useState(false);
  const [askMessages, setAskMessages] = useState<AskMessage[]>([]);

  const conv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  // Reset the input + (re)load the chat history whenever the active
  // conversation changes, so the thread you're looking at always shows
  // its own Mue conversation (and the global one when no conv is open).
  useEffect(() => {
    if (activeConvId === undefined) return;
    setAskInput("");

    let cancelled = false;
    setAskHistoryLoading(true);
    listMueChatMessages({ conversationId: activeConvId || null })
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setAskMessages([]);
          return;
        }
        setAskMessages(
          result.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setAskHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConvId]);

  const runAsk = async (raw: string) => {
    const question = raw.trim();
    if (!question || askPending) return;
    const userMessage: AskMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };
    setAskMessages((prev) => [...prev, userMessage].slice(-6));
    setAskInput("");
    setAskPending(true);
    try {
      const res = await askMue({ conversationId: activeConvId ?? null, question });
      const answer = res.answer ?? res.error ?? "Mue n'a pas pu répondre.";
      setAskMessages((prev) =>
        [
          ...prev,
          {
            id: `mue-${Date.now()}`,
            role: "mue" as const,
            content: answer,
            tone: res.error ? ("error" as const) : ("normal" as const),
          },
        ].slice(-6)
      );
    } catch (err) {
      setAskMessages((prev) =>
        [
          ...prev,
          {
            id: `mue-${Date.now()}`,
            role: "mue" as const,
            content: err instanceof Error ? err.message : "Mue n'a pas pu répondre.",
            tone: "error" as const,
          },
        ].slice(-6)
      );
    } finally {
      setAskPending(false);
    }
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    // Entrée sur le hero vide = première suggestion (démarrage à une touche).
    if (!askInput.trim() && suggestions[0]) {
      void runAsk(suggestions[0].label);
      return;
    }
    void runAsk(askInput);
  };

  const handleClearAskHistory = async () => {
    const previous = askMessages;
    setAskMessages([]);
    try {
      const result = await clearMueChat({ conversationId: activeConvId || null });
      if (!result.ok) {
        setAskMessages(previous);
        push({ kind: "error", text: result.error ?? "Impossible d'effacer l'historique." });
      }
    } catch (err) {
      setAskMessages(previous);
      push({
        kind: "error",
        text: err instanceof Error ? err.message : "Impossible d'effacer l'historique.",
      });
    }
  };

  // (47) Auto-focus du champ à l'ouverture — on tape immédiatement.
  const askInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (mueOpen) requestAnimationFrame(() => askInputRef.current?.focus());
  }, [mueOpen]);

  // Fermé : rien ici — le lanceur « ✦ Mue » vit dans le FAB.
  if (!mueOpen) return null;

  const hasChat = askMessages.length > 0 || askPending || askHistoryLoading;
  const suggestions = conv
    ? [
        { label: "Résume ce fil", icon: "doc" as const },
        { label: "Propose une réponse", icon: "reply" as const },
        { label: "Quelle action faire ?", icon: "bolt" as const },
      ]
    : [
        { label: "Résume ma journée", icon: "doc" as const },
        { label: "Qu'est-ce qui attend une réponse ?", icon: "reply" as const },
        { label: "Aide-moi à prioriser", icon: "bolt" as const },
      ];

  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    viewBox: "0 0 24 24",
  };

  // ── Ouvert : panneau agent (style sombre) ───────────────────────────
  return (
    <aside className="copilot mue-pane is-open" aria-label="Mue copilot">
      {suggestTasksOpen ? (
        <MueTaskScanner onClose={() => setSuggestTasksOpen(false)} />
      ) : (
        <>
          <header className="mue-agent-head">
            <span className="mue-agent-id" aria-hidden />
            <div className="mue-agent-actions">
              {askMessages.length > 0 && (
                <button
                  type="button"
                  className="mue-agent-iconbtn"
                  onClick={handleClearAskHistory}
                  aria-label="Effacer le fil"
                >
                  <svg {...stroke}>
                    <path d="M3 3v5h5" />
                    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="mue-agent-iconbtn"
                onClick={() => setMueOpen(false)}
                aria-label="Fermer Mue"
              >
                <svg {...stroke}>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          {!hasChat ? (
            <div className={`mue-agent-hero ${mueView === "plan" ? "has-plan" : "has-choices"}`}>
              {mueView === "plan" ? (
                // « Priorise mes tâches » → le plan du jour, avec retour aux choix.
                <>
                  <button
                    type="button"
                    className="mue-plan-back"
                    onClick={() => setMueView("choices")}
                  >
                    <svg {...stroke}>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Retour
                  </button>
                  <DayPlan />
                </>
              ) : (
                // Les 2 choix de base — toujours affichés (plus d'écran « contact »).
                <div className="mue-choices">
                  <h2 className="mue-choices-title">Comment je t'aide ?</h2>
                  <button
                    type="button"
                    className="mue-choice"
                    onClick={() => setSuggestTasksOpen(true)}
                  >
                    <span className="mue-choice-ic">
                      <svg {...stroke}>
                        <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
                      </svg>
                    </span>
                    <span className="mue-choice-tx">
                      <b>Suggérer des tâches</b>
                      <small>Mue scanne tes messages récents</small>
                    </span>
                  </button>
                  <button type="button" className="mue-choice" onClick={() => setMueView("plan")}>
                    <span className="mue-choice-ic">
                      <svg {...stroke}>
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </span>
                    <span className="mue-choice-tx">
                      <b>Priorise mes tâches cette semaine</b>
                      <small>Mue ordonne ce qui compte</small>
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mue-agent-chat">
              <div className="mue-chat-log" aria-live="polite">
                {askHistoryLoading && (
                  <div className="mue-chat-bubble is-mue is-pending">Chargement du fil Mue…</div>
                )}
                {askMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`mue-chat-bubble is-${message.role} ${
                      message.tone === "error" ? "is-error" : ""
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
                {askPending && (
                  <div className="mue-chat-bubble is-mue is-pending">Mue réfléchit…</div>
                )}
              </div>
            </div>
          )}

          <div className="mue-agent-foot">
            <span className="mue-agent-unlim">
              <svg {...stroke}>
                <path d="M18.5 12c0 1.9-1.6 3.5-3.5 3.5S9.5 13.9 9.5 12 7.9 8.5 6 8.5 2.5 10.1 2.5 12 4.1 15.5 6 15.5s3.5-1.6 3.5-3.5S11.1 8.5 13 8.5s5.5 1.6 5.5 3.5z" />
              </svg>
              Illimité
            </span>
            <form className="mue-agent-composer" onSubmit={handleAsk}>
              <input
                ref={askInputRef}
                type="text"
                className="mue-agent-input"
                placeholder="Que veux-tu faire ?"
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                aria-label="Demander à Mue"
                disabled={askPending}
              />
              <div className="mue-agent-composer-row">
                <button type="button" className="mue-agent-cbtn" aria-label="Ajouter">
                  <svg {...stroke}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button type="button" className="mue-agent-cbtn" aria-label="Réglages">
                  <svg {...stroke}>
                    <line x1="4" y1="8" x2="20" y2="8" />
                    <line x1="4" y1="16" x2="20" y2="16" />
                    <circle cx="9" cy="8" r="2" />
                    <circle cx="15" cy="16" r="2" />
                  </svg>
                </button>
                <span className="mue-agent-spacer" />
                <button type="button" className="mue-agent-cbtn" aria-label="Dicter">
                  <svg {...stroke}>
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0" />
                    <line x1="12" y1="18" x2="12" y2="21" />
                  </svg>
                </button>
                <button
                  type="submit"
                  className="mue-agent-send"
                  aria-label="Envoyer"
                  disabled={!askInput.trim() || askPending}
                >
                  <svg {...stroke}>
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="6 11 12 5 18 11" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </aside>
  );
}
