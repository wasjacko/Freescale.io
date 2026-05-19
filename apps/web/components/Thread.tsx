"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/hooks/useToast";
import { useData } from "@/lib/contexts/DataContext";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { EmailHtmlBody } from "@/components/EmailHtmlBody";
import { TagPopover } from "@/components/TagPopover";
import { sendEmailReply } from "@/lib/actions/inbox";
import { getEmailSignature } from "@/lib/actions/profile";
import {
  listEmailTemplates,
  type EmailTemplate,
} from "@/lib/actions/email-templates";
import { getConversationMessages } from "@/lib/actions/thread-messages";
import {
  suggestReplies,
  summarizeThread,
  suggestTasks,
  translateThread,
  type ReplySuggestion,
  type ThreadSummary,
  type SuggestedTask,
  type TranslatedMessage,
} from "@/lib/actions/mue";
import type { Message } from "@/lib/types";

type ThreadAiResult =
  | { kind: "summary"; data: ThreadSummary }
  | { kind: "tasks"; data: SuggestedTask[] }
  | { kind: "translation"; data: TranslatedMessage[]; lang: string }
  | { kind: "loading"; label: string }
  | { kind: "error"; message: string };

const TRANSLATE_LANGS: Array<{ code: string; label: string; flag: string }> = [
  { code: "en", label: "anglais", flag: "🇬🇧" },
  { code: "es", label: "espagnol", flag: "🇪🇸" },
  { code: "fr", label: "français", flag: "🇫🇷" },
  { code: "it", label: "italien", flag: "🇮🇹" },
  { code: "de", label: "allemand", flag: "🇩🇪" },
  { code: "pt", label: "portugais", flag: "🇵🇹" },
  { code: "nl", label: "néerlandais", flag: "🇳🇱" },
  { code: "ar", label: "arabe", flag: "🇸🇦" },
  { code: "zh", label: "chinois", flag: "🇨🇳" },
  { code: "ja", label: "japonais", flag: "🇯🇵" },
];

const QUICK_REPLIES = [
  { id: "suggest", icon: "i-spark", text: "Suggest reply" },
  { id: "good", text: "👍 Sounds good" },
  { id: "call", text: "📅 Book a call" },
  { id: "thanks", text: "🙏 Thanks!" },
];

type MsgGroup = {
  dir: "in" | "out";
  items: Message[];
};

function groupMessages(messages: Message[]): MsgGroup[] {
  const groups: MsgGroup[] = [];
  let curr: MsgGroup | null = null;
  for (const m of messages) {
    if (!curr || curr.dir !== m.dir) {
      curr = { dir: m.dir, items: [m] };
      groups.push(curr);
    } else {
      curr.items.push(m);
    }
  }
  return groups;
}

export function Thread() {
  const { activeConvId, setActiveConv } = useApp();
  const {
    conversations,
    messagesByConv,
    appendOutgoingMessage,
    retryFailedMessage,
    setTags,
    toggleStar,
  } = useData();
  const conv = conversations.find((c) => c.id === activeConvId);
  const push = useToast((s) => s.push);

  const [input, setInput] = useState("");
  const messagesEl = useRef<HTMLElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const starBtnRef = useRef<HTMLButtonElement>(null);
  const tagBtnRef = useRef<HTMLButtonElement>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagAnchor, setTagAnchor] = useState<DOMRect | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // The "starred" state lives on the conversation row in the DB —
  // we derive the visual flag from it (no local mirror) so the
  // server is always the source of truth and the bouton stops being
  // purely cosmetic.
  const isStarred = !!conv?.starred;

  // Live-fetch messages from Gmail on conv open. messagesByConv (server
  // DB cache) used only as an INSTANT fallback for the conv we last
  // rendered — never leaks across conv switches (would show the wrong
  // thread's content for ~300ms while the new fetch resolved).
  const [liveByConv, setLiveByConv] = useState<Record<string, Message[]>>({});
  const [liveError, setLiveError] = useState<string | null>(null);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeConvId) {
      setLiveError(null);
      return;
    }
    // If we already have live messages for THIS conv, skip the re-fetch —
    // user just navigated back to a thread they opened earlier in the
    // session.
    if (liveByConv[activeConvId]) return;

    let cancelled = false;
    setLoadingConvId(activeConvId);
    setLiveError(null);
    getConversationMessages(activeConvId)
      .then((result) => {
        if (cancelled) return;
        if (result.error) setLiveError(result.error);
        setLiveByConv((prev) => ({ ...prev, [activeConvId]: result.messages }));
      })
      .catch((err) => {
        if (cancelled) return;
        setLiveError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingConvId(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

  const isLiveLoading = loadingConvId === activeConvId;

  // Strict per-conv lookup. NO fallback to messagesByConv across convs —
  // showing the wrong thread's content during a switch was the "loading
  // flash" bug.
  const messages = useMemo<Message[]>(
    () => liveByConv[activeConvId] ?? messagesByConv[activeConvId] ?? [],
    [liveByConv, messagesByConv, activeConvId]
  );

  const isEmail = conv?.channel === "gmail";
  const groups = useMemo(() => groupMessages(messages), [messages]);

  // Skeleton flash on conv switch
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 180);
    return () => clearTimeout(t);
  }, [activeConvId]);

  // Auto-scroll to bottom on conv change or send
  useEffect(() => {
    if (messagesEl.current) {
      messagesEl.current.scrollTop = messagesEl.current.scrollHeight;
    }
  }, [activeConvId, messages.length]);

  if (!conv) {
    return (
      <section className="thread thread-empty-pane">
        <div className="thread-empty-card" aria-hidden>
          <p>Sélectionnez une conversation pour la lire ici.</p>
        </div>
      </section>
    );
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    sendBtnRef.current?.classList.add("is-sending");
    setTimeout(() => sendBtnRef.current?.classList.remove("is-sending"), 500);
    // Clear the input optimistically. If the send fails, the message
    // stays visible in the thread tagged "failed" — the user's draft
    // isn't lost, they just retap to retry.
    setInput("");
    try {
      await appendOutgoingMessage(activeConvId, text);
    } catch (err) {
      push({
        kind: "error",
        text:
          err instanceof Error
            ? `Envoi échoué : ${err.message}`
            : "Envoi échoué — réessayez.",
        duration: 5000,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarClick = () => {
    const next = !isStarred;
    // Persist on the server (DataContext does the optimistic flip on
    // conversations[…].starred, which is what isStarred now reads from).
    // Without this call the bouton was purely cosmetic and reset on reload.
    void toggleStar(activeConvId, next);
    if (next && starBtnRef.current) {
      // Particle burst — keep the celebratory animation, but only on
      // the star-ON transition (un-starring shouldn't celebrate).
      const burst = document.createElement("span");
      burst.className = "star-burst";
      const angles = 8;
      const colors = ["#F59E0B", "#EC4899", "#A78BFA", "#FCA5A5", "#FBBF24"];
      for (let i = 0; i < angles; i++) {
        const a = (Math.PI * 2 * i) / angles + (Math.random() - 0.5) * 0.4;
        const r = 22 + Math.random() * 10;
        const p = document.createElement("i");
        p.style.background = colors[i % colors.length] ?? "#FBBF24";
        p.style.setProperty("--bx", `${Math.cos(a) * r}px`);
        p.style.setProperty("--by", `${Math.sin(a) * r}px`);
        burst.appendChild(p);
      }
      starBtnRef.current.appendChild(burst);
      setTimeout(() => burst.remove(), 600);
      push({ kind: "info", text: `★ ${conv.name}`, duration: 1800 });
    }
  };

  const firstName = conv.name.split(/[ –-]/)[0]?.trim() ?? "";

  return (
    <main className="thread">
      <header className="thread-head">
        {/* Mobile-only back button — returns to the inbox list. Hidden
            on desktop by CSS (display:none above 768px). */}
        <button
          type="button"
          className="thread-back"
          onClick={() => setActiveConv("")}
          aria-label="Retour à l'inbox"
        >
          ←
        </button>
        <div className="contact">
          <span className="avatar large">
            <Avatar avatar={conv.avatar} className="" />
            <span className="status-dot" />
          </span>
          <div>
            <h1>{conv.subject || conv.name}</h1>
            <div className="contact-sub">
              {conv.name}
              {conv.contactEmail ? <span style={{ opacity: 0.55 }}> · {conv.contactEmail}</span> : null}
            </div>
          </div>
        </div>
        <div className="head-actions">
          <button
            ref={tagBtnRef}
            className={`icon-btn ${(conv.tags?.length ?? 0) > 0 ? "is-on" : ""}`}
            type="button"
            aria-label="Tags"
            data-tip="Tags"
            aria-expanded={tagOpen}
            onClick={() => {
              setTagAnchor(tagBtnRef.current?.getBoundingClientRect() ?? null);
              setTagOpen((v) => !v);
            }}
          >
            <Icon name="i-tag" />
            {(conv.tags?.length ?? 0) > 0 && (
              <span className="icon-btn-badge">{conv.tags?.length}</span>
            )}
          </button>
          <button
            ref={starBtnRef}
            className={`icon-btn ${isStarred ? "is-on" : ""}`}
            type="button"
            aria-label="Favorite"
            data-tip="Star"
            onClick={handleStarClick}
            style={{ color: isStarred ? "#F59E0B" : undefined, position: "relative" }}
          >
            <svg className="icon" style={{ fill: isStarred ? "#F59E0B" : "none" }}>
              <use href="#i-star" />
            </svg>
          </button>
          {/* "More actions" stub removed — every previously planned
              option (mark unread, archive, snooze, set category, etc.)
              is already reachable via the right-click context menu on
              the conv row in the inbox. Audit #14. */}
        </div>
      </header>

      <TagPopover
        open={tagOpen}
        onClose={() => setTagOpen(false)}
        tags={conv.tags ?? []}
        anchorRect={tagAnchor}
        onChange={(next) => void setTags(activeConvId, next)}
      />

      {/* Inline chips row showing the current tags. Always visible (not
          behind the popover) so the user always knows what's applied. */}
      {(conv.tags?.length ?? 0) > 0 && (
        <div className="thread-tags-row" aria-label="Tags appliqués">
          {(conv.tags ?? []).map((t) => (
            <span key={t} className="tag-chip is-readonly">{t}</span>
          ))}
        </div>
      )}

      {isEmail && <ThreadAiBar conversationId={activeConvId} />}

      <section
        className={`messages ${isEmail ? "is-email" : ""} ${isLoading ? "is-loading" : ""}`}
        id="thread-content"
        ref={messagesEl}
        aria-live="polite"
        tabIndex={-1}
      >
        {isLiveLoading && messages.length === 0 && (
          <div className="email-card-skeleton" aria-busy="true">
            <div className="email-card-skel-row">
              <span className="email-card-skel-avatar" />
              <span className="email-card-skel-meta">
                <span className="email-card-skel-line short" />
                <span className="email-card-skel-line tiny" />
              </span>
            </div>
            <span className="email-card-skel-line full" />
            <span className="email-card-skel-line full" />
            <span className="email-card-skel-line long" />
          </div>
        )}
        {liveError && messages.length === 0 && (
          <div
            style={{
              padding: 28,
              color: "#b91c1c",
              fontSize: 13,
              fontFamily: "monospace",
            }}
          >
            Erreur Gmail : {liveError}
          </div>
        )}
        {isEmail
          ? messages.length === 0
            ? null
            : messages.map((m) => (
              <EmailCard
                key={m.id}
                message={m}
                fallbackName={m.dir === "out" ? "Moi" : conv.name}
                fallbackAvatar={m.dir === "out" ? null : conv.avatar}
              />
            ))
          : groups.map((g, gi) => {
              const isOut = g.dir === "out";
              const lastTime = g.items[g.items.length - 1]?.time ?? "";
              return (
                <div key={gi} className={`msg-group ${isOut ? "out" : "in"}`}>
                  {g.items.map((m, idx) => {
                    const isLast = idx === g.items.length - 1;
                    const hidden = !isLast;
                    const isPending = m.status === "pending";
                    const isFailed = m.status === "failed";
                    return (
                      <div key={m.id} className="msg-row">
                        {!isOut && (
                          <div className={`msg-avatar${hidden ? " hidden" : ""}`}>
                            <Avatar avatar={conv.avatar} className="" />
                          </div>
                        )}
                        <div
                          className={`bubble ${isPending ? "is-pending" : ""} ${
                            isFailed ? "is-failed" : ""
                          }`}
                        >
                          <p>{m.text}</p>
                          {isFailed && (
                            <button
                              type="button"
                              className="bubble-retry"
                              onClick={async () => {
                                try {
                                  await retryFailedMessage(activeConvId, m.id);
                                } catch (err) {
                                  push({
                                    kind: "error",
                                    text:
                                      err instanceof Error
                                        ? `Envoi échoué : ${err.message}`
                                        : "Envoi échoué — réessayez.",
                                    duration: 5000,
                                  });
                                }
                              }}
                            >
                              ↻ Réessayer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <span className="msg-time" style={isOut ? { textAlign: "right" } : undefined}>{lastTime}</span>
                </div>
              );
            })}
      </section>

      <footer className="composer">
        {isEmail ? (
          <EmailComposer
            conversationId={activeConvId}
            toName={conv.name}
            contactEmail={conv.contactEmail ?? null}
          />
        ) : (
          <>
            <div className="quick-replies" id="quick-replies">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q.id}
                  className="quick-reply"
                  type="button"
                  onClick={() =>
                    setInput(
                      q.id === "suggest"
                        ? "I appreciate you sharing this — let me come back to you with a thoughtful reply by end of day."
                        : q.text.replace(/^[\p{Emoji}\s]+/u, "").trim()
                    )
                  }
                >
                  {q.icon && <Icon name={q.icon} />}
                  {q.text}
                </button>
              ))}
            </div>

            <div className="composer-box">
              <input
                className="composer-input"
                type="text"
                placeholder={`Reply to ${firstName}…`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="composer-bar">
                <div className="composer-tools">
                  <button className="icon-btn" type="button" aria-label="Emoji" data-tip="Add emoji"><Icon name="i-smile" /></button>
                  <button className="icon-btn" type="button" aria-label="Attach" data-tip="Attach file"><Icon name="i-clip" /></button>
                  <button className="icon-btn" type="button" aria-label="More" data-tip="More tools"><Icon name="i-more" /></button>
                </div>
                <button
                  ref={sendBtnRef}
                  className="btn btn-primary btn-send"
                  type="button"
                  aria-label="Send"
                  data-tip="Send · Enter"
                  onClick={handleSend}
                >
                  <Icon name="i-send" />
                </button>
              </div>
            </div>
          </>
        )}
      </footer>
    </main>
  );
}

/**
 * Inline Mue toolbar sitting between the thread head and the messages.
 * Holds the three contextual actions (Résumer · Tâches · Traduire) so
 * they live where the user actually reads + replies to the conversation
 * — not buried in the right-side MuePanel which now does the higher-
 * level "brief du jour" job.
 */
function ThreadAiBar({ conversationId }: { conversationId: string }) {
  const push = useToast((s) => s.push);
  const [result, setResult] = useState<ThreadAiResult | null>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  // Clear any previous result the moment the user switches threads so a
  // stale summary doesn't briefly hang over the new conversation.
  useEffect(() => {
    setResult(null);
    setLangPickerOpen(false);
  }, [conversationId]);

  const handleSummary = async () => {
    setResult({ kind: "loading", label: "Résumé en cours…" });
    const res = await summarizeThread(conversationId);
    if (res.error || !res.summary) {
      setResult({ kind: "error", message: res.error ?? "Erreur Mue" });
    } else {
      setResult({ kind: "summary", data: res.summary });
    }
  };

  const handleTasks = async () => {
    setResult({ kind: "loading", label: "Extraction des tâches…" });
    const res = await suggestTasks(conversationId);
    if (res.error) {
      setResult({ kind: "error", message: res.error });
    } else if (res.tasks.length === 0) {
      setResult({
        kind: "error",
        message: "Aucune action concrète détectée dans cette conversation.",
      });
    } else {
      setResult({ kind: "tasks", data: res.tasks });
    }
  };

  const runTranslation = async (langLabel: string) => {
    setLangPickerOpen(false);
    setResult({ kind: "loading", label: `Traduction en ${langLabel}…` });
    const res = await translateThread(conversationId, langLabel);
    if (res.error || res.messages.length === 0) {
      setResult({ kind: "error", message: res.error ?? "Aucune traduction" });
    } else {
      setResult({ kind: "translation", data: res.messages, lang: langLabel });
    }
  };

  return (
    <div className="thread-ai-bar">
      <div className="thread-ai-actions">
        <button type="button" className="thread-ai-btn" onClick={handleSummary}>
          <Icon name="i-list" /> Résumer
        </button>
        <button type="button" className="thread-ai-btn" onClick={handleTasks}>
          <Icon name="i-spark" /> Tâches
        </button>
        <button
          type="button"
          className={`thread-ai-btn ${langPickerOpen ? "is-active" : ""}`}
          onClick={() => setLangPickerOpen((o) => !o)}
          aria-expanded={langPickerOpen}
        >
          <Icon name="i-globe" /> Traduire
          <span className="thread-ai-chevron" aria-hidden>{langPickerOpen ? "▴" : "▾"}</span>
        </button>
        {result && (
          <button
            type="button"
            className="thread-ai-close"
            onClick={() => setResult(null)}
            aria-label="Fermer le résultat Mue"
          >
            ✕
          </button>
        )}
      </div>

      {langPickerOpen && (
        <div className="thread-ai-lang" role="menu">
          {TRANSLATE_LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitem"
              className="thread-ai-lang-option"
              onClick={() => {
                void runTranslation(l.label);
                push({ text: `Mue traduit en ${l.label}…`, duration: 1600 });
              }}
            >
              <span aria-hidden>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      )}

      {result && result.kind === "loading" && (
        <div className="thread-ai-result is-loading">
          <span className="mue-result-spinner" /> {result.label}
        </div>
      )}
      {result && result.kind === "error" && (
        <div className="thread-ai-result is-error">{result.message}</div>
      )}
      {result && result.kind === "summary" && (
        <div className="thread-ai-result">
          <p className="thread-ai-tldr">{result.data.tldr}</p>
          <ul className="thread-ai-bullets">
            {result.data.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}
      {result && result.kind === "tasks" && (
        <ul className="thread-ai-result thread-ai-tasks">
          {result.data.map((t, i) => (
            <li key={i} className={`mue-task is-${t.priority}`}>
              <span className="mue-task-priority" />
              <span className="mue-task-title">{t.title}</span>
              {t.due && <span className="mue-task-due">{t.due}</span>}
            </li>
          ))}
        </ul>
      )}
      {result && result.kind === "translation" && (
        <div className="thread-ai-result thread-ai-translation">
          {result.data.map((m, i) => (
            <div key={i} className="mue-translated-msg">
              <div className="mue-translated-meta">
                <strong>{m.sender}</strong>
                <span>{new Date(m.date).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
              </div>
              <p>{m.translated}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailCard({
  message,
  fallbackName,
  fallbackAvatar,
}: {
  message: Message;
  fallbackName: string;
  fallbackAvatar: import("@/lib/types").Avatar | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const name = message.senderName || fallbackName;
  const email = message.senderEmail || "";
  const avatarSrc =
    message.senderAvatarUrl ||
    (fallbackAvatar && fallbackAvatar.kind === "img" ? fallbackAvatar.src : null);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || (email[0]?.toUpperCase() ?? "?");

  const hasHtml = !!message.bodyHtml && message.bodyHtml.length > 50;

  // Strip the long auto-footers (=== separator, "View this email in browser"…)
  // for a tighter preview. Keep the first ~80 lines / 4000 chars max.
  const cleaned = (message.text || "").replace(/ /g, " ").trim();

  return (
    <article className={`email-card ${message.dir === "out" ? "is-out" : ""}`}>
      <header className="email-card-head">
        <div className="email-card-avatar">
          {avatarSrc && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="email-card-meta">
          <div className="email-card-line">
            <span className="email-card-name">{name}</span>
            {email && <span className="email-card-email">&lt;{email}&gt;</span>}
          </div>
          <div className="email-card-date">{message.dateLong || message.time}</div>
        </div>
      </header>
      <div className="email-card-body">
        {/* Render BOTH text and html when both exist. The text shows
            instantly while the HTML iframe loads — and serves as a
            fallback if DOMPurify fails to load client-side. Previously
            the right panel could stay blank forever when the iframe
            never rendered. */}
        {cleaned && (
          <pre style={{ marginBottom: hasHtml ? 16 : 0 }}>{cleaned}</pre>
        )}
        {hasHtml && (
          <EmailHtmlBody html={message.bodyHtml as string} />
        )}
        {!cleaned && !hasHtml && (
          <p style={{ opacity: 0.5, fontStyle: "italic" }}>(Aucun contenu textuel)</p>
        )}
      </div>
    </article>
  );
}

const SIGNATURE_SEP = "\n\n-- \n";

function EmailComposer({
  conversationId,
  toName,
  contactEmail,
}: {
  conversationId: string;
  toName: string;
  contactEmail: string | null;
}) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  // Signature lives in component state (not a module-level cache) so it
  // can't leak between users on a shared device. When user A signs out,
  // the EmailComposer instance unmounts and the state is collected; the
  // next sign-in mounts a fresh component with a fresh fetch.
  const [signature, setSignature] = useState("");
  const [signatureLoaded, setSignatureLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mue — AI reply suggestions
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  // User-saved reply templates. Lazy-loaded the first time the user opens
  // the picker (no network on every conv switch) — then kept in memory
  // for the session.
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Fetch the signature ONCE per component lifecycle. The Composer mounts
  // when the user enters /app and unmounts on sign-out → no cross-user
  // leak (which the module-level cache used to have).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sig = await getEmailSignature();
        if (!cancelled) {
          setSignature(sig);
          setSignatureLoaded(true);
        }
      } catch {
        if (!cancelled) setSignatureLoaded(true); // mark loaded even on error so the conv-switch effect can run with empty sig
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset suggestions + pre-fill body with the signature whenever the
  // user switches to a different conv. We prefill (rather than appending
  // on send) so the user sees exactly what will be sent and can tweak it.
  // signature is NOT in the deps — that's intentional: if the user edits
  // their sig in Settings mid-draft, the draft shouldn't be wiped. The
  // dedicated "signature-updated" listener below handles that case
  // conditionally (only updates body if it was still empty/just-the-sig).
  useEffect(() => {
    setSuggestions([]);
    if (!signatureLoaded) return; // Wait for first fetch; avoids a "" → sig flash.
    setBody(signature ? `${SIGNATURE_SEP}${signature}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, signatureLoaded]);

  // Close the templates menu on outside-click or Escape.
  useEffect(() => {
    if (!templatesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTemplatesOpen(false);
    };
    const onDocClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".email-composer-templates-wrap")) return;
      setTemplatesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Defer so the open click doesn't immediately close.
    const t = setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
      clearTimeout(t);
    };
  }, [templatesOpen]);

  // Listen for TemplatesManager mutations so the composer cache stays in
  // sync without a page reload.
  useEffect(() => {
    const onChanged = () => {
      setTemplates(null); // Force re-fetch on next open.
    };
    window.addEventListener("freescale:templates-changed", onChanged);
    return () => window.removeEventListener("freescale:templates-changed", onChanged);
  }, []);

  // Listen for ProfileForm saves so the composer reflects an in-session
  // signature edit without a page reload. The body only auto-refreshes
  // if the user's draft is still just the previous signature (i.e. they
  // haven't typed anything) — otherwise we'd nuke a half-written reply.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail ?? "";
      setSignature(detail);
      setBody((prev) => {
        const isJustSignature =
          prev.trim() === "" ||
          (signature && prev === `${SIGNATURE_SEP}${signature}`);
        if (isJustSignature) return detail ? `${SIGNATURE_SEP}${detail}` : "";
        return prev;
      });
    };
    window.addEventListener("freescale:signature-updated", onUpdate);
    return () => window.removeEventListener("freescale:signature-updated", onUpdate);
  }, [signature]);

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const result = await suggestReplies(conversationId);
      if (result.error) {
        push({
          text: `Mue : ${result.error}`,
          duration: 5000,
        });
        return;
      }
      if (result.suggestions.length === 0) {
        push({ text: "Mue n'a pas pu générer de suggestions.", duration: 3000 });
        return;
      }
      setSuggestions(result.suggestions);
    } catch (err) {
      push({
        text: err instanceof Error ? err.message : "Mue est indisponible.",
        duration: 5000,
      });
    } finally {
      setSuggesting(false);
    }
  };

  const openTemplates = async () => {
    // Toggle close if already open. Lazy-load on first open.
    if (templatesOpen) {
      setTemplatesOpen(false);
      return;
    }
    if (templates === null) {
      setTemplatesLoading(true);
      try {
        const list = await listEmailTemplates();
        setTemplates(list);
      } catch {
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    }
    setTemplatesOpen(true);
  };

  const insertTemplate = (t: EmailTemplate) => {
    // Replace template variables with their concrete values:
    //   {{firstName}}  — first token of the contact's name
    //   {{lastName}}   — remaining tokens of the contact's name (may be empty)
    //   {{fullName}}   — full contact name
    //   {{date}}       — today's date in the user's locale (long format)
    //   {{time}}       — current time HH:MM (24h)
    // Unknown variables are left as-is so the user spots typos. Then
    // append the signature so it survives the template swap.
    const first = toName.split(/[ –-]/)[0]?.trim() ?? "";
    const rest = toName.slice(first.length).trim();
    const now = new Date();
    const date = now.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const replaced = t.body
      .replace(/\{\{\s*firstName\s*\}\}/gi, first)
      .replace(/\{\{\s*lastName\s*\}\}/gi, rest)
      .replace(/\{\{\s*fullName\s*\}\}/gi, toName)
      .replace(/\{\{\s*date\s*\}\}/gi, date)
      .replace(/\{\{\s*time\s*\}\}/gi, time);
    setBody(signature ? `${replaced}${SIGNATURE_SEP}${signature}` : replaced);
    setTemplatesOpen(false);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed && files.length === 0) {
      push({ text: "Le message est vide." });
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("conversationId", conversationId);
      fd.append("text", trimmed);
      if (cc.trim()) fd.append("cc", cc.trim());
      for (const f of files) fd.append("files", f);

      await sendEmailReply(fd);
      push({ text: "Email envoyé via Gmail ✉", duration: 3000 });
      // Reset back to a fresh draft with just the signature, so the
      // next reply opens ready-to-type.
      setBody(signature ? `${SIGNATURE_SEP}${signature}` : "");
      setCc("");
      setShowCc(false);
      setFiles([]);
      // Refresh server data so the new message appears in the thread.
      // (Combined with DataProvider's useEffect on initial props.)
      router.refresh();
    } catch (err) {
      push({
        text: err instanceof Error ? err.message : "Envoi impossible.",
        duration: 5000,
      });
    } finally {
      setSending(false);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="email-composer">
      <div className="email-composer-headers">
        <div className="email-composer-row">
          <span className="email-composer-label">À</span>
          <span className="email-composer-value">
            {toName}
            {contactEmail ? <span className="email-composer-email"> &lt;{contactEmail}&gt;</span> : null}
          </span>
          {!showCc && (
            <button
              type="button"
              className="email-composer-toggle"
              onClick={() => setShowCc(true)}
            >
              Cc
            </button>
          )}
        </div>
        {showCc && (
          <div className="email-composer-row">
            <span className="email-composer-label">Cc</span>
            <input
              type="text"
              className="email-composer-cc"
              placeholder="email1@…, email2@…"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="email-composer-toggle"
              onClick={() => {
                setShowCc(false);
                setCc("");
              }}
              aria-label="Retirer Cc"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mue-suggestions">
          <span className="mue-suggestions-label">
            <Icon name="i-spark" />
            Mue suggère
          </span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="mue-suggestion-chip"
              onClick={() => {
                // Insert the suggestion above the signature so the user
                // doesn't lose their auto-appended sig when picking a
                // Mue-generated reply.
                setBody(
                  signature ? `${s.text}${SIGNATURE_SEP}${signature}` : s.text
                );
                setSuggestions([]);
              }}
              title={s.text}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className="mue-suggestion-dismiss"
            onClick={() => setSuggestions([])}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      <textarea
        className="email-composer-body"
        placeholder={`Votre réponse à ${toName}…`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
      />

      {files.length > 0 && (
        <div className="email-composer-files">
          {files.map((f, idx) => (
            <span key={idx} className="email-composer-file">
              <Icon name="i-clip" />
              <span>{f.name}</span>
              <em>{(f.size / 1024).toFixed(0)} Ko</em>
              <button
                type="button"
                aria-label="Retirer"
                onClick={() => removeFile(idx)}
              >
                ✕
              </button>
            </span>
          ))}
          <span className="email-composer-total">
            Total : {(totalSize / 1024 / 1024).toFixed(2)} Mo (max 25 Mo)
          </span>
        </div>
      )}

      <div className="email-composer-actions">
        <button
          type="button"
          className="email-composer-attach"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
        >
          <Icon name="i-clip" />
          Joindre
        </button>
        <div className="email-composer-templates-wrap">
          <button
            type="button"
            className="email-composer-templates"
            onClick={openTemplates}
            disabled={sending}
            aria-expanded={templatesOpen}
            title="Insérer un modèle de réponse"
          >
            <Icon name="i-edit" />
            Modèles
          </button>
          {templatesOpen && (
            <div className="templates-menu" role="menu">
              {templatesLoading && (
                <div className="templates-menu-empty">Chargement…</div>
              )}
              {!templatesLoading && templates && templates.length === 0 && (
                <div className="templates-menu-empty">
                  Aucun modèle. Créez-en dans Paramètres → Modèles.
                </div>
              )}
              {!templatesLoading &&
                templates &&
                templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="templates-menu-item"
                    role="menuitem"
                    onClick={() => insertTemplate(t)}
                  >
                    <span className="templates-menu-name">{t.name}</span>
                    <span className="templates-menu-preview">
                      {t.body.replace(/\s+/g, " ").slice(0, 60) || "Modèle vide"}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="email-composer-mue"
          onClick={handleSuggest}
          disabled={suggesting || sending}
          title="Mue génère 3 propositions de réponse contextuelles"
        >
          <Icon name="i-spark" />
          {suggesting ? "Mue réfléchit…" : "Suggérer (Mue)"}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="email-composer-send"
          onClick={handleSend}
          disabled={sending || (!body.trim() && files.length === 0)}
        >
          <Icon name="i-send" />
          {sending ? "Envoi…" : "Envoyer sur Gmail"}
        </button>
      </div>
    </div>
  );
}
