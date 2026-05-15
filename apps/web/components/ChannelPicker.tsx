"use client";

import { useEffect, useRef } from "react";
import { ChannelLogo } from "@/components/icons/Icon";

const ALL_CHANNELS = [
  { id: "gmail", name: "Gmail" },
  { id: "instagram", name: "Instagram" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "slack", name: "Slack" },
  { id: "discord", name: "Discord" },
  { id: "x", name: "X (Twitter)" },
  { id: "linkedin", name: "LinkedIn" },
  { id: "telegram", name: "Telegram" },
  { id: "messenger", name: "Messenger" },
];

type Props = {
  anchor: HTMLElement | null;
  onClose: () => void;
  connectedIds: Set<string>;
  onConnect: (id: string, name: string) => void;
};

export function ChannelPicker({ anchor, onClose, connectedIds, onConnect }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor || !ref.current) return;
    const r = anchor.getBoundingClientRect();
    const el = ref.current;
    el.style.left = `${r.right + 8}px`;
    el.style.top = `${r.top - 6}px`;
    // Clamp
    const pr = el.getBoundingClientRect();
    if (pr.right > window.innerWidth - 12) {
      el.style.left = `${window.innerWidth - pr.width - 12}px`;
    }
    if (pr.bottom > window.innerHeight - 12) {
      el.style.top = `${window.innerHeight - pr.height - 12}px`;
    }
  }, [anchor]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && e.target !== anchor && !anchor?.contains(e.target as Node)) {
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
    <div ref={ref} className="channel-picker">
      <div className="picker-head">
        <div>
          <div className="picker-title">Add a channel</div>
          <div className="picker-sub">Connect a platform to centralize your inbox</div>
        </div>
      </div>
      {ALL_CHANNELS.map((ch) => {
        const added = connectedIds.has(ch.id);
        return (
          <button
            key={ch.id}
            className={`picker-item ${added ? "is-added" : ""}`}
            type="button"
            onClick={() => {
              if (!added) onConnect(ch.id, ch.name);
            }}
          >
            <ChannelLogo channel={ch.id} />
            <span className="picker-name">{ch.name}</span>
            <span className="picker-connect">{added ? "Connected" : "Connect"}</span>
          </button>
        );
      })}
    </div>
  );
}
