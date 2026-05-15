"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/hooks/useToast";
import { useData } from "@/lib/contexts/DataContext";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";

type CmdkProps = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: CmdkProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setView, setActiveConv } = useApp();
  const { conversations } = useData();
  const push = useToast((s) => s.push);

  const actions = useMemo(
    () => [
      { id: "mark-all", icon: "✓", name: "Mark all as read", fn: () => push({ text: "All conversations marked as read" }) },
      { id: "new-task", icon: "+", name: "New task", fn: () => { setView("tasks"); push({ text: "Open a new task — coming soon ⚡" }); } },
      { id: "go-cal", icon: "📅", name: "Go to calendar", fn: () => setView("calendar") },
      { id: "go-ai", icon: "✨", name: "Open AI Knowledge", fn: () => setView("ai-knowledge") },
    ],
    [push, setView]
  );

  const q = query.trim().toLowerCase();
  const matchedConvs = q
    ? conversations.filter(
        (c) => c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)
      ).slice(0, 6)
    : conversations.slice(0, 6);
  const matchedActions = q ? actions.filter((a) => a.name.toLowerCase().includes(q)) : actions;
  const total = matchedConvs.length + matchedActions.length;

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (activeIdx >= total) setActiveIdx(0);
  }, [total, activeIdx]);

  const runActive = () => {
    if (activeIdx < matchedConvs.length) {
      const conv = matchedConvs[activeIdx];
      if (conv) {
        setView("inbox");
        setActiveConv(conv.id);
      }
    } else {
      const action = matchedActions[activeIdx - matchedConvs.length];
      action?.fn();
    }
    onClose();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      runActive();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % Math.max(total, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + Math.max(total, 1)) % Math.max(total, 1));
    }
  };

  return (
    <div
      className={`cmdk-overlay ${open ? "is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmdk">
        <div className="cmdk-search">
          <Icon name="i-search" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search conversations, run a command…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
          />
          <kbd>esc</kbd>
        </div>
        <div className="cmdk-list">
          {matchedConvs.length > 0 && <div className="cmdk-group-label">Conversations</div>}
          {matchedConvs.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`cmdk-item ${activeIdx === i ? "is-active" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => {
                setView("inbox");
                setActiveConv(c.id);
                onClose();
              }}
            >
              <Avatar avatar={c.avatar} />
              <span className="cmdk-name">{c.name}</span>
              <span className="cmdk-meta">{c.preview.slice(0, 30)}</span>
            </button>
          ))}
          {matchedActions.length > 0 && <div className="cmdk-group-label">Actions</div>}
          {matchedActions.map((a, i) => {
            const idx = matchedConvs.length + i;
            return (
              <button
                key={a.id}
                type="button"
                className={`cmdk-item ${activeIdx === idx ? "is-active" : ""}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => {
                  a.fn();
                  onClose();
                }}
              >
                <span
                  className="channel-logo"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(99,102,241,0.10)",
                    color: "#4F46E5",
                    fontWeight: 700,
                  }}
                >
                  {a.icon}
                </span>
                <span className="cmdk-name">{a.name}</span>
              </button>
            );
          })}
          {total === 0 && <div className="cmdk-empty">No results for &quot;{query}&quot;</div>}
        </div>
      </div>
    </div>
  );
}
