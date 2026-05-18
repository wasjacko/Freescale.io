"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anchored popover for editing a conversation's tag list. Renders inline
 * (no portal) and uses absolute positioning relative to its anchor's
 * parent. Closes on outside-click and Escape.
 *
 * Tags are lower-cased, trimmed, and de-duplicated locally before being
 * sent to the parent's onChange. The server applies the same normalization
 * so the canonical list always matches.
 */
export function TagPopover({
  open,
  onClose,
  tags,
  onChange,
  anchorRect,
}: {
  open: boolean;
  onClose: () => void;
  tags: string[];
  onChange: (next: string[]) => void;
  /** Bounding rect of the icon-button that opened this popover, used to
   *  position the floating panel relative to the viewport. */
  anchorRect: DOMRect | null;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraft("");
      // Tiny delay so the focus doesn't race the open animation.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (e.target instanceof Node && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    // Defer so the click that opened us doesn't immediately close us.
    const t = setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const commit = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t || t.length > 24) return;
    if (tags.includes(t)) return;
    if (tags.length >= 12) return;
    onChange([...tags, t]);
    setDraft("");
  };

  const remove = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  // Anchor the panel just below the icon button, right-aligned to it so
  // it never spills off the right edge of a wide-screen header.
  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 240),
        right: Math.max(8, window.innerWidth - anchorRect.right),
      }
    : { position: "fixed", top: 80, right: 24 };

  return (
    <div className="tag-popover" ref={panelRef} style={style} role="dialog" aria-label="Tags">
      <div className="tag-popover-label">Tags</div>
      {tags.length > 0 && (
        <div className="tag-popover-chips">
          {tags.map((t) => (
            <span key={t} className="tag-chip">
              {t}
              <button
                type="button"
                className="tag-chip-x"
                aria-label={`Retirer ${t}`}
                onClick={() => remove(t)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        className="tag-popover-input"
        placeholder={tags.length === 0 ? "client, urgent, demo…" : "Ajouter un tag…"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
            e.preventDefault();
            onChange(tags.slice(0, -1));
          }
        }}
        maxLength={24}
      />
      <p className="tag-popover-hint">
        Entrée pour ajouter · Retour arrière pour retirer
      </p>
    </div>
  );
}
