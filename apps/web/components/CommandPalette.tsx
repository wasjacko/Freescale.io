"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/contexts/DataContext";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { searchInbox, type SearchHit } from "@/lib/actions/search";

type CmdkProps = {
  open: boolean;
  onClose: () => void;
};

const MATCH_LABEL: Record<SearchHit["matchedIn"], string> = {
  subject: "Sujet",
  preview: "Aperçu",
  contact: "Contact",
  body: "Corps du mail",
};

export function CommandPalette({ open, onClose }: CmdkProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [serverResults, setServerResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setView, setActiveConv } = useApp();
  const { conversations } = useData();

  const actions = useMemo(
    () => [
      { id: "go-inbox", icon: "📥", name: "Aller à l'inbox", fn: () => setView("inbox") },
      { id: "go-tasks", icon: "✓", name: "Aller aux tâches", fn: () => setView("tasks") },
      { id: "go-cal", icon: "📅", name: "Aller au calendrier", fn: () => setView("calendar") },
      { id: "go-ai", icon: "✨", name: "Ouvrir AI Knowledge", fn: () => setView("ai-knowledge") },
    ],
    [setView]
  );

  const q = query.trim().toLowerCase();

  // Local instant matches (already-loaded conversations) — sub-50ms so
  // the user sees something immediately while the server search fires.
  const localMatches = useMemo(() => {
    if (!q || q.length < 2) return conversations.slice(0, 6);
    return conversations
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.preview.toLowerCase().includes(q) ||
          (c.subject ?? "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [q, conversations]);

  // Server search: covers the whole workspace including body_text of
  // emails that aren't in the eagerly-loaded 150-conv slice. Debounced
  // 280ms so we don't fire a query on every keystroke.
  useEffect(() => {
    if (!q || q.length < 2) {
      setServerResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchInbox(q);
        setServerResults(res.results);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  // Merge local + server, deduplicate by conv id. Local first (instant),
  // then server additions that weren't in local.
  const localIds = new Set(localMatches.map((c) => c.id));
  const serverAdditions = serverResults.filter((r) => !localIds.has(r.conversationId));
  const matchedActions = q ? actions.filter((a) => a.name.toLowerCase().includes(q)) : actions;
  const total = localMatches.length + serverAdditions.length + matchedActions.length;

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setServerResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (activeIdx >= total) setActiveIdx(0);
  }, [total, activeIdx]);

  const goToConv = (id: string) => {
    setView("inbox");
    setActiveConv(id);
  };

  const runActive = () => {
    if (activeIdx < localMatches.length) {
      const conv = localMatches[activeIdx];
      if (conv) goToConv(conv.id);
    } else if (activeIdx < localMatches.length + serverAdditions.length) {
      const hit = serverAdditions[activeIdx - localMatches.length];
      if (hit) goToConv(hit.conversationId);
    } else {
      const aIdx = activeIdx - localMatches.length - serverAdditions.length;
      const action = matchedActions[aIdx];
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
      aria-label="Recherche globale"
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
            placeholder="Chercher dans tous vos mails, ou lancer une commande…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
          />
          {searching ? <span className="cmdk-spin" aria-hidden /> : <kbd>esc</kbd>}
        </div>
        <div className="cmdk-list">
          {localMatches.length > 0 && (
            <div className="cmdk-group-label">Conversations récentes</div>
          )}
          {localMatches.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`cmdk-item ${activeIdx === i ? "is-active" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => {
                goToConv(c.id);
                onClose();
              }}
            >
              <Avatar avatar={c.avatar} />
              <span className="cmdk-name">{c.name}</span>
              <span className="cmdk-meta">{c.preview.slice(0, 36)}</span>
            </button>
          ))}

          {serverAdditions.length > 0 && (
            <div className="cmdk-group-label">Plus loin dans l'inbox</div>
          )}
          {serverAdditions.map((hit, i) => {
            const idx = localMatches.length + i;
            return (
              <button
                key={hit.conversationId}
                type="button"
                className={`cmdk-item ${activeIdx === idx ? "is-active" : ""}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => {
                  goToConv(hit.conversationId);
                  onClose();
                }}
              >
                <span className="cmdk-server-orb" aria-hidden>
                  {hit.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="cmdk-name">{hit.name}</span>
                <span className="cmdk-meta">
                  <span className="cmdk-match-badge">{MATCH_LABEL[hit.matchedIn]}</span>
                  {(hit.subject || hit.preview).slice(0, 36)}
                </span>
              </button>
            );
          })}

          {matchedActions.length > 0 && (
            <div className="cmdk-group-label">Actions</div>
          )}
          {matchedActions.map((a, i) => {
            const idx = localMatches.length + serverAdditions.length + i;
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

          {total === 0 && q && !searching && (
            <div className="cmdk-empty">Aucun résultat pour &quot;{query}&quot;</div>
          )}
        </div>
      </div>
    </div>
  );
}
