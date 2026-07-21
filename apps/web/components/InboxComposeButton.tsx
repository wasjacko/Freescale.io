"use client";

// Bouton compose compact (icône crayon) — visible en mobile uniquement, vit à
// droite du sort dans .ibx-search-wrap--list. Remplace l'ancien FAB violet
// flottant qui chevauchait la bottom-nav.

import { NewMessageModal } from "@/components/NewMessageModal";
import { useApp } from "@/lib/store";
import { useState } from "react";

export function InboxComposeButton() {
  const { inboxMode, setActiveConv } = useApp();
  const [open, setOpen] = useState(false);

  const label = inboxMode === "email" ? "Nouvel email" : "Nouveau message";

  return (
    <>
      <button
        type="button"
        className="ibx-compose-btn"
        title={label}
        aria-label={label}
        onClick={() => {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(8);
          }
          setOpen(true);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
        </svg>
      </button>
      {open && (
        <NewMessageModal
          open={open}
          onClose={() => setOpen(false)}
          onCreated={(convId) => setActiveConv(convId)}
        />
      )}
    </>
  );
}
