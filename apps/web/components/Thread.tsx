"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { CONVERSATIONS, MESSAGES } from "@/lib/data/conversations";
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
  const conv = CONVERSATIONS.find((c) => c.id === activeConvId);
  const baseMessages = MESSAGES[activeConvId] ?? [];

  const [sent, setSent] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const messagesEl = useRef<HTMLElement>(null);
  const [isStarred, setIsStarred] = useState(false);

  const messages = useMemo(
    () => [...baseMessages, ...(sent[activeConvId] ?? [])],
    [baseMessages, sent, activeConvId]
  );

  const groups = useMemo(() => groupMessages(messages), [messages]);

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
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    setSent((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), { id: crypto.randomUUID(), dir: "out", text, time }],
    }));
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
            <h1>{conv.name}</h1>
            <div className="contact-sub">{conv.channel.charAt(0).toUpperCase() + conv.channel.slice(1)}</div>
          </div>
        </div>
        <div className="head-actions">
          <button className="icon-btn" type="button" aria-label="Tag" data-tip="Add tag">
            <Icon name="i-tag" />
          </button>
          <button
            className={`icon-btn ${isStarred ? "is-on" : ""}`}
            type="button"
            aria-label="Favorite"
            data-tip="Star"
            onClick={() => setIsStarred((v) => !v)}
            style={{ color: isStarred ? "#F59E0B" : undefined }}
          >
            <svg className="icon" style={{ fill: isStarred ? "#F59E0B" : "none" }}>
              <use href="#i-star" />
            </svg>
          </button>
          <button className="icon-btn" type="button" aria-label="More" data-tip="More actions">
            <Icon name="i-more" />
          </button>
        </div>
      </header>

      <section className="messages" id="thread-content" ref={messagesEl} aria-live="polite">
        {groups.map((g, gi) => {
          const isOut = g.dir === "out";
          const lastTime = g.items[g.items.length - 1]?.time ?? "";
          return (
            <div key={gi} className={`msg-group ${isOut ? "out" : "in"}`}>
              {g.items.map((m, idx) => {
                const isLast = idx === g.items.length - 1;
                const hidden = !isLast;
                if (m.shots) {
                  return (
                    <div key={m.id} className="msg-row">
                      {!isOut && (
                        <div className={`msg-avatar${hidden ? " hidden" : ""}`}>
                          <Avatar avatar={conv.avatar} className="" />
                        </div>
                      )}
                      <div className="preview-grid">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="shot">
                            <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
                              <rect width="120" height="160" fill="#F4F4F6" />
                              <text x="60" y="80" textAnchor="middle" fill="#94A3B8" fontSize="10">screenshot {i}</text>
                            </svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
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
