"use client";

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import type { ChannelId } from "@/lib/types";
import { useEffect } from "react";

/**
 * « Ce que Freescale voit » — transparence : la liste des clients réellement
 * ingérés (par canal), avec la possibilité d'en retirer un. Argument de
 * confiance : on ne stocke que tes clients. UI/mock.
 */
export function DataVisibilityModal() {
  const { dataViewOpen, setDataViewOpen, mueOpen } = useApp();
  const { conversations, archived, archive, unarchive } = useData();

  useEffect(() => {
    if (!dataViewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDataViewOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [dataViewOpen, setDataViewOpen]);

  if (!dataViewOpen) return null;

  // 1 entrée par client, avec ses canaux.
  const byClient = new Map<
    string,
    {
      name: string;
      avatar: (typeof conversations)[number]["avatar"];
      channels: Set<ChannelId>;
      ids: string[];
    }
  >();
  for (const c of conversations) {
    const key = c.clientId ?? c.id;
    const g = byClient.get(key);
    if (!g)
      byClient.set(key, {
        name: c.name,
        avatar: c.avatar,
        channels: new Set([c.channel]),
        ids: [c.id],
      });
    else {
      g.channels.add(c.channel);
      g.ids.push(c.id);
    }
  }
  const clients = [...byClient.values()];

  return (
    <div className={`ccm-overlay ${mueOpen ? "mue-panel-open" : ""}`} role="dialog" aria-modal="true" aria-label="Ce que Freescale voit">
      <button
        type="button"
        className="ccm-backdrop"
        aria-hidden
        tabIndex={-1}
        onClick={() => setDataViewOpen(false)}
      />
      <div className="ccm-sheet">
        <header className="ccm-head">
          <div>
            <h2 className="ccm-title">Ce que Freescale voit</h2>
            <p className="ccm-sub">
              Seuls tes clients sont ingérés. Tu peux en retirer un à tout moment — il disparaît de
              ton inbox.
            </p>
          </div>
          <button
            type="button"
            className="ccm-close"
            aria-label="Fermer"
            onClick={() => setDataViewOpen(false)}
          >
            ✕
          </button>
        </header>

        <div className="dvm-list">
          {clients.map((cl) => {
            const isArchived = cl.ids.every((id) => archived.has(id));
            return (
              <div key={cl.name} className={`dvm-row ${isArchived ? "is-off" : ""}`}>
                <Avatar avatar={{ ...cl.avatar, alt: cl.name }} size={32} />
                <span className="dvm-name">{cl.name}</span>
                <span className="dvm-channels">
                  {[...cl.channels].map((ch) => (
                    <ChannelLogo key={ch} channel={ch} className="dvm-chan" />
                  ))}
                </span>
                <button
                  type="button"
                  className="dvm-remove"
                  onClick={() => cl.ids.forEach((id) => (isArchived ? unarchive(id) : archive(id)))}
                >
                  {isArchived ? "Réintégrer" : "Retirer"}
                </button>
              </div>
            );
          })}
        </div>

        <footer className="ccm-foot">
          <button type="button" className="ccm-confirm" onClick={() => setDataViewOpen(false)}>
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
}
