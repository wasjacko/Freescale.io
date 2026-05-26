"use client";

import { createTask } from "@/lib/actions/inbox";
import {
  type SuggestedTask,
  type ThreadSummary,
  askMue,
  clearMueChat,
  listMueChatMessages,
  suggestTasks,
  summarizeThread,
} from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type BriefState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; data: ThreadSummary }
  | { kind: "error"; message: string };

type ActionScanState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; tasks: SuggestedTask[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

type AskMessage = {
  id: string;
  role: "user" | "mue";
  content: string;
  tone?: "normal" | "error";
};

/**
 * MuePanel — companion-style AI panel.
 *
 * Visual: a cute peach blob mascot at the top with eyes + a smile and
 * floating particles, then a headline tailored to the active
 * conversation, two quick-action chips, a quiet contact line, a tiny
 * 2-bubble chat history, and an "Ask Mue" input at the bottom.
 *
 * The blob is pure SVG (radial gradients + organic path) so it scales
 * crisply and animates via CSS keyframes — no Lottie or images.
 *
 * Mue's content is mocked for now (matched to the active conv when
 * possible). Wiring to real Mue logic (summary/actions/follow-ups) is
 * a follow-up — this pass nails the visual character.
 */
export function MuePanel() {
  const { activeConvId } = useApp();
  const { conversations } = useData();
  const push = useToast((s) => s.push);
  const router = useRouter();
  const [askInput, setAskInput] = useState("");
  const [askPending, setAskPending] = useState(false);
  const [askHistoryLoading, setAskHistoryLoading] = useState(false);
  const [askMessages, setAskMessages] = useState<AskMessage[]>([]);
  // Tasks created from suggestions — used to disable their "Créer"
  // button after a successful create so the user doesn't double-fire.
  const [createdSuggestionKeys, setCreatedSuggestionKeys] = useState<Set<string>>(new Set());

  const conv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );
  const firstName = conv?.name.split(/[ –-]/)[0]?.trim() ?? "ton contact";

  // Count other convs with the same contact (cross-thread context)
  const sameContactCount = useMemo(() => {
    if (!conv) return 0;
    return conversations.filter((c) => c.name === conv.name).length;
  }, [conversations, conv]);

  // Brief / summary state — Mue's "summarize this conversation"
  // capability. Calls summarizeThread on click, shows loading then
  // displays the tldr + bullets inside a card. Reset whenever the
  // user switches conversation so a stale brief never hangs over a
  // different thread.
  const [brief, setBrief] = useState<BriefState>({ kind: "idle" });
  const [scan, setScan] = useState<ActionScanState>({ kind: "idle" });
  useEffect(() => {
    if (activeConvId === undefined) return;
    setBrief({ kind: "idle" });
    setScan({ kind: "idle" });
    setAskInput("");
    setCreatedSuggestionKeys(new Set());

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

  const handleBrief = async () => {
    if (!activeConvId) return;
    if (brief.kind === "loading") return;
    setBrief({ kind: "loading" });
    try {
      const res = await summarizeThread(activeConvId);
      if (res.error || !res.summary) {
        setBrief({ kind: "error", message: res.error ?? "Erreur Mue" });
      } else {
        setBrief({ kind: "result", data: res.summary });
      }
    } catch (err) {
      setBrief({
        kind: "error",
        message: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  };

  // "Trouver une action ?" — scans the active conv for actionable
  // items, only proposes a task AFTER finding one. Never auto-pushes.
  // The user explicitly asks; Mue answers with "found X" or "rien".
  const handleScan = async () => {
    if (!activeConvId) return;
    if (scan.kind === "loading") return;
    setScan({ kind: "loading" });
    try {
      const res = await suggestTasks(activeConvId);
      if (res.error) {
        setScan({ kind: "error", message: res.error });
      } else if (res.tasks.length === 0) {
        setScan({ kind: "empty" });
      } else {
        setScan({ kind: "found", tasks: res.tasks });
      }
    } catch (err) {
      setScan({
        kind: "error",
        message: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  };

  const suggestionKey = (task: SuggestedTask) =>
    `${task.title}::${task.priority}::${task.due ?? "no-due"}`;

  const handleCreateTaskFromSuggestion = async (key: string, task: SuggestedTask) => {
    if (createdSuggestionKeys.has(key)) return;
    setCreatedSuggestionKeys((prev) => new Set(prev).add(key));
    try {
      const res = await createTask({
        title: task.title,
        priority: task.priority,
        due: task.due,
        conversationId: activeConvId || null,
      });
      if (res.ok) {
        push({
          kind: "info",
          text: `Tâche créée : ${task.title.slice(0, 50)}`,
          duration: 2500,
        });
        router.refresh();
      } else {
        // Rollback the optimistic "created" flag so the user can retry.
        setCreatedSuggestionKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        push({ kind: "error", text: res.error ?? "Création impossible." });
      }
    } catch (err) {
      setCreatedSuggestionKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      push({
        kind: "error",
        text: err instanceof Error ? err.message : "Création impossible.",
      });
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = askInput.trim();
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
      const res = await askMue({
        conversationId: activeConvId ?? null,
        question,
      });
      const answer = res.answer ?? res.error ?? "Mue n'a pas pu répondre.";
      const mueMessage: AskMessage = {
        id: `mue-${Date.now()}`,
        role: "mue",
        content: answer,
        tone: res.error ? "error" : "normal",
      };
      setAskMessages((prev) => [...prev, mueMessage].slice(-6));
    } catch (err) {
      const mueMessage: AskMessage = {
        id: `mue-${Date.now()}`,
        role: "mue",
        content: err instanceof Error ? err.message : "Mue n'a pas pu répondre.",
        tone: "error",
      };
      setAskMessages((prev) => [...prev, mueMessage].slice(-6));
    } finally {
      setAskPending(false);
    }
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

  return (
    <aside className="copilot mue-pane" aria-label="Mue copilot">
      {/* (Mue blob mascot removed — was stealing visual attention from
          the actual content. The panel now reads as a quiet text+chip
          surface: headline → actions → result cards → ask input.) */}

      {/* Headline — neutral idle state. No fake "X veut une démo
          lundi" anymore — Mue never proposes a task before having
          actually read the thread. */}
      <h2 className="mue-headline">
        {conv
          ? "Coucou ! Je suis là si tu veux que je regarde avec toi."
          : "Sélectionne une conversation, je regarde avec toi."}
      </h2>

      {/* Two real Mue capabilities — both REACTIVE (user-triggered),
          never automatic:
            • Résumer → summarizeThread, renders the brief card below
            • Trouver une action ? → suggestTasks, renders the scan
              result card below. Mue only proposes a task AFTER it
              found one, never up-front. */}
      {conv && (
        <div className="mue-chips" role="group" aria-label="Actions Mue">
          <button
            type="button"
            className="mue-chip mue-chip-primary"
            onClick={handleBrief}
            disabled={brief.kind === "loading"}
            aria-label="Résumer la conversation"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            {brief.kind === "loading" ? "Mue lit…" : "Résumer"}
          </button>
          <button
            type="button"
            className="mue-chip"
            onClick={handleScan}
            disabled={scan.kind === "loading"}
            aria-label="Trouver une action à faire"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {scan.kind === "loading" ? "Mue cherche…" : "Trouver une action ?"}
          </button>
        </div>
      )}

      {/* Scan result card — appears after the user clicks "Trouver une
          action ?". Mue's findings + explicit confirmation per task
          before any creation. Pattern matches the brief card. */}
      {scan.kind !== "idle" && conv && (
        <div
          className="mue-brief-card"
          role="region"
          aria-live="polite"
          aria-label="Action détectée"
        >
          <header className="mue-brief-card-head">
            <span className="mue-brief-card-label">
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Action
            </span>
            <button
              type="button"
              className="mue-brief-card-close"
              onClick={() => setScan({ kind: "idle" })}
              aria-label="Fermer"
            >
              ✕
            </button>
          </header>

          {scan.kind === "loading" && (
            <p className="mue-brief-card-loading">Mue lit la conversation…</p>
          )}

          {scan.kind === "error" && <p className="mue-brief-card-error">{scan.message}</p>}

          {scan.kind === "empty" && (
            <p className="mue-brief-card-tldr" style={{ color: "#94A3B8" }}>
              Rien d&apos;urgent ici. Mue ne voit pas d&apos;action concrète à faire.
            </p>
          )}

          {scan.kind === "found" && (
            <>
              <p className="mue-brief-card-tldr">
                J&apos;ai trouvé{" "}
                {scan.tasks.length === 1 ? "une action" : `${scan.tasks.length} actions`} :
              </p>
              <ul className="mue-action-list">
                {scan.tasks.map((task) => {
                  const key = suggestionKey(task);
                  const created = createdSuggestionKeys.has(key);
                  return (
                    <li key={key} className={`mue-action-item is-${task.priority}`}>
                      <div className="mue-action-text">
                        <span className="mue-action-title">{task.title}</span>
                        {task.due && <span className="mue-action-due"> · {task.due}</span>}
                      </div>
                      <button
                        type="button"
                        className={`mue-action-confirm ${created ? "is-done" : ""}`}
                        onClick={() => handleCreateTaskFromSuggestion(key, task)}
                        disabled={created}
                        aria-label={created ? "Tâche créée" : "Créer la tâche"}
                      >
                        {created ? "✓ Créée" : "Créer la tâche"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Brief result card — sits between the chips and the contact
          line. Renders the tldr as a small headline + the bullets
          beneath, with an × to dismiss. Loading + error states share
          the same shell so the layout doesn't jump. */}
      {brief.kind !== "idle" && conv && (
        <div className="mue-brief-card" role="region" aria-live="polite" aria-label="Brief Mue">
          <header className="mue-brief-card-head">
            <span className="mue-brief-card-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden>
                <path d="M12 3l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5L12 3z" />
              </svg>
              Brief
            </span>
            <button
              type="button"
              className="mue-brief-card-close"
              onClick={() => setBrief({ kind: "idle" })}
              aria-label="Fermer"
            >
              ✕
            </button>
          </header>

          {brief.kind === "loading" && (
            <p className="mue-brief-card-loading">Mue lit la conversation…</p>
          )}

          {brief.kind === "error" && <p className="mue-brief-card-error">{brief.message}</p>}

          {brief.kind === "result" && (
            <>
              <p className="mue-brief-card-tldr">{brief.data.tldr}</p>
              {brief.data.bullets.length > 0 && (
                <ul className="mue-brief-card-bullets">
                  {brief.data.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* Quiet contact line */}
      {conv && (
        <p className="mue-contact-line">
          {sameContactCount} conversation{sameContactCount > 1 ? "s" : ""} avec {firstName} · répond
          en 4h
        </p>
      )}

      {(askMessages.length > 0 || askPending || askHistoryLoading) && (
        <div className="mue-chat-wrap">
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
            {askPending && <div className="mue-chat-bubble is-mue is-pending">Mue réfléchit…</div>}
          </div>
          {askMessages.length > 0 && (
            <button type="button" className="mue-chat-clear" onClick={handleClearAskHistory}>
              Effacer le fil
            </button>
          )}
        </div>
      )}

      {/* Ask input */}
      <form className="mue-ask-form" onSubmit={handleAsk}>
        <input
          type="text"
          className="mue-ask-input"
          placeholder="Demande à Mue..."
          value={askInput}
          onChange={(e) => setAskInput(e.target.value)}
          aria-label="Demander à Mue"
          disabled={askPending}
        />
        <button
          type="submit"
          className="mue-ask-send"
          aria-label="Envoyer"
          disabled={!askInput.trim() || askPending}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </aside>
  );
}
