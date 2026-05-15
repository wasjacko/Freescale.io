"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons/Icon";

export type ContextAction =
  | "open"
  | "mark-read"
  | "mark-unread"
  | "star"
  | "archive";

type Props = {
  x: number;
  y: number;
  isUnread: boolean;
  onClose: () => void;
  onAction: (action: ContextAction) => void;
};

export function ContextMenu({ x, y, isUnread, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
    el.style.top = `${Math.min(y, window.innerHeight - 200)}px`;
  }, [x, y]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
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
  }, [onClose]);

  return (
    <div ref={ref} className="ctx-menu">
      <button className="ctx-item" type="button" onClick={() => { onAction("open"); onClose(); }}>
        <Icon name="i-inbox" /> Open conversation
      </button>
      <button
        className="ctx-item"
        type="button"
        onClick={() => { onAction(isUnread ? "mark-read" : "mark-unread"); onClose(); }}
      >
        <Icon name="i-check" /> {isUnread ? "Mark as read" : "Mark as unread"}
      </button>
      <button className="ctx-item" type="button" onClick={() => { onAction("star"); onClose(); }}>
        <Icon name="i-star" /> Star
      </button>
      <div className="ctx-divider" />
      <button className="ctx-item is-danger" type="button" onClick={() => { onAction("archive"); onClose(); }}>
        <Icon name="i-folder" /> Archive
      </button>
    </div>
  );
}
