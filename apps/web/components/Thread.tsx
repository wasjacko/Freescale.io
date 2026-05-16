"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/hooks/useToast";
import { useData } from "@/lib/contexts/DataContext";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import type { Message } from "@/lib/types";

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
  const { activeConvId } = useApp();
  const { conversations, messagesByConv, appendOutgoingMessage } = useData();
  const conv = conversations.find((c) => c.id === activeConvId);
  const push = useToast((s) => s.push);

  const [input, setInput] = useState("");
  const messagesEl = useRef<HTMLElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const starBtnRef = useRef<HTMLButtonElement>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messages = useMemo<Message[]>(
    () => messagesByConv[activeConvId] ?? [],
    [messagesByConv, activeConvId]
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
    return <section className="thread" />;
  }

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendBtnRef.current?.classList.add("is-sending");
    setTimeout(() => sendBtnRef.current?.classList.remove("is-sending"), 500);
    void appendOutgoingMessage(activeConvId, text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarClick = () => {
    const next = !isStarred;
    setIsStarred(next);
    if (next && starBtnRef.current) {
      // Particle burst
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
      push({ text: `★ Starred ${conv.name}`, duration: 1800 });
    }
  };

  const firstName = conv.name.split(/[ –-]/)[0]?.trim() ?? "";

  return (
    <main className="thread">
      <header className="thread-head">
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
          <button className="icon-btn" type="button" aria-label="Tag" data-tip="Add tag" onClick={() => push({ text: "Tags — coming soon" })}>
            <Icon name="i-tag" />
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
          <button className="icon-btn" type="button" aria-label="More" data-tip="More actions" onClick={() => push({ text: "More actions — coming soon" })}>
            <Icon name="i-more" />
          </button>
        </div>
      </header>

      <section
        className={`messages ${isEmail ? "is-email" : ""} ${isLoading ? "is-loading" : ""}`}
        id="thread-content"
        ref={messagesEl}
        aria-live="polite"
        tabIndex={-1}
      >
        {isEmail
          ? messages.map((m) => (
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
                    return (
                      <div key={m.id} className="msg-row">
                        {!isOut && (
                          <div className={`msg-avatar${hidden ? " hidden" : ""}`}>
                            <Avatar avatar={conv.avatar} className="" />
                          </div>
                        )}
                        <div className="bubble"><p>{m.text}</p></div>
                      </div>
                    );
                  })}
                  <span className="msg-time" style={isOut ? { textAlign: "right" } : undefined}>{lastTime}</span>
                </div>
              );
            })}
      </section>

      <footer className="composer">
        <div className="quick-replies" id="quick-replies">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q.id}
              className="quick-reply"
              type="button"
              onClick={() => setInput(q.id === "suggest"
                ? "I appreciate you sharing this — let me come back to you with a thoughtful reply by end of day."
                : q.text.replace(/^[\p{Emoji}\s]+/u, "").trim())}
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
      </footer>
    </main>
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

  // Strip the long auto-footers (=== separator, "View this email in browser"…)
  // for a tighter preview. Keep the first ~80 lines / 4000 chars max.
  const cleaned = (message.text || "").replace(/ /g, " ").trim();

  return (
    <article className={`email-card ${message.dir === "out" ? "is-out" : ""}`}>
      <header className="email-card-head">
        <div className="email-card-avatar">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
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
        {cleaned ? (
          <pre>{cleaned}</pre>
        ) : (
          <p style={{ opacity: 0.5, fontStyle: "italic" }}>(Aucun contenu textuel)</p>
        )}
      </div>
    </article>
  );
}
