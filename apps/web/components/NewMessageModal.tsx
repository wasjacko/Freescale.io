"use client";

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { Avatar as AvatarT, ChannelId } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type ClientEntry = {
  key: string;
  name: string;
  avatar: AvatarT;
  contactEmail?: string;
  /** Canal → id de la conversation existante (pour continuer le fil). */
  convByChannel: Map<ChannelId, string>;
  channels: ChannelId[];
};

export function NewMessageModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (convId: string) => void;
}) {
  const { createConversation, appendOutgoingMessage, conversations, channels } = useData();
  const push = useToast((s) => s.push);

  // Clients dérivés des conversations (1 entrée par client, multi-canal).
  const clients = useMemo<ClientEntry[]>(() => {
    const map = new Map<string, ClientEntry>();
    for (const c of conversations) {
      const key = c.clientId ?? c.id;
      const existing = map.get(key);
      const e: ClientEntry = existing ?? {
        key,
        name: c.name,
        avatar: c.avatar,
        ...(c.contactEmail ? { contactEmail: c.contactEmail } : {}),
        convByChannel: new Map(),
        channels: [],
      };
      if (!existing) map.set(key, e);
      if (!e.convByChannel.has(c.channel)) {
        e.convByChannel.set(c.channel, c.id);
        e.channels.push(c.channel);
      }
    }
    return [...map.values()];
  }, [conversations]);

  // Canaux réellement connectés (pour un nouveau contact).
  const connectedChannels = useMemo<ChannelId[]>(() => {
    const set = new Set<ChannelId>();
    for (const ch of channels) set.add(ch.kind);
    return set.size > 0 ? [...set] : ["gmail"];
  }, [channels]);

  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [newName, setNewName] = useState(""); // contact hors liste
  const [channel, setChannel] = useState<ChannelId>("gmail");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = selectedKey ? (clients.find((c) => c.key === selectedKey) ?? null) : null;
  // Canaux proposés : ceux du client sélectionné, sinon les canaux connectés.
  const channelOptions = selected ? selected.channels : connectedChannels;

  const reset = () => {
    setQuery("");
    setSelectedKey(null);
    setNewName("");
    setSubject("");
    setMessage("");
  };

  // Lock body scroll + Esc.
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
  const recipientName = selected?.name ?? newName.trim();
  const canSend = !!recipientName && !!message.trim() && !submitting;

  const pickClient = (c: ClientEntry) => {
    setSelectedKey(c.key);
    setNewName("");
    setQuery("");
    setChannel(c.channels[0] ?? connectedChannels[0] ?? "gmail");
  };
  const pickNewContact = (nameValue: string) => {
    setSelectedKey(null);
    setNewName(nameValue);
    setQuery("");
    setChannel(connectedChannels[0] ?? "gmail");
  };
  const clearRecipient = () => {
    setSelectedKey(null);
    setNewName("");
    setQuery("");
  };

  const filtered = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : clients;
  const exactMatch = clients.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName) {
      push({ kind: "error", text: "Choisis un client ou saisis un destinataire." });
      return;
    }
    if (!message.trim()) {
      push({ kind: "error", text: "Écris un message." });
      return;
    }

    setSubmitting(true);
    try {
      let convId: string;
      const existing = selected?.convByChannel.get(channel);
      if (existing) {
        // Le client a déjà un fil sur ce canal → on continue la conversation.
        await appendOutgoingMessage(existing, message.trim());
        convId = existing;
      } else {
        convId = await createConversation(
          recipientName,
          channel,
          message.trim(),
          isEmail ? subject.trim() : undefined,
          selected
            ? {
                avatar: selected.avatar,
                clientId: selected.key,
                ...(selected.contactEmail ? { contactEmail: selected.contactEmail } : {}),
              }
            : undefined
        );
      }
      push({
        kind: "success",
        text: `Message envoyé à ${recipientName} (${channelProviderLabel(channel)})`,
      });
      onCreated(convId);
      onClose();
      reset();
    } catch {
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
      tabIndex={-1}
    >
      <div className="add-channel-sheet" style={{ maxWidth: "480px" }}>
        <header className="add-channel-head">
          <div>
            <h2>Nouveau message</h2>
            <p>Choisis un client et le canal — Mue envoie sur le bon fil.</p>
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
          {/* ── Destinataire ── */}
          {recipientName && (selected || newName) ? (
            <div className="nm-selected">
              {selected ? (
                <Avatar avatar={{ ...selected.avatar, alt: selected.name }} size={32} />
              ) : (
                <span className="nm-selected-new" aria-hidden>
                  {recipientName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="nm-selected-name">{recipientName}</span>
              {!selected && <span className="nm-selected-tag">nouveau contact</span>}
              <button type="button" className="nm-selected-change" onClick={clearRecipient}>
                Changer
              </button>
            </div>
          ) : (
            <div className="new-msg-field">
              <label htmlFor="nm-search">Destinataire</label>
              <input
                id="nm-search"
                type="text"
                placeholder="Rechercher un client ou saisir un nom…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              <div className="nm-results">
                {filtered.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className="nm-result"
                    onClick={() => pickClient(c)}
                  >
                    <Avatar avatar={{ ...c.avatar, alt: c.name }} size={30} />
                    <span className="nm-result-name">{c.name}</span>
                    <span className="nm-result-chans">
                      {c.channels.map((ch) => (
                        <ChannelLogo key={ch} channel={ch} className="nm-result-chan" />
                      ))}
                    </span>
                  </button>
                ))}
                {query.trim() && !exactMatch && (
                  <button
                    type="button"
                    className="nm-result nm-result--new"
                    onClick={() => pickNewContact(query.trim())}
                  >
                    <span className="nm-selected-new" aria-hidden>
                      +
                    </span>
                    <span className="nm-result-name">Écrire à « {query.trim()} »</span>
                    <span className="nm-result-hint">nouveau contact</span>
                  </button>
                )}
                {filtered.length === 0 && !query.trim() && (
                  <p className="nm-empty">Aucun client pour l'instant.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Canal ── (segmenté avec logos) */}
          {recipientName && (
            <div className="new-msg-field">
              <label>Canal</label>
              <div className="nm-channels">
                {channelOptions.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className={`nm-chan ${channel === ch ? "is-on" : ""}`}
                    onClick={() => setChannel(ch)}
                  >
                    <ChannelLogo channel={ch} className="nm-chan-logo" />
                    {channelProviderLabel(ch)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Objet (email) ── */}
          {recipientName && isEmail && (
            <div className="new-msg-field">
              <label htmlFor="nm-subject">Objet</label>
              <input
                id="nm-subject"
                type="text"
                placeholder="Sujet du mail…"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          {/* ── Message ── */}
          {recipientName && (
            <div className="new-msg-field">
              <label htmlFor="nm-text">Message</label>
              <textarea
                id="nm-text"
                rows={5}
                placeholder={`Écris à ${recipientName}…`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          )}

          <div className="new-msg-actions">
            <button type="button" className="new-msg-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="new-msg-submit" disabled={!canSend}>
              {submitting ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
