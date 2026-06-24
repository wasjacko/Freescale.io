"use client";

import { askMue, clearMueChat, listMueChatMessages } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useApp } from "@/lib/store";
import { useEffect, useMemo, useRef, useState } from "react";
import { MueTaskScanner } from "./SuggestTasksModal";

type AskMessage = {
  id: string;
  role: "user" | "mue";
  kind?: "text" | "scan";
  content: string;
  tone?: "normal" | "error";
};

type Mode = "ask" | "agents";

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
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="mue2-mark">
    <defs>
      <linearGradient id="mue2grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7aa2ff" />
        <stop offset="50%" stopColor="#b78cff" />
        <stop offset="100%" stopColor="#ff9d7a" />
      </linearGradient>
    </defs>
    <path
      d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z"
      fill="url(#mue2grad)"
    />
    <path
      d="M18.5 16l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"
      fill="url(#mue2grad)"
    />
  </svg>
);

/**
 * MuePanel — copilote Mue façon « Brain » : deux modes (Demander / Agents),
 * un composer à liseré dégradé, 3 suggestions, et une surface de chat pur.
 * Le scan de tâches se joue INLINE dans le chat (skeleton pastel → tâches).
 */
export function MuePanel() {
  const {
    activeConvId,
    mueOpen,
    setMueOpen,
    suggestTasksOpen,
    setSuggestTasksOpen,
    setView,
    setActiveConv,
    setInboxBucket,
  } = useApp();
  const { conversations } = useData();
  const push = useToast((s) => s.push);

  const [mode, setMode] = useState<Mode>("ask");
  const [askInput, setAskInput] = useState("");
  const [askPending, setAskPending] = useState(false);
  const [askHistoryLoading, setAskHistoryLoading] = useState(false);
  const [askMessages, setAskMessages] = useState<AskMessage[]>([]);

  const conv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  // Brief : nb de CLIENTS distincts dont la balle est dans mon camp.
  const awaitingCount = new Set(
    conversations
      .filter((c) => {
        const inb = c.lastInboundAt ? new Date(c.lastInboundAt).getTime() : 0;
        const out = c.lastOutboundAt ? new Date(c.lastOutboundAt).getTime() : 0;
        return inb > out;
      })
      .map((c) => c.clientId ?? c.id)
  ).size;
  const openToReply = () => {
    setView("inbox");
    setActiveConv("");
    setInboxBucket("to-reply");
    setMueOpen(false);
  };

  // Recharge l'historique quand la conversation active change.
  useEffect(() => {
    if (activeConvId === undefined) return;
    setAskInput("");
    let cancelled = false;
    setAskHistoryLoading(true);
    listMueChatMessages({ conversationId: activeConvId || null })
      .then((result) => {
        if (cancelled) return;
        if (result.error) return setAskMessages([]);
        setAskMessages(
          result.messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
        );
      })
      .finally(() => {
        if (!cancelled) setAskHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConvId]);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [askMessages, askPending]);

  const runScan = () => {
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: "Suggérer des tâches" },
      { id: `scan-${Date.now()}`, role: "mue", kind: "scan", content: "" },
    ]);
  };

  // Déclencheur externe (store) → scan inline.
  useEffect(() => {
    if (suggestTasksOpen) {
      setMode("ask");
      runScan();
      setSuggestTasksOpen(false);
    }
  }, [suggestTasksOpen, setSuggestTasksOpen]);

  const runAsk = async (raw: string) => {
    const question = raw.trim();
    if (!question || askPending) return;
    setAskMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: question },
    ]);
    setAskInput("");
    setAskPending(true);
    try {
      const res = await askMue({ conversationId: activeConvId ?? null, question });
      const answer = res.answer ?? res.error ?? "Mue n'a pas pu répondre.";
      setAskMessages((prev) => [
        ...prev,
        {
          id: `mue-${Date.now()}`,
          role: "mue",
          content: answer,
          tone: res.error ? "error" : "normal",
        },
      ]);
    } catch (err) {
      setAskMessages((prev) => [
        ...prev,
        {
          id: `mue-${Date.now()}`,
          role: "mue",
          content: err instanceof Error ? err.message : "Mue n'a pas pu répondre.",
          tone: "error",
        },
      ]);
    } finally {
      setAskPending(false);
    }
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    void runAsk(askInput);
  };

  const handleClear = async () => {
    const previous = askMessages;
    setAskMessages([]);
    try {
      const result = await clearMueChat({ conversationId: activeConvId || null });
      if (!result.ok) {
        setAskMessages(previous);
        push({ kind: "error", text: result.error ?? "Impossible d'effacer." });
      }
    } catch {
      setAskMessages(previous);
    }
  };

  const askInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (mueOpen && mode === "ask") requestAnimationFrame(() => askInputRef.current?.focus());
  }, [mueOpen, mode]);

  if (!mueOpen) return null;

  const hasChat = askMessages.length > 0 || askPending || askHistoryLoading;

  // 3 suggestions (cartes). « Suggérer des tâches » lance le scan inline.
  const suggestions = conv
    ? [
        {
          title: "Résumer ce fil",
          sub: "L'essentiel en 3 points",
          icon: "doc",
          run: () => runAsk("Résume ce fil"),
        },
        {
          title: "Proposer une réponse",
          sub: "Mue rédige pour toi",
          icon: "reply",
          run: () => runAsk("Propose une réponse à ce fil"),
        },
        { title: "Suggérer des tâches", sub: "Mue scanne ce client", icon: "spark", run: runScan },
      ]
    : [
        {
          title: "Suggérer des tâches",
          sub: "Mue scanne tes messages",
          icon: "spark",
          run: runScan,
        },
        {
          title: "Résumer ma journée",
          sub: "Ce qui compte aujourd'hui",
          icon: "doc",
          run: () => runAsk("Résume ma journée"),
        },
        {
          title: "Prioriser cette semaine",
          sub: "Mue ordonne tes tâches",
          icon: "bolt",
          run: () => runAsk("Aide-moi à prioriser cette semaine"),
        },
      ];

  const cardIcon = (k: string) => {
    if (k === "doc")
      return (
        <svg {...stroke}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      );
    if (k === "reply")
      return (
        <svg {...stroke}>
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      );
    if (k === "bolt")
      return (
        <svg {...stroke}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
      </svg>
    );
  };

  const composer = (
    <form className="mue2-composer" onSubmit={handleAsk}>
      <textarea
        ref={askInputRef}
        className="mue2-input"
        placeholder="Besoin d'aide ? Pose une question, recherche ou crée."
        value={askInput}
        onChange={(e) => setAskInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAsk(e);
          }
        }}
        rows={2}
        disabled={askPending}
        aria-label="Demander à Mue"
      />
      <div className="mue2-composer-row">
        <span className="mue2-model">
          <MueMark size={15} /> Max
        </span>
        <button
          type="submit"
          className="mue2-send"
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
  );

  return (
    <aside className="copilot mue-pane mue2 is-open" aria-label="Mue copilot">
      <header className="mue2-head">
        <div className="mue2-tabs" role="tablist" aria-label="Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "ask"}
            className={`mue2-tab ${mode === "ask" ? "is-on" : ""}`}
            onClick={() => setMode("ask")}
          >
            <MueMark size={15} /> Demander
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "agents"}
            className={`mue2-tab ${mode === "agents" ? "is-on" : ""}`}
            onClick={() => setMode("agents")}
          >
            <svg {...stroke} width={15} height={15}>
              <rect x="3" y="8" width="18" height="11" rx="3" />
              <circle cx="8.5" cy="13.5" r="1.6" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="13.5" r="1.6" fill="currentColor" stroke="none" />
              <path d="M12 4v4" />
            </svg>
            Agents
          </button>
        </div>
        <div className="mue2-head-actions">
          {askMessages.length > 0 && mode === "ask" && (
            <button
              type="button"
              className="mue-agent-iconbtn"
              onClick={handleClear}
              aria-label="Nouveau fil"
              title="Nouveau fil"
            >
              <svg {...stroke}>
                <path d="M12 5v14" />
                <path d="M5 12h14" />
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

      {mode === "agents" ? (
        <div className="mue2-agents">
          <span className="mue2-agents-orb">
            <svg {...stroke} width={26} height={26}>
              <rect x="3" y="8" width="18" height="11" rx="3" />
              <circle cx="8.5" cy="13.5" r="1.6" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="13.5" r="1.6" fill="currentColor" stroke="none" />
              <path d="M12 4v4" />
            </svg>
          </span>
          <h2>Agents Mue</h2>
          <p>
            Bientôt : des agents qui agissent seuls (relances, tri, brouillons) pendant que tu fais
            autre chose.
          </p>
        </div>
      ) : !hasChat ? (
        // ── État vide : composer dégradé + 3 suggestions ──
        <div className="mue2-empty">
          {composer}
          {awaitingCount > 0 && !conv && (
            <button type="button" className="mue2-brief" onClick={openToReply}>
              <span className="mue2-brief-badge">{awaitingCount}</span>
              <span>
                <b>
                  {awaitingCount} client{awaitingCount > 1 ? "s" : ""} attend
                  {awaitingCount > 1 ? "ent" : ""} ta réponse
                </b>
              </span>
              <span className="mue2-brief-arrow" aria-hidden>
                →
              </span>
            </button>
          )}
          <div className="mue2-cards">
            {suggestions.map((s) => (
              <button key={s.title} type="button" className="mue2-card" onClick={s.run}>
                <span className="mue2-card-ic">{cardIcon(s.icon)}</span>
                <b className="mue2-card-title">{s.title}</b>
                <small className="mue2-card-sub">{s.sub}</small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // ── Chat pur ──
        <>
          <div className="mue2-chat" ref={logRef} aria-live="polite">
            {askHistoryLoading && <div className="mue2-msg is-mue">Chargement…</div>}
            {askMessages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="mue2-msg is-user">
                  {m.content}
                </div>
              ) : m.kind === "scan" ? (
                <div key={m.id} className="mue2-msg is-mue mue2-msg--scan">
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <MueTaskScanner inline />
                </div>
              ) : (
                <div
                  key={m.id}
                  className={`mue2-msg is-mue ${m.tone === "error" ? "is-error" : ""}`}
                >
                  <div className="mue2-msg-head">
                    <MueMark size={16} /> Mue
                  </div>
                  <div className="mue2-msg-body">{m.content}</div>
                </div>
              )
            )}
            {askPending && (
              <div className="mue2-msg is-mue">
                <div className="mue2-msg-head">
                  <MueMark size={16} /> Mue
                </div>
                <div className="mue2-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
          <div className="mue2-foot">{composer}</div>
        </>
      )}
    </aside>
  );
}
