"use client";

import { AddChannelModal } from "@/components/AddChannelModal";
import { Icon } from "@/components/icons/Icon";
import { useApp } from "@/lib/store";
import { useState } from "react";

/**
 * Quiet empty state shown when the workspace has zero connected channels. In
 * app-only/local mode, this should still feel like a usable SaaS surface.
 */
export function NoChannelsHero({ canConnect = false }: { canConnect?: boolean }) {
  const { setView } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="no-channels-hero">
      <div className="no-channels-card">
        <span className="no-channels-icon">
          <Icon name="i-inbox" />
        </span>
        <h2 className="no-channels-title">
          {canConnect ? "Connectons votre boîte mail" : "Votre espace SaaS est prêt"}
        </h2>
        <p className="no-channels-sub">
          {canConnect
            ? "Freescale unifie vos messages en un seul endroit. Commencez par votre Gmail."
            : "L'inbox est vide pour l'instant. Vous pouvez déjà capturer, organiser et suivre vos tâches."}
        </p>
        {canConnect ? (
          <button type="button" className="no-channels-cta" onClick={() => setOpen(true)}>
            Connecter Gmail
          </button>
        ) : (
          <button type="button" className="no-channels-cta" onClick={() => setView("tasks")}>
            Ouvrir les tâches
          </button>
        )}
      </div>

      {canConnect && (
        <AddChannelModal open={open} onClose={() => setOpen(false)} connectedKinds={new Set()} />
      )}
    </div>
  );
}
