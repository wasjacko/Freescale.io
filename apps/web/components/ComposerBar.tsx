"use client";

// Barre d'actions unifiée du composer (mails + messages). Rangée d'icônes
// compactes à gauche (+ outils), micro à droite, bouton Envoyer noir avec
// chevron déroulant. Visuel commun aux 2 mondes (email / message).
// Stratégie d'allègement : on n'affiche que 4 essentielles + un bouton
// « ... » qui regroupe le reste dans un popover.

import type { ReactNode } from "react";

type IconAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  active?: boolean | undefined;
};

const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  width: 17,
  height: 17,
  "aria-hidden": true,
};

export function ComposerBar({
  onAttach,
  onMue,
  onMention,
  onTemplate,
  onEmoji,
  onChecklist,
  onSend,
  onMic,
  canSend,
  onFormat,
  formatOpen,
}: {
  onFormat?: () => void;
  onAttach?: () => void;
  onMue?: () => void;
  onMention?: () => void;
  onTemplate?: () => void;
  onEmoji?: () => void;
  onChecklist?: () => void;
  onSend: () => void;
  onMic?: () => void;
  canSend: boolean;
  formatOpen?: boolean;
}) {
  // Ordre des icônes calé sur la maquette : +, sparkle (Mue), mention,
  // paperclip, @, chat bubble, emoji, vidéo, checklist, template, swap.
  const actions: IconAction[] = [
    {
      key: "add",
      label: "Ajouter",
      icon: (
        <svg {...ico}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
      onClick: onAttach,
    },
    {
      key: "format",
      label: "Mise en forme",
      active: formatOpen,
      icon: (
        <svg {...ico} viewBox="0 0 24 24">
          <path d="M4 20h16" />
          <path d="m6.9 15 6.9-11L21 15" />
          <path d="m8.6 11.4 7.6-.2" />
        </svg>
      ),
      onClick: onFormat,
    },
    {
      key: "mue",
      label: "Mue — suggérer",
      onClick: onMue,
      icon: (
        // Petit motif fleur dégradé pour évoquer Mue (sans alourdir l'import).
        <svg {...ico} stroke="none" fill="url(#cbar-grad)">
          <defs>
            <linearGradient
              id="cbar-grad"
              x1="0"
              y1="0"
              x2="24"
              y2="24"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#78AABF" />
              <stop offset="40%" stopColor="#611C71" />
              <stop offset="80%" stopColor="#FE0045" />
              <stop offset="100%" stopColor="#E1B9B8" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="6" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="12" r="3" />
          <circle cx="12" cy="18" r="3" />
        </svg>
      ),
    },
    {
      key: "mention",
      label: "Mentionner",
      onClick: onMention,
      icon: (
        <svg {...ico} stroke="none" fill="url(#cbar-grad-alt)">
          <defs>
            <linearGradient
              id="cbar-grad-alt"
              x1="0"
              y1="0"
              x2="24"
              y2="24"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FE0045" />
              <stop offset="100%" stopColor="#611C71" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 9.5a3 3 0 1 0 3 3" stroke="#fff" strokeWidth={1.6} fill="none" />
          <path d="M15 9.5v3a2.5 2.5 0 0 0 4.5 1.5" stroke="#fff" strokeWidth={1.6} fill="none" />
        </svg>
      ),
    },
    {
      key: "attach",
      label: "Joindre un fichier",
      onClick: onAttach,
      icon: (
        <svg {...ico}>
          <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 1 1-2.83-2.83l8.49-8.49" />
        </svg>
      ),
    },
    {
      key: "at",
      label: "Citer un contact",
      onClick: onMention,
      icon: (
        <svg {...ico}>
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
        </svg>
      ),
    },
    {
      key: "reply",
      label: "Réponses rapides",
      onClick: onTemplate,
      icon: (
        <svg {...ico}>
          <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.6 8.6 0 0 1-3.5-.7L3 21l1.9-4.4a8.3 8.3 0 0 1-1.4-4.6A8.4 8.4 0 0 1 12 3.6a8.4 8.4 0 0 1 9 7.9z" />
        </svg>
      ),
    },
    {
      key: "emoji",
      label: "Emoji",
      onClick: onEmoji,
      icon: (
        <svg {...ico}>
          <circle cx="12" cy="12" r="9" />
          <line x1="9" y1="10" x2="9.01" y2="10" />
          <line x1="15" y1="10" x2="15.01" y2="10" />
          <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
        </svg>
      ),
    },
    {
      key: "video",
      label: "Appel vidéo",
      icon: (
        <svg {...ico}>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <polygon points="23 7 16 12 23 17 23 7" />
        </svg>
      ),
    },
    {
      key: "task",
      label: "Créer une tâche",
      onClick: onChecklist,
      icon: (
        <svg {...ico}>
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      key: "template",
      label: "Insérer un modèle",
      onClick: onTemplate,
      icon: (
        <svg {...ico}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <line x1="12" y1="10" x2="12" y2="16" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
      ),
    },
    {
      key: "swap",
      label: "Reformuler",
      icon: (
        <svg {...ico}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polyline points="8 12 11 9 14 12" />
          <polyline points="10 15 13 18 16 15" />
        </svg>
      ),
    },
  ];

  // Allègement : 2 groupes séparés par un divider vertical.
  // Groupe « Contenu » (insérer/joindre) à gauche, Mue isolée à droite.
  // Boutons retirés (peu lisibles / redondants) : Réponses rapides, Tâche,
  // Modèle, Reformuler.
  const GROUP_A = new Set(["attach", "at", "emoji", "video"]);
  const GROUP_B = new Set(["mue"]);
  const groupA = actions.filter((a) => GROUP_A.has(a.key));
  const groupB = actions.filter((a) => GROUP_B.has(a.key));

  const renderBtn = (a: IconAction) => (
    <button
      key={a.key}
      type="button"
      className={`cbar-btn ${a.active ? "is-on" : ""}`}
      onClick={a.onClick}
      disabled={a.disabled}
      title={a.label}
      aria-label={a.label}
    >
      {a.icon}
    </button>
  );

  return (
    <div className="cbar">
      <div className="cbar-left">
        <div className="cbar-group">{groupA.map(renderBtn)}</div>
        {groupA.length > 0 && groupB.length > 0 && <span className="cbar-divider" aria-hidden />}
        <div className="cbar-group">{groupB.map(renderBtn)}</div>
      </div>
      <div className="cbar-right">
        {onMic && (
          <button
            type="button"
            className="cbar-btn"
            onClick={onMic}
            title="Dicter"
            aria-label="Dicter"
          >
            <svg {...ico}>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="18" x2="12" y2="22" />
            </svg>
          </button>
        )}
        <div className={`cbar-send ${canSend ? "" : "is-disabled"}`}>
          <button
            type="button"
            className="cbar-send-main"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Envoyer"
            title="Envoyer"
          >
            <svg {...ico} width={16} height={16}>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
          <button
            type="button"
            className="cbar-send-caret"
            aria-label="Plus d'options d'envoi"
            title="Options d'envoi"
          >
            <svg {...ico} width={12} height={12}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
