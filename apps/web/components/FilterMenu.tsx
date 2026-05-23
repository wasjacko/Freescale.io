"use client";

import { useEffect, useRef } from "react";

export type FilterMode = "all" | "unread" | "mentions" | "assigned";

type Props = {
  anchor: HTMLElement | null;
  onClose: () => void;
  current: FilterMode;
  onSelect: (mode: FilterMode) => void;
  counts: { all: number; unread: number; mentions: number; assigned: number };
};

export function FilterMenu({ anchor, onClose, current, onSelect, counts }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor || !menuRef.current) return;
    const r = anchor.getBoundingClientRect();
    const el = menuRef.current;
    el.style.top = `${r.bottom + 6}px`;
    el.style.left = `${Math.max(8, r.right - 220)}px`;
  }, [anchor]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && e.target !== anchor) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    setTimeout(() => {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  return (
    <div ref={menuRef} className="filter-menu">
      <button
        className={`filter-item ${current === "all" ? "is-on" : ""}`}
        type="button"
        onClick={() => {
          onSelect("all");
          onClose();
        }}
      >
        All <span className="filter-num">{counts.all}</span>
      </button>
      <button
        className={`filter-item ${current === "unread" ? "is-on" : ""}`}
        type="button"
        onClick={() => {
          onSelect("unread");
          onClose();
        }}
      >
        Unread <span className="filter-num">{counts.unread}</span>
      </button>
      <div className="filter-divider" />
      <button
        className={`filter-item ${current === "assigned" ? "is-on" : ""}`}
        type="button"
        onClick={() => {
          onSelect("assigned");
          onClose();
        }}
      >
        Mes assignations <span className="filter-num">{counts.assigned}</span>
      </button>
      <button
        className={`filter-item ${current === "mentions" ? "is-on" : ""}`}
        type="button"
        onClick={() => {
          onSelect("mentions");
          onClose();
        }}
      >
        Mentions <span className="filter-num">{counts.mentions}</span>
      </button>
    </div>
  );
}
