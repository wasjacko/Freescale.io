"use client";

// Bouton de tri compact (icône seule) — vit à droite de la recherche, en haut
// de la liste de conversations. Ouvre un petit menu Récents / Non lus / Étoilés.
// L'état de tri vit dans le store global (`useApp`).

import { useApp } from "@/lib/store";
import { useState } from "react";

const SORTS: { key: "date" | "unread" | "starred"; label: string }[] = [
  { key: "date", label: "Récents" },
  { key: "unread", label: "Non lus" },
  { key: "starred", label: "Étoilés" },
];

export function InboxSortButton() {
  const { inboxSort, setInboxSort } = useApp();
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.key === inboxSort) ?? { key: "date", label: "Récents" };

  return (
    <div className="ibx-sort-wrap">
      <button
        type="button"
        className={`ibx-sort-btn ${open ? "is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Trier : ${current.label}`}
        aria-label={`Trier : ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M7 4v16M7 4 4 7M7 4l3 3" />
          <path d="M17 20V4M17 20l3-3M17 20l-3-3" />
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="ibx-tool-scrim"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div className="ibx-tool-menu ibx-sort-menu" role="menu">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`ibx-tool-item ${inboxSort === s.key ? "is-active" : ""}`}
                onClick={() => {
                  setInboxSort(s.key);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
