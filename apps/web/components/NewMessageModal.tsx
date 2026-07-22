"use client";

import { Avatar } from "@/components/ui/Avatar";
import { channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { Avatar as AvatarT, ChannelId } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

type ClientEntry = {
  key: string;
  name: string;
  avatar: AvatarT;
  contactEmail?: string;
  /** Canal → id de la conversation existante (pour continuer le fil). */
  convByChannel: Map<ChannelId, string>;
  channels: ChannelId[];
};

type ToItem = {
  key: string;
  name: string;
  email: string;
  avatar?: AvatarT;
  entry?: ClientEntry;
};

type Attachment = { name: string; size: number };

/** Devine le libellé d'extension + une couleur pour la vignette. */
function fileMeta(name: string): { ext: string; color: string } {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  const palette: Record<string, string> = {
    fig: "#a259ff",
    blend: "#ea7600",
    pdf: "#e5252a",
    png: "#22a06b",
    jpg: "#22a06b",
    jpeg: "#22a06b",
    doc: "#2b579a",
    docx: "#2b579a",
    xls: "#217346",
    xlsx: "#217346",
    zip: "#6b7280",
  };
  return { ext: ext ? ext.toUpperCase() : "FILE", color: palette[ext] ?? "#64748b" };
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} o`;
}

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

  // Canal d'envoi : un canal email connecté en priorité.
  const sendChannel = useMemo<ChannelId>(() => {
    const email = connectedChannels.find((c) => c === "gmail" || c === "outlook");
    return email ?? connectedChannels[0] ?? "gmail";
  }, [connectedChannels]);

  const fromEmail =
    channels.find((c) => c.kind === sendChannel)?.displayName ?? "moi@freescale.app";

  const [toItems, setToItems] = useState<ToItem[]>([]);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setToItems([]);
    setQuery("");
    setSubject("");
    setMessage("");
    setFiles([]);
    setShowCc(false);
    setShowBcc(false);
    setCc("");
    setBcc("");
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

  const toKeys = new Set(toItems.map((t) => t.key));
  const filtered = query.trim()
    ? clients.filter(
        (c) => !toKeys.has(c.key) && c.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : clients.filter((c) => !toKeys.has(c.key));
  const exactMatch = clients.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  const addClient = (c: ClientEntry) => {
    setToItems((prev) => [
      ...prev,
      {
        key: c.key,
        name: c.name,
        email: c.contactEmail ?? `${c.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
        avatar: c.avatar,
        entry: c,
      },
    ]);
    setQuery("");
  };
  const addRaw = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setToItems((prev) => [...prev, { key: `raw-${v}-${prev.length}`, name: v, email: v }]);
    setQuery("");
  };
  const removeTo = (key: string) => setToItems((prev) => prev.filter((t) => t.key !== key));

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size }));
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const primary = toItems[0] ?? null;
  const canSend = !!primary && !!message.trim() && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primary) {
      push({ kind: "error", text: "Ajoute au moins un destinataire." });
      return;
    }
    if (!message.trim()) {
      push({ kind: "error", text: "Écris un message." });
      return;
    }
    setSubmitting(true);
    try {
      let convId: string;
      const existing = primary.entry?.convByChannel.get(sendChannel);
      if (existing) {
        await appendOutgoingMessage(existing, message.trim());
        convId = existing;
      } else {
        convId = await createConversation(
          primary.name,
          sendChannel,
          message.trim(),
          subject.trim() || undefined,
          primary.entry
            ? {
                avatar: primary.entry.avatar,
                clientId: primary.entry.key,
                ...(primary.entry.contactEmail
                  ? { contactEmail: primary.entry.contactEmail }
                  : {}),
              }
            : undefined
        );
      }
      push({
        kind: "success",
        text: `Email envoyé à ${primary.name} (${channelProviderLabel(sendChannel)})`,
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
      className="compose-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Nouvel email"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      tabIndex={-1}
    >
      <div className="compose-modal">
        {/* ── Header ── */}
        <header className="compose-head">
          <div className="compose-head-title">
            <svg
              className="compose-head-ic"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="m3.5 7 8.5 6 8.5-6" />
            </svg>
            <h2>Nouvel email</h2>
          </div>
          <div className="compose-head-actions">
            <button type="button" className="compose-icon-btn" aria-label="Agrandir" title="Agrandir">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </button>
            <button type="button" className="compose-icon-btn" aria-label="Fermer" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="compose-form">
          {/* ── Carte blanche ── */}
          <div className="compose-card">
            {/* De */}
            <div className="compose-row">
              <span className="compose-row-label">De</span>
              <div className="compose-chips">
                <span className="compose-chip">
                  <span className="compose-chip-avatar" aria-hidden>
                    {fromEmail.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="compose-chip-text">{fromEmail}</span>
                </span>
              </div>
            </div>

            {/* À */}
            <div className="compose-row">
              <span className="compose-row-label">À</span>
              <div className="compose-to">
                <div className="compose-chips">
                  {toItems.map((t) => (
                    <span key={t.key} className="compose-chip">
                      {t.avatar ? (
                        <Avatar avatar={{ ...t.avatar, alt: t.name }} size={22} />
                      ) : (
                        <span className="compose-chip-avatar" aria-hidden>
                          {t.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="compose-chip-text">{t.email}</span>
                      <button
                        type="button"
                        className="compose-chip-remove"
                        aria-label={`Retirer ${t.name}`}
                        onClick={() => removeTo(t.key)}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <input
                    className="compose-to-input"
                    type="text"
                    placeholder={toItems.length ? "" : "Ajouter un destinataire…"}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && query.trim()) {
                        e.preventDefault();
                        if (filtered[0]) addClient(filtered[0]);
                        else addRaw(query);
                      }
                      if (e.key === "Backspace" && !query && toItems.length) {
                        removeTo(toItems[toItems.length - 1]!.key);
                      }
                    }}
                    autoComplete="off"
                  />
                </div>
                {query.trim() && (
                  <div className="compose-suggest">
                    {filtered.map((c) => (
                      <button key={c.key} type="button" className="compose-suggest-item" onClick={() => addClient(c)}>
                        <Avatar avatar={{ ...c.avatar, alt: c.name }} size={26} />
                        <span className="compose-suggest-name">{c.name}</span>
                        <span className="compose-suggest-mail">
                          {c.contactEmail ?? `${c.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`}
                        </span>
                      </button>
                    ))}
                    {!exactMatch && (
                      <button type="button" className="compose-suggest-item compose-suggest-new" onClick={() => addRaw(query)}>
                        <span className="compose-chip-avatar" aria-hidden>+</span>
                        <span className="compose-suggest-name">Écrire à « {query.trim()} »</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="compose-ccbcc">
                <button
                  type="button"
                  className={`compose-ccbcc-btn ${showCc ? "is-on" : ""}`}
                  onClick={() => setShowCc((v) => !v)}
                >
                  Cc
                </button>
                <button
                  type="button"
                  className={`compose-ccbcc-btn ${showBcc ? "is-on" : ""}`}
                  onClick={() => setShowBcc((v) => !v)}
                >
                  Cci
                </button>
              </div>
            </div>

            {showCc && (
              <div className="compose-row">
                <span className="compose-row-label">Cc</span>
                <input className="compose-plain-input" type="text" placeholder="Copie à…" value={cc} onChange={(e) => setCc(e.target.value)} />
              </div>
            )}
            {showBcc && (
              <div className="compose-row">
                <span className="compose-row-label">Cci</span>
                <input className="compose-plain-input" type="text" placeholder="Copie cachée à…" value={bcc} onChange={(e) => setBcc(e.target.value)} />
              </div>
            )}

            <div className="compose-divider" />

            {/* Objet */}
            <input
              className="compose-subject"
              type="text"
              placeholder="Objet du mail"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            {/* Corps */}
            <textarea
              className="compose-body"
              placeholder={primary ? `Écris à ${primary.name}…` : "Écris ton message…"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
            />

            {/* Pièces jointes */}
            {files.length > 0 && (
              <div className="compose-attachments">
                {files.map((f, i) => {
                  const meta = fileMeta(f.name);
                  return (
                    <div key={`${f.name}-${i}`} className="compose-attach-card">
                      <span className="compose-attach-icon" style={{ background: meta.color }} aria-hidden>
                        {meta.ext}
                      </span>
                      <span className="compose-attach-tx">
                        <span className="compose-attach-name">{f.name}</span>
                        <span className="compose-attach-size">{fmtSize(f.size)}</span>
                      </span>
                      <button
                        type="button"
                        className="compose-attach-remove"
                        aria-label={`Retirer ${f.name}`}
                        onClick={() => removeFile(i)}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer : outils + envoyer ── */}
          <div className="compose-footer">
            <div className="compose-tools">
              <button type="button" className="compose-tool-btn" aria-label="Mise en forme" title="Mise en forme">
                <span className="compose-tool-aa">Aa</span>
              </button>
              <button
                type="button"
                className="compose-tool-btn"
                aria-label="Joindre un fichier"
                title="Joindre un fichier"
                onClick={() => fileRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.67 3.67 0 0 1 5.19 5.19l-8.5 8.49a1.83 1.83 0 0 1-2.59-2.59l7.79-7.78" />
                </svg>
              </button>
              <button type="button" className="compose-tool-btn" aria-label="Insérer un lien" title="Insérer un lien">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </button>
              <button type="button" className="compose-tool-btn" aria-label="Emoji" title="Emoji">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              <button type="button" className="compose-tool-btn" aria-label="Planifier l'envoi" title="Planifier l'envoi">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2.5" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
            </div>

            <div className="compose-footer-right">
              <button type="submit" className="compose-send" disabled={!canSend}>
                {submitting ? "Envoi…" : "Envoyer l'email"}
              </button>
              <button
                type="button"
                className="compose-trash"
                aria-label="Supprimer le brouillon"
                title="Supprimer le brouillon"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18" />
                  <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={onPickFiles}
            aria-hidden
          />
        </form>
      </div>
    </div>
  );
}
