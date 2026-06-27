"use client";

// Modale « Ajouter un client » — saisie manuelle d'un contact/client dans la
// liste Santé client (UI/mock). Réutilise l'overlay .add-channel-* (modale
// centrée). On construit un Client minimal : nom, société, email, canaux.

import { ChannelLogo } from "@/components/icons/Icon";
import { useToast } from "@/lib/hooks/useToast";
import type { ChannelId, Client } from "@/lib/types";
import { useState } from "react";

// Canaux proposés à la sélection (les plus courants pour un freelance).
const CHANNELS: ChannelId[] = ["gmail", "whatsapp", "linkedin", "instagram", "slack", "sms"];
const CHAN_LABEL: Record<string, string> = {
  gmail: "Gmail",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  slack: "Slack",
  sms: "SMS",
};
// Palette de fonds d'avatar (initiales) — déterministe selon le nom.
const AVATAR_BG = ["#4f46e5", "#0891b2", "#db2777", "#d97706", "#16a34a", "#7c3aed"];

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function AddClientModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (client: Client) => void;
}) {
  const push = useToast((s) => s.push);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [channels, setChannels] = useState<Set<ChannelId>>(new Set(["gmail"]));

  if (!open) return null;

  const toggleChannel = (ch: ChannelId) =>
    setChannels((prev) => {
      const n = new Set(prev);
      if (n.has(ch)) n.delete(ch);
      else n.add(ch);
      return n;
    });

  const reset = () => {
    setName("");
    setCompany("");
    setEmail("");
    setChannels(new Set(["gmail"]));
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      push({ kind: "error", text: "Donne au moins un nom au client." });
      return;
    }
    const bg = AVATAR_BG[trimmed.length % AVATAR_BG.length] ?? "#4f46e5";
    const client: Client = {
      id: `client-${Date.now()}`,
      name: trimmed,
      ...(company.trim() ? { company: company.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      avatar: { kind: "initials", text: initialsOf(trimmed), bg, alt: trimmed },
      channels: channels.size > 0 ? Array.from(channels) : ["gmail"],
      stage: "prospect",
      lastContactLabel: "à l'instant",
    };
    onCreate(client);
    push({ kind: "success", text: `${trimmed} ajouté à tes clients.` });
    reset();
    onClose();
  };

  return (
    <div
      className="add-channel-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Ajouter un client"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      tabIndex={-1}
    >
      <div className="add-channel-sheet" style={{ maxWidth: "460px" }}>
        <header className="add-channel-head">
          <div>
            <h2>Ajouter un client</h2>
            <p>Crée une fiche client — tu pourras l'enrichir ensuite.</p>
          </div>
          <button type="button" className="add-channel-close" aria-label="Fermer" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="acm-body">
          <label className="acm-field">
            <span>Nom</span>
            <input
              type="text"
              placeholder="Ex. Camille Bernard"
              value={name}
              // biome-ignore lint/a11y/noAutofocus: premier champ d'une modale ouverte à la demande
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </label>
          <label className="acm-field">
            <span>Société (optionnel)</span>
            <input
              type="text"
              placeholder="Ex. Studio Bernard"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
          <label className="acm-field">
            <span>Email (optionnel)</span>
            <input
              type="email"
              placeholder="camille@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <div className="acm-field">
            <span>Canaux</span>
            <div className="acm-channels">
              {CHANNELS.map((ch) => {
                const on = channels.has(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    className={`acm-chan ${on ? "is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => toggleChannel(ch)}
                  >
                    <ChannelLogo channel={ch} className="acm-chan-logo" />
                    {CHAN_LABEL[ch] ?? ch}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="acm-foot">
          <button type="button" className="acm-btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="acm-btn acm-btn--primary" onClick={submit}>
            Ajouter le client
          </button>
        </footer>
      </div>
    </div>
  );
}
