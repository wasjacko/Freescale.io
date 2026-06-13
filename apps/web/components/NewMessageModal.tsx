"use client";

import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { ChannelId } from "@/lib/types";
import { useEffect, useState } from "react";

export function NewMessageModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (convId: string) => void;
}) {
  const { createConversation } = useData();
  const push = useToast((s) => s.push);

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<ChannelId>("gmail");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Lock body scroll + Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const isEmail = channel === "gmail" || channel === "outlook";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      push({ kind: "error", text: "Veuillez entrer un destinataire." });
      return;
    }
    if (!message.trim()) {
      push({ kind: "error", text: "Veuillez écrire un message." });
      return;
    }

    setSubmitting(true);
    try {
      const convId = await createConversation(
        name.trim(),
        channel,
        message.trim(),
        isEmail ? subject.trim() : undefined
      );
      push({ kind: "success", text: "Message envoyé !" });
      onCreated(convId);
      onClose();
      // Reset state
      setName("");
      setSubject("");
      setMessage("");
    } catch (err) {
      push({ kind: "error", text: "Erreur lors de l'envoi." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="add-channel-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Nouveau message"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <div className="add-channel-sheet" style={{ maxWidth: "480px" }}>
        <header className="add-channel-head">
          <div>
            <h2>Nouveau message</h2>
            <p>Envoyez un message à un client sur le canal de votre choix.</p>
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
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="new-msg-form">
          <div className="new-msg-field">
            <label htmlFor="msg-recipient">Destinataire</label>
            <input
              id="msg-recipient"
              type="text"
              placeholder="Nom du client..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="new-msg-field">
            <label htmlFor="msg-channel">Canal</label>
            <select
              id="msg-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ChannelId)}
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="slack">Slack</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          {isEmail && (
            <div className="new-msg-field">
              <label htmlFor="msg-subject">Objet</label>
              <input
                id="msg-subject"
                type="text"
                placeholder="Sujet du mail..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div className="new-msg-field">
            <label htmlFor="msg-text">Message</label>
            <textarea
              id="msg-text"
              rows={6}
              placeholder="Écrivez votre message ici..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <div className="new-msg-actions">
            <button type="button" className="new-msg-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="new-msg-submit" disabled={submitting}>
              {submitting ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
