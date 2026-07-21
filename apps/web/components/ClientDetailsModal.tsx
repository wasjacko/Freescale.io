"use client";

// Modale « Fiche client » — affiche les infos d'un client sans quitter la page
// courante (Inbox). Réutilise l'overlay .add-channel-* pour rester cohérent
// avec les autres modales (AddClient, AddChannel, NewMessage).

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { channelProviderLabel } from "@/lib/channels/registry";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { Client } from "@/lib/types";

export function ClientDetailsModal({
  client,
  open,
  onClose,
}: {
  client: Client | null;
  open: boolean;
  onClose: () => void;
}) {
  const data = useData();
  const { setActiveConv } = useApp();

  if (!open || !client) return null;

  const ids = client.conversationIds ?? [];
  const convs = (data.conversations ?? []).filter((c) => ids.includes(c.id));
  const tasks = (data.tasks ?? []).filter(
    (t) => t.conversationId && ids.includes(t.conversationId)
  );
  const lastConv =
    convs
      .slice()
      .sort((a, b) => new Date(b.lastAtIso).getTime() - new Date(a.lastAtIso).getTime())[0] ?? null;

  return (
    <div
      className="add-channel-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Fiche client — ${client.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      tabIndex={-1}
    >
      <div className="add-channel-sheet client-details-sheet" style={{ maxWidth: "520px" }}>
        <header className="add-channel-head">
          <div className="client-details-head">
            <span className="client-details-av">
              <Avatar avatar={client.avatar} size={48} />
            </span>
            <div>
              <h2 style={{ margin: 0 }}>{client.name}</h2>
              {client.company && <p style={{ margin: "2px 0 0" }}>{client.company}</p>}
            </div>
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

        <div className="client-details-body">
          {/* Action buttons row */}
          <div className="client-quick-actions">
            <a
              href={`mailto:${client.email || ""}`}
              className="client-quick-btn client-quick-btn--email"
            >
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email
            </a>
            <a href="tel:+33102030405" className="client-quick-btn client-quick-btn--phone">
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Téléphone
            </a>
            <a
              href="https://wa.me/33102030405"
              target="_blank"
              rel="noopener noreferrer"
              className="client-quick-btn client-quick-btn--whatsapp"
            >
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              WhatsApp
            </a>
          </div>

          {/* Coordonnées */}
          <section className="client-details-section">
            <h3 className="client-details-h3">Coordonnées</h3>
            <dl className="client-details-dl">
              {client.email && (
                <>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${client.email}`} className="client-details-link">
                      {client.email}
                    </a>
                  </dd>
                </>
              )}
              <dt>Canaux</dt>
              <dd>
                <span className="client-details-chans">
                  {client.channels.map((ch) => (
                    <span key={ch} className="client-details-chan" title={channelProviderLabel(ch)}>
                      <ChannelLogo channel={ch} />
                      {channelProviderLabel(ch)}
                    </span>
                  ))}
                </span>
              </dd>
            </dl>
          </section>

          {/* Activité — chiffres réels comptés sur les données mock/serveur. */}
          <section className="client-details-section">
            <h3 className="client-details-h3">Activité</h3>
            <div className="client-details-stats">
              <div className="client-details-stat">
                <span className="client-details-stat-val">{convs.length}</span>
                <span className="client-details-stat-lbl">Conversations</span>
              </div>
              <div className="client-details-stat">
                <span className="client-details-stat-val">{tasks.length}</span>
                <span className="client-details-stat-lbl">Tâches liées</span>
              </div>
              <div className="client-details-stat">
                <span className="client-details-stat-val">
                  {lastConv
                    ? new Date(lastConv.lastAtIso).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </span>
                <span className="client-details-stat-lbl">Dernier échange</span>
              </div>
            </div>
          </section>

          {/* Conversations rattachées — clic = on bascule vers le fil concerné. */}
          {convs.length > 0 && (
            <section className="client-details-section">
              <h3 className="client-details-h3">Conversations récentes</h3>
              <ul className="client-details-convs">
                {convs.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="client-details-conv"
                      onClick={() => {
                        setActiveConv(c.id);
                        onClose();
                      }}
                    >
                      <span className="client-details-conv-chan">
                        <ChannelLogo channel={c.channel} />
                      </span>
                      <span className="client-details-conv-main">
                        <span className="client-details-conv-subj">{c.subject ?? c.name}</span>
                        <span className="client-details-conv-prev">{c.preview ?? "…"}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
