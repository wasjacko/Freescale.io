"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SHORTCUTS = {
  navigation: [
    { label: "Open command palette", keys: ["⌘", "K"], pcKeys: ["Ctrl", "K"] },
    { label: "Show this menu", keys: ["?"] },
    { label: "Next conversation", keys: ["J"] },
    { label: "Previous conversation", keys: ["K"] },
    { label: "Open conversation", keys: ["Enter"] },
  ],
  actions: [
    { label: "Send message", keys: ["Enter"] },
    { label: "Toggle sidebar", keys: ["⌘", "\\"], pcKeys: ["Ctrl", "\\"] },
    { label: "Close any panel", keys: ["Esc"] },
  ],
};

export function ShortcutsModal({ open, onClose }: Props) {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  return (
    <div
      className={`shortcuts-modal ${open ? "is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <div className="shortcuts-panel">
        <div className="shortcuts-head">
          <h3>Keyboard shortcuts</h3>
          <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="shortcuts-body">
          {Object.entries(SHORTCUTS).map(([group, items]) => (
            <div key={group} className="shortcuts-group">
              <div className="shortcuts-group-label">{group}</div>
              {items.map((s) => {
                const keys = !isMac && "pcKeys" in s && s.pcKeys ? s.pcKeys : s.keys;
                return (
                  <div key={s.label} className="shortcut-row">
                    <span>{s.label}</span>
                    <span className="shortcut-keys">
                      {keys.map((k) => (
                        <kbd key={k}>{k}</kbd>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
